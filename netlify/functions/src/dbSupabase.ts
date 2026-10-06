import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  CustomerRow,
  Database,
  DuplicateOrderError,
  OrderRow,
} from "./db";


/**
 * Supabase / Postgres adapter using `pg`.
 *
 * Connection settings:
 *  - Uses `DATABASE_URL` from the environment (Supabase Transaction pooler).
 *  - Keeps a single `pg.Pool` for the lifetime of the function process.
 */

let pool: pg.Pool | null = null;

function getPool(connectionString: string): pg.Pool {
  if (pool) return pool;
  pool = new pg.Pool({
    connectionString,
    // Tighter SSL: Supabase requires it in production.
    ssl:
      process.env.PGSSLMODE === "disable"
        ? false
        : { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

export function createSupabaseDatabase(connectionString: string): Database {
  const p = getPool(connectionString);

  return {
    async findCustomerByEmail(email) {
      const { rows } = await p.query<CustomerRow>(
        `SELECT id, name, email, phone, address, created_at, updated_at
         FROM customers
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1`,
      [email]);
      return rows[0] ?? null;
    },

    async upsertCustomer({ name, email, phone, address }) {
      const id = randomUUID();
      const { rows } = await p.query<CustomerRow>(
        `INSERT INTO customers (id, name, email, phone, address)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (LOWER(email)) DO UPDATE
           SET name = EXCLUDED.name,
               phone = EXCLUDED.phone,
               address = EXCLUDED.address,
               updated_at = NOW()
         RETURNING id, name, email, phone, address, created_at, updated_at`,
        [id, name, email, phone, address],
      );
      return rows[0];
    },

    async findOrderByClientOrderId(clientOrderId) {
      const { rows } = await p.query<OrderRow>(
        `SELECT id, order_number, customer_id, items_json, total_amount, status, client_order_id, created_at, updated_at
         FROM orders
         WHERE client_order_id = $1
         LIMIT 1`,
        [clientOrderId],
      );
      return rows[0] ?? null;
    },

    async insertOrder({
      orderNumber,
      customerId,
      items,
      totalAmount,
      status,
      clientOrderId,
    }) {
      try {
        const { rows } = await p.query<OrderRow>(
          `INSERT INTO orders
             (order_number, customer_id, items_json, total_amount, status, client_order_id)
           VALUES ($1, $2, $3::jsonb, $4, $5, $6)
           RETURNING id, order_number, customer_id, items_json, total_amount, status, client_order_id, created_at, updated_at`,
          [orderNumber, customerId, JSON.stringify(items), totalAmount, status, clientOrderId],
        );
        return rows[0];
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "23505" // unique_violation
        ) {
          throw new DuplicateOrderError();
        }
        throw err;
      }
    },

    async close() {
      if (pool) {
        await pool.end();
        pool = null;
      }
    },
  };
}

// Note: `pg` is not installed as a dep at the workspace root because we want
// the function runtime to be the only place that imports it. Netlify's
// esbuild bundles it into the function. Tests use the in-memory adapter.