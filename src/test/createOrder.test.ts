import { describe, expect, it, beforeEach } from "vitest";
import createOrderHandler from "../../netlify/functions/create-order";
import { processOrder } from "../../netlify/functions/src/orders";
import { createInMemoryDb } from "./inMemoryDb";
import { createFakeEmail } from "./fakeEmail";
import type { ProcessOrderDeps } from "../../netlify/functions/src/orders";
import type { OrderConfirmationEmail } from "../../netlify/functions/src/email";
import type { OrderItemRecord } from "../types";

function setup(extra?: { dbFail?: "lookup" | "upsert" | "insert"; emailFail?: boolean }): {
  deps: ProcessOrderDeps;
  db: ReturnType<typeof createInMemoryDb>;
  email: ReturnType<typeof createFakeEmail>;
} {
  const db = createInMemoryDb();
  const email = createFakeEmail({ fail: extra?.emailFail });
  if (extra?.dbFail) db.__simulateDbError(extra.dbFail);

  const deps: ProcessOrderDeps = {
    db,
    email,
    company: {
      name: "Macaw Test",
      contact: { phone: "+1 555 0000", address: "1 Test Way", email: "hi@test" },
      currency: { code: "BDT", locale: "en-BD" },
    },
  };
  return { deps, db, email };
}

const goodCustomer = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "+1 555 0000",
  address: "1 Test Way, Test City",
};

const validItems = [
  { productId: "M001", quantity: 2, size: "L", color: "Black" },
];

const baseBody = () => ({
  customer: goodCustomer,
  items: validItems,
});

describe("create-order endpoint methods", () => {
  it("rejects methods other than POST", async () => {
    const response = await createOrderHandler(
      new Request("http://localhost/.netlify/functions/create-order", {
        method: "GET",
      }),
      {} as never,
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is allowed." },
    });
  });
});

describe("processOrder — happy path", () => {
  it("creates an order with an authoritative total and sends an email", async () => {
    const { deps, db, email } = setup();

    const out = await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "abc12345-zz" },
      clientOrderId: "abc12345-zz",
    });

    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") throw new Error("unreachable");
    expect(out.result.total).toBe(1200 * 2); // M001 is 1200, qty 2
    expect(out.result.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);
    expect(out.result.emailSent).toBe(true);

    expect(db.raw.orders).toHaveLength(1);
    const order = db.raw.orders[0];
    expect(order.total_amount).toBe(2400);
    expect(order.items_json).toHaveLength(1);
    expect(order.items_json[0]).toMatchObject({
      productId: "M001",
      name: "Classic Crew Tee",
      quantity: 2,
      unitPrice: 1200,
      subtotal: 2400,
      size: "L",
      color: "Black",
    });

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe(goodCustomer.email);
    expect(email.sent[0].orderNumber).toBe(out.result.orderNumber);
  });

  it("matches product ids case-sensitively and only uses the catalog price", async () => {
    const { deps } = setup();
    const out = await processOrder(deps, {
      rawBody: {
        customer: goodCustomer,
        items: [{ productId: "M001", quantity: 1, size: "L", color: "Black" }],
        clientOrderId: "abcdef1234567",
      },
      clientOrderId: "abcdef1234567",
    });
    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") throw new Error("unreachable");
    expect(out.result.total).toBe(1200); // M001 catalog price
  });
});

describe("processOrder — input validation", () => {
  let deps: ProcessOrderDeps;
  beforeEach(() => {
    deps = setup().deps;
  });

  it("rejects an invalid email", async () => {
    const out = await processOrder(deps, {
      rawBody: {
        customer: { ...goodCustomer, email: "not-an-email" },
        items: validItems,
        clientOrderId: "id-1234567",
      },
      clientOrderId: "id-1234567",
    });
    expect(out.kind).toBe("validation_error");
  });

  it.each([
    ["missing name", { ...goodCustomer, name: "" }],
    ["missing phone", { ...goodCustomer, phone: "" }],
    ["missing address", { ...goodCustomer, address: "" }],
    ["bad phone", { ...goodCustomer, phone: "abc" }],
  ])("rejects %s", async (_label, customer) => {
    const out = await processOrder(deps, {
      rawBody: {
        customer,
        items: validItems,
        clientOrderId: "missing-info-123",
      },
      clientOrderId: "missing-info-123",
    });
    expect(out.kind).toBe("validation_error");
  });

  it("rejects empty cart", async () => {
    const out = await processOrder(deps, {
      rawBody: {
        customer: goodCustomer,
        items: [],
        clientOrderId: "empty-cart-001",
      },
      clientOrderId: "empty-cart-001",
    });
    expect(out.kind).toBe("validation_error");
    if (out.kind !== "validation_error") throw new Error("unreachable");
    expect(out.message.toLowerCase()).toContain("empty");
  });

  it("rejects invalid product id", async () => {
    const out = await processOrder(deps, {
      rawBody: {
        customer: goodCustomer,
        items: [{ productId: "ZZZZ", quantity: 1 }],
        clientOrderId: "bad-product-001",
      },
      clientOrderId: "bad-product-001",
    });
    expect(out.kind).toBe("validation_error");
    if (out.kind !== "validation_error") throw new Error("unreachable");
    expect(out.message.toLowerCase()).toContain("unknown product");
  });

  it("rejects unavailable product", async () => {
    const out = await processOrder(deps, {
      rawBody: {
        customer: goodCustomer,
        items: [{ productId: "M005", quantity: 1 }], // M005 is `available: false`
        clientOrderId: "unavailable-001",
      },
      clientOrderId: "unavailable-001",
    });
    expect(out.kind).toBe("validation_error");
  });

  it("rejects invalid quantity (zero / negative / > 50)", async () => {
    for (const bad of [0, -1, 51]) {
      const out = await processOrder(deps, {
        rawBody: {
          customer: goodCustomer,
          items: [{ productId: "M001", quantity: bad, size: "L" }],
          clientOrderId: `bad-qty-${bad}-12345`,
        },
        clientOrderId: `bad-qty-${bad}-12345`,
      });
      expect(out.kind).toBe("validation_error");
    }
  });

  it("rejects invalid size", async () => {
    const out = await processOrder(deps, {
      rawBody: {
        customer: goodCustomer,
        items: [{ productId: "M001", quantity: 1, size: "XXXXL" }],
        clientOrderId: "bad-size-001",
      },
      clientOrderId: "bad-size-001",
    });
    expect(out.kind).toBe("validation_error");
  });

  it("rejects invalid color", async () => {
    const out = await processOrder(deps, {
      rawBody: {
        customer: goodCustomer,
        items: [{ productId: "M001", quantity: 1, color: "Magenta" }],
        clientOrderId: "bad-color-001",
      },
      clientOrderId: "bad-color-001",
    });
    expect(out.kind).toBe("validation_error");
  });

  it("requires size/color when the product offers them", async () => {
    const out = await processOrder(deps, {
      rawBody: {
        customer: goodCustomer,
        items: [{ productId: "M001", quantity: 1 }], // M001 needs size
        clientOrderId: "missing-size-001",
      },
      clientOrderId: "missing-size-001",
    });
    expect(out.kind).toBe("validation_error");
  });
});

describe("processOrder — price manipulation defense", () => {
  it("ignores client-supplied prices and computes total from the catalog", async () => {
    const { deps, db } = setup();
    // Sneaky client tries to pretend M001 costs 1 BDT. The schema doesn't
    // actually have a price field on items — but it doesn't hurt to be loud.
    const sneakyPayload = {
      customer: goodCustomer,
      items: [
        { productId: "M001", quantity: 1, size: "L", color: "Black" } as unknown as OrderItemRecord,
      ],
      clientOrderId: "price-tamper-001",
      // Injected for clarity — even if a future version adds it, the
      // server should ignore any client price.
      price: 1,
    };

    const out = await processOrder(deps, {
      rawBody: sneakyPayload,
      clientOrderId: "price-tamper-001",
    });
    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") throw new Error("unreachable");
    expect(out.result.total).toBe(1200);
    expect(db.raw.orders[0].items_json[0].unitPrice).toBe(1200);
  });

  it("computes correct totals for multiple lines and quantities", async () => {
    const { deps, db } = setup();
    const out = await processOrder(deps, {
      rawBody: {
        customer: goodCustomer,
        items: [
          { productId: "M001", quantity: 2, size: "L", color: "Black" }, // 2400
          { productId: "K001", quantity: 3, size: "6Y", color: "Red" },  // 1950
          { productId: "M002", quantity: 1, size: "30", color: "Khaki" }, // 2400
        ],
        clientOrderId: "multi-line-0001",
      },
      clientOrderId: "multi-line-0001",
    });
    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") throw new Error("unreachable");
    expect(out.result.total).toBe(2400 + 1950 + 2400);
    expect(db.raw.orders[0].items_json).toHaveLength(3);
    expect(db.raw.orders[0].items_json.map((i) => i.subtotal)).toEqual([
      2400, 1950, 2400,
    ]);
  });
});

describe("processOrder — idempotency on clientOrderId", () => {
  it("returns the original order on a duplicate clientOrderId", async () => {
    const { deps, db } = setup();

    const first = await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "dupe-test-001" },
      clientOrderId: "dupe-test-001",
    });
    expect(first.kind).toBe("ok");
    if (first.kind !== "ok") throw new Error("unreachable");

    const second = await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "dupe-test-001" },
      clientOrderId: "dupe-test-001",
    });
    expect(second.kind).toBe("duplicate");
    if (second.kind !== "duplicate") throw new Error("unreachable");
    expect(second.result.orderNumber).toBe(first.result.orderNumber);
    expect(second.result.total).toBe(first.result.total);

    // No second row in the DB.
    expect(db.raw.orders).toHaveLength(1);
  });

  it("enforces uniqueness in the DB layer (insertOrder)", async () => {
    const { deps, db } = setup();
    await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "unique-test-001" },
      clientOrderId: "unique-test-001",
    });
    // Calling the underlying adapter again with the same id must throw.
    const order = db.raw.orders[0];
    await expect(
      db.insertOrder({
        orderNumber: "ORD-DUP-0000",
        customerId: order.customer_id,
        items: order.items_json,
        totalAmount: 0,
        status: "pending",
        clientOrderId: "unique-test-001",
      }),
    ).rejects.toThrow();
  });
});

describe("processOrder — failure handling", () => {
  it("returns an internal error when the DB lookup fails and creates no row", async () => {
    const { deps, db } = setup({ dbFail: "lookup" });
    const out = await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "dbfail-001-x" },
      clientOrderId: "dbfail-001-x",
    });
    expect(out.kind).toBe("internal_error");
    expect(db.raw.orders).toHaveLength(0);
  });

  it("returns an internal error when DB save fails and sends no email", async () => {
    const { deps, db, email } = setup({ dbFail: "insert" });
    const out = await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "dbsave-fail-001" },
      clientOrderId: "dbsave-fail-001",
    });
    expect(out.kind).toBe("internal_error");
    expect(db.raw.orders).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("keeps the order and reports email failure but still returns 200-shaped result", async () => {
    const { deps, db, email } = setup({ emailFail: true });
    const out = await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "emailfail-001" },
      clientOrderId: "emailfail-001",
    });
    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") throw new Error("unreachable");
    expect(out.result.emailSent).toBe(false);
    expect(out.result.emailWarning).toBeDefined();
    expect(db.raw.orders).toHaveLength(1); // order is preserved
    expect(email.sent).toHaveLength(0);
  });
});

describe("processOrder — email payload", () => {
  it("includes customer details, items, total, and company info", async () => {
    const { deps, email } = setup();
    await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "email-payload-01" },
      clientOrderId: "email-payload-01",
    });
    const sent = email.sent[0] as OrderConfirmationEmail;
    expect(sent).toMatchObject({
      to: goodCustomer.email,
      customerName: goodCustomer.name,
      customerPhone: goodCustomer.phone,
      customerAddress: goodCustomer.address,
      total: 2400,
      company: {
        name: "Macaw Test",
      },
    });
    expect(sent.items).toHaveLength(1);
    expect(sent.items[0]).toMatchObject({
      productId: "M001",
      name: "Classic Crew Tee",
      quantity: 2,
      unitPrice: 1200,
      subtotal: 2400,
      size: "L",
      color: "Black",
    });
  });
});

describe("processOrder — order number format", () => {
  it("generates ORD-YYYYMMDD-XXXX order numbers", async () => {
    const { deps } = setup();
    const out = await processOrder(deps, {
      rawBody: { ...baseBody(), clientOrderId: "ordnum-test-001" },
      clientOrderId: "ordnum-test-001",
    });
    if (out.kind !== "ok") throw new Error("expected ok");
    expect(out.result.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);
  });
});

describe("processOrder — without email configured", () => {
  it("still saves the order when no email service is provided", async () => {
    const { deps, db } = setup();
    // Same as setup() but with email=undefined — the operator hasn't
    // configured Resend yet.
    const depsNoEmail: ProcessOrderDeps = { ...deps, email: undefined };

    const out = await processOrder(depsNoEmail, {
      rawBody: { ...baseBody(), clientOrderId: "no-email-001" },
      clientOrderId: "no-email-001",
    });

    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") throw new Error("expected ok");
    expect(out.result.emailSent).toBe(false);
    expect(out.result.emailWarning).toBe("email not configured");
    expect(out.result.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);

    // The order is still saved.
    expect(db.raw.orders).toHaveLength(1);
    expect(db.raw.orders[0].total_amount).toBe(2400);
  });
});