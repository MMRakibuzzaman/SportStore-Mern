import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAppStore } from "../store/useAppStore.js";
import {
  emptyShippingForm,
  loadShippingForm,
  saveShippingForm,
  type ShippingFormState,
} from "../services/checkoutStorage.js";
import { fetchCurrentProfile, updateCurrentProfile } from "../services/account.js";

type ShippingFormErrors = Partial<Record<keyof ShippingFormState, string>>;

interface ReleaseStockResponse {
  success: boolean;
  data: {
    variantId: string;
    inventoryCount: number;
  };
}

export function Cart() {
  const shoppingCart = useAppStore((state) => state.shoppingCart);
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const updateCartQuantity = useAppStore((state) => state.updateCartQuantity);
  const setVariantInventoryCount = useAppStore((state) => state.setVariantInventoryCount);
  const [shippingForm, setShippingForm] = useState<ShippingFormState>(() => ({
    ...emptyShippingForm,
    ...loadShippingForm(),
  }));
  const [formErrors, setFormErrors] = useState<ShippingFormErrors>({});
  const [isAdjusting, setIsAdjusting] = useState<string | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);
  const [savedAddress, setSavedAddress] = useState<ShippingFormState | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [saveAddressError, setSaveAddressError] = useState<string | null>(null);
  const [saveAddressSuccess, setSaveAddressSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const cartTotal = shoppingCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const canCheckout = shoppingCart.length > 0;

  const isAddressComplete = useMemo(
    () =>
      Boolean(
        shippingForm.email.trim() &&
        shippingForm.streetLine1.trim() &&
        shippingForm.city.trim() &&
        shippingForm.state.trim() &&
        shippingForm.postalCode.trim() &&
        shippingForm.country.trim(),
      ),
    [shippingForm],
  );

  const addressNeedsSaving = useMemo(() => {
    if (!isAuthenticated || !isAddressComplete) {
      return false;
    }

    if (!savedAddress) {
      return true;
    }

    return JSON.stringify(savedAddress) !== JSON.stringify(shippingForm);
  }, [isAddressComplete, isAuthenticated, savedAddress, shippingForm]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedAddress(null);
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
          saveShippingForm(profile.savedShippingAddress);
          setSavedAddress(profile.savedShippingAddress);
        } else {
          setSavedAddress(null);
        }
      } catch {
        if (isMounted) {
          setSaveAddressError("Unable to load your saved address right now.");
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

  const handleFormChange = (field: keyof ShippingFormState) => (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    setShippingForm((current) => {
      const next = { ...current, [field]: event.target.value };
      saveShippingForm(next);
      setPromptDismissed(false);
      setSaveAddressSuccess(null);
      return next;
    });

    setFormErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateShippingForm = (): ShippingFormErrors => {
    const errors: ShippingFormErrors = {};

    if (!shippingForm.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(shippingForm.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!shippingForm.streetLine1.trim()) {
      errors.streetLine1 = "Street Address is required.";
    }

    if (!shippingForm.city.trim()) {
      errors.city = "City is required.";
    }

    if (!shippingForm.state.trim()) {
      errors.state = "State / Province is required.";
    }

    if (!shippingForm.postalCode.trim()) {
      errors.postalCode = "Postal Code is required.";
    }

    if (!shippingForm.country.trim()) {
      errors.country = "Country is required.";
    }

    return errors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!canCheckout) {
      return;
    }

    const validationErrors = validateShippingForm();

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    saveShippingForm(shippingForm);

    navigate("/checkout");
  };

  const handleSaveAddress = async (): Promise<void> => {
    if (!isAuthenticated || !isAddressComplete) {
      return;
    }

    try {
      setSaveAddressError(null);
      const updatedProfile = await updateCurrentProfile({ savedShippingAddress: shippingForm });
      if (updatedProfile.savedShippingAddress) {
        setSavedAddress(updatedProfile.savedShippingAddress);
        saveShippingForm(updatedProfile.savedShippingAddress);
      }
      setSaveAddressSuccess("Your permanent address has been saved.");
      setPromptDismissed(true);
    } catch (error) {
      setSaveAddressError(error instanceof Error ? error.message : "Could not save address.");
    }
  };

  const handleAdjustQuantity = async (
    variantId: string,
    requestedQuantity: number,
  ): Promise<void> => {
    const cartItem = shoppingCart.find((item) => item.variantId === variantId);

    if (!cartItem || isAdjusting === variantId) {
      return;
    }

    const targetQuantity = Number.isFinite(requestedQuantity)
      ? Math.max(0, Math.floor(requestedQuantity))
      : cartItem.quantity;

    if (targetQuantity === cartItem.quantity) {
      setQuantityDrafts((current) => {
        if (!(variantId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[variantId];
        return next;
      });
      return;
    }

    try {
      setIsAdjusting(variantId);

      if (targetQuantity === 0) {
        const response = await api.patch<ReleaseStockResponse>(
          `/products/variants/${variantId}/stock/release`,
          { units: cartItem.quantity },
        );

        setVariantInventoryCount(response.data.data.variantId, response.data.data.inventoryCount);
        removeFromCart(variantId);
        return;
      }

      if (targetQuantity > cartItem.quantity) {
        const delta = targetQuantity - cartItem.quantity;
        const response = await api.patch<ReleaseStockResponse>(
          `/products/variants/${variantId}/stock/decrease`,
          { units: delta },
        );

        setVariantInventoryCount(response.data.data.variantId, response.data.data.inventoryCount);
      } else {
        const delta = cartItem.quantity - targetQuantity;
        const response = await api.patch<ReleaseStockResponse>(
          `/products/variants/${variantId}/stock/release`,
          { units: delta },
        );

        setVariantInventoryCount(response.data.data.variantId, response.data.data.inventoryCount);
      }

      updateCartQuantity(variantId, targetQuantity);
    } finally {
      setQuantityDrafts((current) => {
        if (!(variantId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[variantId];
        return next;
      });
      setIsAdjusting(null);
    }
  };

  const handleQuantityInputChange = (variantId: string, value: string): void => {
    setQuantityDrafts((current) => ({ ...current, [variantId]: value }));
  };

  const resolveDisplayQuantity = (variantId: string, actualQuantity: number): string => {
    return quantityDrafts[variantId] ?? String(actualQuantity);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold text-white">Cart</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Review your order, confirm shipping details, and preview the final total before checkout.
        </p>
      </div>

      {shoppingCart.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 p-10 text-center text-slate-300">
          Your cart is empty.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.6fr)_minmax(0,1fr)]">
          <div className="order-2 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
                  Shipping Details
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Where should we deliver?</h2>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                Guest checkout ready
              </span>
            </div>

            {!isAuthenticated ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-slate-300">
                <p className="text-sm font-medium text-white">Please log in to continue checkout.</p>
                <p className="mt-2 text-sm text-slate-400">
                  Only logged-in users can access the shipping form and save addresses for future purchases.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/login");
                    }}
                    className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Log in
                  </button>
                </div>
              </div>
            ) : isLoadingProfile ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-slate-300">
                Loading your saved address...
              </div>
            ) : (
              <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-300">Email</span>
                  <input
                    type="email"
                    value={shippingForm.email}
                    onChange={handleFormChange("email")}
                    aria-invalid={Boolean(formErrors.email)}
                    className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${formErrors.email
                      ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                      : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                      }`}
                    placeholder="customer@example.com"
                  />
                  {formErrors.email ? (
                    <p className="text-xs text-red-300">{formErrors.email}</p>
                  ) : null}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-300">Street Address</span>
                  <input
                    type="text"
                    value={shippingForm.streetLine1}
                    onChange={handleFormChange("streetLine1")}
                    aria-invalid={Boolean(formErrors.streetLine1)}
                    className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${formErrors.streetLine1
                      ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                      : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                      }`}
                    placeholder="123 Market Street"
                  />
                  {formErrors.streetLine1 ? (
                    <p className="text-xs text-red-300">{formErrors.streetLine1}</p>
                  ) : null}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-300">Apartment, suite, etc.</span>
                  <input
                    type="text"
                    value={shippingForm.streetLine2}
                    onChange={handleFormChange("streetLine2")}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="Optional"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-300">City</span>
                  <input
                    type="text"
                    value={shippingForm.city}
                    onChange={handleFormChange("city")}
                    aria-invalid={Boolean(formErrors.city)}
                    className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${formErrors.city
                      ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                      : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                      }`}
                    placeholder="Austin"
                  />
                  {formErrors.city ? (
                    <p className="text-xs text-red-300">{formErrors.city}</p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-300">State / Province</span>
                  <input
                    type="text"
                    value={shippingForm.state}
                    onChange={handleFormChange("state")}
                    aria-invalid={Boolean(formErrors.state)}
                    className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${formErrors.state
                      ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                      : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                      }`}
                    placeholder="Texas"
                  />
                  {formErrors.state ? (
                    <p className="text-xs text-red-300">{formErrors.state}</p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-300">Postal Code</span>
                  <input
                    type="text"
                    value={shippingForm.postalCode}
                    onChange={handleFormChange("postalCode")}
                    aria-invalid={Boolean(formErrors.postalCode)}
                    className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${formErrors.postalCode
                      ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                      : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                      }`}
                    placeholder="78701"
                  />
                  {formErrors.postalCode ? (
                    <p className="text-xs text-red-300">{formErrors.postalCode}</p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-300">Country</span>
                  <input
                    type="text"
                    value={shippingForm.country}
                    onChange={handleFormChange("country")}
                    aria-invalid={Boolean(formErrors.country)}
                    className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:ring-2 ${formErrors.country
                      ? "border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20"
                      : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                      }`}
                    placeholder="United States"
                  />
                  {formErrors.country ? (
                    <p className="text-xs text-red-300">{formErrors.country}</p>
                  ) : null}
                </label>

                <div className="flex items-center justify-end gap-3 pt-2 md:col-span-2">
                  <button
                    type="submit"
                    disabled={!canCheckout}
                    className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${canCheckout
                      ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                      : "cursor-not-allowed bg-slate-700 text-slate-400"
                      }`}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </form>
            )}

            {isAuthenticated && isAddressComplete && addressNeedsSaving && !promptDismissed ? (
              <div className="fixed bottom-4 right-4 z-50 w-[320px] rounded-2xl border border-cyan-400/30 bg-slate-950/95 p-4 shadow-2xl shadow-slate-950/80 backdrop-blur">
                <p className="text-sm font-semibold text-white">Save this as your permanent address?</p>
                <p className="mt-2 text-xs text-slate-300">
                  You can reuse it next time without retyping.
                </p>
                {saveAddressError ? (
                  <p className="mt-2 text-xs text-red-300">{saveAddressError}</p>
                ) : null}
                {saveAddressSuccess ? (
                  <p className="mt-2 text-xs text-emerald-300">{saveAddressSuccess}</p>
                ) : null}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPromptDismissed(true);
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSaveAddress();
                    }}
                    className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Save Address
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="order-1 space-y-3 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white">Items in Order</h2>
            </div>

            <div className="space-y-2 pt-2">
              <div>
                {shoppingCart.map((item) => {
                  const itemDetails = [item.brand, item.size, item.color].filter(
                    (value) => value.trim() !== "-" && value.trim() !== "",
                  );
                  const detailsText = itemDetails.join(" - ") || "Product details unavailable";

                  const draftQuantity = resolveDisplayQuantity(
                    item.variantId,
                    item.quantity,
                  );
                  const isBusy = isAdjusting === item.variantId;

                  return (
                    <article
                      key={item.variantId}
                      className="mb-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div
                            className="relative block"
                            onMouseEnter={() => {
                              setHoveredVariantId(item.variantId);
                            }}
                            onMouseLeave={() => {
                              setHoveredVariantId((current) =>
                                current === item.variantId ? null : current,
                              );
                            }}
                          >
                            <p className="cursor-default break-words text-sm font-semibold leading-snug text-white">
                              {item.baseName}
                            </p>
                            {hoveredVariantId === item.variantId ? (
                              <div className="pointer-events-none absolute left-0 z-20 w-max max-w-[260px] rounded-lg border border-white/15 bg-slate-950/95 px-3 py-2 text-xs uppercase tracking-[0.12em] text-slate-200 shadow-lg shadow-slate-950/70 top-full mt-1 md:top-auto md:bottom-full md:mb-1 md:mt-0">
                                {detailsText}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="w-[112px]">
                          <label className="sr-only" htmlFor={`qty-${item.variantId}`}>
                            Quantity
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                void handleAdjustQuantity(item.variantId, item.quantity - 1);
                              }}
                              disabled={isBusy || item.quantity <= 0}
                              className="absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-md border border-white/15 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>

                            <input
                              id={`qty-${item.variantId}`}
                              type="number"
                              min={0}
                              step={1}
                              value={draftQuantity}
                              onChange={(event) => {
                                handleQuantityInputChange(item.variantId, event.target.value);
                              }}
                              onBlur={() => {
                                const parsed = Number.parseInt(
                                  resolveDisplayQuantity(item.variantId, item.quantity),
                                  10,
                                );
                                void handleAdjustQuantity(item.variantId, parsed);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  const parsed = Number.parseInt(
                                    resolveDisplayQuantity(item.variantId, item.quantity),
                                    10,
                                  );
                                  void handleAdjustQuantity(item.variantId, parsed);
                                }
                              }}
                              disabled={isBusy}
                              className="w-full rounded-lg border border-white/15 bg-slate-900/80 px-7 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-70"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                void handleAdjustQuantity(item.variantId, item.quantity + 1);
                              }}
                              disabled={isBusy}
                              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-md border border-white/15 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <p className="w-[88px] text-right text-sm font-semibold text-cyan-300">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <p className="text-sm font-medium text-slate-300">Total</p>
                <p className="text-base font-semibold text-cyan-300">${cartTotal.toFixed(2)}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}