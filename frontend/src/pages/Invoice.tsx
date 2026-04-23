import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadInvoiceData } from "../services/checkoutStorage.js";

export function Invoice() {
  const navigate = useNavigate();

  const invoiceData = useMemo(() => loadInvoiceData(), []);
  const subtotal = invoiceData?.orderTotal ?? 0;
  const tax = 0;
  const shipping = 0;
  const grandTotal = subtotal + tax + shipping;

  const handlePrint = (): void => {
    window.print();
  };

  if (!invoiceData) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8">
          <h1 className="text-3xl font-semibold text-white">Invoice</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            No invoice is available yet. Please return to checkout and confirm your order first.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              navigate("/cart");
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Back to Cart
          </button>
          <Link
            to="/checkout"
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Back to Checkout
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 print:space-y-4">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 print:border-slate-300 print:bg-white print:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300 print:text-slate-500">
                SportStore Invoice
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white print:text-slate-900">Invoice</h1>
              <p className="mt-3 max-w-3xl text-slate-300 print:text-slate-600">
                Printable order summary for {invoiceData.orderId}.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 print:text-slate-700">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Order Number</p>
                <p className="mt-1 font-medium text-slate-100 print:text-slate-900">
                  {invoiceData.orderId}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Order Date</p>
                <p className="mt-1 font-medium text-slate-100 print:text-slate-900">
                  {new Date(invoiceData.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 print:hidden"
          >
            Print
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] print:block">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30 print:rounded-none print:border-slate-200 print:bg-white print:shadow-none">
          <div className="border-b border-white/10 pb-4 print:border-slate-200">
            <h2 className="text-xl font-semibold text-white print:text-slate-900">Purchased Items</h2>
          </div>

          <div className="mt-4 space-y-3">
            {invoiceData.items.map((item) => (
              <article
                key={item.variantId}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 print:border-slate-200 print:bg-transparent"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white print:text-slate-900">
                      {item.baseName}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400 print:text-slate-500">
                      {item.brand} - {item.size} - {item.color}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-400 print:text-slate-600">Qty</p>
                    <p className="font-semibold text-white print:text-slate-900">x{item.quantity}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <p className="text-slate-300 print:text-slate-700">Unit: ${item.price.toFixed(2)}</p>
                  <p className="font-semibold text-cyan-300 print:text-slate-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 border-t border-white/10 pt-4 print:border-slate-200">
            <div className="space-y-2 text-sm text-slate-300 print:text-slate-700">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-slate-100 print:text-slate-900">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tax</span>
                <span className="font-medium text-slate-100 print:text-slate-900">
                  ${tax.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span className="font-medium text-slate-100 print:text-slate-900">
                  ${shipping.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 print:border-slate-200">
              <p className="text-sm font-medium text-slate-300 print:text-slate-700">Total</p>
              <p className="text-base font-semibold text-cyan-300 print:text-slate-900">
                ${grandTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-6 print:mt-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30 print:rounded-none print:border-slate-200 print:bg-white print:shadow-none">
            <div className="border-b border-white/10 pb-4 print:border-slate-200">
              <h2 className="text-xl font-semibold text-white print:text-slate-900">Shipping Details</h2>
            </div>

            <dl className="mt-4 grid gap-3 text-sm text-slate-300 print:text-slate-700">
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</dt>
                <dd className="mt-1 text-slate-100 print:text-slate-900">{invoiceData.shippingForm.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Street Address</dt>
                <dd className="mt-1 text-slate-100 print:text-slate-900">{invoiceData.shippingForm.streetLine1}</dd>
              </div>
              {invoiceData.shippingForm.streetLine2 ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Apartment, suite, etc.</dt>
                  <dd className="mt-1 text-slate-100 print:text-slate-900">{invoiceData.shippingForm.streetLine2}</dd>
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">City</dt>
                  <dd className="mt-1 text-slate-100 print:text-slate-900">{invoiceData.shippingForm.city}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">State / Province</dt>
                  <dd className="mt-1 text-slate-100 print:text-slate-900">{invoiceData.shippingForm.state}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Postal Code</dt>
                  <dd className="mt-1 text-slate-100 print:text-slate-900">{invoiceData.shippingForm.postalCode}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Country</dt>
                  <dd className="mt-1 text-slate-100 print:text-slate-900">{invoiceData.shippingForm.country}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30 print:rounded-none print:border-slate-200 print:bg-white print:shadow-none">
            <div className="border-b border-white/10 pb-4 print:border-slate-200">
              <h2 className="text-xl font-semibold text-white print:text-slate-900">Payment Method</h2>
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-slate-200 print:border-slate-200 print:bg-transparent print:text-slate-700">
              Cash on Delivery selected
            </div>

            <div className="mt-4 text-sm text-slate-400 print:text-slate-600">
              Cash on delivery will be collected on delivery.
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
