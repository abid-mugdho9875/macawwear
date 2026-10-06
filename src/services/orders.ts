import { getProductById } from "@/data/products";
import type {
  ApiResponse,
  CartItem,
  CustomerInput,
  OrderItemRecord,
  PaymentMethod,
} from "@/types";

/**
 * The browser talks to the same origin under `/.netlify/functions/*`.
 * In dev, Vite proxies these to `netlify dev` (port 8888).
 * Set `VITE_API_URL` to override (e.g. when running frontend separately).
 */
function apiBase(): string {
  const override = import.meta.env.VITE_API_URL as string | undefined;
  if (override && override.trim().length > 0) {
    return override.replace(/\/$/, "");
  }
  return ""; // same-origin
}

export interface CreateOrderRequest {
  customer: CustomerInput;
  items: CartItem[];
  clientOrderId: string;
  paymentMethod: PaymentMethod;
}

export interface CreateOrderData {
  orderNumber: string;
  total: number;
  emailSent: boolean;
  emailWarning?: string;
}

/**
 * Submit an order to the backend.
 *
 * Throws an `Error` whose `.message` is a user-friendly description.
 * Network errors and validation errors are normalized to the same shape.
 */
export async function createOrder(
  payload: CreateOrderRequest,
): Promise<CreateOrderData> {
  const url = `${apiBase()}/.netlify/functions/create-order`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "We couldn't reach the server. Please check your connection and try again.",
    );
  }

  let json: ApiResponse<CreateOrderData>;
  try {
    json = (await res.json()) as ApiResponse<CreateOrderData>;
  } catch {
    throw new Error("The server returned an invalid response. Please try again.");
  }

  if (!json.success) {
    throw new Error(json.error.message);
  }

  return json.data;
}

/**
 * Local preview only — the backend re-computes the authoritative total from
 * `src/data/products.ts`. Used for the order summary on the checkout page.
 */
export function previewOrderItems(items: CartItem[]): OrderItemRecord[] {
  return items.map<OrderItemRecord>((it) => {
    const p = getProductById(it.productId);
    const unitPrice = p?.price ?? 0;
    const record: OrderItemRecord = {
      productId: it.productId,
      name: p?.name ?? it.productId,
      quantity: it.quantity,
      unitPrice,
      subtotal: unitPrice * it.quantity,
    };
    if (it.size !== undefined) record.size = it.size;
    if (it.color !== undefined) record.color = it.color;
    return record;
  });
}