import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import { uploadImage } from "../middleware/uploadMiddleware.js";

const productRouter = Router();
const productController = new ProductController();

productRouter.get("/admin", requireAuth, requireAdmin, productController.listProducts);
productRouter.get("/:id/variants", requireAuth, requireAdmin, productController.getVariantsByProductId);
productRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadImage.single("image"),
  productController.createProduct,
);
productRouter.get("/variants", requireAuth, requireAdmin, productController.getAdminInventory);
productRouter.patch(
  "/variants/:variantId/stock/increase",
  requireAuth,
  requireAdmin,
  productController.increaseVariantStock,
);
productRouter.patch(
  "/variants/:variantId/stock/set",
  requireAuth,
  requireAdmin,
  productController.setVariantStock,
);
productRouter.patch(
  "/variants/:variantId/stock/release",
  productController.releaseVariantStock,
);
productRouter.patch(
  "/variants/:variantId/stock/decrease",
  productController.decreaseVariantStock,
);
productRouter.get("/:id", requireAuth, requireAdmin, productController.getProductById);
productRouter.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadImage.single("image"),
  productController.updateProduct,
);
productRouter.delete("/:id", requireAuth, requireAdmin, productController.deleteProduct);
productRouter.get("/", productController.getCatalog);

export { productRouter };