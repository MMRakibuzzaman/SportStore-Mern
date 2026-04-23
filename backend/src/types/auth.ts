import type { UserRole } from "../models/user.model.js";

export interface ShippingAddress {
  email: string;
  streetLine1: string;
  streetLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  pastOrderIds: string[];
  savedShippingAddress: ShippingAddress | null;
}

export interface CurrentUserProfile extends PublicUser {
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  savedShippingAddress?: ShippingAddress | null;
}

export interface LoginResult {
  user: PublicUser;
  token: string;
}

export interface UpdateProfileResult {
  user: CurrentUserProfile;
  token: string;
}