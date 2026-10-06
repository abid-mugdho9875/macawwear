import { randomBytes } from "node:crypto";

/**
 * Generate a human-friendly, sortable, unique-ish order number.
 *
 * Format: ORD-YYYYMMDD-XXXX
 *   - YYYYMMDD makes it sort chronologically.
 *   - XXXX is 4 base36 chars from `crypto.randomBytes` — 36^4 ≈ 1.7M values per
 *     day, sufficient for collision avoidance in practice; we still verify
 *     uniqueness against the database before accepting the order.
 */
export function generateOrderNumber(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const tail = randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return `ORD-${yyyy}${mm}${dd}-${tail}`;
}

/**
 * Strip anything that isn't a safe filename/database id character. Used in
 * logs and the rare places we interpolate identifiers into emails.
 */
export function sanitizeForLog(value: string, max = 80): string {
  return value.replace(/[^A-Za-z0-9_@.\-:+]/g, "_").slice(0, max);
}