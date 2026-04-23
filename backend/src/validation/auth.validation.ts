import { z } from "zod";

export const shippingAddressSchema = z
  .object({
    email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
    streetLine1: z.string().trim().min(1, "Street address is required.").max(180),
    streetLine2: z.string().trim().max(180).default(""),
    city: z.string().trim().min(1, "City is required.").max(120),
    state: z.string().trim().min(1, "State / Province is required.").max(120),
    postalCode: z.string().trim().min(1, "Postal code is required.").max(24),
    country: z.string().trim().min(1, "Country is required.").max(120),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    email: z.email().max(254).transform((value) => value.trim().toLowerCase()).optional(),
    currentPassword: z.string().min(1, "Current password is required.").optional(),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long.")
      .max(128, "New password must be at most 128 characters long.")
      .optional(),
    savedShippingAddress: shippingAddressSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const wantsCredentialChange = Boolean(value.email) || Boolean(value.newPassword);

    if (wantsCredentialChange && !value.currentPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current password is required to update email or password.",
        path: ["currentPassword"],
      });
    }
  });

export const registerSchema = z
  .object({
    email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .max(128, "Password must be at most 128 characters long."),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
    password: z.string().min(1, "Password is required."),
  })
  .strict();

export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;
export type ShippingAddressPayload = z.infer<typeof shippingAddressSchema>;
export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;