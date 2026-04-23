import http from "node:http";
import path from "node:path";
import "dotenv/config";
import express from "express";
import { app } from "./app.js";
import { connectToDatabase, disconnectFromDatabase } from "./config/database.js";
import { logger } from "./config/logger.js";
import { globalErrorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { initializeSocketServer } from "./realtime/socket.js";
import { checkoutRouter } from "./routes/checkout.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { orderRouter } from "./routes/order.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { variantRouter } from "./routes/variant.routes.js";
import { CronService } from "./services/CronService.js";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
const normalizedPort = Number.isFinite(port) && port > 0 ? port : 4000;

const server = http.createServer(app);
const cronService = new CronService();
initializeSocketServer(server);

app.use("/images", express.static(path.resolve(process.cwd(), "public/images")));
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/variants", variantRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/orders", orderRouter);
app.use(notFoundHandler);
app.use(globalErrorHandler);

async function startServer(): Promise<void> {
  await connectToDatabase();
  cronService.start();

  server.listen(normalizedPort, () => {
    logger.info(`Server listening on port ${normalizedPort}`);
  });
}

startServer().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info(`${signal} received. Closing HTTP server...`);
  cronService.stop();

  server.close(async (error) => {
    if (error) {
      logger.error("Error while closing HTTP server", error);
      process.exit(1);
    }

    try {
      await disconnectFromDatabase();
      logger.info("HTTP server closed gracefully.");
      process.exit(0);
    } catch (disconnectError) {
      logger.error("Error while disconnecting from MongoDB", disconnectError);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", reason);
  process.exit(1);
});
