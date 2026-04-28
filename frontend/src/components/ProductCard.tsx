import { useEffect, useMemo, useState, type ReactNode } from "react";
import placeholderIcon from "../assets/react.svg";
import { useAppStore } from "../store/useAppStore.js";

export interface ProductCardDetail {
  label: string;
  value: ReactNode;
}

export interface VariantOption {
  id: string;
  sku: string;
  price: number;
  inventoryCount: number;
  attributes: Record<string, string | number | boolean | null>;
}

interface ProductCardProps {
  variantId: string;
  productName: string;
  brand: string;
  price: number;
  imageUrl: string;
  inventoryCount?: number;
  details?: ProductCardDetail[];
  getDetailsForVariant?: (variant: VariantOption | null) => ProductCardDetail[];
  actions?: ReactNode;
  variants?: VariantOption[];
  onAddToCart?: (variantId: string) => void;
  onVariantChange?: (variant: VariantOption) => void;
}

export function ProductCard({
  variantId,
  productName,
  brand,
  price: initialPrice,
  imageUrl,
  inventoryCount: inventoryCountOverride,
  details: initialDetails,
  getDetailsForVariant,
  actions,
  variants,
  onAddToCart,
  onVariantChange,
}: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<VariantOption | null>(
    variants ? (variants[0] ?? null) : null,
  );

  const currentVariant = selectedVariant || (variants ? variants[0] : null);
  const effectivePrice = currentVariant?.price ?? initialPrice;
  const effectiveInventoryCount =
    currentVariant?.inventoryCount ?? inventoryCountOverride ?? 0;
  const effectiveVariantId = currentVariant?.id ?? variantId;

  useEffect(() => {
    if (variants && variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }
  }, [variants, selectedVariant]);

  const liveInventoryCount = useAppStore(
    (state) =>
      state.displayedProducts.find(
        (product) => product.variantId === effectiveVariantId,
      )?.inventoryCount,
  );
  const effectiveInventoryCountFromStore =
    liveInventoryCount ?? effectiveInventoryCount;

  const backendBaseUrl = useMemo(() => {
    const configuredApiBaseUrl =
      import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

    if (/^https?:\/\//.test(configuredApiBaseUrl)) {
      return configuredApiBaseUrl.replace(/\/api\/?$/, "");
    }

    if (configuredApiBaseUrl.startsWith("/")) {
      return "http://localhost:4000";
    }

    return "http://localhost:4000";
  }, []);

  const resolvedImageSrc = useMemo(() => {
    if (!imageUrl) {
      return placeholderIcon;
    }

    if (
      /^(https?:)?\/\//.test(imageUrl) ||
      imageUrl.startsWith("data:") ||
      imageUrl.startsWith("blob:")
    ) {
      return imageUrl;
    }

    const normalizedRelativePath = imageUrl.startsWith("/")
      ? imageUrl
      : `/${imageUrl}`;
    return `${backendBaseUrl}${normalizedRelativePath}`;
  }, [backendBaseUrl, imageUrl]);

  const [currentImageSrc, setCurrentImageSrc] =
    useState<string>(resolvedImageSrc);

  useEffect(() => {
    setCurrentImageSrc(resolvedImageSrc);
  }, [resolvedImageSrc]);

  const isOutOfStock = effectiveInventoryCountFromStore === 0;

  const handleVariantChange = (newVariant: VariantOption): void => {
    setSelectedVariant(newVariant);
    onVariantChange?.(newVariant);
  };

  const handleAddToCart = (): void => {
    if (isOutOfStock) {
      return;
    }

    onAddToCart?.(effectiveVariantId);
  };

  const resolvedDetails =
    getDetailsForVariant?.(currentVariant) ?? initialDetails ?? [];

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-lg shadow-slate-950/30 backdrop-blur-sm">
      <div className="relative overflow-hidden">
        <img
          src={currentImageSrc}
          alt={productName}
          onError={(event) => {
            if (event.currentTarget.src !== placeholderIcon) {
              setCurrentImageSrc(placeholderIcon);
            }
          }}
          className={`h-44 w-full object-cover transition duration-300 md:h-48 ${isOutOfStock ? "grayscale" : "group-hover:scale-[1.03]"}`}
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
            isOutOfStock
              ? "bg-slate-700 text-slate-200"
              : "bg-emerald-400/20 text-emerald-200"
          }`}
        >
          {isOutOfStock ? "Out" : `${effectiveInventoryCountFromStore} left`}
        </span>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {brand}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white md:text-xl">
              {productName}
            </h3>
          </div>

          <p className="shrink-0 text-sm font-semibold text-cyan-300">
            ${effectivePrice.toFixed(2)}
          </p>
        </div>

        {variants && variants.length > 1 ? (
          <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
            <label className="flex min-w-0 items-center justify-between gap-2">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Select Variant
              </span>
              <select
                value={selectedVariant?.id ?? ""}
                onChange={(e) => {
                  const selected = variants.find(
                    (v) => v.id === e.target.value,
                  );
                  if (selected) {
                    handleVariantChange(selected);
                  }
                }}
                className="max-w-[10rem] min-w-0 rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                title={selectedVariant?.sku ?? ""}
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.sku}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {resolvedDetails.length > 0 ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            {resolvedDetails.map((detail) => (
              <div
                key={detail.label}
                className="min-w-0 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {detail.label}
                </dt>
                <dd className="mt-1 break-words text-sm text-slate-100">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-sm text-slate-300">
            Inventory{" "}
            <span className="font-semibold text-white">
              {effectiveInventoryCountFromStore}
            </span>
          </p>

          {actions ?? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                isOutOfStock
                  ? "pointer-events-none cursor-not-allowed bg-slate-600 text-slate-300"
                  : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              }`}
            >
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
