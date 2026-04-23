import type { OrderStatus } from "../models/order.model.js";

export interface AdminOrderListItem {
  id: string;
  email: string;
  itemCount: number;
  totalCost: number;
  orderStatus: OrderStatus;
  shippingCity: string;
  shippingCountry: string;
}

export interface CurrentUserOrderItem {
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export interface CurrentUserOrderListItem {
  id: string;
  email: string;
  createdAt: string;
  itemCount: number;
  totalCost: number;
  orderStatus: OrderStatus;
  shippingAddress: {
    streetLine1: string;
    streetLine2?: string | undefined;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: CurrentUserOrderItem[];
}

export interface UpdateOrderStatusResult {
  id: string;
  orderStatus: OrderStatus;
}
