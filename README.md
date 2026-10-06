# Macaw — small ecommerce ordering website

A complete, production-ready clothing ecommerce ordering website for a small
company. Customers browse **Men** and **Kids**, add to cart, check out, and
receive an order confirmation by email.

```
Customer
   ↓
Netlify
├── React/Vite frontend
└── Netlify Functions backend
       ├── Supabase PostgreSQL
       └── Resend email
```

The architecture is intentionally lightweight: **no always-on server**, no
Render, no Redis, no inventory tables. Products live in a TypeScript file
that the browser reads directly for browsing and that the backend imports
to compute authoritative prices.

---

## Features

- Two categories: **Men** and **Kids**
- Static product catalog in `src/data/products.ts` — no DB calls to browse
- Product images in `public/products/` — no external image URLs
- Mobile-first, accessible Tailwind UI
- Cart persisted to `localStorage` (no customer PII)
- Server-authoritative pricing — the browser cannot set or modify prices
- Idempotent order submission (unique `clientOrderId` + DB constraint)
- Rate-limited, size-limited, JSON-validated order endpoint
- Supabase Postgres with RLS enabled
- Resend transactional confirmation emails
- Vitest unit + integration tests for backend and frontend

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Validation | Zod (shared between client + server) |
| Backend | Netlify Functions (Node 20) |
| Database | Supabase Postgres (`pg` driver) |
| Email | Resend |
| Tests | Vitest + Testing Library |

---

## Project structure

```
.
├── netlify/
│   ├── functions/
│   │   ├── create-order.ts       # POST /.netlify/functions/create-order
│   │   ├── health.ts             # GET  /.netlify/functions/health
│   │   ├── src/                  # shared backend logic (compiled to /lib)
│   │   │   ├── api.ts            # response envelope helpers
│   │   │   ├── rateLimit.ts      # in-memory per-IP limiter
│   │   │   ├── db.ts             # Database interface
│   │   │   ├── dbSupabase.ts     # pg-backed implementation
│   │   │   ├── orders.ts         # core order processing
│   │   │   ├── email.ts          # Resend client
│   │   │   └── orderNumber.ts    # ORD-YYYYMMDD-XXXX generator
│   │   └── tsconfig.json
│   └── (netlify.toml lives at the repo root)
├── src/
│   ├── components/               # Layout, ProductCard, ButtonSpinner
│   ├── pages/                    # Home, Products, Details, Cart, Checkout, Confirmation, NotFound
│   ├── context/CartContext.tsx
│   ├── data/products.ts          # ← THE product catalog
│   ├── hooks/useCart.ts
│   ├── services/orders.ts        # frontend → backend client
│   ├── config/company.ts         # ← THE company config
│   ├── types/                    # shared domain types
│   ├── utils/                    # format helpers, Zod schemas
│   └── test/                     # in-memory DB, fake email, *test.ts(x)
├── public/
│   └── products/                 # product images (m001.svg, k001.svg, …)
├── supabase/
│   ├── config.toml
│   └── migrations/001_initial.sql
├── netlify.toml
├── package.json
├── tsconfig.json / apps / app / node
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── .env.example
└── README.md
```

---

## Requirements

- Node.js **>= 18.17** (Netlify Functions run on Node 20 in production;
  CI on Node 18 is fine).
- npm 9+ (yarn/pnpm should also work).
- A Supabase project (free tier is enough).
- A Resend account (free tier is enough).
- A Netlify account (free tier is enough).

---

## Installation

```bash
npm install
cp .env.example .env
# then edit .env with real values (see "Environment variables" below)
```

---

## Environment variables

All variables are listed in `.env.example`. **Never commit a real `.env`.**

### Server-side (Netlify Function env, set in Netlify dashboard)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Supabase Postgres connection string (use the **Transaction pooler** URL). |
| `RESEND_API_KEY` | optional | Resend API key. Skip until you want to send confirmation emails. |
| `EMAIL_FROM` | optional | Verified "from" address (e.g. `orders@yourdomain.com`). Required only if `RESEND_API_KEY` is set. |
| `COMPANY_NAME` | optional | Brand name shown in the confirmation email. Defaults to `Macaw`. |

> The **only** required server-side variable is `DATABASE_URL`. Email is
> entirely optional — if `RESEND_API_KEY` / `EMAIL_FROM` are missing, orders
> still save to Supabase; the customer just sees a "we'll follow up shortly"
> banner instead of "confirmation email sent". Set them up later when you're
> ready to send emails.
>
> `RESEND_API_KEY` and `DATABASE_URL` are **server-only**. They are never
> bundled into the frontend by Vite because they are **not** prefixed with
> `VITE_`. Vite only exposes variables that begin with `VITE_` to the browser.

### Frontend (Vite env)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | optional | Absolute base URL for the API (e.g. `https://your-site.netlify.app`). If omitted, requests go same-origin to `/.netlify/functions/...`. |

---

## Local development

### 1. Run the frontend (Vite dev server)

```bash
npm run dev
```

This opens the app at `http://localhost:5173`.

In dev mode the Vite proxy forwards `/.netlify/functions/*` to the Netlify
Dev server on `:8888`, so you must run that in a second terminal:

```bash
# One-time: install the Netlify CLI
npm install -g netlify-cli

# Then:
netlify dev
```

The Netlify CLI uses the function source in `netlify/functions/`, compiles
it on the fly, and serves it on `http://localhost:8888/.netlify/functions/...`.

> If you don't want to install the Netlify CLI, you can run the pure Vite
> dev server with `npm run dev` and exercise the API directly via tests
> (`npm test`).

### 2. Run the tests

```bash
npm test              # one run
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

The test suite covers the scenarios in the project brief:
valid order, invalid email, missing customer information, empty cart,
invalid product, unavailable product, invalid quantity, invalid
size/color, price manipulation, correct total calculation, duplicate
`clientOrderId`, database failure, email failure — plus frontend
behavior for products, the cart, checkout validation, and the
confirmation page.

### 3. Type check, lint, build

```bash
npm run typecheck      # typecheck frontend AND Netlify Functions
npm run lint           # ESLint
npm run build          # builds the frontend to ./dist
npm run functions:check  # typecheck the Netlify Functions only
```

> Netlify bundles the TypeScript in `netlify/functions/*.ts` at deploy time
> (via `node_bundler = "esbuild"` in `netlify.toml`), so there is no
> pre-compilation step for functions in development.

---

## Database setup (Supabase)

### One-time

1. Sign in at [supabase.com](https://supabase.com/) and create a new project.
2. Wait for the project to provision (~1 minute).
3. **Apply the schema** — open `supabase/migrations/001_initial.sql` and
   run it in the Supabase SQL editor
   (`Project → SQL Editor → New query → paste → Run`).
4. **Get the connection string** —
   `Project Settings → Database → Connection string → Transaction pooler`
   (URI mode). Copy it into `DATABASE_URL` in your local `.env` *and* in
   your Netlify site's environment variables.
5. Verify by running these queries in the SQL editor:

   ```sql
   \dt public.*
   \d public.customers
   \d public.orders
   ```

You should see two tables, `customers` and `orders`, with the unique
indices on `lower(email)` and `client_order_id`.

### Schema highlights
- `customers` is unique on `lower(email)` (case-insensitive).
- `orders` is unique on `order_number` *and* on `client_order_id`.
- `orders.items_json` is `jsonb`; GIN-indexed for future search.
- Row-Level Security is **enabled** on both tables. The function uses
  the service-role connection string, which bypasses RLS; anon clients
  cannot read or write PII.

---

## Product editing

Open `src/data/products.ts`, edit the `PRODUCTS` array, save. Vite picks
it up on the next reload — no rebuild step needed. To add a product:

1. Drop an image into `public/products/your-id.svg` (or `.jpg`/`.png`).
2. Add an entry to the array, following the `Product` interface in
   `src/types/index.ts`:

   ```ts
   {
     id: "M006",
     name: "New Tee",
     category: "men",
     price: 1500,
     image: "/products/m006.svg",
     description: "…",
     available: true,
     sizes: ["S", "M", "L"],
     colors: ["Black"],
   }
   ```

3. Save. The new product appears immediately in the UI **and** the
   backend will accept orders for it.

> **Important:** The backend imports the same file. The price the
> customer sees is *never* the price the backend uses — the backend
> *re-reads* the price from the catalog on every order.

---

## Image replacement

1. Drop a real product photo into `public/products/` using the same
   filename as the placeholder (`m001.svg`, `k002.svg`, etc.).
2. Update the `image` field in `products.ts` to point at the new file
   (or leave it — same filename = no edit needed).

Recommended format: **AVIF or WebP**, max ~600×600 px, aim for < 80 KB
per image. Tailwind already rounds them to `aspect-square`, so square
images look best.

---

## Netlify deployment

### Option A — Connect to Git (recommended)

1. Push this folder to a new GitHub/GitLab/Bitbucket repo.
2. In Netlify: **Add new site → Import an existing project →** pick
   the repo.
3. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run typecheck && npm run build`
   - Publish: `dist`
   - Functions: `netlify/functions` (bundled at deploy time by esbuild)
4. **Set environment variables** in
   `Site settings → Environment variables`:
   - `DATABASE_URL` (required)
   - `RESEND_API_KEY`, `EMAIL_FROM`, `COMPANY_NAME` (optional — for emails)
5. Deploy.

### Option B — Manual deploy

```bash
npm install -g netlify-cli
netlify login
netlify init        # one-time, links the folder to a Netlify site
netlify deploy --build
netlify deploy --build --prod
```

---

## Resend setup (optional — skip if you only need the database)

The app works without email. To add confirmation emails later:

1. Sign up at [resend.com](https://resend.com/).
2. **Verify a domain** — `Domains → Add domain → follow DNS steps`.
   You need this to send from anything other than `onboarding@resend.dev`.
3. **Create an API key** — `API Keys → Create API key`. Copy it to
   `RESEND_API_KEY` (env) and to Netlify.
4. Set `EMAIL_FROM` to the verified address, e.g. `orders@yourdomain.com`.
5. In Netlify: `Site settings → Environment variables` → add the three vars.
6. **Trigger deploy → Clear cache and deploy** so the function picks up the new env.
7. Send a test order on your deployed site to confirm the email arrives.

Resend's free tier is 100 emails/day, 3 000/month — more than enough for a
small shop.

### Order fulfilment without email

Until you set up Resend, fulfil orders directly in Supabase:

```sql
-- See all pending orders
SELECT id, order_number, customer_id, total_amount, status, created_at
FROM public.orders
WHERE status = 'pending'
ORDER BY created_at DESC;

-- See the items in one order
SELECT items_json
FROM public.orders
WHERE order_number = 'ORD-20261005-XXXX';

-- Mark an order as confirmed
UPDATE public.orders
SET status = 'confirmed'
WHERE order_number = 'ORD-20261005-XXXX';
```

The customer's name, email, phone, and address are in the `customers` table:

```sql
-- Get the customer for an order
SELECT c.name, c.email, c.phone, c.address
FROM public.customers c
JOIN public.orders o ON o.customer_id = c.id
WHERE o.order_number = 'ORD-20261005-XXXX';
```

---

## Troubleshooting

### "We couldn't reach the server" on local dev

The Vite dev server proxies `/.netlify/functions/*` to `netlify dev` on
port 8888. Either run `netlify dev` in a second terminal, or set
`VITE_API_URL` to point at a deployed instance.

### Function works locally but not on Netlify

1. Netlify dashboard → `Logs` → look at the function output for the
   failing invocation. Stack traces appear there.
2. Confirm all required env vars are set on the **production** scope
   (not just the deploy preview scope).
3. Verify `DATABASE_URL` uses the **Transaction pooler** URL — the
   direct connection URL hits a separate port that doesn't accept TLS from
   external IPs by default.

### Email not arriving

1. Verify the "from" address in `EMAIL_FROM` against your verified
   domains in Resend.
2. Check Resend's `Logs` tab for the send attempt.
3. Check spam.
4. If the order was still placed, look for `emailWarning` in the API
   response — the order is preserved even when the email fails.

### Duplicate order attempts

The browser disables the submit button while a request is in flight,
the same `clientOrderId` returns the existing order (idempotency), and
the database has a `UNIQUE` constraint on `client_order_id`. So
duplicate submissions cannot create duplicate orders.

### Type errors on `import "@/..."`

We use the `vite-tsconfig-paths`-equivalent alias `@/* → src/*`. This is
wired up in both `tsconfig.app.json` and `vite.config.ts`. If your editor
complains, restart it so it picks up `tsconfig.app.json`.

### Tests fail to find `node:crypto`

Vitest runs in a Node-like environment; this should work out of the box.
If you see `Cannot find module 'node:crypto'`, ensure your Node version
is >= 18.

---

## Security notes

- **Zod validation** is the single source of truth on both sides.
- **Rate limit**: 10 orders/minute per IP (in-process; bumps to a shared
  store if you ever scale to multiple regions).
- **Body size**: 32 KB hard cap (more than enough for an order).
- **Parameterized queries** everywhere — `pg` placeholders only.
- **No secrets in client code** — only `VITE_*` env vars are exposed.
- **No PII in logs** — emails, phones, and addresses are scrubbed.
- **RLS enabled** on all tables; the service-role connection bypasses
  it, anon connections cannot read anything.
- **Strict security headers** via `netlify.toml` (HSTS, XFO, nosniff, …).

---

## License

MIT — adapt freely for your company.