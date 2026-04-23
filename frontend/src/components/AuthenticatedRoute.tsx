import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";

export function AuthenticatedRoute() {
  const location = useLocation();
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
