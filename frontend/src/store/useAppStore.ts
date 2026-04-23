import { create } from "zustand";
import { api } from "../services/api.js";
import type { LoginPayload } from "../validation/auth.validation.js";

export type UserRole = "customer" | "admin";

export interface AuthUser {
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

interface AppState {
  auth: AuthSlice;
  shoppingCart: CartItem[];
  displayedProducts: DisplayedProduct[];
  loginUser: (payload: LoginPayload) => Promise<AuthUser>;
  logoutUser: () => void;
  setAuthUser: (user: AuthUser | null) => void;
  setDisplayedProducts: (products: DisplayedProduct[]) => void;
  clearDisplayedProducts: () => void;
  setVariantInventoryCount: (variantId: string, inventoryCount: number) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  updateCartQuantity: (variantId: string, quantity: number) => void;
}

const AUTH_STORAGE_KEY = "sportstore.auth";
const CART_STORAGE_KEY = "sportstore.cart";
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
      typeof parsed.user.email === "string" &&
      (parsed.user.role === "customer" || parsed.user.role === "admin")
    ) {
      return {
        user: {
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

function getInitialCartState(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(CART_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is CartItem =>
          item &&
          typeof item === "object" &&
          typeof (item as CartItem).variantId === "string" &&
          typeof (item as CartItem).quantity === "number",
      );
    }
  } catch {
    // Ignore malformed persisted cart state and reset to a clean default.
  }

  return [];
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

function persistCartState(cart: CartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
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
  // Listen for storage events (cart changes from other tabs/windows)
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === CART_STORAGE_KEY) {
        if (!event.newValue) {
          set({ shoppingCart: [] });
          return;
        }

        try {
          const parsed = JSON.parse(event.newValue) as unknown;

          if (Array.isArray(parsed)) {
            const newCart = parsed.filter(
              (item): item is CartItem =>
                item &&
                typeof item === "object" &&
                typeof (item as CartItem).variantId === "string" &&
                typeof (item as CartItem).quantity === "number",
            );

            set({ shoppingCart: newCart });
          }
        } catch {
          // Ignore malformed cart data
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
    shoppingCart: getInitialCartState(),
    displayedProducts: [],
    loginUser: async (payload) => {
      const response = await api.post<LoginResponse>("/auth/login", payload);

      const nextUser: AuthUser = {
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
    addToCart: (item) =>
      set((state) => {
        const existingItemIndex = state.shoppingCart.findIndex(
          (cartItem) => cartItem.variantId === item.variantId,
        );

        let updatedCart: CartItem[];

        if (existingItemIndex === -1) {
          updatedCart = [...state.shoppingCart, item];
        } else {
          updatedCart = [...state.shoppingCart];
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            quantity: updatedCart[existingItemIndex].quantity + item.quantity,
          };
        }

        persistCartState(updatedCart);
        return { shoppingCart: updatedCart };
      }),
    removeFromCart: (variantId) =>
      set((state) => {
        const updatedCart = state.shoppingCart.filter(
          (item) => item.variantId !== variantId,
        );
        persistCartState(updatedCart);
        return { shoppingCart: updatedCart };
      }),
    clearCart: () => {
      persistCartState([]);
      set({ shoppingCart: [] });
    },
    updateCartQuantity: (variantId, quantity) =>
      set((state) => {
        const updatedCart = state.shoppingCart.map((item) =>
          item.variantId === variantId ? { ...item, quantity } : item,
        );
        persistCartState(updatedCart);
        return { shoppingCart: updatedCart };
      }),
  };
});
