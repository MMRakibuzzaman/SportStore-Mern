import { OrderRepository } from "../repositories/order.repository.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { HttpError } from "../types/http-error.js";
import type {
  AdminOrderListItem,
  CurrentUserOrderListItem,
  UpdateOrderStatusResult,
} from "../types/order.js";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository = new OrderRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly productRepository: ProductRepository = new ProductRepository(),
  ) { }

  async getAllOrders(): Promise<AdminOrderListItem[]> {
    const orders = await this.orderRepository.findAllOrders();

    return orders.map((order) => ({
      id: order._id.toString(),
      email: order.email,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      totalCost: order.totalCost,
      orderStatus: order.orderStatus,
      shippingCity: order.shippingAddress.city,
      shippingCountry: order.shippingAddress.country,
    }));
  }

  async getMyOrders(userId: string): Promise<CurrentUserOrderListItem[]> {
    const user = await this.userRepository.findUserById(userId);

    if (!user) {
      throw this.buildError("User not found", 404);
    }

    const orders = await this.orderRepository.findOrdersByIds(
      user.pastOrderIds.map((orderId) => orderId.toString()),
    );

    const nameBySku = new Map<string, string>();

    return Promise.all(
      orders.map(async (order) => ({
        id: order._id.toString(),
        email: order.email,
        createdAt: (order as typeof order & { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        totalCost: order.totalCost,
        orderStatus: order.orderStatus,
        shippingAddress: {
          streetLine1: order.shippingAddress.streetLine1,
          streetLine2: order.shippingAddress.streetLine2,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postalCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country,
        },
        items: await Promise.all(
          order.items.map(async (item) => ({
            name: await this.resolveOrderItemName(item.name, item.sku, nameBySku),
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
          })),
        ),
      })),
    );
  }

  async markOrderShipped(orderId: string): Promise<UpdateOrderStatusResult> {
    const existingOrder = await this.orderRepository.findOrderById(orderId);

    if (!existingOrder) {
      throw this.buildError("Order not found", 404);
    }

    if (existingOrder.orderStatus !== "Pending") {
      throw this.buildError("Only pending orders can be marked as shipped", 409);
    }

    const updatedOrder = await this.orderRepository.updateOrderStatus(orderId, "Shipped");

    if (!updatedOrder) {
      throw this.buildError("Order not found", 404);
    }

    return {
      id: updatedOrder._id.toString(),
      orderStatus: updatedOrder.orderStatus,
    };
  }

  private buildError(message: string, statusCode: number): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    return error;
  }

  private async resolveOrderItemName(
    currentName: string,
    sku: string,
    cache: Map<string, string>,
  ): Promise<string> {
    const normalizedCurrentName = currentName.trim();
    const normalizedSku = sku.trim().toUpperCase();

    if (
      normalizedCurrentName.length > 0 &&
      normalizedCurrentName.toUpperCase() !== normalizedSku
    ) {
      return currentName;
    }

    const cachedName = cache.get(normalizedSku);

    if (cachedName) {
      return cachedName;
    }

    const variant = await this.productRepository.findVariantBySku(normalizedSku);

    if (!variant) {
      return normalizedCurrentName.length > 0 ? currentName : sku;
    }

    const product = await this.productRepository.findProductById(variant.product.toString());
    const resolvedName = product?.baseName?.trim();

    if (!resolvedName) {
      return normalizedCurrentName.length > 0 ? currentName : sku;
    }

    cache.set(normalizedSku, resolvedName);
    return resolvedName;
  }
}
