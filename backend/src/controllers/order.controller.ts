import type { NextFunction, Request, Response } from "express";
import { OrderService } from "../services/order.service.js";
import type { HttpError } from "../types/http-error.js";
import {
  orderIdParamSchema,
  updateOrderStatusSchema,
  type OrderIdParams,
  type UpdateOrderStatusPayload,
} from "../validation/order.validation.js";

export class OrderController {
  constructor(private readonly orderService: OrderService = new OrderService()) { }

  getMyOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const orders = await this.orderService.getMyOrders(req.authUser.userId);

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrders = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await this.orderService.getAllOrders();

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  };

  updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = this.parseOrderIdParams(req.params);
      const { orderStatus } = this.parseUpdateOrderStatusPayload(req.body);

      if (orderStatus !== "Shipped") {
        throw this.buildError("Only shipping updates are currently supported", 400);
      }

      const updatedOrder = await this.orderService.markOrderShipped(orderId);

      res.status(200).json({
        success: true,
        data: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  };

  private parseOrderIdParams(params: Request["params"]): OrderIdParams {
    const parsedResult = orderIdParamSchema.safeParse(params);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid orderId parameter", 400, parsedResult.error.issues);
  }

  private parseUpdateOrderStatusPayload(body: unknown): UpdateOrderStatusPayload {
    const parsedResult = updateOrderStatusSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid order status payload", 400, parsedResult.error.issues);
  }

  private buildError(message: string, statusCode: number, details?: unknown): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }
}
