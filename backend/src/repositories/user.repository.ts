import { User, type UserDocument, type UserRole } from "../models/user.model.js";
import type { RegisterPayload } from "../validation/auth.validation.js";

export class UserRepository {
  async findAllUsers(): Promise<UserDocument[]> {
    return User.find().sort({ createdAt: -1 }).exec();
  }

  async findUserByEmail(email: string): Promise<UserDocument | null> {
    return User.findOne({ email: email.toLowerCase() }).exec();
  }

  async findUserById(userId: string): Promise<UserDocument | null> {
    return User.findById(userId).exec();
  }

  async createUser(payload: RegisterPayload): Promise<UserDocument> {
    return User.create({
      email: payload.email,
      password: payload.password,
      savedShippingAddress: null,
    });
  }

  async updateUserRoleById(userId: string, role: UserRole): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { new: true, runValidators: true },
    ).exec();
  }
}