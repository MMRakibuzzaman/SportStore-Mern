import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid variant ID"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export type AddToCartPayload = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().nonnegative("Quantity must be non-negative"),
});

export type UpdateCartItemPayload = z.infer<typeof updateCartItemSchema>;
