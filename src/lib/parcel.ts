import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Parcel services (Lucknow → Lucknow local courier).
 *
 * ⚠️ SINGLE source of truth for parcel business config — import from here,
 * never re-hardcode ₹99 / 2 KG / Lucknow in components. The same rules are
 * ALSO enforced server-side in drizzle/migrations/0003_parcel_requests.sql
 * (book_parcel RPC + CHECK constraints), so a tampered client cannot bypass
 * them. The home-page route animation is decorative only — never real
 * tracking (see trackParcelByToken below).
 */

export const PARCEL_CONFIG = {
  city: "Lucknow",
  price: 99,
  maxWeightKg: 2,
  currency: "₹",
} as const;

export const PARCEL_STATUSES = [
  "submitted",
  "confirmed",
  "pickup_pending",
  "picked_up",
  "delivered",
  "rejected",
] as const;

export type ParcelStatus = (typeof PARCEL_STATUSES)[number];

export type ParcelRequest = {
  id: string;
  token_number: string;
  user_id: string;
  customer_name: string;
  customer_mobile: string;
  pickup_address: string;
  receiver_name: string;
  receiver_mobile: string;
  delivery_address: string;
  parcel_weight: number;
  parcel_image_url: string | null;
  price: number;
  status: ParcelStatus;
  created_at: string;
  updated_at: string;
};

/** Customer-facing timeline (admin `rejected` is surfaced separately). */
export const TRACK_TIMELINE: ParcelStatus[] = [
  "submitted",
  "confirmed",
  "pickup_pending",
  "picked_up",
  "delivered",
];

export function parcelStatusLabel(status: ParcelStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Valid index into TRACK_TIMELINE; -1 for `rejected`. */
export function timelineIndex(status: ParcelStatus): number {
  return TRACK_TIMELINE.indexOf(status);
}

/* ---------------- Booking ---------------- */

export type ParcelBookingInput = {
  customer_name: string;
  customer_mobile: string;
  pickup_address: string;
  receiver_name: string;
  receiver_mobile: string;
  delivery_address: string;
  parcel_weight: number;
  parcel_image_url?: string | null;
};

export function validateParcelBooking(
  input: ParcelBookingInput,
): string | null {
  if (!input.customer_name.trim()) return "Please enter your name.";
  if (!/^\d{10}$/.test(input.customer_mobile.replace(/\D/g, "").slice(-10)) ||
      input.customer_mobile.replace(/\D/g, "").length < 10)
    return "Please enter a valid 10-digit mobile number.";
  if (!input.pickup_address.trim()) return "Please enter the pickup address.";
  if (!input.receiver_name.trim()) return "Please enter the receiver's name.";
  if (!/^\d{10}$/.test(input.receiver_mobile.replace(/\D/g, "").slice(-10)) ||
      input.receiver_mobile.replace(/\D/g, "").length < 10)
    return "Please enter a valid 10-digit receiver mobile number.";
  if (!input.delivery_address.trim())
    return "Please enter the delivery address.";
  if (
    !Number.isFinite(input.parcel_weight) ||
    input.parcel_weight <= 0 ||
    input.parcel_weight > PARCEL_CONFIG.maxWeightKg
  )
    return `Parcel weight must be between 0 and ${PARCEL_CONFIG.maxWeightKg} KG.`;
  return null;
}

/**
 * Creates the parcel request server-side via the `book_parcel` SECURITY
 * DEFINER RPC (drizzle migration 0003). One round-trip; the token is minted
 * in Postgres from a dedicated sequence, so concurrent bookings can never
 * collide. Returns the new token (e.g. 29B-P-10482).
 */
export async function bookParcel(
  input: ParcelBookingInput,
): Promise<string> {
  const problem = validateParcelBooking(input);
  if (problem) throw new Error(problem);

  const { data, error } = await supabase.rpc("book_parcel", {
    p_customer_name: input.customer_name.trim(),
    p_customer_mobile: input.customer_mobile.trim(),
    p_pickup_address: input.pickup_address.trim(),
    p_receiver_name: input.receiver_name.trim(),
    p_receiver_mobile: input.receiver_mobile.trim(),
    p_delivery_address: input.delivery_address.trim(),
    p_parcel_weight: Math.round(input.parcel_weight * 100) / 100,
    p_parcel_image_url: input.parcel_image_url?.trim() || null,
  });
  if (error) {
    // Never leak raw Postgres errors to customers — map the known business
    // violations to friendly copy and everything else to a generic message.
    const msg = error.message;
    if (/weight/i.test(msg)) return Promise.reject(new Error(`Maximum parcel weight is ${PARCEL_CONFIG.maxWeightKg} KG.`));
    if (/sign in/i.test(msg))
      return Promise.reject(new Error("Please sign in to book your parcel."));
    throw new Error(
      "Could not submit your parcel request right now. Please try again or call us.",
    );
  }
  return data;
}

/* ---------------- Tracking ---------------- */

/**
 * 1 SELECT by exact token. Authorization is enforced by RLS
 * (migration 0003): customers only ever receive their own parcels, admins
 * any. An unknown token or someone else's token both return zero rows —
 * indistinguishable by design, so tokens can't be probed.
 */
export async function trackParcelByToken(
  token: string,
): Promise<ParcelRequest | null> {
  const clean = token.trim().toUpperCase();
  if (!/^29B-P-\d{4,8}$/.test(clean)) return null;
  const { data, error } = await supabase
    .from("parcel_requests")
    .select("*")
    .eq("token_number", clean)
    .maybeSingle();
  if (error) throw new Error("Could not look up that token. Please try again.");
  return (data as ParcelRequest) ?? null;
}

/* ---------------- Admin ---------------- */

export function adminParcelsQuery(
  filters: { status?: string | undefined } = {},
) {
  return queryOptions({
    queryKey: ["admin-parcels", filters],
    queryFn: async (): Promise<ParcelRequest[]> => {
      let q = supabase
        .from("parcel_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as ParcelRequest[];
    },
  });
}

/** One UPDATE — the only admin write. RLS (public.is_admin()) is the gate. */
export async function adminUpdateParcelStatus(
  id: string,
  status: ParcelStatus,
): Promise<void> {
  const { error } = await supabase
    .from("parcel_requests")
    .update({ status })
    .eq("id", id);
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes("row-level")
        ? "You need admin access to update parcels."
        : "Status update failed. Please try again.",
    );
  }
}
