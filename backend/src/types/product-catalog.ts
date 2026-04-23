import type { Types } from "mongoose";

export interface ProductCatalogFilters {
  category?: string | string[] | undefined;
  size?: string | undefined;
  brand?: string | string[] | undefined;
  color?: string | undefined;
  sku?: string | undefined;
  minPrice?: number | undefined;
  limit?: number | undefined;
  page?: number | undefined;
}

export interface ProductCatalogItem {
  product: {
    _id: Types.ObjectId;
    baseName: string;
    brand: string;
    imagePath?: string | undefined;
  };
  variant: {
    _id: Types.ObjectId;
    sku: string;
    price: number;
    attributes: Record<string, string | number | boolean | null>;
    weight: number;
    inventoryCount: number;
  };
}

export interface ProductCatalogSearchResult {
  items: ProductCatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}