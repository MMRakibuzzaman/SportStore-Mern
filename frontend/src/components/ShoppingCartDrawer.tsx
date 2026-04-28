import { useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore.js";

interface ShoppingCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout?: () => void;
}

export function ShoppingCartDrawer({
  isOpen,
  onClose,
  onProceedToCheckout,
}: ShoppingCartDrawerProps) {
  const shoppingCart = useAppStore((state) => state.shoppingCart);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const updateCartQuantity = useAppStore((state) => state.updateCartQuantity);
  const [isAdjusting, setIsAdjusting] = useState<string | null>(null);

  const cartTotal = useMemo(
    () =>
      shoppingCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [shoppingCart],
  );

  const isCheckoutDisabled = shoppingCart.length === 0;

  const handleProceedToCheckout = (): void => {
    if (isCheckoutDisabled) {
      return;
    }

    onProceedToCheckout?.();
  };

  const handleRemoveOne = async (variantId: string): Promise<void> => {
    const cartItem = shoppingCart.find((item) => item.variantId === variantId);

    if (!cartItem || isAdjusting === variantId) {
      return;
    }

    try {
      setIsAdjusting(variantId);

      if (cartItem.quantity <= 1) {
        await removeFromCart(variantId);
        return;
      }

      await updateCartQuantity(variantId, cartItem.quantity - 1);
    } finally {
      setIsAdjusting(null);
    }
  };

  const handleRemoveAll = async (variantId: string): Promise<void> => {
    const cartItem = shoppingCart.find((item) => item.variantId === variantId);

    if (!cartItem || cartItem.quantity <= 0 || isAdjusting === variantId) {
      return;
    }

    try {
      setIsAdjusting(variantId);
      await removeFromCart(variantId);
    } finally {
      setIsAdjusting(null);
    }
  };

  return (
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        aria-label="Shopping cart"
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-white/10 bg-slate-900/95 shadow-2xl shadow-slate-950/60 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Cart
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Shopping Cart
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {shoppingCart.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/20 p-5 text-sm text-slate-300">
              Your cart is empty.
            </p>
          ) : (
            shoppingCart.map((item) => {
              return (
                <article
                  key={item.variantId}
                  className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.baseName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">
                        {item.brand} - {item.size} - {item.color}
                      </p>
                      <p className="mt-2 text-sm text-cyan-300">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void handleRemoveOne(item.variantId);
                        }}
                        disabled={isAdjusting === item.variantId}
                        className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                      >
                        {isAdjusting === item.variantId
                          ? "Updating..."
                          : "Remove One"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleRemoveAll(item.variantId);
                        }}
                        disabled={isAdjusting === item.variantId}
                        className="rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/20"
                      >
                        {isAdjusting === item.variantId
                          ? "Updating..."
                          : "Remove All"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <p className="text-slate-300">Qty: {item.quantity}</p>
                    <p className="text-slate-300">In cart</p>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <footer className="space-y-4 border-t border-white/10 p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-lg font-semibold text-white">
              ${cartTotal.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={isCheckoutDisabled}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
              isCheckoutDisabled
                ? "pointer-events-none cursor-not-allowed bg-slate-700 text-slate-400"
                : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            }`}
          >
            Proceed to Checkout
          </button>
        </footer>
      </aside>
    </>
  );
}
