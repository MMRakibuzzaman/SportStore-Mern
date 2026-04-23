import type { NextFunction, Request, Response } from "express";
import { TransactionService } from "../services/transaction.service.js";
import type { HttpError } from "../types/http-error.js";
import { checkoutSchema, type CheckoutPayload } from "../validation/checkout.validation.js";

export class CheckoutController {
  constructor(private readonly transactionService: TransactionService = new TransactionService()) { }

  checkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const payload = this.parseCheckoutPayload(req.body);
      const checkoutResult = await this.transactionService.checkoutCart(req.authUser.userId, payload);

      res.status(200).json({
        success: true,
        data: checkoutResult,
      });
    } catch (error) {
      next(error);
    }
  };

  private parseCheckoutPayload(body: unknown): CheckoutPayload {
    const parsedResult = checkoutSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid checkout payload", 400, parsedResult.error.issues);
  }

  private buildError(message: string, statusCode: number, details?: unknown): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }
}