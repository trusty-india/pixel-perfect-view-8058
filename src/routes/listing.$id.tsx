import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Heart, MapPin, Phone, MessageCircle, CalendarDays, Flag, Share2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/data";
import { priceLabel, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/listing/$id")({
  head: () => ({
    meta: [
      { title: "Property details — 29Bricks" },
      { name: "description", content: "Full details, photos and contact options for this property." },
      { property: "og:title", content: "Property details — 29Bricks" },
      { property: "og:description", content: "View photos, price and location for this property." },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const [offer, setOffer] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [note, setNote] = useState("");

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (data) {
        void supabase
          .from("listings")
          .update({ views: (data.views ?? 0) + 1 })
          .eq("id", id);
      }
      return data;
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["saved", id, user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_listings")
        .select("id")
        .eq("listing_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      if (saved) {
        await supabase.from("saved_listings").delete().eq("id", saved.id);
      } else {
        await supabase.from("saved_listings").insert({ listing_id: id, user_id: user.id });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["saved"] });
      toast.success(saved ? "Removed from saved" : "Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendOffer = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      const { error } = await supabase
        .from("offers")
        .insert({ listing_id: id, user_id: user.id, amount: Number(offer) });
      if (error) throw error;
    },
    onSuccess: () => {
      setOffer("");
      toast.success("Offer sent to the team.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bookVisit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      const { error } = await supabase.from("visit_requests").insert({
        listing_id: id,
        user_id: user.id,
        preferred_date: visitDate || null,
        note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setVisitDate("");
      setNote("");
      toast.success("Visit request sent.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("reports")
        .insert({ listing_id: id, user_id: user?.id ?? null, reason: "Reported from listing page" });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Reported. Our team will review it."),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </AppShell>
    );
  }

  if (!listing) {
    return (
      <AppShell>
        <div className="rounded-3xl border bg-card p-8 text-center">
          <p className="font-semibold">This property is no longer available.</p>
          <Link to="/search" className="mt-3 inline-block text-sm font-semibold text-primary">
            Browse other properties
          </Link>
        </div>
      </AppShell>
    );
  }

  const phone =
    listing.contact_mode === "custom" && listing.custom_public_number
      ? listing.custom_public_number
      : (settings?.public_contact_number ?? "9793045547");

  return (
    <AppShell>
      <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
        <div className="flex snap-x gap-1 overflow-x-auto">
          {(listing.images?.length ? listing.images : [null]).map((src, i) => (
            <div key={i} className="aspect-[4/3] w-full shrink-0 snap-center bg-muted">
              {src ? (
                <img src={src} alt={listing.title} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-sm text-muted-foreground">
                  No photos
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold text-primary">
                {priceLabel(listing.price ? Number(listing.price) : null, listing.purpose)}
              </p>
              <h1 className="text-lg font-bold">{listing.title}</h1>
            </div>
            <button
              onClick={() => toggleSave.mutate()}
              className="grid size-10 shrink-0 place-items-center rounded-full border bg-card tap-scale"
              aria-label="Save property"
            >
              <Heart className={saved ? "size-5 fill-brand text-brand" : "size-5"} />
            </button>
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {listing.location}, {listing.city}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="capitalize">
              {listing.purpose}
            </Badge>
            <Badge variant="secondary">{listing.property_type}</Badge>
            {listing.bhk ? <Badge variant="secondary">{listing.bhk}</Badge> : null}
            {listing.furnishing ? <Badge variant="secondary">{listing.furnishing}</Badge> : null}
            {listing.area_size ? <Badge variant="secondary">{listing.area_size}</Badge> : null}
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            Posted {timeAgo(listing.created_at)} · {listing.views ?? 0} views
          </p>
        </div>
      </div>

      {listing.description ? (
        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-soft">
          <h2 className="text-sm font-bold">About this property</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {listing.description}
          </p>
        </div>
      ) : null}

      {listing.facilities?.length ? (
        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-soft">
          <h2 className="text-sm font-bold">Facilities</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {listing.facilities.map((f: string) => (
              <span key={f} className="rounded-full bg-muted px-3 py-1 text-xs">
                {f}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href={`tel:${phone}`}
          className="flex items-center justify-center gap-2 rounded-2xl gradient-red px-4 py-3 text-sm font-semibold text-brand-foreground tap-scale"
        >
          <Phone className="size-4" /> Call now
        </a>
        <a
          href={`https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
            `Hi, I am interested in "${listing.title}" on 29Bricks.`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-success/12 px-4 py-3 text-sm font-semibold text-success tap-scale"
        >
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-4 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <CalendarDays className="size-4" /> Book a site visit
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          <Input
            placeholder="Preferred time / note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button className="mt-3 w-full rounded-xl" onClick={() => bookVisit.mutate()}>
          Request visit
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-4 shadow-soft">
        <h2 className="text-sm font-bold">Make an offer</h2>
        <div className="mt-3 flex gap-2">
          <Input
            inputMode="numeric"
            placeholder="Your offer in ₹"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
          />
          <Button className="rounded-xl" disabled={!offer} onClick={() => sendOffer.mutate()}>
            Send
          </Button>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-xl"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied");
          }}
        >
          <Share2 className="mr-2 size-4" /> Share
        </Button>
        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => report.mutate()}>
          <Flag className="mr-2 size-4" /> Report
        </Button>
      </div>
      <Textarea className="hidden" readOnly value="" />
    </AppShell>
  );
}
