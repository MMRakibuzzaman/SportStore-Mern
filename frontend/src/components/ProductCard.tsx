import { useEffect, useMemo, useState, type ReactNode } from "react";
import placeholderIcon from "../assets/react.svg";
import { useAppStore } from "../store/useAppStore.js";

export interface ProductCardDetail {
  label: string;
  value: ReactNode;
}

interface ProductCardProps {
  variantId: string;
  productName: string;
  brand: string;
  price: number;
  imageUrl: string;
  inventoryCount?: number;
  details?: ProductCardDetail[];
  actions?: ReactNode;
  onAddToCart?: (variantId: string) => void;
}

export function ProductCard({
  variantId,
  productName,
  brand,
  price,
  imageUrl,
  inventoryCount: inventoryCountOverride,
  details,
  actions,
  onAddToCart,
}: ProductCardProps) {
  const inventoryCount = useAppStore(
    (state) => state.displayedProducts.find((product) => product.variantId === variantId)?.inventoryCount ?? 0,
  );
  const effectiveInventoryCount = inventoryCountOverride ?? inventoryCount;

  const backendBaseUrl = useMemo(() => {
    const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

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

    if (/^(https?:)?\/\//.test(imageUrl) || imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
      return imageUrl;
    }

    const normalizedRelativePath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${backendBaseUrl}${normalizedRelativePath}`;
  }, [backendBaseUrl, imageUrl]);

  const [currentImageSrc, setCurrentImageSrc] = useState<string>(resolvedImageSrc);

  useEffect(() => {
    setCurrentImageSrc(resolvedImageSrc);
  }, [resolvedImageSrc]);

  const isOutOfStock = effectiveInventoryCount === 0;

  const handleAddToCart = (): void => {
    if (isOutOfStock) {
      return;
    }

    onAddToCart?.(variantId);
  };

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
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${isOutOfStock ? "bg-slate-700 text-slate-200" : "bg-emerald-400/20 text-emerald-200"
            }`}
        >
          {isOutOfStock ? "Out" : `${effectiveInventoryCount} left`}
        </span>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{brand}</p>
            <h3 className="mt-1 text-lg font-semibold text-white md:text-xl">{productName}</h3>
          </div>

          <p className="shrink-0 text-sm font-semibold text-cyan-300">${price.toFixed(2)}</p>
        </div>

        {details && details.length > 0 ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label} className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {detail.label}
                </dt>
                <dd className="mt-1 text-sm text-slate-100">{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-sm text-slate-300">
            Inventory <span className="font-semibold text-white">{effectiveInventoryCount}</span>
          </p>

          {actions ?? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${isOutOfStock
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
