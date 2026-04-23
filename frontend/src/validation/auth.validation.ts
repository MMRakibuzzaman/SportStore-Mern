import { z } from "zod";

// Mirrors backend auth validation rules for immediate client-side feedback.
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
