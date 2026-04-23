import { useEffect, useState } from "react";
import { fetchMyOrders, type MyOrderListItem } from "../services/order.js";

export function MyOrders() {
  const [orders, setOrders] = useState<MyOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadOrders = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const nextOrders = await fetchMyOrders();

        if (!controller.signal.aborted) {
          setOrders(nextOrders);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load your orders.");
        }
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

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/30">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">My Orders</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Order History</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Orders confirmed from checkout are saved here with their current status and item summary.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
          Loading your orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
          No orders have been placed yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                    Order #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    {new Date(order.createdAt).toLocaleString()}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">{order.email}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-semibold text-cyan-300">{order.orderStatus}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={`${order.id}-${item.sku}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">
                            SKU {item.sku}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-cyan-300">x{item.quantity}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">Unit price: ${item.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shipping</p>
                    <p className="mt-2 text-slate-100">
                      {order.shippingAddress.streetLine1}
                      {order.shippingAddress.streetLine2 ? `, ${order.shippingAddress.streetLine2}` : ""}
                    </p>
                    <p className="mt-1 text-slate-100">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p className="mt-1 text-slate-100">{order.shippingAddress.country}</p>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Summary</p>
                    <p className="mt-2">Items: {order.itemCount}</p>
                    <p className="mt-1 text-base font-semibold text-cyan-300">
                      Total: ${order.totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
