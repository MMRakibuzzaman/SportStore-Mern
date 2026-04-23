import { type ClientSession } from "mongoose";
import { Order, type IOrder, type OrderDocument, type OrderStatus } from "../models/order.model.js";

export class OrderRepository {
  async createOrder(orderData: IOrder, session?: ClientSession): Promise<OrderDocument> {
    return new Order(orderData).save({ session: session ?? null });
  }

  async findOrdersByIds(orderIds: string[]): Promise<OrderDocument[]> {
    if (orderIds.length === 0) {
      return [];
    }

    return Order.find({ _id: { $in: orderIds } }).sort({ createdAt: -1 }).exec();
  }

  async findAllOrders(): Promise<OrderDocument[]> {
    return Order.find().sort({ createdAt: -1 }).exec();
  }

  async findOrderById(orderId: string): Promise<OrderDocument | null> {
    return Order.findById(orderId).exec();
  }

  async saveOrder(order: OrderDocument): Promise<OrderDocument> {
    return order.save();
  }

  async updateOrderStatus(orderId: string, orderStatus: OrderStatus): Promise<OrderDocument | null> {
    return Order.findByIdAndUpdate(orderId, { orderStatus }, { new: true }).exec();
  }
}
