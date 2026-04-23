import { categoryConfig } from "../constants/categoryConfig.js";

interface FilterSidebarProps {
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
}

const categories = Object.keys(categoryConfig);

export function FilterSidebar({
  selectedCategories,
  onToggleCategory,
}: FilterSidebarProps) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/30">
      <div className="border-b border-white/10 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
          Filters
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Refine collection results</h2>
      </div>

      <div className="mt-5 space-y-6">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Category
          </h3>
          <div className="mt-3 space-y-3">
            {categories.map((category) => (
              <label
                key={category}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-slate-900"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => onToggleCategory(category)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                />
                <span>{category}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}