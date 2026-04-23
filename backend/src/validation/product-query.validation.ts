import { z } from "zod";

const queryStringSchema = z.string().trim().min(1).max(120);
const brandQuerySchema = z.string().trim().min(1).max(80);
const stringOrStringArraySchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.union([itemSchema, z.array(itemSchema).min(1)]);

export const productCatalogQuerySchema = z
  .object({
    category: stringOrStringArraySchema(queryStringSchema).optional(),
    size: z.string().trim().min(1).max(40).optional(),
    brand: stringOrStringArraySchema(brandQuerySchema).optional(),
    color: z.string().trim().min(1).max(40).optional(),
    sku: z.string().trim().min(1).max(64).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .strict();

export type ProductCatalogQuery = z.infer<typeof productCatalogQuerySchema>;