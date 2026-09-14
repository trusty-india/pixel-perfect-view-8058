import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * User-side queries. Every query scopes to the signed-in user's id taken from
 * the Supabase session — RLS remains the real boundary and further restricts
 * what these queries may return (e.g. leads have no user-side read policy).
 */

export type MyListing = {
  id: string;
  title: string;
  property_type: string;
  purpose: string;
  price: number | null;
  price_unit: string | null;
  city: string;
  location: string;
  status: string;
  is_featured: boolean;
  views: number | null;
  images: string[] | null;
  rejection_reason: string | null;
  created_at: string;
};

export type MyRequirement = {
  id: string;
  title: string;
  purpose: string;
  property_type: string | null;
  city: string;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  bhk: string | null;
  status: string;
  description: string | null;
  created_at: string;
};

export type MyService = {
  id: string;
  name: string;
  service_type: string;
  city: string;
  areas: string | null;
  status: string;
  is_featured: boolean;
  image_url: string | null;
  price_from: number | null;
  created_at: string;
};

export type MyOffer = {
  id: string;
  listing_id: string;
  amount: number;
  counter_amount: number | null;
  status: string;
  created_at: string;
};

export type MyVisit = {
  id: string;
  listing_id: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  created_at: string;
};

export type MyContact = {
  id: string;
  listing_id: string | null;
  status: string;
  created_at: string;
};

/** Friendly, database-accurate status labels (no invented statuses). */
export function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending review";
    case "approved":
      return "Live";
    case "rejected":
      return "Rejected";
    case "hidden":
      return "Hidden by team";
    case "unpublished":
      return "Unpublished";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function statusHint(status: string): string {
  switch (status) {
    case "pending":
      return "Our team is reviewing your submission.";
    case "approved":
      return "Visible to everyone on 29Bricks.";
    case "rejected":
      return "See the team's reason below — edit and resubmit.";
    case "hidden":
      return "Temporarily removed from public view by our team.";
    case "unpublished":
      return "Taken offline. Contact us to publish it again.";
    default:
      return "";
  }
}

export function myListingsQuery(userId: string) {
  return queryOptions({
    queryKey: ["my-listings", userId],
    queryFn: async (): Promise<MyListing[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, property_type, purpose, price, price_unit, city, location, status, is_featured, views, images, rejection_reason, created_at",
        )
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyListing[];
    },
  });
}

export function myRequirementsQuery(userId: string) {
  return queryOptions({
    queryKey: ["my-requirements", userId],
    queryFn: async (): Promise<MyRequirement[]> => {
      const { data, error } = await supabase
        .from("requirements")
        .select(
          "id, title, purpose, property_type, city, location, budget_min, budget_max, bhk, status, description, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyRequirement[];
    },
  });
}

export function myServicesQuery(userId: string) {
  return queryOptions({
    queryKey: ["my-services", userId],
    queryFn: async (): Promise<MyService[]> => {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id, name, service_type, city, areas, status, is_featured, image_url, price_from, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyService[];
    },
  });
}

export function myOffersQuery(userId: string) {
  return queryOptions({
    queryKey: ["my-offers", userId],
    queryFn: async (): Promise<MyOffer[]> => {
      const { data, error } = await supabase
        .from("offers")
        .select("id, listing_id, amount, counter_amount, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as MyOffer[];
    },
  });
}

export function myVisitsQuery(userId: string) {
  return queryOptions({
    queryKey: ["my-visits", userId],
    queryFn: async (): Promise<MyVisit[]> => {
      const { data, error } = await supabase
        .from("visit_requests")
        .select("id, listing_id, preferred_date, preferred_time, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as MyVisit[];
    },
  });
}

export function myContactsQuery(userId: string) {
  return queryOptions({
    queryKey: ["my-contacts", userId],
    queryFn: async (): Promise<MyContact[]> => {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("id, listing_id, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as MyContact[];
    },
  });
}

export type MyConversations = {
  items: {
    id: string;
    listing_id: string | null;
    subject: string | null;
    lead_status: string;
    is_closed: boolean;
    last_message_at: string;
    listing: { id: string; title: string; city: string; location: string; price: number | null; images: string[] | null } | null;
  }[];
};

export function myConversationsQuery(userId: string) {
  return queryOptions({
    queryKey: ["my-conversations", userId],
    queryFn: async (): Promise<MyConversations> => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id, listing_id, subject, lead_status, is_closed, last_message_at, listing:listings(id, title, city, location, price, images)",
        )
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return { items: (data ?? []) as MyConversations["items"] };
    },
  });
}
