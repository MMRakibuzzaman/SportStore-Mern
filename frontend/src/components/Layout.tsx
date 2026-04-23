import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";

export function Layout() {
  const navigate = useNavigate();
  const auth = useAppStore((state) => state.auth);
  const logoutUser = useAppStore((state) => state.logoutUser);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleLogout = (): void => {
    logoutUser();
    setIsAccountMenuOpen(false);
    navigate("/", { replace: true });
  };

  const closeAccountMenu = (): void => {
    setIsAccountMenuOpen(false);
  };

  const isAuthenticated = auth.isAuthenticated;
  const role = auth.user?.role;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">SportStore</p>
            <p className="mt-1 text-sm text-slate-300">Commerce Platform</p>
          </div>

          <nav className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-1">
            {isAuthenticated && role === "admin" ? (
              <Link
                to="/admin"
                className="rounded-lg border border-cyan-300/60 bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Admin Dashboard
              </Link>
            ) : null}

            <Link to="/" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              Home
            </Link>
            <Link
              to="/catalog"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Collection
            </Link>
            <Link
              to="/cart"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Cart
            </Link>

            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/orders"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  My Orders
                </Link>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((current) => !current)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                  >
                    Account
                  </button>

                  {isAccountMenuOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur">
                      <Link
                        to="/account"
                        onClick={closeAccountMenu}
                        className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        Account Settings
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
        <Outlet />
      </div>
    </main>
  );
}