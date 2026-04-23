import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AdminProductForm } from "../components/AdminProductForm.js";
import { categoryConfig, type ProductCategory } from "../constants/categoryConfig.js";

export function AdminProductCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedCategory = searchParams.get("category")?.trim() ?? "";
  const validCategories = Object.keys(categoryConfig) as ProductCategory[];
  const initialCategory = validCategories.includes(requestedCategory as ProductCategory)
    ? (requestedCategory as ProductCategory)
    : undefined;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Collection</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Create Product</h2>
        </div>

        <Link
          to="/admin/catalog"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Back to Collection
        </Link>
      </div>

      <AdminProductForm
        mode="create"
        initialValues={
          initialCategory
            ? {
              category: initialCategory,
            }
            : undefined
        }
        onSuccess={() => {
          navigate("/admin/catalog", { replace: true });
        }}
      />
    </section>
  );
}
