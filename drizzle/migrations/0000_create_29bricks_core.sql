-- ROLES
create type public.app_role as enum ('admin','broker','user');

create table public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  avatar_url text,
  city text,
  is_blocked boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id or public.is_admin());
create policy "roles self read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

-- SITE SETTINGS
create table public.site_settings (
  id boolean primary key default true,
  business_name text not null default '29Bricks',
  powered_by text not null default 'Sarkar Properties',
  management_name text not null default 'Seema Sarkar',
  mobile text not null default '9793045547',
  whatsapp text not null default '9793045547',
  public_contact_number text not null default '9793045547',
  email text,
  address text not null default 'Vastu Khand, Lucknow',
  description text,
  logo_url text,
  admin_avatar_url text,
  social_links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id)
);
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select using (true);
create policy "settings admin write" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.site_settings (id, description, email) values (true, 'Premium property and local services marketplace in Lucknow.', 'contact@29bricks.in');

-- CITIES
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'coming_soon',
  image_url text,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.cities to anon, authenticated;
grant insert, update, delete on public.cities to authenticated;
grant all on public.cities to service_role;
alter table public.cities enable row level security;
create policy "cities public read" on public.cities for select using (true);
create policy "cities admin write" on public.cities for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.cities (name, slug, status, sort_order, description) values
 ('Lucknow','lucknow','live',1,'Our launch city — fully live'),
 ('Varanasi','varanasi','coming_soon',2,'Launching soon'),
 ('Kanpur','kanpur','coming_soon',3,'Launching soon');

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  subtitle text,
  kind text not null default 'property',
  sort_order int not null default 0,
  is_active boolean not null default true
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.categories (name, slug, icon, subtitle, kind, sort_order) values
 ('Buy Property','buy','Home','Houses, flats & more','property',1),
 ('Rent Property','rent','KeyRound','Flats & houses on rent','property',2),
 ('Land / Plot','land','Mountain','Plots & farmland','property',3),
 ('Shop / Commercial','commercial','Store','Shops & offices','property',4),
 ('Room / PG','room','BedDouble','Rooms, PG & sharing','property',5),
 ('Student Stay','student','GraduationCap','Near colleges','property',6),
 ('Services','services','Wrench','Home & local services','service',7),
 ('Packers & Movers','packers-movers','Truck','Shifting made easy','service',8);

-- ANNOUNCEMENTS
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text,
  image_url text,
  type text not null default 'announcement',
  position text not null default 'top',
  button_text text,
  button_url text,
  start_at timestamptz,
  end_at timestamptz,
  start_time time,
  end_time time,
  is_active boolean not null default true,
  is_pinned boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy "announcements public read" on public.announcements for select using (is_active);
create policy "announcements admin all" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.announcements (title, message, type, start_time, end_time, sort_order) values
 ('Good Morning 🌞','Find your perfect home with 29Bricks','greeting','05:00','12:00',1),
 ('Welcome 👋','Fresh listings added across Lucknow','greeting','12:00','17:00',2),
 ('Good Evening 🌆','New properties added in Lucknow','greeting','17:00','23:59',3),
 ('🎉 Special Offer','Book a property visit today — free site assistance','offer',null,null,4);

-- LISTINGS
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  property_type text not null,
  purpose text not null default 'rent',
  category_slug text,
  price numeric,
  price_unit text default 'total',
  city text not null default 'Lucknow',
  location text not null,
  address text,
  area_size text,
  bhk text,
  furnishing text,
  facilities text[] not null default '{}',
  description text,
  availability text,
  images text[] not null default '{}',
  audience text,
  status text not null default 'pending',
  rejection_reason text,
  is_featured boolean not null default false,
  contact_mode text not null default 'business',
  custom_public_number text,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.listings to authenticated;
grant select on public.listings to anon;
grant all on public.listings to service_role;
alter table public.listings enable row level security;
create trigger listings_touch before update on public.listings for each row execute function public.touch_updated_at();
create policy "listings public read approved" on public.listings for select using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "listings owner insert" on public.listings for insert to authenticated with check (owner_id = auth.uid());
create policy "listings owner update" on public.listings for update to authenticated using ((owner_id = auth.uid() and status <> 'approved') or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "listings delete" on public.listings for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

create table public.listing_private (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  owner_name text,
  owner_phone text,
  owner_email text
);
grant select, insert, update, delete on public.listing_private to authenticated;
grant all on public.listing_private to service_role;
alter table public.listing_private enable row level security;
create policy "listing private owner or admin" on public.listing_private for all to authenticated
using (public.is_admin() or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()))
with check (public.is_admin() or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));

-- REQUIREMENTS
create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  purpose text not null default 'rent',
  property_type text,
  city text not null default 'Lucknow',
  location text,
  budget_min numeric,
  budget_max numeric,
  bhk text,
  area_size text,
  preferred_date date,
  description text,
  contact_name text,
  contact_phone text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.requirements to authenticated;
grant select on public.requirements to anon;
grant all on public.requirements to service_role;
alter table public.requirements enable row level security;
create trigger requirements_touch before update on public.requirements for each row execute function public.touch_updated_at();
create policy "requirements read" on public.requirements for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "requirements insert" on public.requirements for insert to authenticated with check (user_id = auth.uid());
create policy "requirements update" on public.requirements for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "requirements delete" on public.requirements for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  service_type text not null,
  city text not null default 'Lucknow',
  areas text,
  phone text,
  description text,
  image_url text,
  price_from numeric,
  status text not null default 'pending',
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.services to authenticated;
grant select on public.services to anon;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services read" on public.services for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "services insert" on public.services for insert to authenticated with check (user_id = auth.uid());
create policy "services update" on public.services for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "services delete" on public.services for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- BROKERS
create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  name text not null,
  photo_url text,
  experience_years int,
  service_areas text,
  categories text[] not null default '{}',
  phone text,
  status text not null default 'pending',
  commission_type text default 'percentage',
  commission_value numeric default 2,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.brokers to authenticated;
grant select on public.brokers to anon;
grant all on public.brokers to service_role;
alter table public.brokers enable row level security;
create policy "brokers read" on public.brokers for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "brokers insert" on public.brokers for insert to authenticated with check (user_id = auth.uid());
create policy "brokers update" on public.brokers for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

-- SAVED
create table public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);
grant select, insert, delete on public.saved_listings to authenticated;
grant all on public.saved_listings to service_role;
alter table public.saved_listings enable row level security;
create policy "saved own" on public.saved_listings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- LEADS
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null default 'new',
  listing_id uuid references public.listings(id) on delete set null,
  requirement_id uuid references public.requirements(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  user_id uuid,
  broker_id uuid references public.brokers(id) on delete set null,
  name text,
  phone text,
  message text,
  admin_notes text,
  commission_amount numeric,
  commission_status text default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();
create policy "leads insert any auth" on public.leads for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "leads admin read" on public.leads for select to authenticated using (public.is_admin());
create policy "leads admin write" on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "leads admin delete" on public.leads for delete to authenticated using (public.is_admin());

-- OFFERS
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null,
  amount numeric not null,
  message text,
  status text not null default 'new',
  counter_amount numeric,
  admin_notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.offers to authenticated;
grant all on public.offers to service_role;
alter table public.offers enable row level security;
create policy "offers own or admin" on public.offers for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "offers insert" on public.offers for insert to authenticated with check (user_id = auth.uid());
create policy "offers admin update" on public.offers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "offers admin delete" on public.offers for delete to authenticated using (public.is_admin());

-- VISITS / CONTACT REQUESTS
create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null,
  preferred_date date,
  preferred_time text,
  note text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.visit_requests to authenticated;
grant all on public.visit_requests to service_role;
alter table public.visit_requests enable row level security;
create policy "visits own or admin" on public.visit_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "visits insert" on public.visit_requests for insert to authenticated with check (user_id = auth.uid());
create policy "visits admin update" on public.visit_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contact_requests to authenticated;
grant all on public.contact_requests to service_role;
alter table public.contact_requests enable row level security;
create policy "contact own or admin" on public.contact_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "contact insert" on public.contact_requests for insert to authenticated with check (user_id = auth.uid());
create policy "contact admin update" on public.contact_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  user_id uuid,
  reason text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports insert" on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy "reports admin read" on public.reports for select to authenticated using (public.is_admin());
create policy "reports admin write" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- CHAT
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  user_id uuid not null,
  party text not null default 'buyer',
  subject text,
  lead_status text not null default 'new',
  admin_notes text,
  is_closed boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, user_id, party)
);
grant select, insert, update on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "conv own or admin" on public.conversations for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "conv insert own" on public.conversations for insert to authenticated with check (user_id = auth.uid());
create policy "conv update admin" on public.conversations for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  is_admin boolean not null default false,
  body text,
  image_url text,
  read_at timestamptz,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages participants read" on public.messages for select to authenticated using (
  public.is_admin() or exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
);
create policy "messages participants insert" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and (public.is_admin() or exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid() and not c.is_closed))
);
create policy "messages update" on public.messages for update to authenticated using (
  public.is_admin() or exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
) with check (true);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

create index on public.listings (status, created_at desc);
create index on public.listings (city, purpose, property_type);
create index on public.requirements (status, created_at desc);
create index on public.messages (conversation_id, created_at);