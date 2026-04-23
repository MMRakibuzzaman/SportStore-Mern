import "dotenv/config";
import { connectToDatabase, disconnectFromDatabase } from "../src/config/database.js";
import { Product } from "../src/models/product.model.js";
import { Variant } from "../src/models/variant.model.js";

interface SeedVariant {
  sku: string;
  size: string;
  color: string;
  weight: number;
  price: number;
  inventoryCount: number;
}

interface SeedProduct {
  baseName: string;
  brand: string;
  imageUrl: string;
  variants: SeedVariant[];
}

const seedCatalog: SeedProduct[] = [
  {
    baseName: "Apex Carbon Tennis Racket",
    brand: "SportStore Elite",
    imageUrl: "/images/seed-racket.jpg",
    variants: [
      {
        sku: "TEN-APEX-27-WHT",
        size: "27in",
        color: "White",
        weight: 0.31,
        price: 189.99,
        inventoryCount: 24,
      },
      {
        sku: "TEN-APEX-27-BLK",
        size: "27in",
        color: "Black",
        weight: 0.32,
        price: 194.99,
        inventoryCount: 18,
      },
    ],
  },
  {
    baseName: "Velocity Pro Running Shoe",
    brand: "SprintWorks",
    imageUrl: "/images/seed-shoe.jpg",
    variants: [
      {
        sku: "RUN-VEL-42-BLU",
        size: "42",
        color: "Blue",
        weight: 0.46,
        price: 129.99,
        inventoryCount: 36,
      },
      {
        sku: "RUN-VEL-43-RED",
        size: "43",
        color: "Red",
        weight: 0.47,
        price: 129.99,
        inventoryCount: 28,
      },
    ],
  },
  {
    baseName: "PowerGrip Training Gloves",
    brand: "IronPulse",
    imageUrl: "/images/seed-gloves.jpg",
    variants: [
      {
        sku: "FIT-PWR-M-BLK",
        size: "M",
        color: "Black",
        weight: 0.14,
        price: 39.99,
        inventoryCount: 52,
      },
      {
        sku: "FIT-PWR-L-GRY",
        size: "L",
        color: "Gray",
        weight: 0.15,
        price: 39.99,
        inventoryCount: 44,
      },
    ],
  },
  {
    baseName: "HydroFlex Yoga Mat",
    brand: "BalanceLab",
    imageUrl: "/images/seed-yogamat.jpg",
    variants: [
      {
        sku: "YOG-HYD-6MM-PUR",
        size: "6mm",
        color: "Purple",
        weight: 1.25,
        price: 59.99,
        inventoryCount: 30,
      },
      {
        sku: "YOG-HYD-8MM-TEA",
        size: "8mm",
        color: "Teal",
        weight: 1.42,
        price: 64.99,
        inventoryCount: 22,
      },
    ],
  },
  {
    baseName: "StormShield Football Helmet",
    brand: "GridForce",
    imageUrl: "/images/seed-helmet.jpg",
    variants: [
      {
        sku: "FB-STM-M-WHT",
        size: "M",
        color: "White",
        weight: 1.72,
        price: 219.99,
        inventoryCount: 12,
      },
      {
        sku: "FB-STM-L-BLK",
        size: "L",
        color: "Black",
        weight: 1.76,
        price: 219.99,
        inventoryCount: 10,
      },
    ],
  },
];

async function seedCatalogData(): Promise<void> {
  await connectToDatabase();

  // IMPORTANT: Before running npm run seed:catalog, manually place these five JPEG files in backend/public/images:
  // seed-racket.jpg, seed-shoe.jpg, seed-gloves.jpg, seed-yogamat.jpg, seed-helmet.jpg

  const productNames = seedCatalog.map((product) => product.baseName);
  const existingProductsCount = await Product.countDocuments({ baseName: { $in: productNames } }).exec();

  if (existingProductsCount > 0) {
    console.info("Catalog seed skipped: one or more seed products already exist.");
    return;
  }

  const now = new Date();
  const productDocuments = await Product.insertMany(
    seedCatalog.map((product) => ({
      baseName: product.baseName,
      brand: product.brand,
      imagePath: product.imageUrl,
      createdAt: now,
      updatedAt: now,
    })),
  );

  const variantDocuments = productDocuments.flatMap((productDocument, index) => {
    const productSeed = seedCatalog[index];

    return productSeed.variants.map((variant) => ({
      product: productDocument._id,
      sku: variant.sku,
      price: variant.price,
      size: variant.size,
      color: variant.color,
      weight: variant.weight,
      inventoryCount: variant.inventoryCount,
      createdAt: now,
      updatedAt: now,
    }));
  });

  await Variant.insertMany(variantDocuments);

  console.info(`Catalog seed completed: ${productDocuments.length} products and ${variantDocuments.length} variants inserted.`);
}

seedCatalogData()
  .then(async () => {
    await disconnectFromDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Catalog seed failed", error);

    try {
      await disconnectFromDatabase();
    } catch (disconnectError) {
      console.error("Failed to disconnect after catalog seed failure", disconnectError);
    }

    process.exit(1);
  });
