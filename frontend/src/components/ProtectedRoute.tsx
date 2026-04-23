import { Navigate, Outlet } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";

export function ProtectedRoute() {
  const currentUser = useAppStore((state) => state.auth.user);
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" replace />;
  }

  if (currentUser.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
