import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";

interface AdminVariantInventoryItem {
  variantId: string;
  productId: string;
  baseName: string;
  brand: string;
  sku: string;
  attributes: Record<string, string | number | boolean | null>;
  weight: number;
  price: number;
  inventoryCount: number;
}

interface InventoryResponse {
  success: boolean;
  data: AdminVariantInventoryItem[];
}

interface SetStockResponse {
  success: boolean;
  data: {
    variantId: string;
    inventoryCount: number;
  };
}

export function AdminInventory() {
  const [searchParams] = useSearchParams();
  const [variants, setVariants] = useState<AdminVariantInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<AdminVariantInventoryItem | null>(null);
  const [stockInput, setStockInput] = useState<string>("");
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
  const stockFilterRaw = searchParams.get("stock")?.trim().toLowerCase() ?? "all";
  const stockFilter: "all" | "low" | "out" | "in" =
    stockFilterRaw === "low" || stockFilterRaw === "out" || stockFilterRaw === "in"
      ? stockFilterRaw
      : "all";

  useEffect(() => {
    const controller = new AbortController();

    const loadVariants = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await api.get<InventoryResponse>("/products/variants", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setVariants(response.data.data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Failed to load inventory.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadVariants();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredVariants = useMemo(() => {
    if (stockFilter === "low") {
      return variants.filter((variant) => variant.inventoryCount < 5);
    }

    if (stockFilter === "out") {
      return variants.filter((variant) => variant.inventoryCount === 0);
    }

    if (stockFilter === "in") {
      return variants.filter((variant) => variant.inventoryCount > 0);
    }

    return variants;
  }, [variants, stockFilter]);

  const lowStockCount = useMemo(
    () => filteredVariants.filter((variant) => variant.inventoryCount < 5).length,
    [filteredVariants],
  );

  const openAddStockModal = (variant: AdminVariantInventoryItem): void => {
    setSelectedVariant(variant);
    setStockInput(String(variant.inventoryCount));
    setModalErrorMessage(null);
  };

  const closeAddStockModal = (): void => {
    setSelectedVariant(null);
    setStockInput("");
    setModalErrorMessage(null);
  };

  const handleSaveStock = async (): Promise<void> => {
    if (!selectedVariant) {
      return;
    }

    const parsedUnits = Number(stockInput);

    if (!Number.isInteger(parsedUnits) || parsedUnits < 0) {
      setModalErrorMessage("Please enter a valid non-negative whole number.");
      return;
    }

    try {
      setIsSavingStock(true);
      setModalErrorMessage(null);

      const response = await api.patch<SetStockResponse>(
        `/products/variants/${selectedVariant.variantId}/stock/set`,
        { inventoryCount: parsedUnits },
      );

      setVariants((current) =>
        current.map((variant) =>
          variant.variantId === response.data.data.variantId
            ? { ...variant, inventoryCount: response.data.data.inventoryCount }
            : variant,
        ),
      );

      closeAddStockModal();
    } catch (error) {
      setModalErrorMessage(error instanceof Error ? error.message : "Failed to update stock.");
    } finally {
      setIsSavingStock(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Inventory</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Inventory Management</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Audit all variant stock levels and prioritize low inventory items for replenishment.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Low Stock</p>
          <p className="mt-1 text-xl font-semibold text-red-300">{lowStockCount}</p>
        </div>
      </header>

      {errorMessage ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/35">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Attributes</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Weight</th>
                <th className="px-4 py-3 font-medium">Inventory</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-slate-200">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={8}>
                    Loading variant inventory...
                  </td>
                </tr>
              ) : filteredVariants.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={8}>
                    No variants found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredVariants.map((variant) => {
                  const isLowStock = variant.inventoryCount < 5;

                  return (
                    <tr
                      key={variant.variantId}
                      className={`transition ${isLowStock
                        ? "bg-red-500/20 hover:bg-red-500/25"
                        : "bg-slate-900/20 hover:bg-white/5"
                        }`}
                    >
                      <td className="px-4 py-4 font-medium text-white">{variant.sku}</td>
                      <td className="px-4 py-4">{variant.baseName}</td>
                      <td className="px-4 py-4">{variant.brand}</td>
                      <td className="px-4 py-4 text-slate-300">
                        {Object.entries(variant.attributes).length === 0
                          ? "-"
                          : Object.entries(variant.attributes)
                            .map(([key, value]) => `${key}: ${String(value)}`)
                            .join(", ")}
                      </td>
                      <td className="px-4 py-4 text-cyan-300">${variant.price.toFixed(2)}</td>
                      <td className="px-4 py-4">{variant.weight.toFixed(2)} kg</td>
                      <td className="px-4 py-4 font-semibold">
                        <span className={isLowStock ? "text-red-200" : "text-emerald-300"}>
                          {variant.inventoryCount}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openAddStockModal(variant)}
                          className="rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-400/20"
                        >
                          Add Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedVariant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Adjust Inventory</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Set Inventory Count</h3>
              <p className="mt-2 text-sm text-slate-300">
                {selectedVariant.baseName} ({selectedVariant.sku}) currently has {selectedVariant.inventoryCount} units.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-slate-300" htmlFor="stock-units-input">
                New inventory count
              </label>
              <input
                id="stock-units-input"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={stockInput}
                onChange={(event) => setStockInput(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                placeholder="e.g. 50"
              />

              {modalErrorMessage ? (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {modalErrorMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeAddStockModal}
                disabled={isSavingStock}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveStock();
                }}
                disabled={isSavingStock}
                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingStock ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
