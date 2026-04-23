import { Router } from "express";
import { CheckoutController } from "../controllers/checkout.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const checkoutRouter = Router();
const checkoutController = new CheckoutController();

checkoutRouter.post("/", requireAuth, checkoutController.checkout);

export { checkoutRouter };