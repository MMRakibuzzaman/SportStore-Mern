import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { api } from "../services/api.js";
import {
  categoryConfig,
  type ProductCategory,
} from "../constants/categoryConfig.js";
import { VariantFieldArray } from "./VariantFieldArray.js";

export type { ProductCategory } from "../constants/categoryConfig.js";

export interface AdminProductVariantInput {
  sku: string;
  price: number;
  weight: number;
  attributes: Record<string, string | number>;
  inventoryCount: number;
}

export interface AdminProductFormValues {
  baseName: string;
  brand: string;
  category: ProductCategory;
  image: FileList;
  variants: AdminProductVariantInput[];
}

interface AdminProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialValues?: AdminProductFormInitialValues;
  onSuccess?: () => void;
}

export interface AdminProductFormInitialValues {
  baseName?: string;
  brand?: string;
  category?: ProductCategory;
  variants?: AdminProductVariantInput[];
}

const CATEGORY_OPTIONS = Object.keys(categoryConfig) as ProductCategory[];

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

function buildDefaultAttributes(
  category: ProductCategory,
): Record<string, string | number> {
  const fields = categoryConfig[category] ?? [];

  return fields.reduce<Record<string, string | number>>(
    (accumulator, field) => {
      const key = toAttributeKey(field.name);
      accumulator[key] = field.type === "number" ? 0 : "";
      return accumulator;
    },
    {},
  );
}

function normalizeVariantAttributes(
  category: ProductCategory,
  variant: AdminProductVariantInput,
): Record<string, string | number> {
  const configFields = categoryConfig[category] ?? [];

  return configFields.reduce<Record<string, string | number>>(
    (accumulator, field) => {
      const key = toAttributeKey(field.name);
      const rawValue = variant.attributes?.[key];

      if (field.type === "number") {
        accumulator[key] = Number(rawValue ?? 0);
        return accumulator;
      }

      accumulator[key] = String(rawValue ?? "").trim();
      return accumulator;
    },
    {},
  );
}

function resolveWeight(
  category: ProductCategory,
  variant: AdminProductVariantInput,
): number {
  if (category === "Cricket Bat") {
    const weightFromAttributes = Number(variant.attributes?.weightLbs ?? 0);
    return Number.isFinite(weightFromAttributes) ? weightFromAttributes : 0;
  }

  if (category === "Tennis Racket") {
    const weightFromAttributes = Number(variant.attributes?.weightG ?? 0);
    const weightInKilograms = weightFromAttributes / 1000;
    return Number.isFinite(weightInKilograms) ? weightInKilograms : 0;
  }

  return Number(variant.weight);
}

function createEmptyVariant(
  category: ProductCategory = "Cricket Bat",
): AdminProductVariantInput {
  return {
    sku: "",
    price: 0,
    weight: 0,
    attributes: buildDefaultAttributes(category),
    inventoryCount: 0,
  };
}

export function AdminProductForm({
  mode,
  productId,
  initialValues,
  onSuccess,
}: AdminProductFormProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AdminProductFormValues>({
    defaultValues: {
      baseName: initialValues?.baseName ?? "",
      brand: initialValues?.brand ?? "",
      category: initialValues?.category ?? "Cricket Bat",
      variants: initialValues?.variants?.length
        ? initialValues.variants
        : [createEmptyVariant(initialValues?.category ?? "Cricket Bat")],
    },
    mode: "onChange",
  });

  useEffect(() => {
    reset({
      baseName: initialValues?.baseName ?? "",
      brand: initialValues?.brand ?? "",
      category: initialValues?.category ?? "Cricket Bat",
      variants: initialValues?.variants?.length
        ? initialValues.variants
        : [createEmptyVariant(initialValues?.category ?? "Cricket Bat")],
    });
  }, [initialValues, reset]);

  const selectedCategory = useWatch({
    control,
    name: "category",
  });

  const onSubmit = async (values: AdminProductFormValues): Promise<void> => {
    if (mode === "edit" && !productId) {
      setSubmissionError("Cannot update product: missing product id.");
      return;
    }

    try {
      setSubmissionError(null);
      setIsSubmittingForm(true);

      const formData = new FormData();
      formData.append("baseName", values.baseName.trim());
      formData.append("brand", values.brand.trim());

      const imageFile = values.image?.[0];
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const variantsPayload: AdminProductVariantInput[] = values.variants
        .map((variant) => {
          const normalizedWeight = resolveWeight(values.category, variant);

          return {
            sku: variant.sku.trim().toUpperCase(),
            price: Number(variant.price),
            attributes: normalizeVariantAttributes(values.category, variant),
            weight: normalizedWeight,
            inventoryCount: Number(variant.inventoryCount),
          };
        })
        .filter((variant) => variant.sku.length > 0);

      // Variants must be serialized because multipart/form-data cannot send nested JSON directly.
      formData.append("variants", JSON.stringify(variantsPayload));

      if (mode === "create") {
        await api.post("/products", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        reset({
          baseName: "",
          brand: "",
          category: "Cricket Bat",
          variants: [
            {
              ...createEmptyVariant(),
              attributes: buildDefaultAttributes("Cricket Bat"),
            },
          ],
        });
      } else {
        await api.put(`/products/${productId}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      onSuccess?.();
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Failed to save product.",
      );
    } finally {
      setIsSubmittingForm(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
        Collection Editor
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-white">
        {mode === "create" ? "Create Product" : "Update Product"}
      </h3>

      <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">
              Base Name
            </span>
            <input
              type="text"
              {...register("baseName", {
                required: "Base name is required.",
                minLength: {
                  value: 2,
                  message: "Base name must be at least 2 characters.",
                },
              })}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="Velocity Runner"
            />
            {errors.baseName ? (
              <p className="text-sm text-red-300">{errors.baseName.message}</p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Brand</span>
            <input
              type="text"
              {...register("brand", {
                required: "Brand is required.",
                minLength: {
                  value: 2,
                  message: "Brand must be at least 2 characters.",
                },
              })}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="SportStore Pro"
            />
            {errors.brand ? (
              <p className="text-sm text-red-300">{errors.brand.message}</p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Category</span>
            <select
              {...register("category", {
                required: "Category is required.",
              })}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p className="text-sm text-red-300">{errors.category.message}</p>
            ) : null}
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-300">
              Product Image
            </span>
            <input
              type="file"
              accept="image/*"
              {...register("image")}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950 hover:file:bg-cyan-300"
            />
          </label>
        </div>

        <VariantFieldArray
          control={control}
          register={register}
          selectedCategory={selectedCategory}
        />

        {submissionError ? (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {submissionError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmittingForm}
          className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmittingForm
            ? "Saving Product..."
            : mode === "create"
              ? "Create Product"
              : "Update Product"}
        </button>
      </form>
    </section>
  );
}
