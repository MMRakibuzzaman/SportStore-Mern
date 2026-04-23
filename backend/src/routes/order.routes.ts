import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";

const orderRouter = Router();
const orderController = new OrderController();

orderRouter.get("/me", requireAuth, orderController.getMyOrders);

orderRouter.use(requireAuth, requireAdmin);
orderRouter.get("/", orderController.getOrders);
orderRouter.patch("/:orderId/status", orderController.updateOrderStatus);

export { orderRouter };
