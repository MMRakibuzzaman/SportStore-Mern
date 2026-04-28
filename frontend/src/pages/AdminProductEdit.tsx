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
    attributes?: Record<string, string | number | boolean | null>;
    weight: number;
    inventoryCount: number;
    [key: string]: unknown;
  }>;
}

const KNOWN_ATTRIBUTE_KEYS = new Set(
  (Object.keys(categoryConfig) as ProductCategory[]).flatMap((category) =>
    categoryConfig[category].map((field) => toAttributeKey(field.name)),
  ),
);

function toAttributeKey(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
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

const CATEGORY_NAME_HINTS: Record<ProductCategory, string[]> = {
  "Cricket Bat": ["bat", "willow"],
  "Cricket Ball": ["ball"],
  Football: ["football", "soccer"],
  "Tennis Racket": ["racket", "racquet", "tennis"],
  Helmet: ["helmet"],
  Pads: ["pad", "pads", "guard"],
  Footwear: ["shoe", "shoes", "boot", "boots", "cleat", "cleats"],
  Sportswear: [
    "jersey",
    "shirt",
    "tshirt",
    "tee",
    "short",
    "shorts",
    "track",
    "pant",
    "pants",
    "hoodie",
    "wear",
  ],
};

function inferCategory(
  variants: Array<Record<string, string | number>>,
  baseName: string,
): ProductCategory {
  const categories = Object.keys(categoryConfig) as ProductCategory[];
  const presentKeys = new Set(
    variants.flatMap((variant) => Object.keys(variant)),
  );

  if (presentKeys.size === 0) {
    return "Cricket Bat";
  }

  let bestCategory: ProductCategory = "Cricket Bat";
  let bestScore = -1;
  let bestCoverage = -1;
  let bestHintScore = -1;

  const normalizedBaseName = baseName.toLowerCase();

  for (const category of categories) {
    const requiredKeys = categoryConfig[category].map((field) =>
      toAttributeKey(field.name),
    );

    if (requiredKeys.length === 0) {
      continue;
    }

    const score = requiredKeys.filter((key) => presentKeys.has(key)).length;

    if (score === 0) {
      continue;
    }

    const coverage = score / requiredKeys.length;
    const hintScore = CATEGORY_NAME_HINTS[category].some((keyword) =>
      normalizedBaseName.includes(keyword),
    )
      ? 1
      : 0;

    if (score > bestScore || (score === bestScore && coverage > bestCoverage)) {
      bestCategory = category;
      bestScore = score;
      bestCoverage = coverage;
      bestHintScore = hintScore;
      continue;
    }

    if (
      score === bestScore &&
      coverage === bestCoverage &&
      hintScore > bestHintScore
    ) {
      bestCategory = category;
      bestHintScore = hintScore;
    }
  }

  return bestCategory;
}

function normalizeVariantAttributes(
  variant: VariantResponse["data"][number],
): Record<string, string | number> {
  const attributes: Record<string, string | number> = {};

  const addEntry = (rawKey: string, value: unknown): void => {
    if (typeof value !== "string" && typeof value !== "number") {
      return;
    }

    const normalizedRawKey = rawKey.trim();
    const normalizedKey = KNOWN_ATTRIBUTE_KEYS.has(normalizedRawKey)
      ? normalizedRawKey
      : toAttributeKey(rawKey);

    if (!KNOWN_ATTRIBUTE_KEYS.has(normalizedKey)) {
      return;
    }

    attributes[normalizedKey] = value;
  };

  if (variant.attributes && typeof variant.attributes === "object") {
    for (const [key, value] of Object.entries(variant.attributes)) {
      addEntry(key, value);
    }
  }

  for (const [key, value] of Object.entries(variant)) {
    if (key === "attributes") {
      continue;
    }

    addEntry(key, value);
  }

  return attributes;
}

export function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState<
    AdminProductFormInitialValues | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const missingProductId = !id;

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();

    const loadProduct = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [productResponse, variantsResponse] = await Promise.all([
          api.get<ProductResponse>(`/products/${id}`, {
            signal: controller.signal,
          }),
          api.get<VariantResponse>(`/products/${id}/variants`, {
            signal: controller.signal,
          }),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        const variants = variantsResponse.data.data;
        const normalizedVariants = variants.map((variant) => {
          const attributes = normalizeVariantAttributes(variant);

          return {
            sku: variant.sku,
            price: variant.price,
            weight: variant.weight,
            inventoryCount: variant.inventoryCount,
            attributes,
          };
        });

        const category = inferCategory(
          normalizedVariants.map((variant) => variant.attributes),
          productResponse.data.data.baseName,
        );

        setInitialValues({
          baseName: productResponse.data.data.baseName,
          brand: productResponse.data.data.brand,
          category,
          variants:
            normalizedVariants.length > 0
              ? normalizedVariants.map((variant) => ({
                  sku: variant.sku,
                  price: variant.price,
                  weight: variant.weight,
                  inventoryCount: variant.inventoryCount,
                  attributes: variant.attributes,
                }))
              : [
                  {
                    sku: "",
                    price: 0,
                    weight: 0,
                    inventoryCount: 0,
                    attributes: {},
                  },
                ],
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load product.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    queueMicrotask(() => {
      void loadProduct();
    });

    return () => {
      controller.abort();
    };
  }, [id]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Collection
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Edit Product
          </h2>
        </div>

        <Link
          to="/admin/catalog"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Back to Collection
        </Link>
      </div>

      {missingProductId || errorMessage ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {missingProductId ? "Missing product id." : errorMessage}
        </p>
      ) : null}

      {!missingProductId && isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
          Loading product...
        </div>
      ) : missingProductId ? null : (
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
