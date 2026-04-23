import { z } from "zod";

export const checkoutSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            variantId: z.string().regex(/^[0-9a-fA-F]{24}$/, "variantId must be a valid ObjectId."),
            quantity: z
              .number()
              .int("quantity must be an integer.")
              .min(1, "quantity must be at least 1."),
          })
          .strict(),
      )
      .min(1, "items must contain at least one item."),
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