import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { FilterSidebar } from "../components/FilterSidebar.js";
import type { ProductCardDetail } from "../components/ProductCard.js";
import { ProductCard } from "../components/ProductCard.js";
import { api } from "../services/api.js";
import { useAppStore, type DisplayedProduct } from "../store/useAppStore.js";

interface BackendCatalogItem {
  product: {
    _id: string;
    baseName: string;
    brand: string;
    imagePath?: string;
  };
  variant: {
    _id: string;
    sku: string;
    price: number;
    attributes: Record<string, string | number | boolean | null>;
    weight: number;
    inventoryCount: number;
  };
}

interface BackendCatalogResponse {
  success: boolean;
  data: BackendCatalogItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CatalogCard extends DisplayedProduct {
  imageUrl: string;
  attributes: Record<string, string | number | boolean | null>;
  hasUploadedImage: boolean;
}

interface ReserveStockResponse {
  success: boolean;
  data: {
    variantId: string;
    inventoryCount: number;
  };
}

const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

function normalizeSearchParams(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPlaceholderImage(title: string, subtitle: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" rx="36" fill="url(#g)" />
      <circle cx="560" cy="66" r="110" fill="rgba(34,197,94,0.22)" />
      <circle cx="98" cy="320" r="150" fill="rgba(56,189,248,0.18)" />
      <text x="48" y="168" fill="#e2e8f0" font-size="40" font-family="Inter, Arial, sans-serif" font-weight="700">
        ${escapeXml(title)}
      </text>
      <text x="48" y="212" fill="#94a3b8" font-size="22" font-family="Inter, Arial, sans-serif">
        ${escapeXml(subtitle)}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function mapToCatalogCard(item: BackendCatalogItem): CatalogCard {
  const fallbackImage = buildPlaceholderImage(item.product.baseName, item.product.brand);
  const derivedSize =
    item.variant.attributes.size ??
    item.variant.attributes.shoeSize ??
    item.variant.attributes.gripSize ??
    "-";
  const derivedColor = item.variant.attributes.color ?? "-";

  return {
    productId: item.product._id,
    variantId: item.variant._id,
    baseName: item.product.baseName,
    brand: item.product.brand,
    price: item.variant.price,
    sku: item.variant.sku,
    size: String(derivedSize),
    color: String(derivedColor),
    weight: item.variant.weight,
    inventoryCount: item.variant.inventoryCount,
    imageUrl: item.product.imagePath ?? fallbackImage,
    attributes: item.variant.attributes,
    hasUploadedImage: Boolean(item.product.imagePath),
  };
}

function toTitleCase(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAttributeValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function buildCatalogCardDetails(item: CatalogCard): ProductCardDetail[] {
  const details: ProductCardDetail[] = [
    { label: "Primary SKU", value: item.sku },
    { label: "Weight", value: `${item.weight} kg` },
    { label: "Image", value: item.hasUploadedImage ? "Uploaded" : "Generated" },
  ];

  const preferredAttributes = ["size", "shoeSize", "gripSize", "color"];
  const includedKeys = new Set<string>();

  preferredAttributes.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(item.attributes, key)) {
      details.push({
        label: toTitleCase(key),
        value: formatAttributeValue(item.attributes[key]),
      });
      includedKeys.add(key);
    }
  });

  Object.entries(item.attributes).forEach(([key, value]) => {
    if (includedKeys.has(key)) {
      return;
    }

    details.push({
      label: toTitleCase(key),
      value: formatAttributeValue(value),
    });
  });

  return details;
}

function CatalogSkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl shadow-slate-950/30"
        >
          <div className="h-60 w-full animate-pulse bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800" />
          <div className="space-y-4 p-5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-700" />
            <div className="h-6 w-4/5 animate-pulse rounded-full bg-slate-700" />
            <div className="h-4 w-20 animate-pulse rounded-full bg-slate-700" />
            <div className="h-4 w-full animate-pulse rounded-full bg-slate-700" />
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-700" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogCards, setCatalogCards] = useState<CatalogCard[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setDisplayedProducts = useAppStore((state) => state.setDisplayedProducts);
  const setVariantInventoryCount = useAppStore((state) => state.setVariantInventoryCount);
  const addToCart = useAppStore((state) => state.addToCart);
  const navigate = useNavigate();

  const selectedCategories = useMemo(
    () => normalizeSearchParams(searchParams.getAll("category")),
    [searchParams],
  );

  const activeFilterCount = selectedCategories.length;

  const buildNextParams = (next: {
    categories?: string[];
  }): URLSearchParams => {
    const nextParams = new URLSearchParams();
    const categories = next.categories ?? selectedCategories;

    categories.forEach((value) => nextParams.append("category", value));

    return nextParams;
  };

  const handleToggleCategory = (category: string): void => {
    const nextCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((value) => value !== category)
      : [...selectedCategories, category];

    setSearchParams(buildNextParams({ categories: nextCategories }), { replace: true });
  };

  const clearFilters = (): void => {
    setSearchParams({}, { replace: true });
  };

  useEffect(() => {
    const controller = new AbortController();

    const debounceId = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const requestParams = new URLSearchParams();

        selectedCategories.forEach((value) => requestParams.append("category", value));

        requestParams.set("limit", String(DEFAULT_LIMIT));
        requestParams.set("page", String(DEFAULT_PAGE));

        const response = await api.get<BackendCatalogResponse>(
          `/products?${requestParams.toString()}`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) {
          return;
        }

        const nextCards = response.data.data.map(mapToCatalogCard);
        const nextDisplayedProducts: DisplayedProduct[] = nextCards.map((card) => ({
          productId: card.productId,
          variantId: card.variantId,
          baseName: card.baseName,
          brand: card.brand,
          price: card.price,
          sku: card.sku,
          size: card.size,
          color: card.color,
          weight: card.weight,
          inventoryCount: card.inventoryCount,
        }));

        setCatalogCards(nextCards);
        setDisplayedProducts(nextDisplayedProducts);
        setPagination(response.data.pagination);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Failed to load collection.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(debounceId);
      controller.abort();
    };
  }, [selectedCategories, setDisplayedProducts]);

  const handleAddToCart = async (variantId: string): Promise<void> => {
    const item = catalogCards.find((catalogCard) => catalogCard.variantId === variantId);

    if (!item) {
      return;
    }

    try {
      const response = await api.patch<ReserveStockResponse>(
        `/products/variants/${variantId}/stock/decrease`,
        { units: 1 },
      );

      setVariantInventoryCount(response.data.data.variantId, response.data.data.inventoryCount);
      addToCart({ ...item, inventoryCount: response.data.data.inventoryCount, quantity: 1 });
      setErrorMessage(null);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        setVariantInventoryCount(variantId, 0);
        setErrorMessage("Item is out of stock.");
        navigate(-1);
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "Failed to add item to cart.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Collection</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Filters are persisted in the URL and fetched from the backend with debounce, so fast
              filter changes stay responsive and shareable.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="w-fit rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <FilterSidebar
          selectedCategories={selectedCategories}
          onToggleCategory={handleToggleCategory}
        />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
            <span>
              Showing <span className="font-semibold text-white">{catalogCards.length}</span> of {pagination.total} results
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
              {activeFilterCount} active filters
            </span>
          </div>

          {isLoading ? (
            <CatalogSkeletonGrid />
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
              {errorMessage}
            </div>
          ) : catalogCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 p-10 text-center text-slate-300">
              No products match the current filters.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {catalogCards.map((item) => (
                  <ProductCard
                    key={item.variantId}
                    variantId={item.variantId}
                    productName={item.baseName}
                    brand={item.brand}
                    price={item.price}
                    imageUrl={item.imageUrl}
                    inventoryCount={item.inventoryCount}
                    details={buildCatalogCardDetails(item)}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
                <span>
                  Page <span className="font-semibold text-white">{pagination.page}</span> of {pagination.totalPages || 1}
                </span>
                <span>
                  Limit <span className="font-semibold text-white">{pagination.limit}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
