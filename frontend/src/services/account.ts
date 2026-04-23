import { api } from "./api.js";
import type { ShippingFormState } from "./checkoutStorage.js";

export interface AccountProfile {
  id: string;
  email: string;
  role: "customer" | "admin";
  pastOrderIds: string[];
  savedShippingAddress: ShippingFormState | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  savedShippingAddress?: ShippingFormState | null;
}

interface ProfileResponse {
  success: boolean;
  data: AccountProfile;
}

export async function fetchCurrentProfile(): Promise<AccountProfile> {
  const response = await api.get<ProfileResponse>("/auth/profile");
  return response.data.data;
}

export async function updateCurrentProfile(
  payload: UpdateProfilePayload,
): Promise<AccountProfile> {
  const response = await api.patch<ProfileResponse>("/auth/profile", payload);
  return response.data.data;
}
