import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { categoryConfig } from "../constants/categoryConfig.js";
import type {
  AdminProductFormValues,
  AdminProductVariantInput,
  ProductCategory,
} from "./AdminProductForm.js";

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

function buildDefaultAttributes(category: ProductCategory): Record<string, string | number> {
  const fields = categoryConfig[category] ?? [];

  return fields.reduce<Record<string, string | number>>((accumulator, field) => {
    const key = toAttributeKey(field.name);
    accumulator[key] = field.type === "number" ? 0 : "";
    return accumulator;
  }, {});
}

function createEmptyVariant(): AdminProductVariantInput {
  return {
    sku: "",
    price: 0,
    weight: 0,
    attributes: buildDefaultAttributes("Cricket Bat"),
    inventoryCount: 0,
  };
}

interface VariantFieldArrayProps {
  control: Control<AdminProductFormValues>;
  register: UseFormRegister<AdminProductFormValues>;
  selectedCategory: ProductCategory;
}

export function VariantFieldArray({
  control,
  register,
  selectedCategory,
}: VariantFieldArrayProps) {
  const categoryFields = categoryConfig[selectedCategory] ?? [];

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Variants</h4>
        <button
          type="button"
          onClick={() =>
            append({
              ...createEmptyVariant(),
              attributes: buildDefaultAttributes(selectedCategory),
            })
          }
          className="rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200 hover:bg-cyan-400/20"
        >
          Add Variant
        </button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <article key={field.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Variant {index + 1}</p>
              {fields.length > 1 ? (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">SKU</span>
                <input
                  type="text"
                  {...register(`variants.${index}.sku`)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
                  placeholder="TEN-APEX-27-WHT"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Price</span>
                <input
                  type="number"
                  step="0.01"
                  {...register(`variants.${index}.price`, { valueAsNumber: true })}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
                  placeholder="129.99"
                />
              </label>

              {categoryFields.map((attribute) => {
                const key = toAttributeKey(attribute.name);
                const inputPath = `variants.${index}.attributes.${key}` as const;

                return (
                  <label key={`${field.id}-${key}`} className="space-y-1">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
                      {attribute.name}
                    </span>

                    {attribute.options && attribute.options.length > 0 ? (
                      <select
                        {...register(inputPath, {
                          required: `${attribute.name} is required.`,
                        })}
                        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
                      >
                        <option value="">Select {attribute.name}</option>
                        {attribute.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={attribute.type === "number" ? "number" : "text"}
                        step={attribute.type === "number" ? "0.01" : undefined}
                        {...register(inputPath, {
                          required: `${attribute.name} is required.`,
                          valueAsNumber: attribute.type === "number",
                        })}
                        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
                        placeholder={attribute.name}
                      />
                    )}
                  </label>
                );
              })}

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Weight (kg)</span>
                <input
                  type="number"
                  step="0.01"
                  {...register(`variants.${index}.weight`, { valueAsNumber: true })}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
                  placeholder="0.46"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Inventory Count</span>
                <input
                  type="number"
                  {...register(`variants.${index}.inventoryCount`, { valueAsNumber: true })}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
                  placeholder="24"
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
