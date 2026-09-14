import { queryOptions, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "broker" | "user";

export type AdminListing = {
  id: string;
  title: string;
  city: string;
  location: string;
  price: number | null;
  price_unit: string | null;
  property_type: string;
  purpose: string;
  status: string;
  is_featured: boolean;
  views: number;
  owner_id: string;
  rejection_reason: string | null;
  description: string | null;
  address: string | null;
  bhk: string | null;
  furnishing: string | null;
  area_size: string | null;
  availability: string | null;
  audience: string | null;
  category_slug: string | null;
  contact_mode: string;
  custom_public_number: string | null;
  facilities: string[];
  images: string[];
  created_at: string;
  updated_at: string;
};

export type AdminRequirement = {
  id: string;
  title: string;
  city: string;
  location: string | null;
  purpose: string;
  status: string;
  user_id: string;
  description: string | null;
  property_type: string | null;
  bhk: string | null;
  budget_min: number | null;
  budget_max: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  area_size: string | null;
  preferred_date: string | null;
  created_at: string;
};

export type AdminService = {
  id: string;
  name: string;
  service_type: string;
  city: string;
  phone: string | null;
  status: string;
  is_featured: boolean;
  user_id: string | null;
  description: string | null;
  image_url: string | null;
  price_from: number | null;
  areas: string | null;
  created_at: string;
};

export type AdminBroker = {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  status: string;
  user_id: string;
  service_areas: string | null;
  experience_years: number | null;
  categories: string[];
  commission_type: string | null;
  commission_value: number | null;
  created_at: string;
};

export type AdminProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  is_blocked: boolean;
  is_verified: boolean;
  created_at: string;
};

export type AdminLead = {
  id: string;
  name: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  status: string;
  admin_notes: string | null;
  broker_id: string | null;
  commission_amount: number | null;
  commission_status: string | null;
  listing_id: string | null;
  requirement_id: string | null;
  service_id: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminOffer = {
  id: string;
  listing_id: string;
  user_id: string;
  amount: number;
  counter_amount: number | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export type AdminVisit = {
  id: string;
  listing_id: string;
  user_id: string;
  preferred_date: string | null;
  preferred_time: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

export type AdminContact = {
  id: string;
  listing_id: string | null;
  user_id: string;
  status: string;
  created_at: string;
};

export type AdminReport = {
  id: string;
  listing_id: string | null;
  user_id: string | null;
  reason: string;
  status: string;
  created_at: string;
};

export type AdminConversation = {
  id: string;
  user_id: string;
  subject: string | null;
  party: string;
  lead_status: string;
  is_closed: boolean;
  admin_notes: string | null;
  listing_id: string | null;
  last_message_at: string;
  created_at: string;
};

export type AdminCity = {
  id: string;
  name: string;
  slug: string;
  status: string;
  is_active: boolean;
  sort_order: number;
  description: string | null;
  image_url: string | null;
  created_at: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  icon: string | null;
  subtitle: string | null;
  sort_order: number;
  is_active: boolean;
};

export type AdminAnnouncement = {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_active: boolean;
  is_pinned: boolean;
  position: string;
  sort_order: number;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  start_at: string | null;
  end_at: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
};

export const ADMIN_PAGE_SIZE = 50;

export type Paged<T> = {
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function buildPaged<T>(
  data: T[] | null,
  error: { message: string } | null,
  count: number,
  page: number,
): Paged<T> {
  if (error) throw new Error(error.message);
  return {
    rows: data ?? [],
    count,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    hasMore: (page + 1) * ADMIN_PAGE_SIZE <= count,
  };
}

export type ListingFilters = {
  search?: string | undefined;
  status?: string | undefined;
  city?: string | undefined;
  featured?: boolean | undefined;
};

export function adminListingsQuery(filters: ListingFilters = {}, page = 0) {
  return queryOptions({
    queryKey: ["admin-listings", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminListing>> => {
      let countQ = supabase.from("listings").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      if (filters.city) countQ = countQ.eq("city", filters.city);
      if (filters.featured) countQ = countQ.eq("is_featured", true);
      if (filters.search) {
        const s = `%${filters.search}%`;
        countQ = countQ.or(`title.ilike.${s},location.ilike.${s},description.ilike.${s}`);
      }
      const { count } = await countQ;

      let q = supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.city) q = q.eq("city", filters.city);
      if (filters.featured) q = q.eq("is_featured", true);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(`title.ilike.${s},location.ilike.${s},description.ilike.${s}`);
      }
      const { data, error } = await q;
      return buildPaged<AdminListing>(data, error, count ?? 0, page);
    },
  });
}

export function adminRequirementsQuery(
  filters: { search?: string | undefined; status?: string | undefined } = {},
  page = 0,
) {
  return queryOptions({
    queryKey: ["admin-requirements", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminRequirement>> => {
      let countQ = supabase.from("requirements").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      if (filters.search) {
        const s = `%${filters.search}%`;
        countQ = countQ.or(`title.ilike.${s},location.ilike.${s},description.ilike.${s}`);
      }
      const { count } = await countQ;

      let q = supabase
        .from("requirements")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(`title.ilike.${s},location.ilike.${s},description.ilike.${s}`);
      }
      const { data, error } = await q;
      return buildPaged<AdminRequirement>(data, error, count ?? 0, page);
    },
  });
}

export function adminServicesQuery(
  filters: { search?: string | undefined; status?: string | undefined } = {},
  page = 0,
) {
  return queryOptions({
    queryKey: ["admin-services", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminService>> => {
      let countQ = supabase.from("services").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      if (filters.search) {
        const s = `%${filters.search}%`;
        countQ = countQ.or(`name.ilike.${s},service_type.ilike.${s},city.ilike.${s}`);
      }
      const { count } = await countQ;

      let q = supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(`name.ilike.${s},service_type.ilike.${s},city.ilike.${s}`);
      }
      const { data, error } = await q;
      return buildPaged<AdminService>(data, error, count ?? 0, page);
    },
  });
}

export function adminBrokersQuery(
  filters: { search?: string | undefined; status?: string | undefined } = {},
  page = 0,
) {
  return queryOptions({
    queryKey: ["admin-brokers", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminBroker>> => {
      let countQ = supabase.from("brokers").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      if (filters.search) {
        const s = `%${filters.search}%`;
        countQ = countQ.or(`name.ilike.${s},service_areas.ilike.${s},phone.ilike.${s}`);
      }
      const { count } = await countQ;

      let q = supabase
        .from("brokers")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(`name.ilike.${s},service_areas.ilike.${s},phone.ilike.${s}`);
      }
      const { data, error } = await q;
      return buildPaged<AdminBroker>(data, error, count ?? 0, page);
    },
  });
}

export function adminProfilesQuery(filters: { search?: string | undefined } = {}, page = 0) {
  return queryOptions({
    queryKey: ["admin-profiles", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminProfile>> => {
      let countQ = supabase.from("profiles").select("id", { count: "exact", head: true });
      if (filters.search) {
        const s = `%${filters.search}%`;
        countQ = countQ.or(`full_name.ilike.${s},phone.ilike.${s},city.ilike.${s}`);
      }
      const { count } = await countQ;

      let q = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(`full_name.ilike.${s},phone.ilike.${s},city.ilike.${s}`);
      }
      const { data, error } = await q;
      return buildPaged<AdminProfile>(data, error, count ?? 0, page);
    },
  });
}

export function adminLeadsQuery(
  filters: {
    search?: string | undefined;
    status?: string | undefined;
    source?: string | undefined;
    broker_id?: string | undefined;
  } = {},
  page = 0,
) {
  return queryOptions({
    queryKey: ["admin-leads", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminLead>> => {
      let countQ = supabase.from("leads").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      if (filters.source) countQ = countQ.eq("source", filters.source);
      if (filters.broker_id) countQ = countQ.eq("broker_id", filters.broker_id);
      if (filters.search) {
        const s = `%${filters.search}%`;
        countQ = countQ.or(`name.ilike.${s},phone.ilike.${s},message.ilike.${s},admin_notes.ilike.${s}`);
      }
      const { count } = await countQ;

      let q = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.source) q = q.eq("source", filters.source);
      if (filters.broker_id) q = q.eq("broker_id", filters.broker_id);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(`name.ilike.${s},phone.ilike.${s},message.ilike.${s},admin_notes.ilike.${s}`);
      }
      const { data, error } = await q;
      return buildPaged<AdminLead>(data, error, count ?? 0, page);
    },
  });
}

export function adminOffersQuery(filters: { status?: string | undefined } = {}, page = 0) {
  return queryOptions({
    queryKey: ["admin-offers", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminOffer>> => {
      let countQ = supabase.from("offers").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      const { count } = await countQ;

      let q = supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      return buildPaged<AdminOffer>(data, error, count ?? 0, page);
    },
  });
}

export function adminVisitsQuery(filters: { status?: string | undefined } = {}, page = 0) {
  return queryOptions({
    queryKey: ["admin-visits", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminVisit>> => {
      let countQ = supabase.from("visit_requests").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      const { count } = await countQ;

      let q = supabase
        .from("visit_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      return buildPaged<AdminVisit>(data, error, count ?? 0, page);
    },
  });
}

export function adminContactsQuery(filters: { status?: string | undefined } = {}, page = 0) {
  return queryOptions({
    queryKey: ["admin-contacts", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminContact>> => {
      let countQ = supabase.from("contact_requests").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      const { count } = await countQ;

      let q = supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      return buildPaged<AdminContact>(data, error, count ?? 0, page);
    },
  });
}

export function adminReportsQuery(filters: { status?: string | undefined } = {}, page = 0) {
  return queryOptions({
    queryKey: ["admin-reports", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<AdminReport>> => {
      let countQ = supabase.from("reports").select("id", { count: "exact", head: true });
      if (filters.status) countQ = countQ.eq("status", filters.status);
      const { count } = await countQ;

      let q = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      return buildPaged<AdminReport>(data, error, count ?? 0, page);
    },
  });
}

/* ---------- Small tables (no pagination needed) ---------- */

export type AdminCityList = { items: AdminCity[] };

export function adminCitiesQuery() {
  return queryOptions({
    queryKey: ["admin-cities"],
    queryFn: async (): Promise<AdminCityList> => {
      const { data, error } = await supabase.from("cities").select("*").order("sort_order");
      if (error) throw error;
      return { items: (data ?? []) as AdminCity[] };
    },
  });
}

export type AdminCategoryList = { items: AdminCategory[] };

export function adminCategoriesQuery() {
  return queryOptions({
    queryKey: ["admin-categories"],
    queryFn: async (): Promise<AdminCategoryList> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("kind")
        .order("sort_order");
      if (error) throw error;
      return { items: (data ?? []) as AdminCategory[] };
    },
  });
}

export function adminAnnouncementsQuery() {
  return queryOptions({
    queryKey: ["admin-announcements"],
    queryFn: async (): Promise<{ items: AdminAnnouncement[] }> => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { items: (data ?? []) as AdminAnnouncement[] };
    },
  });
}

export function adminConversationsQuery() {
  return queryOptions({
    queryKey: ["admin-conversations"],
    queryFn: async (): Promise<{ items: AdminConversation[] }> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return { items: (data ?? []) as AdminConversation[] };
    },
  });
}

/* ---------- Dashboard stats (head-count only, no rows fetched) ---------- */

export type DashboardStats = {
  listings: { total: number; pending: number; approved: number; featured: number };
  requirements: { total: number; pending: number };
  services: { total: number; pending: number; featured: number };
  brokers: { total: number; pending: number };
  users: { total: number };
  leads: { total: number; open: number };
  offers: { total: number; pending: number };
  visits: { total: number; pending: number };
  reports: { total: number; unresolved: number };
  announcements: { active: number };
  conversations: { open: number };
  contacts: { total: number };
  categories: { total: number };
  /** Leads that have a commission_amount recorded (count, not currency sum). */
  commission: { count: number };
};

type CountableTable =
  | "listings"
  | "requirements"
  | "services"
  | "brokers"
  | "profiles"
  | "leads"
  | "offers"
  | "visit_requests"
  | "contact_requests"
  | "reports"
  | "announcements"
  | "conversations"
  | "categories";

type CountFilter =
  | { column: string; value: unknown }
  | { column: string; op: "not"; operator: string; value: unknown };

/**
 * COUNT helper that uses `head: true` so zero rows are transferred. The builder
 * casts are contained here; call sites pass literal table names and exact
 * column/value filters, so the queries (and RLS) behave identically.
 */
async function headCount(table: CountableTable, ...filters: CountFilter[]): Promise<number> {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  for (const f of filters) {
    if ("op" in f && f.op === "not") {
      q = q.not(f.column as never, f.operator as never, f.value as never);
    } else {
      q = q.eq(f.column as never, f.value as never);
    }
  }
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export const dashboardStatsQuery = queryOptions({
  queryKey: ["admin-dashboard-stats"],
  staleTime: 30_000,
  queryFn: async (): Promise<DashboardStats> => {
    const [
      lTotal, lPending, lApproved, lFeatured,
      rTotal, rPending,
      sTotal, sPending, sFeatured,
      bTotal, bPending,
      uTotal,
      leadsTotal, leadsOpen,
      oTotal, oPending,
      vTotal, vPending,
      repTotal, repUnresolved,
      annActive,
      convOpen,
      cTotal,
      catTotal,
      commCount,
    ] = await Promise.all([
      headCount("listings"),
      headCount("listings", { column: "status", value: "pending" }),
      headCount("listings", { column: "status", value: "approved" }),
      headCount("listings", { column: "is_featured", value: true }),
      headCount("requirements"),
      headCount("requirements", { column: "status", value: "pending" }),
      headCount("services"),
      headCount("services", { column: "status", value: "pending" }),
      headCount("services", { column: "is_featured", value: true }),
      headCount("brokers"),
      headCount("brokers", { column: "status", value: "pending" }),
      headCount("profiles"),
      headCount("leads"),
      headCount("leads", { column: "status", value: "new" }),
      headCount("offers"),
      headCount("offers", { column: "status", value: "new" }),
      headCount("visit_requests"),
      headCount("visit_requests", { column: "status", value: "new" }),
      headCount("reports"),
      headCount("reports", { column: "status", op: "not", operator: "eq", value: "resolved" }),
      headCount("announcements", { column: "is_active", value: true }),
      headCount("conversations", { column: "is_closed", value: false }),
      headCount("contact_requests"),
      headCount("categories"),
      headCount("leads", { column: "commission_amount", op: "not", operator: "is", value: null }),
    ]);
    return {
      listings: { total: lTotal, pending: lPending, approved: lApproved, featured: lFeatured },
      requirements: { total: rTotal, pending: rPending },
      services: { total: sTotal, pending: sPending, featured: sFeatured },
      brokers: { total: bTotal, pending: bPending },
      users: { total: uTotal },
      leads: { total: leadsTotal, open: leadsOpen },
      offers: { total: oTotal, pending: oPending },
      visits: { total: vTotal, pending: vPending },
      reports: { total: repTotal, unresolved: repUnresolved },
      announcements: { active: annActive },
      conversations: { open: convOpen },
      contacts: { total: cTotal },
      categories: { total: catTotal },
      commission: { count: commCount },
    };
  },
});
