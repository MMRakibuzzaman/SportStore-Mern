import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AdminProductForm,
  type AdminProductFormInitialValues,
} from "../components/AdminProductForm.js";
import type { ProductCategory } from "../constants/categoryConfig.js";
import { categoryConfig } from "../constants/categoryConfig.js";
import { api } from "../services/api.js";

interface ProductResponse {
  success: boolean;
  data: {
    _id: string;
    baseName: string;
    brand: string;
    imagePath?: string;
  };
}

interface VariantResponse {
  success: boolean;
  data: Array<{
    sku: string;
    price: number;
    attributes: Record<string, string | number | boolean | null>;
    weight: number;
    inventoryCount: number;
  }>;
}

function toAttributeKey(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((segment, index) => {
      const lower = segment.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function inferCategory(attributes: Record<string, string | number | boolean | null>): ProductCategory {
  const categories = Object.keys(categoryConfig) as ProductCategory[];

  for (const category of categories) {
    const requiredKeys = categoryConfig[category].map((field) => toAttributeKey(field.name));
    const hasAnyKey = requiredKeys.some((key) => Object.prototype.hasOwnProperty.call(attributes, key));

    if (hasAnyKey) {
      return category;
    }
  }

  return "Sportswear";
}

export function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState<AdminProductFormInitialValues | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setErrorMessage("Missing product id.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadProduct = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [productResponse, variantsResponse] = await Promise.all([
          api.get<ProductResponse>(`/products/${id}`, { signal: controller.signal }),
          api.get<VariantResponse>(`/products/${id}/variants`, { signal: controller.signal }),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        const variants = variantsResponse.data.data;
        const category = inferCategory(variants[0]?.attributes ?? {});

        setInitialValues({
          baseName: productResponse.data.data.baseName,
          brand: productResponse.data.data.brand,
          category,
          variants: variants.length > 0
            ? variants.map((variant) => ({
              sku: variant.sku,
              price: variant.price,
              weight: variant.weight,
              inventoryCount: variant.inventoryCount,
              attributes: Object.entries(variant.attributes).reduce<Record<string, string | number>>(
                (accumulator, [key, value]) => {
                  if (typeof value === "string" || typeof value === "number") {
                    accumulator[key] = value;
                  }

                  return accumulator;
                },
                {},
              ),
            }))
            : [{
              sku: "",
              price: 0,
              weight: 0,
              inventoryCount: 0,
              attributes: {},
            }],
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Failed to load product.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      controller.abort();
    };
  }, [id]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Collection</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Edit Product</h2>
        </div>

        <Link
          to="/admin/catalog"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Back to Collection
        </Link>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
          Loading product...
        </div>
      ) : (
        <AdminProductForm
          mode="edit"
          productId={id}
          initialValues={initialValues}
          onSuccess={() => {
            navigate("/admin/catalog");
          }}
        />
      )}
    </section>
  );
}
