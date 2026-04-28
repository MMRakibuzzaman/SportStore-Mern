import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { AdminLayout } from "./components/AdminLayout.tsx";
import { Layout } from "./components/Layout.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { useInventorySocket } from "./hooks/useInventorySocket.ts";
import { useCartWebSocket } from "./hooks/useCartWebSocket.ts";
import { AdminInventory } from "./pages/AdminInventory.tsx";
import { AdminOrders } from "./pages/AdminOrders.tsx";
import { AdminUsers } from "./pages/AdminUsers.tsx";
import { AdminCatalog } from "./pages/AdminCatalog.tsx";
import { AdminProductCreate } from "./pages/AdminProductCreate.tsx";
import { AdminProductEdit } from "./pages/AdminProductEdit.tsx";
import { AccountSettings } from "./pages/AccountSettings.tsx";
import { Cart } from "./pages/Cart.tsx";
import { Catalog } from "./pages/Catalog.tsx";
import { Checkout } from "./pages/Checkout.tsx";
import { Home } from "./pages/Home.tsx";
import { Login } from "./pages/Login.tsx";
import { Invoice } from "./pages/Invoice.tsx";
import { PrintableInvoice } from "./pages/PrintableInvoice.tsx";
import { MyOrders } from "./pages/MyOrders.tsx";
import { Register } from "./pages/Register.tsx";
import { AuthenticatedRoute } from "./components/AuthenticatedRoute.tsx";
import { useAppStore } from "./store/useAppStore.js";

function App() {
  useInventorySocket();
  useCartWebSocket();
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);
  const loadCart = useAppStore((state) => state.loadCart);

  useEffect(() => {
    if (isAuthenticated) {
      void loadCart();
    }
  }, [isAuthenticated, loadCart]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/invoice/print" element={<PrintableInvoice />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="invoice" element={<Invoice />} />
          <Route element={<AuthenticatedRoute />}>
            <Route path="orders" element={<MyOrders />} />
          </Route>
          <Route
            path="login"
            element={
              isAuthenticated ? <Navigate replace to="/catalog" /> : <Login />
            }
          />
          <Route path="register" element={<Register />} />

          <Route element={<AuthenticatedRoute />}>
            <Route path="account" element={<AccountSettings />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate replace to="orders" />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="catalog" element={<AdminCatalog />} />
              <Route path="catalog/new" element={<AdminProductCreate />} />
              <Route path="catalog/:id/edit" element={<AdminProductEdit />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
