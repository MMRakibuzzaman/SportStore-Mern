export interface CheckoutRequest {
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  shippingAddress: {
    email: string;
    streetLine1: string;
    streetLine2?: string | undefined;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface CheckoutResponse {
  orderId: string;
  orderStatus: "Pending" | "Shipped" | "Delivered";
  totalCost: number;
  createdAt: string;
}