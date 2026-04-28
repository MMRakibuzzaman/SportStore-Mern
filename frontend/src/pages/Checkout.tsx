import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";
import {
  calculateOrderTotal,
  loadShippingForm,
  saveInvoiceData,
  type CheckoutInvoiceData,
  type PaymentMethod,
} from "../services/checkoutStorage.js";
import { fetchCurrentProfile } from "../services/account.js";
import { createCheckoutOrder } from "../services/order.js";

export function Checkout() {
  const navigate = useNavigate();
  const shoppingCart = useAppStore((state) => state.shoppingCart);
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);
  const clearCart = useAppStore((state) => state.clearCart);
  const [shippingForm, setShippingForm] = useState(() => loadShippingForm());
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const orderTotal = useMemo(
    () => calculateOrderTotal(shoppingCart),
    [shoppingCart],
  );
  const totalQuantity = useMemo(
    () => shoppingCart.reduce((sum, item) => sum + item.quantity, 0),
    [shoppingCart],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isMounted = true;

    const loadProfile = async (): Promise<void> => {
      try {
        setIsLoadingProfile(true);
        const profile = await fetchCurrentProfile();

        if (!isMounted) {
          return;
        }

        if (profile.savedShippingAddress) {
          setShippingForm(profile.savedShippingAddress);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleConfirm = async (): Promise<void> => {
    if (!isAuthenticated) {
      setSubmitError("Please log in before confirming your order.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const createdOrder = await createCheckoutOrder({
        shippingAddress: shippingForm,
      });

      const invoiceData: CheckoutInvoiceData = {
        orderId: createdOrder.orderId,
        createdAt: createdOrder.createdAt,
        shippingForm,
        items: shoppingCart,
        paymentMethod: "cash_on_delivery" satisfies PaymentMethod,
        orderTotal: createdOrder.totalCost,
      };

      saveInvoiceData(invoiceData);
      await clearCart();
      navigate("/invoice");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to confirm checkout.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    navigate("/cart");
  };

  if (shoppingCart.length === 0) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8">
          <h1 className="text-3xl font-semibold text-white">Checkout</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Your cart is empty, so there is nothing to confirm yet.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Back to Cart
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold text-white">Checkout</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Review the items, shipping information, and payment method before
          confirming.
        </p>
        {!isAuthenticated ? (
          <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Log in to save this order to your account and view it in My Orders.
          </p>
        ) : null}
      </div>

      <div className="space-y-6">
        {isLoadingProfile ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
            Loading your saved address...
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
                Order Summary
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Items Purchased
              </h2>
            </div>

            <div className="text-right text-sm text-slate-400">
              <p>
                {shoppingCart.length} line item
                {shoppingCart.length === 1 ? "" : "s"}
              </p>
              <p>
                {totalQuantity} total unit{totalQuantity === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {shoppingCart.map((item) => (
              <article
                key={item.variantId}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {item.baseName}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">
                      SKU {item.sku}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-400">Quantity</p>
                    <p className="font-semibold text-white">x{item.quantity}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <p className="text-slate-300">
                    Unit: ${item.price.toFixed(2)}
                  </p>
                  <p className="font-semibold text-cyan-300">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-sm font-medium text-slate-300">Total</p>
            <p className="text-base font-semibold text-cyan-300">
              ${orderTotal.toFixed(2)}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
          <div className="border-b border-white/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Shipping Details
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Customer Information
            </h2>
          </div>

          <dl className="mt-4 grid gap-4 text-sm text-slate-300 md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Email
              </dt>
              <dd className="mt-1 text-slate-100">{shippingForm.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Street Address
              </dt>
              <dd className="mt-1 text-slate-100">
                {shippingForm.streetLine1}
              </dd>
            </div>
            {shippingForm.streetLine2 ? (
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Apartment, suite, etc.
                </dt>
                <dd className="mt-1 text-slate-100">
                  {shippingForm.streetLine2}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                City
              </dt>
              <dd className="mt-1 text-slate-100">{shippingForm.city}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                State / Province
              </dt>
              <dd className="mt-1 text-slate-100">{shippingForm.state}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Postal Code
              </dt>
              <dd className="mt-1 text-slate-100">{shippingForm.postalCode}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Country
              </dt>
              <dd className="mt-1 text-slate-100">{shippingForm.country}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
          <div className="border-b border-white/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Payment
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Choose Payment Method
            </h2>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4">
            <label className="flex cursor-default items-center gap-3 text-sm text-slate-200">
              <input
                type="radio"
                checked
                readOnly
                className="h-4 w-4 accent-cyan-400"
              />
              Cash on Delivery
            </label>
            <p className="mt-2 text-xs text-slate-400">
              Cash on Delivery is selected by default.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isAuthenticated || isSubmitting}
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-slate-950 transition ${
              !isAuthenticated || isSubmitting
                ? "cursor-not-allowed bg-cyan-400/40"
                : "bg-cyan-400 hover:bg-cyan-300"
            }`}
          >
            {isSubmitting ? "Confirming..." : "Confirm"}
          </button>
        </div>

        {submitError ? (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {submitError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
