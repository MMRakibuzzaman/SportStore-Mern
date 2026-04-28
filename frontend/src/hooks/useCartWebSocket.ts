import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useAppStore, type CartDto } from "../store/useAppStore.js";

let socket: Socket | null = null;

function resolveSocketBaseUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

  if (/^https?:\/\//.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, "");
  }

  return "http://localhost:4000";
}

export function useCartWebSocket(): void {
  const setShoppingCart = useAppStore((state) => state.setShoppingCart);
  const userId = useAppStore((state) => state.auth.user?.id);

  useEffect(() => {
    if (!userId) {
      return;
    }

    // Initialize socket connection if not already done
    if (!socket || !socket.connected) {
      socket = io(resolveSocketBaseUrl(), {
        path: "/socket.io",
        withCredentials: true,
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });
    }

    // Listen for cart updates
    const handleCartUpdated = (cart: CartDto) => {
      setShoppingCart(cart.items);
    };

    const handleCartCleared = () => {
      setShoppingCart([]);
    };

    socket.on(`cart:${userId}:updated`, handleCartUpdated);
    socket.on(`cart:${userId}:cleared`, handleCartCleared);

    return () => {
      socket?.off(`cart:${userId}:updated`, handleCartUpdated);
      socket?.off(`cart:${userId}:cleared`, handleCartCleared);
    };
  }, [userId, setShoppingCart]);
}
