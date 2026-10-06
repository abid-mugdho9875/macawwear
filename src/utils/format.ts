import { company } from "@/config/company";

/**
 * Format a numeric amount as currency using the configured locale/symbol.
 * No rounding tricks — the backend is the source of truth, this is display-only.
 */
export function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat(company.currency.locale, {
      style: "currency",
      currency: company.currency.code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for environments without full ICU support.
    return `${company.currency.symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Generate a short, URL-safe client-side identifier. Not cryptographic —
 * just enough entropy to dedupe accidental double-submits from the same browser.
 */
export function generateClientOrderId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}

/** Tiny class-name joiner. False-y values are dropped. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}