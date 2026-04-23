import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";

const userRouter = Router();
const userController = new UserController();

userRouter.use(requireAuth, requireAdmin);
userRouter.get("/", userController.getUsers);
userRouter.patch("/:id/role", userController.updateUserRole);

export { userRouter };
