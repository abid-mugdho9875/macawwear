import type {
  ApiError,
  ApiResponse,
  ApiSuccess,
} from "@/types";

/**
 * Standard API envelope helpers. We hand-craft responses (instead of importing
 * @netlify/functions Response helpers in case the runtime changes) so behavior
 * is identical across Node tests and Netlify's Edge/Function runtime.
 */

export function jsonResponse<T>(
  status: number,
  body: ApiResponse<T>,
  extraHeaders: Record<string, string> = {},
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  };
  return new Response(JSON.stringify(body), { status, headers });
}

export function successBody<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function errorBody(
  code: string,
  message: string,
  details?: unknown,
): ApiError {
  const error: ApiError["error"] = { code, message };
  if (details !== undefined) error.details = details;
  return { success: false, error };
}

export const CORS_HEADERS: Record<string, string> = {
  // Same-origin in production. These exist for local dev with separate frontends.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Max request body size in bytes (32 KB is more than enough for an order). */
export const MAX_BODY_BYTES = 32 * 1024;

/** A coarse per-IP rate limit. 10 orders per minute. */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 10;