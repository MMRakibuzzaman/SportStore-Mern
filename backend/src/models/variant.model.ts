import { model, Schema, Types, type HydratedDocument, type Model } from "mongoose";

export type VariantAttributes = Record<string, string | number | boolean | null>;

export interface IVariant {
  product: Types.ObjectId;
  sku: string;
  price: number;
  attributes: VariantAttributes;
  weight: number;
  inventoryCount: number;
}

export type VariantDocument = HydratedDocument<IVariant>;

type VariantModel = Model<IVariant>;

const variantSchema = new Schema<IVariant, VariantModel>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 64,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    inventoryCount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value: number): boolean {
          return Number.isInteger(value);
        },
        message: "inventoryCount must be an integer.",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Variant =
  (globalThis as typeof globalThis & { VariantModel?: VariantModel }).VariantModel ??
  model<IVariant, VariantModel>("Variant", variantSchema);

(globalThis as typeof globalThis & { VariantModel?: VariantModel }).VariantModel = Variant;