import mongoose from "mongoose";
import { Variant } from "../models/variant.model.js";

async function ensureVariantIndexes(): Promise<void> {
  try {
    let existingIndexes: Array<{ name?: string; unique?: boolean }> = [];

    try {
      existingIndexes = await Variant.collection.indexes();
    } catch (error) {
      const mongoError = error as { code?: number; codeName?: string } | null;

      if (
        !mongoError ||
        mongoError.code !== 26 ||
        mongoError.codeName !== "NamespaceNotFound"
      ) {
        throw error;
      }
    }

    const hasLegacySkuUniqueIndex = existingIndexes.some(
      (index) => index.name === "sku_1" && index.unique === true,
    );

    if (hasLegacySkuUniqueIndex) {
      await Variant.collection.dropIndex("sku_1");
      console.info("Dropped legacy variants.sku_1 unique index.");
    }

    await Variant.collection.createIndex(
      { product: 1, sku: 1 },
      { unique: true, name: "product_1_sku_1" },
    );
  } catch (error) {
    console.error("Failed to ensure variant indexes", error);
    throw error;
  }
}

export async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  mongoose.connection.on("connected", () => {
    console.info("MongoDB connection established.");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB connection disconnected.");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error", error);
  });

  await mongoose.connect(mongoUri);
  await ensureVariantIndexes();
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}