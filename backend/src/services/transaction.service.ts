import { emitInventoryDepleted } from "../realtime/socket.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { CheckoutPayload } from "../validation/checkout.validation.js";
import type { CheckoutResponse } from "../types/checkout.js";
import type { HttpError } from "../types/http-error.js";
import type { IOrder } from "../models/order.model.js";

export class TransactionService {
  constructor(
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly orderRepository: OrderRepository = new OrderRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
  ) { }

  async checkoutCart(userId: string, payload: CheckoutPayload): Promise<CheckoutResponse> {
    const user = await this.userRepository.findUserById(userId);

    if (!user) {
      throw this.buildError("User not found", 404);
    }

    const items = payload.items;
    const orderItems: IOrder["items"] = [];
    const depletedVariantIds: string[] = [];
    let totalCost = 0;

    for (const item of items) {
      const variant = await this.productRepository.findVariantById(item.variantId);

      if (!variant) {
        throw this.buildError("Variant not found", 404);
      }

      const product = await this.productRepository.findProductById(variant.product.toString());

      if (!product) {
        throw this.buildError("Product not found", 404);
      }

      if (variant.inventoryCount < item.quantity) {
        throw this.buildError("Insufficient inventory for checkout", 409);
      }

      variant.inventoryCount -= item.quantity;
      const savedVariant = await this.productRepository.saveVariant(variant);

      orderItems.push({
        name: product.baseName,
        sku: savedVariant.sku,
        price: savedVariant.price,
        quantity: item.quantity,
      });

      totalCost += savedVariant.price * item.quantity;

      if (savedVariant.inventoryCount === 0) {
        depletedVariantIds.push(savedVariant._id.toString());
      }

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

    for (const variantId of depletedVariantIds) {
      emitInventoryDepleted(variantId);
    }

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