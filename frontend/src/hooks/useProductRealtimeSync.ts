import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

type CatalogChangedPayload = {
  action: "created" | "updated" | "deleted";
  entity: "product" | "variant";
  id: string;
  productId?: string;
};

let realtimeSocket: Socket | null = null;

function resolveSocketBaseUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

  if (/^https?:\/\//.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, "");
  }

  return "http://localhost:4000";
}

export function useProductRealtimeSync(
  onRefresh: () => void | Promise<void>,
  listenToInventoryEvents = true,
): void {
  useEffect(() => {
    if (!realtimeSocket) {
      realtimeSocket = io(resolveSocketBaseUrl(), {
        path: "/socket.io",
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ["websocket", "polling"],
      });
    }

    const triggerRefresh = (_payload?: CatalogChangedPayload): void => {
      void onRefresh();
    };

    realtimeSocket.on("catalog_changed", triggerRefresh);

    if (listenToInventoryEvents) {
      realtimeSocket.on("inventory_updated", triggerRefresh);
      realtimeSocket.on("inventory_depleted", triggerRefresh);
    }

    return () => {
      realtimeSocket?.off("catalog_changed", triggerRefresh);

      if (listenToInventoryEvents) {
        realtimeSocket?.off("inventory_updated", triggerRefresh);
        realtimeSocket?.off("inventory_depleted", triggerRefresh);
      }
    };
  }, [listenToInventoryEvents, onRefresh]);
}