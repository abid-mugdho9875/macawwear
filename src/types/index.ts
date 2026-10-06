/**
 * Shared domain types — used by both the frontend and the backend.
 * Keep this file framework-free so it can be imported anywhere.
 */

export type Category = "men" | "kids";

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  image: string;
  description: string;
  available: boolean;
  sizes?: string[];
  colors?: string[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface OrderItemRecord {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  size?: string;
  color?: string;
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

/** Payment methods the customer can choose at checkout. */
export type PaymentMethod = "cod";

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  items_json: OrderItemRecord[];
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

// API envelope
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;