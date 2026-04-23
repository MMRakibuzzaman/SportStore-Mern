import { z } from "zod";

const productVariantAttributeValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const productVariantInputSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(3, "variant sku must be at least 3 characters long.")
      .max(64, "variant sku must be at most 64 characters long.")
      .transform((value) => value.toUpperCase()),
    price: z.coerce.number().finite().min(0, "variant price must be greater than or equal to 0."),
    attributes: z.record(z.string(), productVariantAttributeValueSchema),
    weight: z.coerce.number().finite().min(0, "variant weight must be greater than or equal to 0."),
    inventoryCount: z
      .coerce.number()
      .int("variant inventoryCount must be an integer.")
      .min(0, "variant inventoryCount must be greater than or equal to 0."),
  })
  .strict();

const productVariantsPayloadSchema = z.union([z.string(), z.array(productVariantInputSchema)]);

export const productIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "id must be a valid ObjectId."),
});

export const createProductSchema = z
  .object({
    baseName: z.string().trim().min(2, "baseName must be at least 2 characters.").max(120),
    brand: z.string().trim().min(2, "brand must be at least 2 characters.").max(80),
    variants: productVariantsPayloadSchema.optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    baseName: z.string().trim().min(2, "baseName must be at least 2 characters.").max(120).optional(),
    brand: z.string().trim().min(2, "brand must be at least 2 characters.").max(80).optional(),
    variants: productVariantsPayloadSchema.optional(),
  })
  .strict();

export type ProductIdParams = z.infer<typeof productIdParamSchema>;
export type CreateProductPayload = z.infer<typeof createProductSchema>;
export type UpdateProductPayload = z.infer<typeof updateProductSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
