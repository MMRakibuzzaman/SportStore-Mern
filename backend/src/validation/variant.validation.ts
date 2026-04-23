import { z } from "zod";

const variantAttributeValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const variantAttributesSchema = z.record(z.string(), variantAttributeValueSchema);

export const createVariantSchema = z
  .object({
    product: z.string().regex(/^[0-9a-fA-F]{24}$/, "product must be a valid ObjectId."),
    sku: z
      .string()
      .trim()
      .min(3, "SKU must be at least 3 characters long.")
      .max(64, "SKU must be at most 64 characters long.")
      .transform((value) => value.toUpperCase()),
    attributes: variantAttributesSchema,
    weight: z.coerce.number().finite().min(0, "weight must be greater than or equal to 0."),
    price: z.coerce.number().finite().min(0, "price must be greater than or equal to 0."),
    inventoryCount: z
      .coerce.number()
      .int("inventoryCount must be an integer.")
      .min(0, "inventoryCount must be greater than or equal to 0."),
  })
  .strict();

export const updateVariantSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(3, "SKU must be at least 3 characters long.")
      .max(64, "SKU must be at most 64 characters long.")
      .transform((value) => value.toUpperCase())
      .optional(),
    attributes: variantAttributesSchema.optional(),
    price: z.coerce.number().finite().min(0, "price must be greater than or equal to 0.").optional(),
    weight: z.coerce.number().finite().min(0, "weight must be greater than or equal to 0.").optional(),
    inventoryCount: z
      .coerce.number()
      .int("inventoryCount must be an integer.")
      .min(0, "inventoryCount must be greater than or equal to 0.")
      .optional(),
  })
  .strict();

export const variantIdParamSchema = z.object({
  variantId: z.string().regex(/^[0-9a-fA-F]{24}$/, "variantId must be a valid ObjectId."),
});

export const variantCrudIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "id must be a valid ObjectId."),
});

export const increaseVariantStockSchema = z
  .object({
    units: z.number().int("units must be an integer.").min(1, "units must be at least 1."),
  })
  .strict();

export const setVariantStockSchema = z
  .object({
    inventoryCount: z
      .number()
      .int("inventoryCount must be an integer.")
      .min(0, "inventoryCount must be greater than or equal to 0."),
  })
  .strict();

export type CreateVariantPayload = z.infer<typeof createVariantSchema>;
export type UpdateVariantPayload = z.infer<typeof updateVariantSchema>;
export type VariantIdParams = z.infer<typeof variantIdParamSchema>;
export type VariantCrudIdParams = z.infer<typeof variantCrudIdParamSchema>;
export type IncreaseVariantStockPayload = z.infer<typeof increaseVariantStockSchema>;
export type SetVariantStockPayload = z.infer<typeof setVariantStockSchema>;
