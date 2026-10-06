import {
  CORS_HEADERS,
  jsonResponse,
  successBody,
} from "./src/api";

/**
 * GET /.netlify/functions/health
 *
 * Liveness probe — confirms the function is reachable. If `DATABASE_URL` is
 * set, attempts a `SELECT 1` and reports reachability.
 *
 * OPTIONS short-circuit is performed at the [[redirects]] layer in netlify.toml,
 * so this handler responds only to GET.
 */

export default async function handler(): Promise<Response> {
  const startedAt = Date.now();

  let dbReachable = false;
  let dbError: string | undefined;
  if (process.env.DATABASE_URL) {
    try {
      // Lazy import keeps cold-start small when DB isn't configured.
      const { default: pg } = await import("pg");
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.PGSSLMODE === "disable"
            ? false
            : { rejectUnauthorized: false },
        max: 1,
      });
      try {
        const r = await pool.query("SELECT 1 AS ok");
        dbReachable = r.rows?.[0]?.ok === 1;
      } finally {
        await pool.end();
      }
    } catch (err) {
      dbError = (err as Error).message?.slice(0, 160);
    }
  }

  return jsonResponse(
    200,
    successBody({
      status: "ok",
      durationMs: Date.now() - startedAt,
      db: process.env.DATABASE_URL
        ? { configured: true, reachable: dbReachable, error: dbError }
        : { configured: false },
      timestamp: new Date().toISOString(),
    }),
    CORS_HEADERS,
  );
}