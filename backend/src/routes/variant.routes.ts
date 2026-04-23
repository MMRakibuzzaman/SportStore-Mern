import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";

const variantRouter = Router();
const productController = new ProductController();

variantRouter.use(requireAuth, requireAdmin);
variantRouter.get("/", productController.listVariants);
variantRouter.post("/", productController.createVariant);
variantRouter.get("/:id", productController.getVariantById);
variantRouter.put("/:id", productController.updateVariant);
variantRouter.delete("/:id", productController.deleteVariant);

export { variantRouter };
