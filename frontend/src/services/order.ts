import { api } from "./api.js";
import type { ShippingFormState } from "./checkoutStorage.js";

export interface CreateCheckoutOrderPayload {
  shippingAddress: ShippingFormState;
}

export interface CreateCheckoutOrderResponse {
  orderId: string;
  orderStatus: "Pending" | "Shipped" | "Delivered";
  totalCost: number;
  createdAt: string;
}

export interface MyOrderItem {
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export interface MyOrderListItem {
  id: string;
  email: string;
  createdAt: string;
  itemCount: number;
  totalCost: number;
  orderStatus: "Pending" | "Shipped" | "Delivered";
  shippingAddress: {
    streetLine1: string;
    streetLine2?: string | undefined;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: MyOrderItem[];
}

interface CheckoutResponseEnvelope {
  success: boolean;
  data: CreateCheckoutOrderResponse;
}

interface MyOrdersResponseEnvelope {
  success: boolean;
  data: MyOrderListItem[];
}

export async function createCheckoutOrder(
  payload: CreateCheckoutOrderPayload,
): Promise<CreateCheckoutOrderResponse> {
  const response = await api.post<CheckoutResponseEnvelope>("/checkout", payload);
  return response.data.data;
}

export async function fetchMyOrders(): Promise<MyOrderListItem[]> {
  const response = await api.get<MyOrdersResponseEnvelope>("/orders/me");
  return response.data.data;
}
