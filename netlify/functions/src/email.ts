import type { OrderItemRecord, PaymentMethod } from "@/types";

/**
 * Tiny EmailService interface. The production implementation talks to Resend;
 * tests inject a fake that records calls.
 */
export interface EmailService {
  sendOrderConfirmation(input: OrderConfirmationEmail): Promise<void>;
}

export interface OrderConfirmationEmail {
  to: string;
  customerName: string;
  orderNumber: string;
  items: OrderItemRecord[];
  total: number;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: PaymentMethod;
  company: {
    name: string;
    contact: { phone: string; address: string; email: string };
    currency: { code: string; locale: string };
  };
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
};

interface ResendConfig {
  apiKey: string;
  from: string;
  companyName: string;
}

/**
 * Resend-backed implementation. Lazy-imports the SDK so the function bundle
 * stays small and tests can run without the dependency being installed.
 */
export function createResendClient(cfg: ResendConfig): EmailService {
  return {
    async sendOrderConfirmation(input) {
      // Lazy import — keeps cold-start small and lets tests mock the call.
      const { Resend } = await import("resend");
      const resend = new Resend(cfg.apiKey);
      const subject = `Order ${input.orderNumber} confirmed`;
      const html = renderOrderEmailHtml(input, cfg.companyName);
      const text = renderOrderEmailText(input, cfg.companyName);

      const { error } = await resend.emails.send({
        from: `${cfg.companyName} <${cfg.from}>`,
        to: input.to,
        subject,
        html,
        text,
      });
      if (error) {
        throw new Error(`Resend error: ${error.message ?? "unknown"}`);
      }
    },
  };
}

function fmt(amount: number, locale: string, code: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderOrderEmailHtml(
  input: OrderConfirmationEmail,
  companyName: string,
): string {
  const rows = input.items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(it.name)}</strong>
            <div style="font-size:12px;color:#6b7280;">
              ${it.size ? `Size: ${escapeHtml(it.size)}` : ""}
              ${it.size && it.color ? " · " : ""}
              ${it.color ? `Color: ${escapeHtml(it.color)}` : ""}
            </div>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(it.unitPrice, input.company.currency.locale, input.company.currency.code)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(it.subtotal, input.company.currency.locale, input.company.currency.code)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="font-family:Inter,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 8px 0;font-size:22px;">Thanks for your order!</h1>
    <p style="margin:0 0 16px 0;color:#475569;">Hi ${escapeHtml(input.customerName)}, we've received your order at <strong>${escapeHtml(companyName)}</strong>.</p>

    <p style="margin:0 0 8px 0;font-size:14px;color:#475569;">Order number</p>
    <p style="margin:0 0 16px 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:600;">${escapeHtml(input.orderNumber)}</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px 12px;text-align:left;">Item</th>
          <th style="padding:8px 12px;text-align:center;">Qty</th>
          <th style="padding:8px 12px;text-align:right;">Unit</th>
          <th style="padding:8px 12px;text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px;text-align:right;font-weight:600;">Total</td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:16px;">${fmt(input.total, input.company.currency.locale, input.company.currency.code)}</td>
        </tr>
      </tfoot>
    </table>

    <h2 style="margin:24px 0 8px 0;font-size:16px;">Delivery details</h2>
    <p style="margin:0 0 4px 0;font-size:14px;color:#475569;"><strong>Phone:</strong> ${escapeHtml(input.customerPhone)}</p>
    <p style="margin:0;font-size:14px;color:#475569;"><strong>Address:</strong> ${escapeHtml(input.customerAddress)}</p>

    <p style="margin:24px 0 0 0;font-size:14px;color:#475569;">If you have any questions, just reply to this email — we're happy to help.</p>
    <p style="margin:16px 0 0 0;font-size:14px;">Thank you,<br/><strong>${escapeHtml(companyName)}</strong></p>
  </div>
</body></html>`;
}

function renderOrderEmailText(
  input: OrderConfirmationEmail,
  companyName: string,
): string {
  const lines = input.items.map(
    (it) =>
      `- ${it.name}${it.size ? ` (${it.size})` : ""}${it.color ? ` / ${it.color}` : ""}  x${it.quantity}  ${fmt(it.unitPrice, input.company.currency.locale, input.company.currency.code)}  =  ${fmt(it.subtotal, input.company.currency.locale, input.company.currency.code)}`,
  );
  return [
    `Thanks for your order!`,
    ``,
    `Hi ${input.customerName}, we've received your order at ${companyName}.`,
    ``,
    `Order number: ${input.orderNumber}`,
    ``,
    `Items:`,
    ...lines,
    ``,
    `Total: ${fmt(input.total, input.company.currency.locale, input.company.currency.code)}`,
    ``,
    `Payment: ${PAYMENT_LABELS[input.paymentMethod] ?? input.paymentMethod}`,
    ``,
    `Phone: ${input.customerPhone}`,
    `Address: ${input.customerAddress}`,
    ``,
    `If you have any questions, just reply to this email.`,
    `Thank you,`,
    `${companyName}`,
  ].join("\n");
}