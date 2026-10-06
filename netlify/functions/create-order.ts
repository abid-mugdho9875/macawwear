import {
  CORS_HEADERS,
  MAX_BODY_BYTES,
  errorBody,
  jsonResponse,
  successBody,
} from "./src/api";
import { checkRateLimit } from "./src/rateLimit";
import { processOrder } from "./src/orders";
import { createResendClient } from "./src/email";
import { createSupabaseDatabase } from "./src/dbSupabase";
//added this part
import type { Context } from "@netlify/functions";


/**
 * POST /.netlify/functions/create-order
 *
 * Validates the request, computes the authoritative total from the
 * server-side catalog, persists the order, sends a confirmation email,
 * and returns a uniform JSON envelope.
 *
 * Idempotent on `clientOrderId`. Rate-limited per IP.
 */

//interface NetlifyLikeEvent {
 // httpMethod: string;
//  headers: Record<string, string | undefined>;
  //body: string | null;
//}

//type NetlifyLikeContext = unknown;

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/*function clientIp(headers: Record<string, string | undefined>): string {
  return (
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["x-real-ip"] ||
    headers["client-ip"] ||
    "unknown"
  );
}*/
//export default async function handler(
  //event: NetlifyLikeEvent,
  //_ctx: NetlifyLikeContext,
//): Promise<Response> {
  // CORS preflight.
  //if (event.httpMethod === "OPTIONS") {
   // return new Response("", { status: 204, headers: CORS_HEADERS });
  //}
  export default async function handler(
  request: Request,
  _ctx: Context,
): Promise<Response> {
//added this part
 if (request.method === "OPTIONS") {
  return new Response("", {
    status: 204,
    headers: CORS_HEADERS,
  });
}
 if (request.method !== "POST") {
    return jsonResponse(
      405,
      errorBody("METHOD_NOT_ALLOWED", "Only POST is allowed."),
      CORS_HEADERS,
    );
  }

  // Rate limit per IP.
  //const ip = clientIp(event.headers);
  const ip =
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  request.headers.get("client-ip") ||
  "unknown";
  const rl = checkRateLimit(`order:${ip}`);
  if (!rl.allowed) {
    return jsonResponse(
      429,
      errorBody(
        "RATE_LIMITED",
        `Too many orders. Try again in ${rl.retryAfterSec ?? 60}s.`,
      ),
      { ...CORS_HEADERS, "Retry-After": String(rl.retryAfterSec ?? 60) },
    );
  }

  // Body size limit.
  //const bodyStr = event.body ?? "";
  const bodyStr = await request.text();
  if (bodyStr.length > MAX_BODY_BYTES) {
    return jsonResponse(
      413,
      errorBody("PAYLOAD_TOO_LARGE", "Request body is too large."),
      CORS_HEADERS,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(bodyStr);
  } catch {
    return jsonResponse(
      400,
      errorBody("INVALID_JSON", "Request body must be valid JSON."),
      CORS_HEADERS,
    );
  }

  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as { clientOrderId?: unknown }).clientOrderId !== "string"
  ) {
    return jsonResponse(
      400,
      errorBody(
        "VALIDATION_ERROR",
        "Missing clientOrderId. Please refresh and try again.",
      ),
      CORS_HEADERS,
    );
  }

  const clientOrderId = (raw as { clientOrderId: string }).clientOrderId;

  // Wire dependencies. The DB and Email client are built per request — they're
  // cheap to construct and this keeps state isolated.
  let db;
  try {
    const dbUrl = getEnv("DATABASE_URL");
    db = createSupabaseDatabase(dbUrl);
  } catch (_err) {
    return jsonResponse(
      500,
      errorBody(
        "CONFIG_ERROR",
        "Server is not configured correctly. Please contact support.",
      ),
      CORS_HEADERS,
    );
  }

  // Email is optional — if RESEND_API_KEY / EMAIL_FROM aren't set, we just
  // don't send a confirmation email. The order still saves.
  let email: ReturnType<typeof createResendClient> | undefined;
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const apiKey = getEnv("RESEND_API_KEY");
    const fromAddress = getEnv("EMAIL_FROM");
    const companyName = getEnv("COMPANY_NAME", "Macaw");
    email = createResendClient({
      apiKey,
      from: fromAddress,
      companyName,
    });
  }

  const companyName = process.env.COMPANY_NAME ?? "Macaw";
  const company = {
    name: companyName,
    contact: {
      phone: getEnv("COMPANY_PHONE", ""),
      address: getEnv("COMPANY_ADDRESS", ""),
      email: getEnv("COMPANY_EMAIL", ""),
    },
    currency: {
      code: getEnv("CURRENCY_CODE", "BDT"),
      locale: getEnv("CURRENCY_LOCALE", "en-BD"),
    },
  };

  const outcome = await processOrder(
    { db, email, company },
    { rawBody: raw, clientOrderId },
  );

  switch (outcome.kind) {
    case "ok":
    case "duplicate":
      return jsonResponse(
        200,
        successBody(outcome.result),
        CORS_HEADERS,
      );
    case "validation_error":
      return jsonResponse(
        400,
        errorBody("VALIDATION_ERROR", outcome.message, outcome.details),
        CORS_HEADERS,
      );
    case "internal_error":
      return jsonResponse(
        500,
        errorBody("INTERNAL_ERROR", outcome.message),
        CORS_HEADERS,
      );
  }
}