import { model, Schema, Types, type HydratedDocument, type Model } from "mongoose";

export interface ICartItem {
  variantId: Types.ObjectId;
  quantity: number;
}

export interface ICart {
  userId: Types.ObjectId;
  items: ICartItem[];
}

export type CartDocument = HydratedDocument<ICart>;

type CartModel = Model<ICart>;

const cartItemSchema = new Schema<ICartItem>(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator(value: number): boolean {
          return Number.isInteger(value);
        },
        message: "quantity must be an integer.",
      },
    },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart, CartModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Cart =
  (globalThis as typeof globalThis & { CartModel?: CartModel }).CartModel ??
  model<ICart, CartModel>("Cart", cartSchema);

(globalThis as typeof globalThis & { CartModel?: CartModel }).CartModel = Cart;
