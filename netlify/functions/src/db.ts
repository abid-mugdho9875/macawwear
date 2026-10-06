import type { OrderItemRecord } from "@/types";

/**
 * Minimal database adapter. Production talks to Supabase Postgres over the
 * "postgres" npm package — but tests inject a fake so we never touch a
 * real database.
 *
 * The shape of this interface is intentionally tiny so a fake can be
 * implemented in a few dozen lines.
 */
export interface Database {
  /**
   * Look up a customer by email. Returns null if not found.
   * Email comparison is case-insensitive.
   */
  findCustomerByEmail(email: string): Promise<CustomerRow | null>;

  /**
   * Insert or update a customer by email. Returns the resulting row.
   */
  upsertCustomer(input: {
    name: string;
    email: string;
    phone: string;
    address: string;
  }): Promise<CustomerRow>;

  /**
   * Look up an existing order by clientOrderId, used for idempotency.
   */
  findOrderByClientOrderId(clientOrderId: string): Promise<OrderRow | null>;

  /**
   * Insert a new order. The implementation MUST guarantee the unique
   * constraint on `client_order_id` and surface a typed error on conflict.
   */
  insertOrder(input: {
    orderNumber: string;
    customerId: string;
    items: OrderItemRecord[];
    totalAmount: number;
    status: string;
    clientOrderId: string;
  }): Promise<OrderRow>;

  /** Friendly close. */
  close(): Promise<void>;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  items_json: OrderItemRecord[];
  total_amount: number;
  status: string;
  client_order_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** Thrown when the unique constraint on client_order_id is hit. */
export class DuplicateOrderError extends Error {
  readonly code = "DUPLICATE_ORDER";
  constructor(message = "Duplicate order") {
    super(message);
    this.name = "DuplicateOrderError";
  }
}