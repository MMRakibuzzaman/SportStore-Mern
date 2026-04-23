import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getJwtExpiresIn, getJwtSecret } from "../config/jwt.js";
import type { UserDocument } from "../models/user.model.js";
import { UserRepository } from "../repositories/user.repository.js";
import type {
  AuthTokenPayload,
  CurrentUserProfile,
  LoginResult,
  PublicUser,
  UpdateProfileResult,
} from "../types/auth.js";
import type { HttpError } from "../types/http-error.js";
import type {
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from "../validation/auth.validation.js";

export class AuthService {
  constructor(private readonly userRepository: UserRepository = new UserRepository()) { }

  async register(payload: RegisterPayload): Promise<PublicUser> {
    const existingUser = await this.userRepository.findUserByEmail(payload.email);

    if (existingUser) {
      throw this.buildError("Email is already in use", 409);
    }

    const createdUser = await this.userRepository.createUser(payload);
    return this.toPublicUser(createdUser);
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    const user = await this.userRepository.findUserByEmail(payload.email);

    if (!user) {
      throw this.buildError("Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.password);

    if (!passwordMatches) {
      throw this.buildError("Invalid email or password", 401);
    }

    const tokenPayload = this.buildTokenPayload(user);
    const token = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    });

    return {
      user: this.toPublicUser(user),
      token,
    };
  }

  async getCurrentUserProfile(userId: string): Promise<CurrentUserProfile> {
    const user = await this.userRepository.findUserById(userId);

    if (!user) {
      throw this.buildError("User not found", 404);
    }

    return this.toCurrentUserProfile(user);
  }

  async updateCurrentUserProfile(
    userId: string,
    payload: UpdateProfilePayload,
  ): Promise<UpdateProfileResult> {
    const user = await this.userRepository.findUserById(userId);

    if (!user) {
      throw this.buildError("User not found", 404);
    }

    const wantsCredentialChange = Boolean(payload.email) || Boolean(payload.newPassword);

    if (wantsCredentialChange) {
      const currentPassword = payload.currentPassword;

      if (!currentPassword) {
        throw this.buildError("Current password is required", 400);
      }

      const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password);

      if (!currentPasswordMatches) {
        throw this.buildError("Current password is invalid", 401);
      }
    }

    if (payload.email && payload.email !== user.email) {
      const existingUser = await this.userRepository.findUserByEmail(payload.email);

      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        throw this.buildError("Email is already in use", 409);
      }

      user.email = payload.email;
    }

    if (payload.newPassword) {
      user.password = payload.newPassword;
    }

    if (payload.savedShippingAddress !== undefined) {
      user.savedShippingAddress = payload.savedShippingAddress;
    }

    await user.save();

    const updatedToken = jwt.sign(this.buildTokenPayload(user), getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    });

    return {
      user: this.toCurrentUserProfile(user),
      token: updatedToken,
    };
  }

  private buildTokenPayload(user: UserDocument): AuthTokenPayload {
    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
  }

  private toPublicUser(user: UserDocument): PublicUser {
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      pastOrderIds: user.pastOrderIds.map((orderId) => orderId.toString()),
      savedShippingAddress: user.savedShippingAddress
        ? this.toShippingAddress(user.savedShippingAddress)
        : null,
    };
  }

  private toCurrentUserProfile(user: UserDocument): CurrentUserProfile {
    const timestampedUser = user as UserDocument & {
      createdAt?: Date;
      updatedAt?: Date;
    };
    const createdAt = timestampedUser.createdAt instanceof Date ? timestampedUser.createdAt : new Date(0);
    const updatedAt = timestampedUser.updatedAt instanceof Date ? timestampedUser.updatedAt : createdAt;

    return {
      ...this.toPublicUser(user),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }

  private toShippingAddress(address: NonNullable<UserDocument["savedShippingAddress"]>) {
    return {
      email: address.email,
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    };
  }

  private buildError(message: string, statusCode: number): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    return error;
  }
}