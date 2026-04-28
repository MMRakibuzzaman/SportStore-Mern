import type { NextFunction, Request, Response } from "express";
import { CartService } from "../services/cart.service.js";
import type { HttpError } from "../types/http-error.js";
import {
  addToCartSchema,
  updateCartItemSchema,
  type AddToCartPayload,
  type UpdateCartItemPayload,
} from "../validation/cart.validation.js";
import {
  emitCartUpdated,
  emitCartCleared,
} from "../realtime/socket.js";

export class CartController {
  constructor(private readonly cartService: CartService = new CartService()) { }

  getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const cart = await this.cartService.getCart(req.authUser.userId);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  addToCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const payload = this.parseAddToCartPayload(req.body);
      const cart = await this.cartService.addToCart(
        req.authUser.userId,
        payload.variantId,
        payload.quantity,
      );

      emitCartUpdated(req.authUser.userId, cart);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  removeFromCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const variantIdParam = req.params.variantId;
      const variantId = Array.isArray(variantIdParam) ? variantIdParam[0] : variantIdParam;

      if (!variantId) {
        throw this.buildError("Invalid variant id", 400);
      }

      const cart = await this.cartService.removeFromCart(req.authUser.userId, variantId);

      emitCartUpdated(req.authUser.userId, cart);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCartItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const variantIdParam = req.params.variantId;
      const variantId = Array.isArray(variantIdParam) ? variantIdParam[0] : variantIdParam;

      if (!variantId) {
        throw this.buildError("Invalid variant id", 400);
      }

      const payload = this.parseUpdateCartItemPayload(req.body);
      const cart = await this.cartService.updateCartItemQuantity(
        req.authUser.userId,
        variantId,
        payload.quantity,
      );

      emitCartUpdated(req.authUser.userId, cart);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const cart = await this.cartService.clearCart(req.authUser.userId);

      emitCartCleared(req.authUser.userId);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  private parseAddToCartPayload(body: unknown): AddToCartPayload {
    const parsedResult = addToCartSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid add to cart payload", 400);
  }

  private parseUpdateCartItemPayload(body: unknown): UpdateCartItemPayload {
    const parsedResult = updateCartItemSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid update cart item payload", 400);
  }

  private buildError(message: string, statusCode: number, details?: unknown): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }
}
