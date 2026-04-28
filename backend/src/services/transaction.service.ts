import { ProductRepository } from "../repositories/product.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { CartRepository } from "../repositories/cart.repository.js";
import type { CheckoutPayload } from "../validation/checkout.validation.js";
import type { CheckoutResponse } from "../types/checkout.js";
import type { HttpError } from "../types/http-error.js";
import type { IOrder } from "../models/order.model.js";

export class TransactionService {
  constructor(
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly orderRepository: OrderRepository = new OrderRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly cartRepository: CartRepository = new CartRepository(),
  ) { }

  async checkoutCart(userId: string, payload: CheckoutPayload): Promise<CheckoutResponse> {
    const user = await this.userRepository.findUserById(userId);

    if (!user) {
      throw this.buildError("User not found", 404);
    }

    // Get cart from database instead of payload
    const cart = await this.cartRepository.getCart(userId);

    if (!cart || cart.items.length === 0) {
      throw this.buildError("Cart is empty", 400);
    }

    const orderItems: IOrder["items"] = [];
    let totalCost = 0;

    for (const cartItem of cart.items) {
      const variant = await this.productRepository.findVariantById(cartItem.variantId.toString());

      if (!variant) {
        throw this.buildError("Variant not found", 404);
      }

      const product = await this.productRepository.findProductById(variant.product.toString());

      if (!product) {
        throw this.buildError("Product not found", 404);
      }

      orderItems.push({
        name: product.baseName,
        sku: variant.sku,
        price: variant.price,
        quantity: cartItem.quantity,
      });

      totalCost += variant.price * cartItem.quantity;
    }

    const orderData: IOrder = {
      email: payload.shippingAddress.email,
      shippingAddress: payload.shippingAddress,
      items: orderItems,
      totalCost,
      orderStatus: "Pending",
    };

    const createdOrder = await this.orderRepository.createOrder(orderData);

    user.pastOrderIds.push(createdOrder._id);
    await user.save();

    // Clear cart after successful checkout
    await this.cartRepository.clearCart(userId);

    return {
      orderId: createdOrder._id.toString(),
      orderStatus: createdOrder.orderStatus,
      totalCost: createdOrder.totalCost,
      createdAt: (
        createdOrder as typeof createdOrder & { createdAt?: Date }
      ).createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  private buildError(message: string, statusCode: number): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    return error;
  }
}