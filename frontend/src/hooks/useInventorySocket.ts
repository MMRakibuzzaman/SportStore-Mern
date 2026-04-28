import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useAppStore } from "../store/useAppStore.js";

type InventoryDepletedPayload = {
  variantId: string;
};

type InventoryUpdatedPayload = {
  variantId: string;
  inventoryCount: number;
};

let socketConnection: Socket | null = null;

function getSocketUrl(): string {
  return import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";
}

export function useInventorySocket(): void {
  useEffect(() => {
    if (!socketConnection) {
      socketConnection = io(getSocketUrl(), {
        withCredentials: true,
        transports: ["websocket"],
      });
    }

    const handleInventoryDepleted = ({ variantId }: InventoryDepletedPayload): void => {
      useAppStore.getState().setVariantInventoryCount(variantId, 0);
    };

    const handleInventoryUpdated = ({ variantId, inventoryCount }: InventoryUpdatedPayload): void => {
      useAppStore.getState().setVariantInventoryCount(variantId, inventoryCount);
    };

    socketConnection.on("inventory_depleted", handleInventoryDepleted);
    socketConnection.on("inventory_updated", handleInventoryUpdated);

    return () => {
      socketConnection?.off("inventory_depleted", handleInventoryDepleted);
      socketConnection?.off("inventory_updated", handleInventoryUpdated);
    };
  }, []);
}
