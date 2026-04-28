import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ProductCard,
  type ProductCardDetail,
  type VariantOption,
} from "../components/ProductCard.js";
import {
  categoryConfig,
  type ProductCategory,
} from "../constants/categoryConfig.js";
import { api } from "../services/api.js";
import { useAppStore } from "../store/useAppStore.js";

interface AdminProduct {
  _id: string;
  baseName: string;
  brand: string;
  imagePath?: string;
  createdAt?: string;
}

interface AdminVariantDetail {
  _id?: string;
  sku: string;
  price: number;
  attributes: Record<string, string | number | boolean | null>;
  weight: number;
  inventoryCount: number;
}

interface AdminCatalogEntry extends AdminProduct {
  variants: AdminVariantDetail[];
}

interface ProductListResponse {
  success: boolean;
  data: AdminProduct[];
}

interface VariantListResponse {
  success: boolean;
  data: AdminVariantDetail[];
}

function resolveBackendImageUrl(imagePath?: string): string {
  if (!imagePath) {
    return "";
  }

  if (
    /^(https?:)?\/\//.test(imagePath) ||
    imagePath.startsWith("data:") ||
    imagePath.startsWith("blob:")
  ) {
    return imagePath;
  }

  const configuredApiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
  const backendBaseUrl = /^https?:\/\//.test(configuredApiBaseUrl)
    ? configuredApiBaseUrl.replace(/\/api\/?$/, "")
    : "http://localhost:4000";
  const normalizedRelativePath = imagePath.startsWith("/")
    ? imagePath
    : `/${imagePath}`;

  return `${backendBaseUrl}${normalizedRelativePath}`;
}

function toAttributeKey(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((segment, index) => {
      const lower = segment.toLowerCase();
      return index === 0
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function inferCategory(
  attributes: Record<string, string | number | boolean | null>,
): ProductCategory | null {
  const categories = Object.keys(categoryConfig) as ProductCategory[];

  for (const category of categories) {
    const keys = categoryConfig[category].map((field) =>
      toAttributeKey(field.name),
    );
    const hasAnyMatch = keys.some((key) =>
      Object.prototype.hasOwnProperty.call(attributes, key),
    );

    if (hasAnyMatch) {
      return category;
    }
  }

  return null;
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

function buildAdminCardDetails(
  product: AdminCatalogEntry,
  variant: VariantOption | null,
): ProductCardDetail[] {
  const details: ProductCardDetail[] = [
    { label: "Variants", value: product.variants.length },
  ];

  if (!variant) {
    return details;
  }

  details.push({ label: "SKU", value: variant.sku });
  details.push({ label: "Price", value: `$${variant.price.toFixed(2)}` });
  details.push({ label: "Inventory", value: variant.inventoryCount });

  const preferredAttributes = ["size", "shoeSize", "gripSize", "color"];
  const includedKeys = new Set<string>();

  preferredAttributes.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(variant.attributes, key)) {
      return;
    }

    details.push({
      label: toTitleCase(key),
      value: formatAttributeValue(variant.attributes[key]),
    });

    includedKeys.add(key);
  });

  Object.entries(variant.attributes).forEach(([key, value]) => {
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

export function AdminCatalog() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<AdminCatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] =
    useState<AdminProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const setDisplayedProducts = useAppStore(
    (state) => state.setDisplayedProducts,
  );

  const selectedCategory = searchParams.get("category")?.trim() ?? "";
  const selectedCategoryParam = selectedCategory || null;

  const loadProducts = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await api.get<ProductListResponse>("/products/admin", {
          signal,
        });

        if (signal?.aborted) {
          return;
        }

        const productDetails = await Promise.all(
          response.data.data.map(async (product) => {
            const variantsResponse = await api.get<VariantListResponse>(
              `/products/${product._id}/variants`,
              {
                signal,
              },
            );

            return {
              ...product,
              variants: variantsResponse.data.data,
            };
          }),
        );

        if (signal?.aborted) {
          return;
        }

        setProducts(productDetails);
        setDisplayedProducts(
          productDetails.flatMap((product) =>
            product.variants
              .filter((variant) => Boolean(variant._id))
              .map((variant) => ({
                productId: product._id,
                variantId: variant._id as string,
                baseName: product.baseName,
                brand: product.brand,
                price: variant.price,
                sku: variant.sku,
                size: String(
                  variant.attributes.size ??
                    variant.attributes.shoeSize ??
                    variant.attributes.gripSize ??
                    "-",
                ),
                color: String(variant.attributes.color ?? "-"),
                weight: variant.weight,
                inventoryCount: variant.inventoryCount,
              })),
          ),
        );
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load products.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [setDisplayedProducts],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadProducts(controller.signal);
    });

    return () => {
      controller.abort();
    };
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryParam) {
      return products;
    }

    return products.filter((product) => {
      const inferred = inferCategory(product.variants[0]?.attributes ?? {});
      return inferred === selectedCategoryParam;
    });
  }, [products, selectedCategoryParam]);

  const productCountLabel = useMemo(() => {
    const count = filteredProducts.length;
    return `${count} product${count === 1 ? "" : "s"}`;
  }, [filteredProducts]);

  const openDeleteModal = (product: AdminProduct): void => {
    setPendingDeleteProduct(product);
    setErrorMessage(null);
  };

  const closeDeleteModal = (): void => {
    if (isDeleting) {
      return;
    }

    setPendingDeleteProduct(null);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!pendingDeleteProduct) {
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(null);

      await api.delete(`/products/${pendingDeleteProduct._id}`);

      setProducts((current) =>
        current.filter((product) => product._id !== pendingDeleteProduct._id),
      );

      setPendingDeleteProduct(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete product.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Collection
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Product Management
          </h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Manage product records, control collection data, and remove products
            with explicit confirmation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-slate-300">
            {productCountLabel}
          </p>
          <Link
            to={
              selectedCategoryParam
                ? `/admin/catalog/new?category=${encodeURIComponent(selectedCategoryParam)}`
                : "/admin/catalog/new"
            }
            className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Create Product
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-6 text-slate-300">
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-6 text-slate-300">
          {selectedCategoryParam
            ? `No products available for ${selectedCategoryParam}.`
            : "No products available."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProducts.map((product) => {
            const firstVariant = product.variants[0];
            const variantOptions: VariantOption[] = product.variants
              .filter((v): v is AdminVariantDetail & { _id: string } =>
                Boolean(v._id),
              )
              .map((v) => ({
                id: v._id!,
                sku: v.sku,
                price: v.price,
                inventoryCount: v.inventoryCount,
                attributes: v.attributes,
              }));

            return (
              <ProductCard
                key={product._id}
                variantId={firstVariant?._id ?? product._id}
                productName={product.baseName}
                brand={product.brand}
                price={firstVariant?.price ?? 0}
                imageUrl={resolveBackendImageUrl(product.imagePath)}
                inventoryCount={firstVariant?.inventoryCount ?? 0}
                variants={
                  variantOptions.length > 0 ? variantOptions : undefined
                }
                getDetailsForVariant={(variant) =>
                  buildAdminCardDetails(product, variant)
                }
                actions={
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/catalog/${product._id}/edit`}
                      className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-400/20"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(product)}
                      className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-200 transition hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      {pendingDeleteProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
                Confirm Deletion
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                Delete Product
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Are you sure you want to delete this product and its variants?
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {pendingDeleteProduct.baseName}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void confirmDelete();
                }}
                disabled={isDeleting}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
