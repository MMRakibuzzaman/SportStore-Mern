import type http from "node:http";
import { Server } from "socket.io";

let io: Server | null = null;

export function initializeSocketServer(server: http.Server): Server {
  const envAllowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultDevOrigins = process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175", "http://127.0.0.1:5175"];

  const allowedOrigins = new Set([...defaultDevOrigins, ...envAllowedOrigins]);

  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Socket.IO CORS policy: origin not allowed"));
      },
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.info(`Socket client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function emitInventoryDepleted(variantId: string): void {
  io?.emit("inventory_depleted", { variantId });
}

export function emitInventoryUpdated(variantId: string, inventoryCount: number): void {
  io?.emit("inventory_updated", { variantId, inventoryCount });
}

export function emitCartUpdated(userId: string, cartData: unknown): void {
  io?.emit(`cart:${userId}:updated`, cartData);
}

export function emitCartItemAdded(userId: string, itemData: unknown): void {
  io?.emit(`cart:${userId}:item_added`, itemData);
}

export function emitCartItemRemoved(userId: string, variantId: string): void {
  io?.emit(`cart:${userId}:item_removed`, { variantId });
}

export function emitCartCleared(userId: string): void {
  io?.emit(`cart:${userId}:cleared`);
}