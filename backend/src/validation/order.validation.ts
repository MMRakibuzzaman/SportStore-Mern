import { z } from "zod";

export const orderIdParamSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "orderId must be a valid ObjectId."),
});

export const updateOrderStatusSchema = z
  .object({
    orderStatus: z.enum(["Shipped"]),
  })
  .strict();

export type OrderIdParams = z.infer<typeof orderIdParamSchema>;
export type UpdateOrderStatusPayload = z.infer<typeof updateOrderStatusSchema>;
