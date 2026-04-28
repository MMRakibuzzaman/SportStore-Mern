import { CartRepository } from "../repositories/cart.repository.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { emitInventoryDepleted, emitInventoryUpdated } from "../realtime/socket.js";
import type { HttpError } from "../types/http-error.js";

export interface CartItemDto {
  variantId: string;
  quantity: number;
  sku: string;
  productName: string;
  price: number;
  baseName: string;
  brand: string;
  imagePath?: string;
  attributes: Record<string, unknown>;
  weight: number;
  inventoryCount: number;
}

export interface CartDto {
  items: CartItemDto[];
  itemCount: number;
  totalPrice: number;
}

export class CartService {
  constructor(
    private readonly cartRepository: CartRepository = new CartRepository(),
    private readonly productRepository: ProductRepository = new ProductRepository(),
  ) { }

  async getCart(userId: string): Promise<CartDto> {
    this.assertObjectId(userId, "userId");

    const cart = await this.cartRepository.getCart(userId);

    if (!cart) {
      return { items: [], itemCount: 0, totalPrice: 0 };
    }

    const items: CartItemDto[] = [];
    let totalPrice = 0;

    for (const cartItem of cart.items) {
      const variant = await this.productRepository.findVariantById(cartItem.variantId.toString());

      if (!variant) {
        continue;
      }

      const product = await this.productRepository.findProductById(variant.product.toString());

      if (!product) {
        continue;
      }

      items.push({
        variantId: cartItem.variantId.toString(),
        quantity: cartItem.quantity,
        sku: variant.sku,
        productName: product.baseName,
        price: variant.price,
        baseName: product.baseName,
        brand: product.brand,
        imagePath: product.imagePath,
        attributes: variant.attributes,
        weight: variant.weight,
        inventoryCount: variant.inventoryCount,
      });

      totalPrice += variant.price * cartItem.quantity;
    }

    return {
      items,
      itemCount: items.length,
      totalPrice,
    };
  }

  async addToCart(userId: string, variantId: string, quantity: number): Promise<CartDto> {
    this.assertObjectId(userId, "userId");
    this.assertObjectId(variantId, "variantId");
    this.assertPositiveInteger(quantity, "quantity");

    const reservedVariant = await this.productRepository.adjustVariantInventoryCount(variantId, -quantity);

    if (!reservedVariant) {
      const existingVariant = await this.productRepository.findVariantById(variantId);

      if (!existingVariant) {
        throw this.buildError("Variant not found", 404);
      }

      throw this.buildError("Insufficient inventory for cart", 409);
    }

    try {
      await this.cartRepository.addToCart(userId, variantId, quantity);
    } catch (error) {
      await this.productRepository.adjustVariantInventoryCount(variantId, quantity);
      throw error;
    }

    emitInventoryUpdated(variantId, reservedVariant.inventoryCount);

    if (reservedVariant.inventoryCount === 0) {
      emitInventoryDepleted(variantId);
    }

    return this.getCart(userId);
  }

  async removeFromCart(userId: string, variantId: string): Promise<CartDto> {
    this.assertObjectId(userId, "userId");
    this.assertObjectId(variantId, "variantId");

    const cart = await this.cartRepository.getCart(userId);
    const quantityToRelease = this.getCartItemQuantity(cart, variantId);

    await this.cartRepository.removeFromCart(userId, variantId);

    const releasedVariant = await this.productRepository.adjustVariantInventoryCount(
      variantId,
      quantityToRelease,
    );

    if (releasedVariant) {
      emitInventoryUpdated(variantId, releasedVariant.inventoryCount);
    }

    return this.getCart(userId);
  }

  async updateCartItemQuantity(
    userId: string,
    variantId: string,
    quantity: number,
  ): Promise<CartDto> {
    this.assertObjectId(userId, "userId");
    this.assertObjectId(variantId, "variantId");
    this.assertNonNegativeInteger(quantity, "quantity");

    const cart = await this.cartRepository.getCart(userId);
    const currentQuantity = this.getCartItemQuantity(cart, variantId);

    if (quantity === currentQuantity) {
      return this.getCart(userId);
    }

    let updatedInventoryCount: number | undefined;
    const quantityDelta = quantity - currentQuantity;

    if (quantityDelta > 0) {
      const reservedVariant = await this.productRepository.adjustVariantInventoryCount(
        variantId,
        -quantityDelta,
      );

      if (!reservedVariant) {
        const existingVariant = await this.productRepository.findVariantById(variantId);

        if (!existingVariant) {
          throw this.buildError("Variant not found", 404);
        }

        throw this.buildError("Insufficient inventory for cart", 409);
      }

      updatedInventoryCount = reservedVariant.inventoryCount;

      if (reservedVariant.inventoryCount === 0) {
        emitInventoryDepleted(variantId);
      }
    } else {
      const releasedVariant = await this.productRepository.adjustVariantInventoryCount(
        variantId,
        Math.abs(quantityDelta),
      );
      updatedInventoryCount = releasedVariant?.inventoryCount;
    }

    if (quantity === 0) {
      await this.cartRepository.removeFromCart(userId, variantId);
    } else {
      await this.cartRepository.updateCartItemQuantity(userId, variantId, quantity);
    }

    if (updatedInventoryCount !== undefined) {
      emitInventoryUpdated(variantId, updatedInventoryCount);
    }

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<CartDto> {
    this.assertObjectId(userId, "userId");

    const cart = await this.cartRepository.getCart(userId);

    if (!cart || cart.items.length === 0) {
      return { items: [], itemCount: 0, totalPrice: 0 };
    }

    await this.cartRepository.clearCart(userId);

    await Promise.all(
      cart.items.map(async (item) => {
        const updatedVariant = await this.productRepository.adjustVariantInventoryCount(
          item.variantId.toString(),
          item.quantity,
        );

        if (updatedVariant) {
          emitInventoryUpdated(item.variantId.toString(), updatedVariant.inventoryCount);
        }
      }),
    );

    return { items: [], itemCount: 0, totalPrice: 0 };
  }

  private getCartItemQuantity(
    cart: Awaited<ReturnType<CartRepository["getCart"]>>,
    variantId: string,
  ): number {
    if (!cart) {
      throw this.buildError("Cart not found", 404);
    }

    const existingItem = cart.items.find((item) => item.variantId.toString() === variantId);

    if (!existingItem) {
      throw this.buildError("Item not found in cart", 404);
    }

    return existingItem.quantity;
  }

  private assertObjectId(id: string, field: string): void {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    if (!objectIdRegex.test(id)) {
      throw this.buildError(`${field} must be a valid ObjectId`, 400);
    }
  }

  private assertNonNegativeInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw this.buildError(`${field} must be a non-negative integer`, 400);
    }
  }

  private assertPositiveInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw this.buildError(`${field} must be a positive integer`, 400);
    }
  }

  private buildError(message: string, statusCode: number): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    return error;
  }
}
