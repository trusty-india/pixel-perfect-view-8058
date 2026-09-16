import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  business_name: string;
  powered_by: string;
  management_name: string;
  mobile: string;
  whatsapp: string;
  public_contact_number: string;
  email: string | null;
  address: string;
  description: string | null;
  logo_url: string | null;
  admin_avatar_url: string | null;
  social_links: Record<string, string>;
};

export const settingsQuery = queryOptions({
  queryKey: ["site-settings"],
  staleTime: 60_000,
  queryFn: async (): Promise<SiteSettings | null> => {
    const { data, error } = await supabase.from("site_settings").select("*").maybeSingle();
    if (error) throw error;
    return data as unknown as SiteSettings;
  },
});

export const citiesQuery = queryOptions({
  queryKey: ["cities"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const announcementsQuery = queryOptions({
  queryKey: ["announcements"],
  staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export type ListingFilters = {
  purpose?: string | undefined;
  propertyType?: string | undefined;
  city?: string | undefined;
  category?: string | undefined;
  search?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  bhk?: string | undefined;
  furnishing?: string | undefined;
  audience?: string | undefined;
  featured?: boolean | undefined;
  limit?: number | undefined;
};

export function listingsQuery(filters: ListingFilters = {}) {
  return queryOptions({
    queryKey: ["listings", filters],
    queryFn: async () => {
      let q = supabase
        .from("listings")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (filters.purpose) q = q.eq("purpose", filters.purpose);
      if (filters.propertyType) q = q.eq("property_type", filters.propertyType);
      if (filters.city) q = q.eq("city", filters.city);
      if (filters.category) q = q.eq("category_slug", filters.category);
      if (filters.bhk) q = q.eq("bhk", filters.bhk);
      if (filters.furnishing) q = q.eq("furnishing", filters.furnishing);
      if (filters.audience) q = q.eq("audience", filters.audience);
      if (filters.featured) q = q.eq("is_featured", true);
      if (filters.minPrice) q = q.gte("price", filters.minPrice);
      if (filters.maxPrice) q = q.lte("price", filters.maxPrice);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(
          `title.ilike.${s},location.ilike.${s},description.ilike.${s},property_type.ilike.${s}`,
        );
      }
      q = q.limit(filters.limit ?? 30);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function requirementsQuery(limit = 20) {
  return queryOptions({
    queryKey: ["requirements", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requirements")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function servicesQuery(type?: string) {
  return queryOptions({
    queryKey: ["services", type ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("services")
        .select("*")
        .eq("status", "approved")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (type) q = q.eq("service_type", type);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

/* ---------- Home Hero (admin-controlled) ---------- */

export type HeroConfig = {
  image_url: string | null;
  title: string;
  description: string;
  cta_text: string;
  cta_url: string;
};

/**
 * Reserved key inside the existing site_settings.social_links JSON column that
 * stores the Home Hero configuration. Uses the existing settings architecture —
 * no new table or migration. Social-link UIs must skip "__"-prefixed keys.
 */
export const HERO_CONFIG_KEY = "__hero";

export function parseHeroConfig(
  raw: Record<string, string> | null | undefined,
): HeroConfig {
  const stored = raw?.[HERO_CONFIG_KEY];
  if (!stored) {
    return { image_url: null, title: "", description: "", cta_text: "", cta_url: "" };
  }
  try {
    const parsed = JSON.parse(stored) as Partial<HeroConfig>;
    return {
      image_url:
        typeof parsed.image_url === "string" && parsed.image_url.trim()
          ? parsed.image_url
          : null,
      title: typeof parsed.title === "string" ? parsed.title : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      cta_text: typeof parsed.cta_text === "string" ? parsed.cta_text : "",
      cta_url: typeof parsed.cta_url === "string" ? parsed.cta_url : "",
    };
  } catch {
    return { image_url: null, title: "", description: "", cta_text: "", cta_url: "" };
  }
}

type AnnouncementWindow = {
  start_time: string | null;
  end_time: string | null;
  start_at: string | null;
  end_at: string | null;
  is_pinned: boolean;
};

export function activeAnnouncement<T extends AnnouncementWindow>(rows: T[] | undefined): T | null {
  if (!rows?.length) return null;
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 8);
  const inWindow = rows.filter((r) => {
    if (r.start_at && new Date(r.start_at) > now) return false;
    if (r.end_at && new Date(r.end_at) < now) return false;
    if (r.start_time && r.end_time) return hhmm >= r.start_time && hhmm <= r.end_time;
    return true;
  });
  return inWindow.find((r) => r.is_pinned) ?? inWindow[0] ?? null;
}
