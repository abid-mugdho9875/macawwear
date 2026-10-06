import { randomUUID } from "node:crypto";
import type {
  CustomerRow,
  Database,
  OrderRow,
} from "../../netlify/functions/src/db";
import { DuplicateOrderError } from "../../netlify/functions/src/db";
import type { OrderItemRecord } from "../types";

/**
 * Hand-rolled in-memory database for tests. Mirrors the small surface of
 * the Supabase adapter — we don't ship a fake Postgres binary, but we do
 * enforce the unique constraints so behavior is realistic.
 */
export function createInMemoryDb(): Database & {
  raw: {
    customers: CustomerRow[];
    orders: OrderRow[];
  };
  __simulateDbError: (kind: "lookup" | "upsert" | "insert" | null) => void;
} {
  const customers: CustomerRow[] = [];
  const orders: OrderRow[] = [];
  let dbError: "lookup" | "upsert" | "insert" | null = null;

  const maybeFail = (kind: NonNullable<typeof dbError>) => {
    if (dbError === kind) {
      throw new Error(`Simulated DB error during ${kind}`);
    }
  };

  return {
    raw: { customers, orders },

    __simulateDbError(kind) {
      dbError = kind;
    },

    async findCustomerByEmail(email) {
      maybeFail("lookup");
      const e = email.toLowerCase();
      return customers.find((c) => c.email.toLowerCase() === e) ?? null;
    },

    async upsertCustomer({ name, email, phone, address }) {
      maybeFail("upsert");
      const e = email.toLowerCase();
      const existing = customers.find((c) => c.email.toLowerCase() === e);
      const now = new Date().toISOString();
      if (existing) {
        existing.name = name;
        existing.phone = phone;
        existing.address = address;
        existing.updated_at = now;
        return existing;
      }
      const row: CustomerRow = {
        id: randomUUID(),
        name,
        email,
        phone,
        address,
        created_at: now,
        updated_at: now,
      };
      customers.push(row);
      return row;
    },

    async findOrderByClientOrderId(clientOrderId) {
      maybeFail("lookup");
      return orders.find((o) => o.client_order_id === clientOrderId) ?? null;
    },

    async insertOrder({
      orderNumber,
      customerId,
      items,
      totalAmount,
      status: statusVal,
      clientOrderId,
    }) {
      maybeFail("insert");
      if (orders.some((o) => o.client_order_id === clientOrderId)) {
        throw new DuplicateOrderError();
      }
      const now = new Date().toISOString();
      const row: OrderRow = {
        id: randomUUID(),
        order_number: orderNumber,
        customer_id: customerId,
        items_json: items as OrderItemRecord[],
        total_amount: Number(totalAmount),
        status: statusVal,
        client_order_id: clientOrderId,
        created_at: now,
        updated_at: now,
      };
      orders.push(row);
      return row;
    },

    async close() {
      /* no-op */
    },
  };
}