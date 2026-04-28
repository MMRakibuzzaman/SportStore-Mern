import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  loadInvoiceData,
  loadOrderInvoice,
  type CheckoutInvoiceData,
  type OrderInvoiceData,
} from "../services/checkoutStorage.js";

type InvoiceData = CheckoutInvoiceData | OrderInvoiceData | null;

function isCheckoutInvoice(data: InvoiceData): data is CheckoutInvoiceData {
  return data !== null && "paymentMethod" in data;
}

function isOrderInvoice(data: InvoiceData): data is OrderInvoiceData {
  return data !== null && "orderStatus" in data && "email" in data;
}

export function PrintableInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const invoiceData = useMemo(() => {
    if (orderId) {
      return loadOrderInvoice(orderId);
    }
    return loadInvoiceData();
  }, [orderId]);

  const subtotal = invoiceData?.orderTotal ?? 0;
  const tax = 0;
  const shipping = 0;
  const grandTotal = subtotal + tax + shipping;
  const currentYear = new Date().getFullYear();

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!invoiceData) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f8f9fa",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#333" }}>No Invoice Found</h1>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Please complete a checkout first.
          </p>
          <button
            onClick={() => navigate("/checkout")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#06b6d4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Back to Checkout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#f8f9fa",
        padding: "20px",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* No-Print Controls */}
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto 20px",
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          textAlign: "right",
        }}
        className="print:hidden"
      >
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#06b6d4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Print Invoice
        </button>
        <button
          onClick={() => navigate("/invoice")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#e2e8f0",
            color: "#1e293b",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Back
        </button>
      </div>

      {/* Compact Invoice - Optimized for Single Page Print */}
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "40px 30px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
        className="print:shadow-none print:rounded-none print:p-0 print:max-w-full"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "30px",
            paddingBottom: "20px",
            borderBottom: "3px solid #06b6d4",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                margin: "0 0 5px 0",
                color: "#1e293b",
              }}
            >
              INVOICE
            </h1>
            <p style={{ margin: "0", color: "#64748b", fontSize: "12px" }}>
              SportStore
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "13px" }}>
            <div style={{ marginBottom: "5px" }}>
              <strong>Invoice #</strong>
              <br />
              {invoiceData.orderId}
            </div>
            <div>
              <strong>Date</strong>
              <br />
              {formatDate(invoiceData.createdAt)}
            </div>
          </div>
        </div>

        {/* Address Section - Two Column */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            marginBottom: "25px",
            fontSize: "12px",
          }}
        >
          <div>
            <p
              style={{
                fontWeight: "bold",
                color: "#1e293b",
                marginBottom: "8px",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Ship To
            </p>
            <p style={{ margin: "3px 0", color: "#333" }}>
              {isCheckoutInvoice(invoiceData) ? invoiceData.shippingForm.email : invoiceData.email}
            </p>
            <p style={{ margin: "3px 0", color: "#333" }}>
              {isCheckoutInvoice(invoiceData) ? invoiceData.shippingForm.streetLine1 : invoiceData.shippingAddress.streetLine1}
            </p>
            {(isCheckoutInvoice(invoiceData) ? invoiceData.shippingForm.streetLine2 : invoiceData.shippingAddress.streetLine2) && (
              <p style={{ margin: "3px 0", color: "#333" }}>
                {isCheckoutInvoice(invoiceData) ? invoiceData.shippingForm.streetLine2 : invoiceData.shippingAddress.streetLine2}
              </p>
            )}
            <p style={{ margin: "3px 0", color: "#333" }}>
              {isCheckoutInvoice(invoiceData) ? invoiceData.shippingForm.city : invoiceData.shippingAddress.city}, {isCheckoutInvoice(invoiceData) ? invoiceData.shippingForm.state : invoiceData.shippingAddress.state}{" "}
              {isCheckoutInvoice(invoiceData) ? invoiceData.shippingForm.postalCode : invoiceData.shippingAddress.postalCode}
            </p>
            <p style={{ margin: "3px 0", color: "#333" }}>
              {isCheckoutInvoice(invoiceData) ? invoiceData.shippingForm.country : invoiceData.shippingAddress.country}
            </p>
          </div>

          <div>
            <p
              style={{
                fontWeight: "bold",
                color: "#1e293b",
                marginBottom: "8px",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Payment
            </p>
            <p style={{ margin: "3px 0", color: "#333" }}>
              <strong>Method:</strong> Cash on Delivery
            </p>
            <p style={{ margin: "6px 0 3px 0", color: "#666", fontSize: "11px" }}>
              Payment will be collected upon delivery.
            </p>
            {isOrderInvoice(invoiceData) && (
              <>
                <p style={{ margin: "10px 0 3px 0", fontWeight: "bold", color: "#1e293b", fontSize: "11px" }}>
                  Status
                </p>
                <p style={{ margin: "3px 0", color: "#333" }}>
                  {invoiceData.orderStatus}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Items Table - Compact */}
        <table
          style={{
            width: "100%",
            marginBottom: "20px",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f1f5f9",
                borderTop: "2px solid #1e293b",
                borderBottom: "2px solid #1e293b",
              }}
            >
              <th
                style={{
                  padding: "10px",
                  textAlign: "left",
                  fontWeight: "bold",
                  color: "#1e293b",
                  fontSize: "11px",
                }}
              >
                Description
              </th>
              <th
                style={{
                  padding: "10px",
                  textAlign: "center",
                  fontWeight: "bold",
                  color: "#1e293b",
                  fontSize: "11px",
                  width: "70px",
                }}
              >
                SKU
              </th>
              <th
                style={{
                  padding: "10px",
                  textAlign: "center",
                  fontWeight: "bold",
                  color: "#1e293b",
                  fontSize: "11px",
                  width: "50px",
                }}
              >
                Qty
              </th>
              <th
                style={{
                  padding: "10px",
                  textAlign: "right",
                  fontWeight: "bold",
                  color: "#1e293b",
                  fontSize: "11px",
                  width: "70px",
                }}
              >
                Unit Price
              </th>
              <th
                style={{
                  padding: "10px",
                  textAlign: "right",
                  fontWeight: "bold",
                  color: "#1e293b",
                  fontSize: "11px",
                  width: "70px",
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, index) => {
              const itemName = "baseName" in item ? item.baseName : item.name;
              const itemKey = "variantId" in item ? item.variantId : `${invoiceData.orderId}-${item.sku}`;
              return (
                <tr
                  key={itemKey}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    backgroundColor:
                      index % 2 === 0 ? "#ffffff" : "#f8f9fa",
                  }}
                >
                  <td style={{ padding: "8px 10px", color: "#1e293b" }}>
                    <strong>{itemName}</strong>
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "center",
                      color: "#555",
                    }}
                  >
                    {item.sku}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "center",
                      color: "#555",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      color: "#555",
                    }}
                  >
                    ${item.price.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      color: "#1e293b",
                      fontWeight: "600",
                    }}
                  >
                    ${(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals - Right Aligned, Compact */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "20px",
          }}
        >
          <div style={{ width: "250px", fontSize: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid #e2e8f0",
                color: "#555",
              }}
            >
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid #e2e8f0",
                color: "#555",
              }}
            >
              <span>Tax:</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "2px solid #1e293b",
                color: "#555",
              }}
            >
              <span>Shipping:</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                fontSize: "14px",
                fontWeight: "bold",
                color: "#1e293b",
              }}
            >
              <span>TOTAL:</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            paddingTop: "15px",
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
            fontSize: "11px",
            color: "#64748b",
          }}
        >
          <p style={{ margin: "5px 0" }}>
            Thank you for your purchase!
          </p>
          <p style={{ margin: "3px 0" }}>
            SportStore © {currentYear} | All rights reserved
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none;
          }
          
          .print\\:rounded-none {
            border-radius: 0;
          }
          
          .print\\:p-0 {
            padding: 0;
          }
          
          .print\\:max-w-full {
            max-width: 100%;
          }
          
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
