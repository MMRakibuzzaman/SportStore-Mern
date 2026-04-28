import { create } from "zustand";
import { api } from "../services/api.js";
import type { LoginPayload } from "../validation/auth.validation.js";

export type UserRole = "customer" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthSlice {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

interface LoginResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface DisplayedProduct {
  productId: string;
  variantId: string;
  baseName: string;
  brand: string;
  price: number;
  sku: string;
  size: string;
  color: string;
  weight: number;
  inventoryCount: number;
}

export interface CartItem extends DisplayedProduct {
  quantity: number;
}

export interface CartDto {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
}

interface AppState {
  auth: AuthSlice;
  shoppingCart: CartItem[];
  displayedProducts: DisplayedProduct[];
  isLoadingCart: boolean;
  loginUser: (payload: LoginPayload) => Promise<AuthUser>;
  logoutUser: () => void;
  setAuthUser: (user: AuthUser | null) => void;
  setDisplayedProducts: (products: DisplayedProduct[]) => void;
  clearDisplayedProducts: () => void;
  setVariantInventoryCount: (variantId: string, inventoryCount: number) => void;
  loadCart: () => Promise<void>;
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity: number }) => Promise<CartDto>;
  removeFromCart: (variantId: string) => Promise<CartDto>;
  clearCart: () => Promise<CartDto>;
  updateCartQuantity: (variantId: string, quantity: number) => Promise<CartDto>;
  setShoppingCart: (cart: CartItem[]) => void;
}

const AUTH_STORAGE_KEY = "sportstore.auth";
const INVENTORY_STORAGE_KEY = "sportstore.inventory";

interface PersistedInventoryUpdate {
  variantId: string;
  inventoryCount: number;
  updatedAt: number;
}

function getInitialAuthState(): AuthSlice {
  if (typeof window === "undefined") {
    return { user: null, isAuthenticated: false };
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return { user: null, isAuthenticated: false };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSlice>;

    if (
      parsed.user &&
      typeof parsed.user.id === "string" &&
      typeof parsed.user.email === "string" &&
      (parsed.user.role === "customer" || parsed.user.role === "admin")
    ) {
      return {
        user: {
          id: parsed.user.id,
          email: parsed.user.email,
          role: parsed.user.role,
        },
        isAuthenticated: true,
      };
    }
  } catch {
    // Ignore malformed persisted auth state and reset to a clean default.
  }

  return { user: null, isAuthenticated: false };
}

function persistAuthState(auth: AuthSlice): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!auth.user || !auth.isAuthenticated) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function persistInventoryUpdate(variantId: string, inventoryCount: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PersistedInventoryUpdate = {
    variantId,
    inventoryCount,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(payload));
}

export const useAppStore = create<AppState>((set) => {
  // Listen for storage events (auth changes from other tabs/windows)
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === AUTH_STORAGE_KEY) {
        if (!event.newValue) {
          set({ auth: { user: null, isAuthenticated: false } });
          return;
        }

        try {
          const parsed = JSON.parse(event.newValue) as Partial<AuthSlice>;

          if (
            parsed.user &&
            typeof parsed.user.id === "string" &&
            typeof parsed.user.email === "string" &&
            (parsed.user.role === "customer" || parsed.user.role === "admin")
          ) {
            set({
              auth: {
                user: {
                  id: parsed.user.id,
                  email: parsed.user.email,
                  role: parsed.user.role,
                },
                isAuthenticated: true,
              },
            });
          }
        } catch {
          // Ignore malformed auth data
        }

        return;
      }

      if (event.key === INVENTORY_STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as Partial<PersistedInventoryUpdate>;

          if (
            typeof parsed.variantId === "string" &&
            typeof parsed.inventoryCount === "number"
          ) {
            set((state) => ({
              displayedProducts: state.displayedProducts.map((product) =>
                product.variantId === parsed.variantId
                  ? { ...product, inventoryCount: parsed.inventoryCount as number }
                  : product,
              ),
              shoppingCart: state.shoppingCart.map((item) =>
                item.variantId === parsed.variantId
                  ? { ...item, inventoryCount: parsed.inventoryCount as number }
                  : item,
              ),
            }));
          }
        } catch {
          // Ignore malformed inventory payload
        }
      }
    });
  }

  return {
    auth: getInitialAuthState(),
    shoppingCart: [],
    displayedProducts: [],
    isLoadingCart: false,
    loginUser: async (payload) => {
      const response = await api.post<LoginResponse>("/auth/login", payload);

      const nextUser: AuthUser = {
        id: response.data.data.id,
        email: response.data.data.email,
        role: response.data.data.role,
      };

      const nextAuthState: AuthSlice = {
        user: nextUser,
        isAuthenticated: true,
      };

      persistAuthState(nextAuthState);
      set({ auth: nextAuthState });
      return nextUser;
    },
    logoutUser: () => {
      const nextAuthState: AuthSlice = {
        user: null,
        isAuthenticated: false,
      };

      persistAuthState(nextAuthState);
      set({ auth: nextAuthState });
    },
    setAuthUser: (user) => {
      const nextAuthState: AuthSlice = {
        user,
        isAuthenticated: Boolean(user),
      };

      persistAuthState(nextAuthState);
      set({ auth: nextAuthState });
    },
    setDisplayedProducts: (products) => set({ displayedProducts: products }),
    clearDisplayedProducts: () => set({ displayedProducts: [] }),
    setVariantInventoryCount: (variantId, inventoryCount) =>
      set((state) => {
        persistInventoryUpdate(variantId, inventoryCount);

        return {
          displayedProducts: state.displayedProducts.map((product) =>
            product.variantId === variantId ? { ...product, inventoryCount } : product,
          ),
          shoppingCart: state.shoppingCart.map((item) =>
            item.variantId === variantId ? { ...item, inventoryCount } : item,
          ),
        };
      }),
    loadCart: async () => {
      try {
        set({ isLoadingCart: true });
        const response = await api.get<{ success: boolean; data: CartDto }>("/cart");
        set({ shoppingCart: response.data.data.items });
      } catch (error) {
        console.error("Failed to load cart", error);
      } finally {
        set({ isLoadingCart: false });
      }
    },
    addToCart: async (item) => {
      try {
        const response = await api.post<{ success: boolean; data: CartDto }>("/cart/add", {
          variantId: item.variantId,
          quantity: item.quantity,
        });
        set({ shoppingCart: response.data.data.items });
        return response.data.data;
      } catch (error) {
        console.error("Failed to add to cart", error);
        throw error;
      }
    },
    removeFromCart: async (variantId) => {
      try {
        const response = await api.delete<{ success: boolean; data: CartDto }>(
          `/cart/${variantId}`,
        );
        set({ shoppingCart: response.data.data.items });
        return response.data.data;
      } catch (error) {
        console.error("Failed to remove from cart", error);
        throw error;
      }
    },
    clearCart: async () => {
      try {
        const response = await api.delete<{ success: boolean; data: CartDto }>("/cart");
        set({ shoppingCart: [] });
        return response.data.data;
      } catch (error) {
        console.error("Failed to clear cart", error);
        throw error;
      }
    },
    updateCartQuantity: async (variantId, quantity) => {
      try {
        const response = await api.patch<{ success: boolean; data: CartDto }>(
          `/cart/${variantId}`,
          { quantity },
        );
        set({ shoppingCart: response.data.data.items });
        return response.data.data;
      } catch (error) {
        console.error("Failed to update cart item", error);
        throw error;
      }
    },
    setShoppingCart: (cart) => set({ shoppingCart: cart }),
  };
});
