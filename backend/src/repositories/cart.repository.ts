import { Types } from "mongoose";
import { Cart, type CartDocument } from "../models/cart.model.js";
import type { VariantDocument } from "../models/variant.model.js";
import { ProductRepository } from "./product.repository.js";

export class CartRepository {
  constructor(private readonly productRepository: ProductRepository = new ProductRepository()) { }

  async findOrCreateCart(userId: string): Promise<CartDocument> {
    const objectId = this.toObjectId(userId);
    let cart = await Cart.findOne({ userId: objectId }).exec();

    if (!cart) {
      cart = new Cart({ userId: objectId, items: [] });
      await cart.save();
    }

    return cart;
  }

  async addToCart(userId: string, variantId: string, quantity: number): Promise<CartDocument> {
    const userObjectId = this.toObjectId(userId);
    const variantObjectId = this.toObjectId(variantId);

    // Verify variant exists
    const variant = await this.productRepository.findVariantById(variantId);
    if (!variant) {
      throw new Error("Variant not found");
    }

    let cart = await Cart.findOne({ userId: userObjectId }).exec();

    if (!cart) {
      cart = new Cart({ userId: userObjectId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.variantId.toString() === variantId,
    );

    if (existingItemIndex >= 0) {
      const existingItem = cart.items[existingItemIndex];

      if (!existingItem) {
        throw new Error("Item not in cart");
      }

      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        variantId: variantObjectId,
        quantity,
      });
    }

    return cart.save();
  }

  async removeFromCart(userId: string, variantId: string): Promise<CartDocument> {
    const userObjectId = this.toObjectId(userId);

    const cart = await Cart.findOne({ userId: userObjectId }).exec();

    if (!cart) {
      throw new Error("Cart not found");
    }

    cart.items = cart.items.filter((item) => item.variantId.toString() !== variantId);

    return cart.save();
  }

  async updateCartItemQuantity(
    userId: string,
    variantId: string,
    quantity: number,
  ): Promise<CartDocument> {
    const userObjectId = this.toObjectId(userId);

    const cart = await Cart.findOne({ userId: userObjectId }).exec();

    if (!cart) {
      throw new Error("Cart not found");
    }

    const itemIndex = cart.items.findIndex((item) => item.variantId.toString() === variantId);

    if (itemIndex < 0) {
      throw new Error("Item not in cart");
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const item = cart.items[itemIndex];

      if (!item) {
        throw new Error("Item not in cart");
      }

      item.quantity = quantity;
    }

    return cart.save();
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const userObjectId = this.toObjectId(userId);

    const cart = await Cart.findOne({ userId: userObjectId }).exec();

    if (!cart) {
      throw new Error("Cart not found");
    }

    cart.items = [];
    return cart.save();
  }

  async removeItemsByVariantIds(variantIds: string[]): Promise<void> {
    if (variantIds.length === 0) {
      return;
    }

    const variantObjectIds = variantIds.map((id) => this.toObjectId(id));
    await Cart.updateMany(
      { items: { $elemMatch: { variantId: { $in: variantObjectIds } } } },
      { $pull: { items: { variantId: { $in: variantObjectIds } } } },
    ).exec();
  }

  async getCart(userId: string): Promise<CartDocument | null> {
    const userObjectId = this.toObjectId(userId);
    return Cart.findOne({ userId: userObjectId }).exec();
  }

  async getCartWithDetails(
    userId: string,
  ): Promise<
    Array<{
      variantId: string;
      quantity: number;
      variant: VariantDocument;
      productName: string;
    }>
  > {
    const userObjectId = this.toObjectId(userId);

    const cart = await Cart.findOne({ userId: userObjectId }).exec();

    if (!cart || cart.items.length === 0) {
      return [];
    }

    const items = [];

    for (const item of cart.items) {
      const variant = await this.productRepository.findVariantById(
        item.variantId.toString(),
      );

      if (variant) {
        const product = await this.productRepository.findProductById(variant.product.toString());

        items.push({
          variantId: item.variantId.toString(),
          quantity: item.quantity,
          variant,
          productName: product?.baseName ?? "Unknown Product",
        });
      }
    }

    return items;
  }

  private toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }
}
