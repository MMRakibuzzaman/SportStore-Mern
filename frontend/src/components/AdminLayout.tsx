import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { categoryConfig } from "../constants/categoryConfig.js";

export function AdminLayout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const categories = Object.keys(categoryConfig);
  const activeCategory = searchParams.get("category")?.trim().toLowerCase() ?? "";
  const activeOrderStatus = searchParams.get("status")?.trim().toLowerCase() ?? "all";
  const activeStockFilter = searchParams.get("stock")?.trim().toLowerCase() ?? "all";
  const activeRoleFilter = searchParams.get("role")?.trim().toLowerCase() ?? "all";

  const activeSection = location.pathname.split("/")[2] ?? "orders";

  const linkBaseClass =
    "rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] transition";

  const getLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `${linkBaseClass} ${isActive ? "bg-cyan-400 text-slate-950" : "text-white/90 hover:bg-white/10"}`;

  const getFilterLinkClassName = (isActive: boolean): string =>
    `rounded-lg border px-3 py-2 text-sm font-medium transition ${isActive
      ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
      : "border-white/10 text-slate-200 hover:bg-white/10"
    }`;

  const quickFilterConfig = (() => {
    if (activeSection === "catalog") {
      return {
        title: "Categories",
        ariaLabel: "Admin collection quick filters",
        links: [
          {
            label: "All Categories",
            to: "/admin/catalog",
            isActive: activeCategory.length === 0,
          },
          ...categories.map((category) => ({
            label: category,
            to: `/admin/catalog?category=${encodeURIComponent(category)}`,
            isActive: activeCategory === category.toLowerCase(),
          })),
        ],
      };
    }

    if (activeSection === "orders") {
      return {
        title: "Order Status",
        ariaLabel: "Admin order quick filters",
        links: [
          { label: "All Orders", to: "/admin/orders", isActive: activeOrderStatus === "all" },
          { label: "Pending", to: "/admin/orders?status=pending", isActive: activeOrderStatus === "pending" },
          { label: "Shipped", to: "/admin/orders?status=shipped", isActive: activeOrderStatus === "shipped" },
          { label: "Delivered", to: "/admin/orders?status=delivered", isActive: activeOrderStatus === "delivered" },
        ],
      };
    }

    if (activeSection === "inventory") {
      return {
        title: "Stock Status",
        ariaLabel: "Admin inventory quick filters",
        links: [
          { label: "All Variants", to: "/admin/inventory", isActive: activeStockFilter === "all" },
          { label: "Low Stock", to: "/admin/inventory?stock=low", isActive: activeStockFilter === "low" },
          { label: "Out of Stock", to: "/admin/inventory?stock=out", isActive: activeStockFilter === "out" },
          { label: "In Stock", to: "/admin/inventory?stock=in", isActive: activeStockFilter === "in" },
        ],
      };
    }

    if (activeSection === "users") {
      return {
        title: "Roles",
        ariaLabel: "Admin user quick filters",
        links: [
          { label: "All Roles", to: "/admin/users", isActive: activeRoleFilter === "all" },
          { label: "Admins", to: "/admin/users?role=admin", isActive: activeRoleFilter === "admin" },
          { label: "Customers", to: "/admin/users?role=customer", isActive: activeRoleFilter === "customer" },
        ],
      };
    }

    return {
      title: "Categories",
      ariaLabel: "Admin quick filters",
      links: [{ label: "All", to: "/admin/orders", isActive: true }],
    };
  })();

  return (
    <section className="grid min-h-[75vh] gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-3xl border border-white/10 bg-slate-900/85 p-5 shadow-2xl shadow-black/30">
        <div className="border-b border-white/10 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">Quick Filters</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{quickFilterConfig.title}</h2>
        </div>

        <nav className="mt-4 flex flex-col gap-2" aria-label={quickFilterConfig.ariaLabel}>
          {quickFilterConfig.links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={getFilterLinkClassName(item.isActive)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-600/70 bg-slate-800 px-4 py-3 shadow-lg shadow-black/25">
          <nav className="flex flex-wrap items-center gap-2" aria-label="Admin section navigation">
            <NavLink to="orders" className={getLinkClassName} end>
              Orders
            </NavLink>
            <NavLink to="users" className={getLinkClassName}>
              Users
            </NavLink>
            <NavLink to="catalog" className={getLinkClassName}>
              Collection
            </NavLink>
            <NavLink to="inventory" className={getLinkClassName}>
              Inventory
            </NavLink>
          </nav>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
