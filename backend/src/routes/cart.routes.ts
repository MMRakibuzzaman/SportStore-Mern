import { Router } from "express";
import { CartController } from "../controllers/cart.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const cartRouter = Router();
const cartController = new CartController();

cartRouter.get("/", requireAuth, cartController.getCart);
cartRouter.post("/add", requireAuth, cartController.addToCart);
cartRouter.delete("/:variantId", requireAuth, cartController.removeFromCart);
cartRouter.patch("/:variantId", requireAuth, cartController.updateCartItem);
cartRouter.delete("/", requireAuth, cartController.clearCart);

export { cartRouter };
