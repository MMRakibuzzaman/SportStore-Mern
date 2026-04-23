import cron, { type ScheduledTask } from "node-cron";
import { Product } from "../models/product.model.js";
import { Variant } from "../models/variant.model.js";
import { logger } from "../config/logger.js";

interface LowStockVariant {
  variantId: string;
  sku: string;
  baseName: string;
  brand: string;
  inventoryCount: number;
}

export class CronService {
  private lowStockTask: ScheduledTask | null = null;

  start(): void {
    if (this.lowStockTask) {
      return;
    }

    this.lowStockTask = cron.schedule(
      "0 0 * * *",
      async () => {
        await this.runLowStockAlertJob();
      },
      {
        timezone: process.env.CRON_TIMEZONE ?? "UTC",
      },
    );

    logger.info("CronService started: low-stock scan scheduled for daily midnight.");
  }

  stop(): void {
    if (!this.lowStockTask) {
      return;
    }

    this.lowStockTask.stop();
    this.lowStockTask.destroy();
    this.lowStockTask = null;
    logger.info("CronService stopped.");
  }

  async runLowStockAlertJob(): Promise<void> {
    const lowStockVariants = await this.getLowStockVariants();

    if (lowStockVariants.length === 0) {
      logger.info("[Mock Email] Daily low-stock scan: no variants under threshold.");
      return;
    }

    const lines = lowStockVariants
      .map(
        (variant, index) =>
          `${index + 1}. SKU=${variant.sku} | Product=${variant.baseName} (${variant.brand}) | Inventory=${variant.inventoryCount}`,
      )
      .join("\n");

    logger.warn(
      [
        "[Mock Email] Daily low-stock inventory alert for store owner",
        `Found ${lowStockVariants.length} variant(s) with inventoryCount < 5:`,
        lines,
      ].join("\n"),
    );
  }

  private async getLowStockVariants(): Promise<LowStockVariant[]> {
    return Variant.aggregate<LowStockVariant>([
      {
        $match: {
          inventoryCount: { $lt: 5 },
        },
      },
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
        $project: {
          _id: 0,
          variantId: { $toString: "$_id" },
          sku: "$sku",
          baseName: "$product.baseName",
          brand: "$product.brand",
          inventoryCount: "$inventoryCount",
        },
      },
      {
        $sort: {
          inventoryCount: 1,
          sku: 1,
        },
      },
    ]).exec();
  }
}
