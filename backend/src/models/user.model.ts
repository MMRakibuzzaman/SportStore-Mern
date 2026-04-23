import bcrypt from "bcrypt";
import { model, Schema, Types, type HydratedDocument, type Model } from "mongoose";

export type UserRole = "customer" | "admin";

export interface ShippingAddress {
  email: string;
  streetLine1: string;
  streetLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IUser {
  email: string;
  password: string;
  role: UserRole;
  pastOrderIds: Types.ObjectId[];
  savedShippingAddress: ShippingAddress | null;
}

export type UserDocument = HydratedDocument<IUser>;

type UserModel = Model<IUser>;

const shippingAddressSchema = new Schema<ShippingAddress>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    streetLine1: { type: String, required: true, trim: true, maxlength: 180 },
    streetLine2: { type: String, required: false, trim: true, maxlength: 180, default: "" },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    state: { type: String, required: true, trim: true, maxlength: 120 },
    postalCode: { type: String, required: true, trim: true, maxlength: 24 },
    country: { type: String, required: true, trim: true, maxlength: 120 },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const userSchema = new Schema<IUser, UserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      required: true,
    },
    pastOrderIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Order" }],
      default: [],
      required: true,
    },
    savedShippingAddress: {
      type: shippingAddressSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.pre("save", async function onUserPreSave() {
  if (!this.isModified("password")) {
    return;
  }

  const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10);
  const normalizedSaltRounds = Number.isFinite(saltRounds) && saltRounds >= 8 ? saltRounds : 12;
  this.password = await bcrypt.hash(this.password, normalizedSaltRounds);
});

export const User =
  (globalThis as typeof globalThis & { UserModel?: UserModel }).UserModel ??
  model<IUser, UserModel>("User", userSchema);

(globalThis as typeof globalThis & { UserModel?: UserModel }).UserModel = User;