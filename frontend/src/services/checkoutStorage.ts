import type { CartItem } from "../store/useAppStore.js";

export interface ShippingFormState {
  email: string;
  streetLine1: string;
  streetLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = "cash_on_delivery";

export interface CheckoutInvoiceData {
  orderId: string;
  createdAt: string;
  shippingForm: ShippingFormState;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  orderTotal: number;
}

const SHIPPING_STORAGE_KEY = "sportstore.checkout.shipping";
const INVOICE_STORAGE_KEY = "sportstore.checkout.invoice";

export const emptyShippingForm: ShippingFormState = {
  email: "",
  streetLine1: "",
  streetLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

function safeRead<T>(storageKey: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadShippingForm(): ShippingFormState {
  const parsed = safeRead<Partial<ShippingFormState>>(SHIPPING_STORAGE_KEY);

  if (!parsed) {
    return { ...emptyShippingForm };
  }

  return {
    email: typeof parsed.email === "string" ? parsed.email : "",
    streetLine1: typeof parsed.streetLine1 === "string" ? parsed.streetLine1 : "",
    streetLine2: typeof parsed.streetLine2 === "string" ? parsed.streetLine2 : "",
    city: typeof parsed.city === "string" ? parsed.city : "",
    state: typeof parsed.state === "string" ? parsed.state : "",
    postalCode: typeof parsed.postalCode === "string" ? parsed.postalCode : "",
    country: typeof parsed.country === "string" ? parsed.country : "",
  };
}

export function saveShippingForm(form: ShippingFormState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(form));
}

export function calculateOrderTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function buildOrderId(): string {
  const randomSegment = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SPT-${Date.now().toString(36).toUpperCase()}-${randomSegment}`;
}

export function saveInvoiceData(data: CheckoutInvoiceData): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(data));
}

export function loadInvoiceData(): CheckoutInvoiceData | null {
  return safeRead<CheckoutInvoiceData>(INVOICE_STORAGE_KEY);
}

// Order Invoice Storage (for past orders from My Orders page)
export interface OrderInvoiceItem {
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export interface OrderInvoiceData {
  orderId: string;
  createdAt: string;
  shippingAddress: ShippingFormState;
  items: OrderInvoiceItem[];
  orderStatus: "Pending" | "Shipped" | "Delivered";
  orderTotal: number;
  email: string;
}

function getOrderInvoiceStorageKey(orderId: string): string {
  return `sportstore.invoice.order.${orderId}`;
}

export function saveOrderInvoice(orderInvoice: OrderInvoiceData): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = getOrderInvoiceStorageKey(orderInvoice.orderId);
  window.localStorage.setItem(key, JSON.stringify(orderInvoice));
}

export function loadOrderInvoice(orderId: string): OrderInvoiceData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const key = getOrderInvoiceStorageKey(orderId);
  return safeRead<OrderInvoiceData>(key);
}

export function clearOrderInvoice(orderId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = getOrderInvoiceStorageKey(orderId);
  window.localStorage.removeItem(key);
}
