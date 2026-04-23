import type { NextFunction, Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import type { HttpError } from "../types/http-error.js";
import {
  updateUserRoleSchema,
  userIdParamSchema,
  type UpdateUserRolePayload,
  type UserIdParams,
} from "../validation/user.validation.js";

export class UserController {
  constructor(private readonly userService: UserService = new UserService()) { }

  getUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  };

  updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = this.parseUserIdParams(req.params);
      const { role } = this.parseUpdateUserRolePayload(req.body);
      const updatedUser = await this.userService.updateUserRole(id, role);

      res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  };

  private parseUserIdParams(params: Request["params"]): UserIdParams {
    const parsedResult = userIdParamSchema.safeParse(params);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid user id parameter", 400, parsedResult.error.issues);
  }

  private parseUpdateUserRolePayload(body: unknown): UpdateUserRolePayload {
    const parsedResult = updateUserRoleSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid user role payload", 400, parsedResult.error.issues);
  }

  private buildError(message: string, statusCode: number, details?: unknown): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }
}
