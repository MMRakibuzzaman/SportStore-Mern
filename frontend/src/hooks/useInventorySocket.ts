import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useAppStore } from "../store/useAppStore.js";

type InventoryDepletedPayload = {
  variantId: string;
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

    socketConnection.on("inventory_depleted", handleInventoryDepleted);

    return () => {
      socketConnection?.off("inventory_depleted", handleInventoryDepleted);
    };
  }, []);
}
