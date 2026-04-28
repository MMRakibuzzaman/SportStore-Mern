import { z } from "zod";

export const checkoutSchema = z
  .object({
    shippingAddress: z
      .object({
        email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
        streetLine1: z.string().trim().min(2).max(120),
        streetLine2: z.string().trim().max(120).optional(),
        city: z.string().trim().min(2).max(80),
        state: z.string().trim().min(2).max(80),
        postalCode: z.string().trim().min(2).max(20),
        country: z.string().trim().min(2).max(80),
      })
      .strict(),
  })
  .strict();

export type CheckoutPayload = z.infer<typeof checkoutSchema>;