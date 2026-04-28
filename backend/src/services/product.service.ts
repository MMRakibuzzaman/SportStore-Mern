import type { ProductDocument } from "../models/product.model.js";
import type { VariantAttributes, VariantDocument } from "../models/variant.model.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { CartRepository } from "../repositories/cart.repository.js";
import { productVariantInputSchema, type CreateProductPayload, type ProductVariantInput, type UpdateProductPayload } from "../validation/product.validation.js";
import type {
  ProductCatalogFilters,
  ProductCatalogSearchResult,
} from "../types/product-catalog.js";
import type { AdminVariantInventoryItem } from "../types/inventory.js";
import type { HttpError } from "../types/http-error.js";
import type { CreateVariantPayload, UpdateVariantPayload } from "../validation/variant.validation.js";
import { z } from "zod";

export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly cartRepository: CartRepository = new CartRepository(),
  ) { }

  async getProductById(productId: string): Promise<ProductDocument> {
    this.assertObjectId(productId, "productId");

    const product = await this.productRepository.findProductById(productId);

    if (!product) {
      throw this.buildError("Product not found", 404);
    }

    return product;
  }

  async getVariantsByProductId(productId: string): Promise<VariantDocument[]> {
    await this.getProductById(productId);
    return this.productRepository.findVariantsByProductId(productId);
  }

  async getVariantBySku(sku: string): Promise<VariantDocument> {
    const normalizedSku = sku.trim().toUpperCase();

    if (!normalizedSku) {
      throw this.buildError("sku is required", 400);
    }

    const variant = await this.productRepository.findVariantBySku(normalizedSku);

    if (!variant) {
      throw this.buildError("Variant not found", 404);
    }

    return variant;
  }

  async getVariantById(variantId: string): Promise<VariantDocument> {
    this.assertObjectId(variantId, "id");

    const variant = await this.productRepository.findVariantById(variantId);

    if (!variant) {
      throw this.buildError("Variant not found", 404);
    }

    return variant;
  }

  async setVariantStock(variantId: string, nextInventoryCount: number): Promise<VariantDocument> {
    this.assertObjectId(variantId, "variantId");
    this.assertNonNegativeInteger(nextInventoryCount, "nextInventoryCount");

    const updatedVariant = await this.productRepository.setVariantInventoryCount(
      variantId,
      nextInventoryCount,
    );

    if (!updatedVariant) {
      throw this.buildError("Variant not found", 404);
    }

    return updatedVariant;
  }

  async increaseVariantStock(variantId: string, units: number): Promise<VariantDocument> {
    this.assertObjectId(variantId, "variantId");
    this.assertPositiveInteger(units, "units");

    const updatedVariant = await this.productRepository.adjustVariantInventoryCount(variantId, units);

    if (!updatedVariant) {
      throw this.buildError("Variant not found", 404);
    }

    return updatedVariant;
  }

  async decreaseVariantStock(variantId: string, units: number): Promise<VariantDocument> {
    this.assertObjectId(variantId, "variantId");
    this.assertPositiveInteger(units, "units");

    const updatedVariant = await this.productRepository.adjustVariantInventoryCount(variantId, -units);

    if (!updatedVariant) {
      throw this.buildError("Variant not found or insufficient inventory", 409);
    }

    return updatedVariant;
  }

  async searchCatalog(filters: ProductCatalogFilters): Promise<ProductCatalogSearchResult> {
    return this.productRepository.findCatalogItems({
      category: this.normalizeTextList(filters.category),
      size: this.normalizeText(filters.size),
      brand: this.normalizeTextList(filters.brand),
      color: this.normalizeText(filters.color),
      sku: this.normalizeText(filters.sku)?.toUpperCase(),
      minPrice: filters.minPrice,
      page: filters.page,
      limit: filters.limit,
    });
  }

  async getAdminInventory(): Promise<AdminVariantInventoryItem[]> {
    return this.productRepository.findAllVariantInventoryItems();
  }

  async listProducts(): Promise<ProductDocument[]> {
    return this.productRepository.findAllProducts();
  }

  async createProduct(payload: CreateProductPayload, imagePath?: string): Promise<ProductDocument> {
    const product = await this.productRepository.createProduct({
      baseName: payload.baseName,
      brand: payload.brand,
      imagePath,
    });

    const variants = this.normalizeProductVariants(payload.variants);

    try {
      if (variants.length > 0) {
        await this.productRepository.createVariants(
          variants.map((variant) => ({
            product: product._id.toString(),
            sku: variant.sku,
            price: variant.price,
            attributes: variant.attributes,
            weight: variant.weight,
            inventoryCount: variant.inventoryCount,
          })),
        );
      }

      return product;
    } catch (error) {
      await this.productRepository.deleteProductById(product._id.toString());
      throw error;
    }
  }

  async updateProduct(
    productId: string,
    payload: UpdateProductPayload,
    imagePath?: string,
  ): Promise<ProductDocument> {
    this.assertObjectId(productId, "id");

    const submittedVariants =
      payload.variants !== undefined ? this.normalizeProductVariants(payload.variants) : undefined;

    const updates: Partial<{ baseName: string; brand: string; imagePath: string }> = {};

    if (payload.baseName !== undefined) {
      updates.baseName = payload.baseName;
    }

    if (payload.brand !== undefined) {
      updates.brand = payload.brand;
    }

    if (submittedVariants && submittedVariants.length > 0) {
      const duplicateSku = this.findDuplicateSku(submittedVariants.map((variant) => variant.sku));

      if (duplicateSku) {
        throw this.buildError(`Duplicate variant sku provided: ${duplicateSku}`, 400);
      }
    }

    if (imagePath !== undefined) {
      updates.imagePath = imagePath;
    }

    if (Object.keys(updates).length === 0 && payload.variants === undefined) {
      throw this.buildError("No product fields were provided for update", 400);
    }

    const updatedProduct =
      Object.keys(updates).length > 0
        ? await this.productRepository.updateProductById(productId, updates)
        : await this.productRepository.findProductById(productId);

    if (!updatedProduct) {
      throw this.buildError("Product not found", 404);
    }

    if (submittedVariants) {
      const existingVariants = await this.productRepository.findVariantsByProductId(productId);
      const variantsBySku = new Map(
        existingVariants.map((variant) => [variant.sku.toUpperCase(), variant]),
      );

      const submittedSkus = new Set(submittedVariants.map((v) => v.sku.toUpperCase()));
      const variantsToDelete: string[] = [];

      for (const existingVariant of existingVariants) {
        if (!submittedSkus.has(existingVariant.sku.toUpperCase())) {
          variantsToDelete.push(existingVariant._id.toString());
        }
      }

      if (variantsToDelete.length > 0) {
        await this.productRepository.deleteVariantsByIds(variantsToDelete);
        await this.cartRepository.removeItemsByVariantIds(variantsToDelete);
      }

      for (const submittedVariant of submittedVariants) {
        const matchingVariant = variantsBySku.get(submittedVariant.sku.toUpperCase());

        if (matchingVariant) {
          await this.productRepository.updateVariantById(matchingVariant._id.toString(), {
            sku: submittedVariant.sku,
            price: submittedVariant.price,
            attributes: submittedVariant.attributes,
            weight: submittedVariant.weight,
            inventoryCount: submittedVariant.inventoryCount,
          });
          continue;
        }

        await this.productRepository.createVariant({
          product: productId,
          sku: submittedVariant.sku,
          price: submittedVariant.price,
          attributes: submittedVariant.attributes,
          weight: submittedVariant.weight,
          inventoryCount: submittedVariant.inventoryCount,
        });
      }
    }

    return updatedProduct;
  }

  async deleteProduct(productId: string): Promise<void> {
    this.assertObjectId(productId, "id");

    const existingProduct = await this.productRepository.findProductById(productId);

    if (!existingProduct) {
      throw this.buildError("Product not found", 404);
    }

    const variantsToDelete = await this.productRepository.findVariantsByProductId(productId);
    const variantIds = variantsToDelete.map((v) => v._id.toString());

    await this.productRepository.deleteVariantsByProductId(productId);

    if (variantIds.length > 0) {
      await this.cartRepository.removeItemsByVariantIds(variantIds);
    }

    const deletedProduct = await this.productRepository.deleteProductById(productId);

    if (!deletedProduct) {
      throw this.buildError("Product not found", 404);
    }
  }

  async listVariants(): Promise<VariantDocument[]> {
    return this.productRepository.findAllVariants();
  }

  async createVariant(payload: CreateVariantPayload): Promise<VariantDocument> {
    await this.getProductById(payload.product);

    const existingVariant = await this.productRepository.findVariantBySku(payload.sku, payload.product);

    if (existingVariant) {
      throw this.buildError("A variant with this SKU already exists", 409);
    }

    return this.productRepository.createVariant(payload);
  }

  async updateVariant(variantId: string, payload: UpdateVariantPayload): Promise<VariantDocument> {
    this.assertObjectId(variantId, "id");

    const existingTargetVariant = await this.productRepository.findVariantById(variantId);

    if (!existingTargetVariant) {
      throw this.buildError("Variant not found", 404);
    }

    if (Object.keys(payload).length === 0) {
      throw this.buildError("No variant fields were provided for update", 400);
    }

    if (payload.sku) {
      const existingVariant = await this.productRepository.findVariantBySku(
        payload.sku,
        existingTargetVariant.product.toString(),
      );

      if (existingVariant && existingVariant._id.toString() !== variantId) {
        throw this.buildError("A variant with this SKU already exists", 409);
      }
    }

    const updates: Partial<{
      sku: string;
      price: number;
      attributes: VariantAttributes;
      weight: number;
      inventoryCount: number;
    }> = {};

    if (payload.sku !== undefined) {
      updates.sku = payload.sku;
    }

    if (payload.price !== undefined) {
      updates.price = payload.price;
    }

    if (payload.attributes !== undefined) {
      updates.attributes = payload.attributes;
    }

    if (payload.weight !== undefined) {
      updates.weight = payload.weight;
    }

    if (payload.inventoryCount !== undefined) {
      updates.inventoryCount = payload.inventoryCount;
    }

    const updatedVariant = await this.productRepository.updateVariantById(variantId, updates);

    if (!updatedVariant) {
      throw this.buildError("Variant not found", 404);
    }

    return updatedVariant;
  }

  async deleteVariant(variantId: string): Promise<void> {
    this.assertObjectId(variantId, "id");

    const deletedVariant = await this.productRepository.deleteVariantById(variantId);

    if (!deletedVariant) {
      throw this.buildError("Variant not found", 404);
    }

    await this.cartRepository.removeItemsByVariantIds([variantId]);
  }

  private assertObjectId(id: string, field: string): void {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    if (!objectIdRegex.test(id)) {
      throw this.buildError(`${field} must be a valid ObjectId`, 400);
    }
  }

  private assertNonNegativeInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw this.buildError(`${field} must be a non-negative integer`, 400);
    }
  }

  private assertPositiveInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw this.buildError(`${field} must be a positive integer`, 400);
    }
  }

  private buildError(message: string, statusCode: number): HttpError {
    const error = new Error(message) as HttpError;
    error.statusCode = statusCode;
    return error;
  }

  private normalizeText(value?: string): string | undefined {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : undefined;
  }

  private normalizeTextList(value?: string | string[]): string[] | undefined {
    if (!value) {
      return undefined;
    }

    const values = Array.isArray(value) ? value : [value];
    const normalized = values.map((entry) => entry.trim()).filter(Boolean);

    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeProductVariants(
    variants: CreateProductPayload["variants"] | UpdateProductPayload["variants"],
  ): ProductVariantInput[] {
    if (!variants) {
      return [];
    }

    const parsedVariants = typeof variants === "string" ? this.parseProductVariantsJson(variants) : variants;

    return parsedVariants.filter((variant) => variant.sku.trim().length > 0);
  }

  private parseProductVariantsJson(rawVariants: string): ProductVariantInput[] {
    try {
      const parsedValue = JSON.parse(rawVariants) as unknown;

      if (!Array.isArray(parsedValue)) {
        throw new Error("Variants payload must be an array.");
      }

      const parsedResult = z.array(productVariantInputSchema).safeParse(parsedValue);

      if (!parsedResult.success) {
        throw new Error("Variants payload is invalid.");
      }

      return parsedResult.data;
    } catch {
      throw this.buildError("Invalid variants payload", 400);
    }
  }

  private findDuplicateSku(skus: string[]): string | null {
    const seen = new Set<string>();

    for (const sku of skus) {
      const normalizedSku = sku.trim().toUpperCase();

      if (seen.has(normalizedSku)) {
        return normalizedSku;
      }

      seen.add(normalizedSku);
    }

    return null;
  }
}