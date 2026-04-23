import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";

type OrderStatus = "Pending" | "Shipped" | "Delivered";

interface AdminOrder {
  id: string;
  email: string;
  itemCount: number;
  totalCost: number;
  orderStatus: OrderStatus;
  shippingCity: string;
  shippingCountry: string;
}

interface OrdersResponse {
  success: boolean;
  data: AdminOrder[];
}

interface UpdateOrderStatusResponse {
  success: boolean;
  data: {
    id: string;
    orderStatus: OrderStatus;
  };
}

export function AdminOrders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Record<string, boolean>>({});
  const statusFilterRaw = searchParams.get("status")?.trim().toLowerCase() ?? "all";
  const statusFilter: "all" | "pending" | "shipped" | "delivered" =
    statusFilterRaw === "pending" || statusFilterRaw === "shipped" || statusFilterRaw === "delivered"
      ? statusFilterRaw
      : "all";

  useEffect(() => {
    const controller = new AbortController();

    const loadOrders = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await api.get<OrdersResponse>("/orders", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setOrders(response.data.data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Failed to load orders.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadOrders();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") {
      return orders;
    }

    return orders.filter((order) => order.orderStatus.toLowerCase() === statusFilter);
  }, [orders, statusFilter]);

  const totalRevenue = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + order.totalCost, 0),
    [filteredOrders],
  );

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus): Promise<void> => {
    if (nextStatus !== "Shipped") {
      return;
    }

    setUpdatingOrderIds((current) => ({
      ...current,
      [orderId]: true,
    }));

    try {
      const response = await api.patch<UpdateOrderStatusResponse>(`/orders/${orderId}/status`, {
        orderStatus: nextStatus,
      });

      setOrders((current) =>
        current.map((order) =>
          order.id === response.data.data.id
            ? { ...order, orderStatus: response.data.data.orderStatus }
            : order,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update order status.");
    } finally {
      setUpdatingOrderIds((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Orders</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Order Pipeline</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Monitor all checkout activity and move pending orders into shipping.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total Revenue</p>
          <p className="mt-1 text-xl font-semibold text-cyan-300">${totalRevenue.toFixed(2)}</p>
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
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-slate-200">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={6}>
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={6}>
                    No orders found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isUpdating = updatingOrderIds[order.id] === true;
                  const isPending = order.orderStatus === "Pending";

                  return (
                    <tr key={order.id} className="bg-slate-900/20">
                      <td className="px-4 py-4 font-medium text-white">#{order.id.slice(-8).toUpperCase()}</td>
                      <td className="px-4 py-4">{order.email}</td>
                      <td className="px-4 py-4 text-slate-300">
                        {order.shippingCity}, {order.shippingCountry}
                      </td>
                      <td className="px-4 py-4">{order.itemCount}</td>
                      <td className="px-4 py-4 font-medium text-cyan-300">${order.totalCost.toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <select
                          value={isPending ? "Pending" : "Shipped"}
                          onChange={(event) => {
                            const nextStatus = event.target.value as OrderStatus;
                            void handleStatusChange(order.id, nextStatus);
                          }}
                          disabled={isUpdating || !isPending}
                          className={`rounded-lg border bg-slate-900 px-3 py-2 text-sm outline-none transition ${isPending
                            ? "border-amber-400/50 text-amber-200"
                            : "border-emerald-400/40 text-emerald-200"
                            } ${isUpdating || !isPending ? "cursor-not-allowed opacity-70" : "focus:ring-2 focus:ring-cyan-400/30"
                            }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Shipped">Shipped</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
