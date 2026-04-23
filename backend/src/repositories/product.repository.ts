import { Types, type ClientSession, type PipelineStage } from "mongoose";
import { Product, type ProductDocument } from "../models/product.model.js";
import { Variant, type VariantAttributes, type VariantDocument } from "../models/variant.model.js";
import type {
  ProductCatalogFilters,
  ProductCatalogItem,
  ProductCatalogSearchResult,
} from "../types/product-catalog.js";
import type { AdminVariantInventoryItem } from "../types/inventory.js";

export class ProductRepository {
  async findAllVariantInventoryItems(): Promise<AdminVariantInventoryItem[]> {
    const results = await Variant.aggregate<AdminVariantInventoryItem>([
      {
        $lookup: {
          from: Product.collection.name,
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $sort: {
          inventoryCount: 1,
          sku: 1,
        },
      },
      {
        $project: {
          _id: 0,
          variantId: { $toString: "$_id" },
          productId: { $toString: "$product._id" },
          baseName: "$product.baseName",
          brand: "$product.brand",
          sku: "$sku",
          attributes: "$attributes",
          weight: "$weight",
          price: "$price",
          inventoryCount: "$inventoryCount",
        },
      },
    ]).exec();

    return results;
  }

  async findAllProducts(): Promise<ProductDocument[]> {
    return Product.find().sort({ createdAt: -1 }).exec();
  }

  async createProduct(
    payload: { baseName: string; brand: string; imagePath?: string | undefined },
    session?: ClientSession,
  ): Promise<ProductDocument> {
    return new Product(payload).save({ session: session ?? null });
  }

  async updateProductById(
    productId: string,
    updates: Partial<{ baseName: string; brand: string; imagePath: string }>,
  ): Promise<ProductDocument | null> {
    const objectId = this.toObjectId(productId);
    return Product.findByIdAndUpdate(objectId, { $set: updates }, { new: true, runValidators: true }).exec();
  }

  async deleteProductById(productId: string): Promise<ProductDocument | null> {
    const objectId = this.toObjectId(productId);
    return Product.findByIdAndDelete(objectId).exec();
  }

  async findAllVariants(): Promise<VariantDocument[]> {
    return Variant.find().sort({ createdAt: -1 }).exec();
  }

  async createVariant(payload: {
    product: string;
    sku: string;
    price: number;
    attributes: VariantAttributes;
    weight: number;
    inventoryCount: number;
  }, session?: ClientSession): Promise<VariantDocument> {
    return new Variant(payload).save({ session: session ?? null });
  }

  async createVariants(
    payloads: Array<{
      product: string;
      sku: string;
      price: number;
      attributes: VariantAttributes;
      weight: number;
      inventoryCount: number;
    }>,
    session?: ClientSession,
  ): Promise<VariantDocument[]> {
    const createdVariants: VariantDocument[] = [];

    try {
      for (const payload of payloads) {
        createdVariants.push(await this.createVariant(payload, session));
      }

      return createdVariants;
    } catch (error) {
      await Promise.all(createdVariants.map((variant) => this.deleteVariantById(variant._id.toString())));
      throw error;
    }
  }

  async updateVariantById(
    variantId: string,
    updates: Partial<{
      sku: string;
      price: number;
      attributes: VariantAttributes;
      weight: number;
      inventoryCount: number;
    }>,
  ): Promise<VariantDocument | null> {
    const objectId = this.toObjectId(variantId);
    return Variant.findByIdAndUpdate(objectId, { $set: updates }, { new: true, runValidators: true }).exec();
  }

  async deleteVariantById(variantId: string): Promise<VariantDocument | null> {
    const objectId = this.toObjectId(variantId);
    return Variant.findByIdAndDelete(objectId).exec();
  }

  async findProductById(productId: string): Promise<ProductDocument | null> {
    const objectId = this.toObjectId(productId);
    return Product.findById(objectId).exec();
  }

  async findVariantById(variantId: string, session?: ClientSession): Promise<VariantDocument | null> {
    const objectId = this.toObjectId(variantId);
    return Variant.findById(objectId).session(session ?? null).exec();
  }

  async findVariantBySku(sku: string): Promise<VariantDocument | null> {
    return Variant.findOne({ sku: sku.toUpperCase() }).exec();
  }

  async findVariantsByProductId(productId: string): Promise<VariantDocument[]> {
    const objectId = this.toObjectId(productId);
    return Variant.find({ product: objectId }).sort({ createdAt: -1 }).exec();
  }

  async setVariantInventoryCount(variantId: string, nextCount: number): Promise<VariantDocument | null> {
    const objectId = this.toObjectId(variantId);

    return Variant.findByIdAndUpdate(
      objectId,
      { $set: { inventoryCount: nextCount } },
      { new: true, runValidators: true },
    ).exec();
  }

  async adjustVariantInventoryCount(variantId: string, delta: number): Promise<VariantDocument | null> {
    const objectId = this.toObjectId(variantId);

    const filter: {
      _id: Types.ObjectId;
      inventoryCount?: { $gte: number };
    } = { _id: objectId };

    if (delta < 0) {
      filter.inventoryCount = { $gte: Math.abs(delta) };
    }

    return Variant.findOneAndUpdate(
      filter,
      { $inc: { inventoryCount: delta } },
      { new: true, runValidators: true },
    ).exec();
  }

  async saveVariant(variant: VariantDocument, session?: ClientSession): Promise<VariantDocument> {
    return variant.save({ session: session ?? null });
  }

  async findCatalogItems(filters: ProductCatalogFilters): Promise<ProductCatalogSearchResult> {
    const matchConditions: Record<string, unknown>[] = [];
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const categoryFilters =
      filters.category === undefined
        ? []
        : (Array.isArray(filters.category) ? filters.category : [filters.category]);

    if (categoryFilters.length > 0) {
      matchConditions.push({
        $or: categoryFilters.map((category) => this.buildCategoryMatchCondition(category)),
      });
    }

    const brandFilters =
      filters.brand === undefined
        ? []
        : (Array.isArray(filters.brand) ? filters.brand : [filters.brand]);

    if (brandFilters.length > 0) {
      matchConditions.push({
        $or: brandFilters.map((brand) => ({
          "product.brand": {
            $regex: this.escapeRegex(brand),
            $options: "i",
          },
        })),
      });
    }

    if (filters.size) {
      matchConditions.push({ "attributes.size": filters.size });
    }

    if (filters.color) {
      matchConditions.push({
        "attributes.color": {
          $regex: this.escapeRegex(filters.color),
          $options: "i",
        },
      });
    }

    if (filters.sku) {
      matchConditions.push({ sku: filters.sku.toUpperCase() });
    }

    if (filters.minPrice !== undefined) {
      matchConditions.push({ price: { $gte: filters.minPrice } });
    }

    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: Product.collection.name,
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      } as PipelineStage,
      ...(matchConditions.length > 0 ? ([{ $match: { $and: matchConditions } }] as PipelineStage[]) : []),
      {
        $sort: {
          "product.baseName": 1,
          sku: 1,
        },
      } as PipelineStage,
      {
        $project: {
          _id: 0,
          product: {
            _id: "$product._id",
            baseName: "$product.baseName",
            brand: "$product.brand",
            imagePath: "$product.imagePath",
          },
          variant: {
            _id: "$_id",
            sku: "$sku",
            price: "$price",
            attributes: "$attributes",
            weight: "$weight",
            inventoryCount: "$inventoryCount",
          },
        },
      } as PipelineStage,
    ];

    const paginatedPipeline: PipelineStage[] = [
      ...pipeline,
      {
        $facet: {
          items: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];

    const [result] = await Variant.aggregate(paginatedPipeline).exec() as Array<{
      items: ProductCatalogItem[];
      totalCount: Array<{ count: number }>;
    }>;

    const total = result?.totalCount[0]?.count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items: result?.items ?? [],
      total,
      page,
      limit,
      totalPages,
    };
  }

  private toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private buildCategoryMatchCondition(category: string): Record<string, unknown> {
    const normalizedCategory = category.trim().toLowerCase();

    const keyMap: Record<string, string[]> = {
      "cricket bat": ["weightLbs", "handle", "handleType", "willowType"],
      "cricket ball": ["type"],
      football: ["material"],
      "tennis racket": ["gripSize"],
      helmet: ["material"],
      pads: ["orientation"],
      footwear: ["shoeSize", "studType", "surfaceType"],
      sportswear: ["fit"],
    };

    const keys = keyMap[normalizedCategory];

    if (!keys || keys.length === 0) {
      return {
        "product.baseName": {
          $regex: this.escapeRegex(category),
          $options: "i",
        },
      };
    }

    return {
      $or: keys.map((key) => ({
        [`attributes.${key}`]: {
          $exists: true,
          $ne: "",
        },
      })),
    };
  }
}