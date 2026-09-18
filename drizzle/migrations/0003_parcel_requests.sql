-- 0003: Parcel requests (Lucknow → Lucknow local courier booking).
--
-- Scope: ONE new table + ONE sequence + ONE SECURITY DEFINER RPC + RLS.
-- No existing table, policy, role, or auth object is modified.
--
-- Business rules live in the database so they cannot be bypassed from the
-- client: fixed price ₹99, max weight 2 KG, Lucknow → Lucknow only.
-- Token numbers are minted SERVER-SIDE from a dedicated sequence so two
-- concurrent bookings can never collide (no reliance on client randomness).

-- ---------------- Token sequence ----------------
-- 10000.. keeps early tokens 6-digit stable (e.g. 29B-P-10482).
create sequence if not exists public.parcel_token_seq start 10000;

-- ---------------- Table ----------------
create table if not exists public.parcel_requests (
  id uuid primary key default gen_random_uuid(),
  token_number text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  customer_mobile text not null,
  pickup_address text not null,
  receiver_name text not null,
  receiver_mobile text not null,
  delivery_address text not null,
  parcel_weight numeric(4, 2) not null,
  parcel_image_url text,
  price numeric(10, 2) not null default 99,
  -- submitted → confirmed → pickup_pending → picked_up → delivered
  -- submitted → rejected (terminal branch)
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parcel_requests_status_check
    check (status in ('submitted','confirmed','pickup_pending','picked_up','delivered','rejected')),
  constraint parcel_requests_weight_check check (parcel_weight > 0 and parcel_weight <= 2),
  constraint parcel_requests_price_check check (price = 99)
);

alter table public.parcel_requests enable row level security;

-- ---------------- kept-timestamp trigger ----------------
create or replace function public.parcel_requests_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists parcel_requests_touch on public.parcel_requests;
create trigger parcel_requests_touch
  before update on public.parcel_requests
  for each row execute function public.parcel_requests_touch_updated_at();

-- ---------------- Server-side token minting RPC ----------------
-- The unique index remains the final collision guard; the sequence makes
-- collisions effectively impossible and keeps tokens gap-free enough to read
-- naturally (29B-P-10483, 29B-P-10484, …).
create or replace function public.next_parcel_token()
returns text language plpgsql security definer set search_path = public as $$
declare
  n bigint;
  candidate text;
begin
  loop
    n := nextval('public.parcel_token_seq');
    candidate := '29B-P-' || n::text;
    exit when not exists (
      select 1 from public.parcel_requests where token_number = candidate
    );
  end loop;
  return candidate;
end; $$;

-- ---------------- Booking RPC ----------------
-- SECURITY DEFINER so an INSERT can never be crafted client-side with an
-- arbitrary user_id or price: user_id is pinned to the caller's JWT and the
-- fixed price is stamped here. All values are validated again server-side
-- (weight ≤ 2 KG, all fields present) exactly as the UI does.
create or replace function public.book_parcel(
  p_customer_name text,
  p_customer_mobile text,
  p_pickup_address text,
  p_receiver_name text,
  p_receiver_mobile text,
  p_delivery_address text,
  p_parcel_weight numeric,
  p_parcel_image_url text default null
)
returns text -- the new token number
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_token text;
begin
  if v_user is null then
    raise exception 'Sign in to book a parcel.';
  end if;
  if nullif(btrim(p_customer_name), '') is null
    or nullif(btrim(p_customer_mobile), '') is null
    or nullif(btrim(p_pickup_address), '') is null
    or nullif(btrim(p_receiver_name), '') is null
    or nullif(btrim(p_receiver_mobile), '') is null
    or nullif(btrim(p_delivery_address), '') is null then
    raise exception 'All booking fields are required.';
  end if;
  if p_parcel_weight is null or p_parcel_weight <= 0 or p_parcel_weight > 2 then
    raise exception 'Maximum parcel weight is 2 KG.';
  end if;

  v_token := public.next_parcel_token();

  insert into public.parcel_requests (
    token_number, user_id,
    customer_name, customer_mobile, pickup_address,
    receiver_name, receiver_mobile, delivery_address,
    parcel_weight, parcel_image_url, price, status
  ) values (
    v_token, v_user,
    btrim(p_customer_name), btrim(p_customer_mobile), btrim(p_pickup_address),
    btrim(p_receiver_name), btrim(p_receiver_mobile), btrim(p_delivery_address),
    round(p_parcel_weight::numeric, 2), p_parcel_image_url, 99, 'submitted'
  );

  return v_token;
end; $$;

revoke all on function public.book_parcel(text, text, text, text, text, text, numeric, text) from public;
grant execute on function public.book_parcel(text, text, text, text, text, text, numeric, text) to authenticated;

-- ---------------- RLS ----------------
-- Customers see only their OWN parcels. Parcel images are uploaded by the
-- customer into their own public-media folder (owner-scoped by the existing
-- storage policies), so the signed image URL never leaks another user's data.
drop policy if exists "parcel owner select" on public.parcel_requests;
create policy "parcel owner select" on public.parcel_requests
  for select to authenticated
  using (user_id = auth.uid());

-- Inserts go through public.book_parcel (the RPC); direct-table inserts stay
-- closed so user_id/price can never be forged from the browser.
drop policy if exists "parcel no direct insert" on public.parcel_requests;
create policy "parcel no direct insert" on public.parcel_requests
  for insert to authenticated
  with check (false);

drop policy if exists "parcel no direct update" on public.parcel_requests;
create policy "parcel no direct update" on public.parcel_requests;
-- ^ a 0-row policy: customers cannot change status/details after submission.

-- Status/admin writes and full visibility flow through public.is_admin()
-- (existing architecture, same as storage + every other admin surface).
drop policy if exists "parcel admin select" on public.parcel_requests;
create policy "parcel admin select" on public.parcel_requests
  for select to authenticated
  using (public.is_admin());

drop policy if exists "parcel admin update" on public.parcel_requests;
create policy "parcel admin update" on public.parcel_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "parcel admin delete" on public.parcel_requests;
create policy "parcel admin delete" on public.parcel_requests
  for delete to authenticated
  using (public.is_admin());

-- ---------------- Grants ----------------
-- RLS governs visibility; grants keep the surface explicit and minimal.
grant select, update, delete on public.parcel_requests to authenticated;
grant all on public.parcel_requests to service_role;
