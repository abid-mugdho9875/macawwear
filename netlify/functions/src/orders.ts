import { getProductById, PRODUCTS } from "@/data/products";
import { createOrderRequestSchema } from "@/utils/schemas";
import type {
  CartItem,
  CustomerInput,
  OrderItemRecord,
} from "@/types";
import { DuplicateOrderError, type Database } from "./db";
import { generateOrderNumber, sanitizeForLog } from "./orderNumber";
import { createResendClient, type EmailService } from "./email";

/**
 * Pure-ish order processing. Given a request, a DB, and an email client,
 * produce a result (or an error).
 *
 * The web of "what to do next" (parse → validate → price → save → email → reply)
 * lives here, not in the function handler, so tests can drive it directly.
 */

export interface ProcessOrderDeps {
  db: Database;
  email?: EmailService;
  company: {
    name: string;
    contact: { phone: string; address: string; email: string };
    currency: { code: string; locale: string };
  };
  now?: () => Date;
  logger?: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

export interface ProcessOrderInput {
  rawBody: unknown;
  clientOrderId: string;
}

export interface ProcessOrderResult {
  orderNumber: string;
  total: number;
  emailSent: boolean;
  emailWarning?: string;
}

/** Result of a logical run; the caller converts to an HTTP Response. */
export type ProcessOrderOutcome =
  | { kind: "ok"; result: ProcessOrderResult }
  | { kind: "validation_error"; message: string; details?: unknown }
  | { kind: "duplicate"; result: ProcessOrderResult }
  | { kind: "internal_error"; message: string };

/**
 * Validate customer data, product IDs, availability, sizes/colors, and
 * quantity. Returns the per-line priced records and the grand total — all
 * computed from the authoritative catalog.
 */
function priceOrder(items: CartItem[]): {
  records: OrderItemRecord[];
  total: number;
} {
  const records: OrderItemRecord[] = [];
  let total = 0;
  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product) {
      throw new PricingError(
        `Unknown product "${sanitizeForLog(item.productId)}".`,
      );
    }
    if (!product.available) {
      throw new PricingError(`Product "${product.name}" is not available.`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new PricingError(
        `Invalid quantity for "${product.name}".`,
      );
    }
    if (product.sizes && product.sizes.length > 0) {
      if (!item.size || !product.sizes.includes(item.size)) {
        throw new PricingError(
          `Please choose a valid size for "${product.name}".`,
        );
      }
    }
    if (product.colors && product.colors.length > 0) {
      if (!item.color || !product.colors.includes(item.color)) {
        throw new PricingError(
          `Please choose a valid color for "${product.name}".`,
        );
      }
    }
    const unitPrice = product.price;
    const subtotal = unitPrice * item.quantity;
    records.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      size: item.size,
      color: item.color,
    });
    total += subtotal;
  }
  return { records, total };
}

class PricingError extends Error {
  readonly code = "PRICING_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

const consoleLogger = {
  info: (msg: string, meta?: Record<string, unknown>) => safeLog("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => safeLog("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => safeLog("error", msg, meta),
};

function safeLog(level: string, msg: string, meta?: Record<string, unknown>) {
  // Never log secrets, emails, addresses, or full payloads.
  const safe: Record<string, unknown> = { level, msg };
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (k === "email" || k === "address" || k === "phone") continue;
      safe[k] = v;
    }
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(safe));
}

export async function processOrder(
  deps: ProcessOrderDeps,
  input: ProcessOrderInput,
): Promise<ProcessOrderOutcome> {
  const logger = deps.logger ?? consoleLogger;

  // 1. Parse + validate input.
  const parsed = createOrderRequestSchema.safeParse(input.rawBody);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      kind: "validation_error",
      message: first?.message ?? "Please check your details and try again.",
      details: parsed.error.flatten(),
    };
  }

  const { customer, items, clientOrderId, paymentMethod } = parsed.data;

  // 2. Idempotency: if we've already seen this clientOrderId, return it.
  try {
    const existing = await deps.db.findOrderByClientOrderId(clientOrderId);
    if (existing) {
      logger.info("idempotent_replay", {
        orderNumber: existing.order_number,
      });
      return {
        kind: "duplicate",
        result: {
          orderNumber: existing.order_number,
          total: Number(existing.total_amount),
          emailSent: true,
        },
      };
    }
  } catch (err) {
    logger.error("db_lookup_failed", {
      error: (err as Error).message?.slice(0, 120),
    });
    return { kind: "internal_error", message: "Database lookup failed." };
  }

  // 3. Validate products, sizes, colors, availability, and price everything.
  let priced: { records: OrderItemRecord[]; total: number };
  try {
    priced = priceOrder(items);
  } catch (err) {
    const msg =
      err instanceof PricingError
        ? err.message
        : "Some items in your cart are no longer available.";
    return { kind: "validation_error", message: msg };
  }

  // 4. Upsert customer, create order.
  let savedOrder;
  let orderNumber: string;
  try {
    const customerRow = await deps.db.upsertCustomer(customer);
    orderNumber = generateOrderNumber(deps.now ? deps.now() : new Date());
    try {
      savedOrder = await deps.db.insertOrder({
        orderNumber,
        customerId: customerRow.id,
        items: priced.records,
        totalAmount: priced.total,
        status: "pending",
        clientOrderId,
      });
    } catch (err) {
      if (err instanceof DuplicateOrderError) {
        const existing = await deps.db.findOrderByClientOrderId(clientOrderId);
        if (existing) {
          return {
            kind: "duplicate",
            result: {
              orderNumber: existing.order_number,
              total: Number(existing.total_amount),
              emailSent: true,
            },
          };
        }
      }
      throw err;
    }
  } catch (err) {
    logger.error("db_save_failed", {
      error: (err as Error).message?.slice(0, 120),
    });
    return {
      kind: "internal_error",
      message:
        "We couldn't save your order. Please try again in a moment.",
    };
  }

  // 5. Send confirmation email — only when an email client is configured.
  // If no client is provided (e.g. RESEND_API_KEY isn't set yet), we still
  // return success: the order is saved, the customer just won't get an
  // email until the operator configures one.
  let emailSent = false;
  let emailWarning: string | undefined;

  if (deps.email) {
    try {
      await deps.email.sendOrderConfirmation({
        to: customer.email,
        customerName: customer.name,
        orderNumber: savedOrder.order_number,
        items: priced.records,
        total: priced.total,
        company: deps.company,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        paymentMethod,
      });
      emailSent = true;
    } catch (err) {
      emailSent = false;
      emailWarning = "delivery pending";
      logger.warn("email_send_failed", {
        orderNumber: savedOrder.order_number,
        error: (err as Error).message?.slice(0, 120),
      });
    }
  } else {
    emailWarning = "email not configured";
  }

  return {
    kind: "ok",
    result: {
      orderNumber: savedOrder.order_number,
      total: Number(savedOrder.total_amount),
      emailSent,
      ...(emailWarning ? { emailWarning } : {}),
    },
  };
}

/** Re-export for convenience in tests / entrypoints. */
export { createResendClient };
export type { EmailService } from "./email";
export { PRODUCTS, getProductById };
export type { CustomerInput };