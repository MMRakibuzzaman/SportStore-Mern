import type { NextFunction, Request, Response } from "express";
import { getAuthCookieName, getAuthCookieOptions } from "../config/jwt.js";
import { AuthService } from "../services/auth.service.js";
import type { HttpError } from "../types/http-error.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  type LoginPayload,
  type RegisterPayload,
  type UpdateProfilePayload,
} from "../validation/auth.validation.js";

export class AuthController {
  constructor(private readonly authService: AuthService = new AuthService()) { }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = this.parseRegisterPayload(req.body);
      const user = await this.authService.register(payload);

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = this.parseLoginPayload(req.body);
      const { user, token } = await this.authService.login(payload);

      res.cookie(getAuthCookieName(), token, getAuthCookieOptions());

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: req.authUser,
    });
  };

  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const profile = await this.authService.getCurrentUserProfile(req.authUser.userId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authUser) {
        throw this.buildError("Authentication required", 401);
      }

      const payload = this.parseUpdateProfilePayload(req.body);
      const result = await this.authService.updateCurrentUserProfile(req.authUser.userId, payload);

      res.cookie(getAuthCookieName(), result.token, getAuthCookieOptions());

      res.status(200).json({
        success: true,
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  private parseRegisterPayload(body: unknown): RegisterPayload {
    const parsedResult = registerSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid registration payload", 400, parsedResult.error.issues);
  }

  private parseLoginPayload(body: unknown): LoginPayload {
    const parsedResult = loginSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid login payload", 400, parsedResult.error.issues);
  }

  private parseUpdateProfilePayload(body: unknown): UpdateProfilePayload {
    const parsedResult = updateProfileSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid profile payload", 400, parsedResult.error.issues);
  }

  private buildError(message: string, statusCode: number, details?: unknown): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }
}