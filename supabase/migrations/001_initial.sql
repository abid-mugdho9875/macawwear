-- ============================================================================
-- Macaw — initial schema
-- ----------------------------------------------------------------------------
-- Run this in a fresh Supabase project (SQL editor) or with `supabase db push`
-- after configuring `supabase/config.toml`. Idempotent — safe to re-run.
-- ============================================================================

-- Required extensions. Supabase has `pgcrypto` available by default for
-- gen_random_uuid(); `pg_trgm` isn't strictly needed today but is cheap to
-- enable for future search use-cases.
create extension if not exists "pgcrypto" with schema extensions;

-- ============================================================================
-- customers
-- ----------------------------------------------------------------------------
-- One row per email address. Email is unique case-insensitively.
-- We upsert by email on every order, so the row reflects the most recent
-- contact info we've seen.
-- ============================================================================
create table if not exists public.customers (
  id          uuid        primary key default extensions.gen_random_uuid(),
  name        text        not null check (char_length(name) between 2 and 120),
  email       text        not null check (char_length(email) between 3 and 254),
  phone       text        not null check (char_length(phone) between 8 and 30),
  address     text        not null check (char_length(address) between 5 and 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness on email.
create unique index if not exists customers_email_lower_uniq
  on public.customers (lower(email));

create index if not exists customers_created_at_idx
  on public.customers (created_at desc);

-- Auto-update `updated_at` on row changes.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at
  before update on public.customers
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- orders
-- ----------------------------------------------------------------------------
-- One row per placed order. `items_json` is a JSONB array containing
-- the historical record of each line (product id, name, unit price,
-- subtotal, quantity, size, color). This ensures orders remain correct
-- even if the product catalog changes later.
--
-- `client_order_id` is the idempotency key supplied by the browser; we
-- enforce uniqueness to prevent accidental double-submits.
-- ============================================================================
create table if not exists public.orders (
  id               uuid        primary key default extensions.gen_random_uuid(),
  order_number     text        not null,
  customer_id      uuid        not null references public.customers(id) on delete restrict,
  items_json       jsonb       not null,
  total_amount     numeric     not null check (total_amount >= 0),
  status           text        not null default 'pending'
                                check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  client_order_id  text        not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists orders_order_number_uniq
  on public.orders (order_number);

-- Hard idempotency guarantee at the DB layer.
create unique index if not exists orders_client_order_id_uniq
  on public.orders (client_order_id);

create index if not exists orders_customer_id_idx
  on public.orders (customer_id, created_at desc);

create index if not exists orders_status_idx
  on public.orders (status);

create index if not exists orders_items_gin_idx
  on public.orders using gin (items_json jsonb_path_ops);

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- The Netlify Function connects with the **service role** key (full access),
-- so RLS doesn't restrict the function itself. But if anything else ever
-- connects with the anonymous role (e.g. a leaked anon key), it cannot read
-- PII.
--
-- We KEEP RLS enabled to give a clear security posture. The service role
-- bypasses it (Postgres `BYPASSRLS` attribute on the role), so the function
-- is unaffected.
-- ============================================================================
alter table public.customers enable row level security;
alter table public.orders    enable row level security;

-- No policies on purpose. The service role bypasses RLS; anon/authenticated
-- clients cannot read or write anything. Adjust if you add a customer portal.

-- ============================================================================
-- Verification queries — run by hand after applying this migration:
--   \dt public.*
--   \d public.customers
--   \d public.orders
--   select * from public.orders limit 0;
-- ============================================================================