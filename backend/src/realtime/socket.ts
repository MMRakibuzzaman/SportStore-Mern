import type http from "node:http";
import { Server } from "socket.io";

let io: Server | null = null;

export function initializeSocketServer(server: http.Server): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [],
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