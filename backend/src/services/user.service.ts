import { Types } from "mongoose";
import type { UserRole } from "../models/user.model.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { HttpError } from "../types/http-error.js";

export interface AdminUserSummary {
  id: string;
  email: string;
  role: UserRole;
  pastOrderIds: string[];
  createdAt: string;
}

export class UserService {
  constructor(private readonly userRepository: UserRepository = new UserRepository()) { }

  async getAllUsers(): Promise<AdminUserSummary[]> {
    const users = await this.userRepository.findAllUsers();
    return users.map((user) => this.toAdminUserSummary(user));
  }

  async updateUserRole(userId: string, role: UserRole): Promise<AdminUserSummary> {
    if (!Types.ObjectId.isValid(userId)) {
      throw this.buildError("id must be a valid ObjectId.", 400);
    }

    const updatedUser = await this.userRepository.updateUserRoleById(userId, role);

    if (!updatedUser) {
      throw this.buildError("User not found", 404);
    }

    return this.toAdminUserSummary(updatedUser);
  }

  private toAdminUserSummary(user: {
    _id: { toString(): string };
    email: string;
    role: UserRole;
    pastOrderIds: Array<{ toString(): string }>;
    createdAt?: Date;
  }): AdminUserSummary {
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(0);

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      pastOrderIds: user.pastOrderIds.map((orderId) => orderId.toString()),
      createdAt: createdAt.toISOString(),
    };
  }

  private buildError(message: string, statusCode: number): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    return error;
  }
}
