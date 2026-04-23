import type { NextFunction, Request, Response } from "express";
import { emitInventoryDepleted } from "../realtime/socket.js";
import { ProductService } from "../services/product.service.js";
import type { ProductCatalogQuery } from "../validation/product-query.validation.js";
import { productCatalogQuerySchema } from "../validation/product-query.validation.js";
import {
  createProductSchema,
  productIdParamSchema,
  updateProductSchema,
  type CreateProductPayload,
  type ProductIdParams,
  type UpdateProductPayload,
} from "../validation/product.validation.js";
import {
  createVariantSchema,
  increaseVariantStockSchema,
  setVariantStockSchema,
  updateVariantSchema,
  variantCrudIdParamSchema,
  variantIdParamSchema,
  type CreateVariantPayload,
  type IncreaseVariantStockPayload,
  type SetVariantStockPayload,
  type UpdateVariantPayload,
  type VariantCrudIdParams,
  type VariantIdParams,
} from "../validation/variant.validation.js";
import type { HttpError } from "../types/http-error.js";

export class ProductController {
  constructor(private readonly productService: ProductService = new ProductService()) { }

  listProducts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const products = await this.productService.listProducts();

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  };

  createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = this.parseCreateProductPayload(req.body);
      const imagePath = req.file ? `/images/${req.file.filename}` : undefined;
      const createdProduct = await this.productService.createProduct(payload, imagePath);

      res.status(201).json({
        success: true,
        data: createdProduct,
      });
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = this.parseProductIdParams(req.params);
      const product = await this.productService.getProductById(id);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  getVariantsByProductId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = this.parseProductIdParams(req.params);
      const variants = await this.productService.getVariantsByProductId(id);

      res.status(200).json({
        success: true,
        data: variants,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = this.parseProductIdParams(req.params);
      const payload = this.parseUpdateProductPayload(req.body);
      const imagePath = req.file ? `/images/${req.file.filename}` : undefined;
      const updatedProduct = await this.productService.updateProduct(id, payload, imagePath);

      res.status(200).json({
        success: true,
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = this.parseProductIdParams(req.params);
      await this.productService.deleteProduct(id);

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  listVariants = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const variants = await this.productService.listVariants();

      res.status(200).json({
        success: true,
        data: variants,
      });
    } catch (error) {
      next(error);
    }
  };

  createVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = this.parseCreateVariantPayload(req.body);
      const createdVariant = await this.productService.createVariant(payload);

      res.status(201).json({
        success: true,
        data: createdVariant,
      });
    } catch (error) {
      next(error);
    }
  };

  getVariantById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = this.parseVariantCrudIdParams(req.params);
      const variant = await this.productService.getVariantById(id);

      res.status(200).json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  updateVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = this.parseVariantCrudIdParams(req.params);
      const payload = this.parseUpdateVariantPayload(req.body);
      const updatedVariant = await this.productService.updateVariant(id, payload);

      res.status(200).json({
        success: true,
        data: updatedVariant,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = this.parseVariantCrudIdParams(req.params);
      await this.productService.deleteVariant(id);

      res.status(200).json({
        success: true,
        message: "Variant deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminInventory = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const variants = await this.productService.getAdminInventory();

      res.status(200).json({
        success: true,
        data: variants,
      });
    } catch (error) {
      next(error);
    }
  };

  getCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = this.parseCatalogQuery(req.query);
      const searchResult = await this.productService.searchCatalog(parsedQuery);

      res.status(200).json({
        success: true,
        data: searchResult.items,
        pagination: {
          total: searchResult.total,
          page: searchResult.page,
          limit: searchResult.limit,
          totalPages: searchResult.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  increaseVariantStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { variantId } = this.parseVariantIdParams(req.params);
      const { units } = this.parseIncreaseStockPayload(req.body);
      const updatedVariant = await this.productService.increaseVariantStock(variantId, units);

      res.status(200).json({
        success: true,
        data: {
          variantId: updatedVariant._id.toString(),
          inventoryCount: updatedVariant.inventoryCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  setVariantStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { variantId } = this.parseVariantIdParams(req.params);
      const { inventoryCount } = this.parseSetStockPayload(req.body);
      const updatedVariant = await this.productService.setVariantStock(variantId, inventoryCount);

      res.status(200).json({
        success: true,
        data: {
          variantId: updatedVariant._id.toString(),
          inventoryCount: updatedVariant.inventoryCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  releaseVariantStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { variantId } = this.parseVariantIdParams(req.params);
      const { units } = this.parseIncreaseStockPayload(req.body);
      const updatedVariant = await this.productService.increaseVariantStock(variantId, units);

      res.status(200).json({
        success: true,
        data: {
          variantId: updatedVariant._id.toString(),
          inventoryCount: updatedVariant.inventoryCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  decreaseVariantStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { variantId } = this.parseVariantIdParams(req.params);
      const { units } = this.parseIncreaseStockPayload(req.body);
      const updatedVariant = await this.productService.decreaseVariantStock(variantId, units);

      if (updatedVariant.inventoryCount === 0) {
        emitInventoryDepleted(updatedVariant._id.toString());
      }

      res.status(200).json({
        success: true,
        data: {
          variantId: updatedVariant._id.toString(),
          inventoryCount: updatedVariant.inventoryCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  private parseCatalogQuery(query: Request["query"]): ProductCatalogQuery {
    const parsedResult = productCatalogQuerySchema.safeParse(query);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid catalog query parameters", 400, parsedResult.error.issues);
  }

  private parseCreateProductPayload(body: unknown): CreateProductPayload {
    const parsedResult = createProductSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid product payload", 400, parsedResult.error.issues);
  }

  private parseUpdateProductPayload(body: unknown): UpdateProductPayload {
    const parsedResult = updateProductSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid product update payload", 400, parsedResult.error.issues);
  }

  private parseProductIdParams(params: Request["params"]): ProductIdParams {
    const parsedResult = productIdParamSchema.safeParse(params);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid product id parameter", 400, parsedResult.error.issues);
  }

  private parseCreateVariantPayload(body: unknown): CreateVariantPayload {
    const parsedResult = createVariantSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid variant payload", 400, parsedResult.error.issues);
  }

  private parseUpdateVariantPayload(body: unknown): UpdateVariantPayload {
    const parsedResult = updateVariantSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid variant update payload", 400, parsedResult.error.issues);
  }

  private parseVariantCrudIdParams(params: Request["params"]): VariantCrudIdParams {
    const parsedResult = variantCrudIdParamSchema.safeParse(params);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid variant id parameter", 400, parsedResult.error.issues);
  }

  private parseVariantIdParams(params: Request["params"]): VariantIdParams {
    const parsedResult = variantIdParamSchema.safeParse(params);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid variantId parameter", 400, parsedResult.error.issues);
  }

  private parseIncreaseStockPayload(body: unknown): IncreaseVariantStockPayload {
    const parsedResult = increaseVariantStockSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid stock increase payload", 400, parsedResult.error.issues);
  }

  private parseSetStockPayload(body: unknown): SetVariantStockPayload {
    const parsedResult = setVariantStockSchema.safeParse(body);

    if (parsedResult.success) {
      return parsedResult.data;
    }

    throw this.buildError("Invalid stock set payload", 400, parsedResult.error.issues);
  }

  private buildError(message: string, statusCode: number, details?: unknown): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }
}