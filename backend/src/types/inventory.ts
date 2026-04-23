export interface AdminVariantInventoryItem {
  variantId: string;
  productId: string;
  baseName: string;
  brand: string;
  sku: string;
  attributes: Record<string, string | number | boolean | null>;
  weight: number;
  price: number;
  inventoryCount: number;
}
