import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const authRouter = Router();
const authController = new AuthController();

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.get("/me", requireAuth, authController.me);
authRouter.get("/profile", requireAuth, authController.profile);
authRouter.patch("/profile", requireAuth, authController.updateProfile);

export { authRouter };