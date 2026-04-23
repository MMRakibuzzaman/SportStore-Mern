import { model, Schema, type HydratedDocument, type Model } from "mongoose";

export interface IProduct {
  baseName: string;
  brand: string;
  imagePath?: string | undefined;
}

export type ProductDocument = HydratedDocument<IProduct>;

type ProductModel = Model<IProduct>;

const productSchema = new Schema<IProduct, ProductModel>(
  {
    baseName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    imagePath: {
      type: String,
      trim: true,
      maxlength: 255,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Product =
  (globalThis as typeof globalThis & { ProductModel?: ProductModel }).ProductModel ??
  model<IProduct, ProductModel>("Product", productSchema);

(globalThis as typeof globalThis & { ProductModel?: ProductModel }).ProductModel = Product;