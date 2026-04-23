import { model, Schema, type HydratedDocument, type Model } from "mongoose";

export type OrderStatus = "Pending" | "Shipped" | "Delivered";

export interface IOrderItemSnapshot {
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export interface IShippingAddress {
  streetLine1: string;
  streetLine2?: string | undefined;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrder {
  email: string;
  shippingAddress: IShippingAddress;
  items: IOrderItemSnapshot[];
  totalCost: number;
  orderStatus: OrderStatus;
}

export type OrderDocument = HydratedDocument<IOrder>;

type OrderModel = Model<IOrder>;

const orderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160,
    },
    sku: {
      type: String,
      required: true,
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
  {
    _id: false,
  },
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    streetLine1: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    streetLine2: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new Schema<IOrder, OrderModel>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    items: {
      type: [orderItemSnapshotSchema],
      required: true,
      validate: {
        validator(value: IOrderItemSnapshot[]): boolean {
          return Array.isArray(value) && value.length > 0;
        },
        message: "items must contain at least one item.",
      },
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered"],
      default: "Pending",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Order =
  (globalThis as typeof globalThis & { OrderModel?: OrderModel }).OrderModel ??
  model<IOrder, OrderModel>("Order", orderSchema);

(globalThis as typeof globalThis & { OrderModel?: OrderModel }).OrderModel = Order;