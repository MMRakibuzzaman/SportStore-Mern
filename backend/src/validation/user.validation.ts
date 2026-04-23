import { z } from "zod";

export const registerUserSchema = z
  .object({
    email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .max(128, "Password must be at most 128 characters long."),
    role: z.enum(["customer", "admin"]).default("customer"),
  })
  .strict();

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "id must be a valid ObjectId."),
});

export const updateUserRoleSchema = z
  .object({
    role: z.enum(["customer", "admin"]),
  })
  .strict();

export type RegisterUserPayload = z.infer<typeof registerUserSchema>;
export type UserIdParams = z.infer<typeof userIdParamSchema>;
export type UpdateUserRolePayload = z.infer<typeof updateUserRoleSchema>;
