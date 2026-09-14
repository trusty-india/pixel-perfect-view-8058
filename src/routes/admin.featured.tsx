import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Loader2, Star, Wrench } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { updateRow } from "@/lib/admin-mutations";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/featured")({
  head: () => ({ meta: [{ title: "Admin featured — 29Bricks" }] }),
  component: AdminFeatured,
});

type FeaturedListing = {
  id: string;
  title: string;
  city: string;
  location: string;
  price: number | null;
  status: string;
  images: string[];
};

type FeaturedService = {
  id: string;
  name: string;
  service_type: string;
  city: string;
  price_from: number | null;
  status: string;
  image_url: string | null;
};

function AdminFeatured() {
  const queryClient = useQueryClient();

  const listings = useQuery({
    queryKey: ["admin-featured-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, city, location, price, status, images")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as FeaturedListing[];
    },
  });

  const services = useQuery({
    queryKey: ["admin-featured-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, service_type, city, price_from, status, image_url")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as FeaturedService[];
    },
  });

  async function unfeatureListing(id: string) {
    try {
      await updateRow("listings", id, { is_featured: false });
      toast.success("Listing unfeatured");
      void queryClient.invalidateQueries({ queryKey: ["admin-featured-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["listings"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function unfeatureService(id: string) {
    try {
      await updateRow("services", id, { is_featured: false });
      toast.success("Service unfeatured");
      void queryClient.invalidateQueries({ queryKey: ["admin-featured-services"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      void queryClient.invalidateQueries({ queryKey: ["services"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const loading = listings.isLoading || services.isLoading;
  const error = listings.error ?? services.error;

  return (
    <div className="grid gap-4">
      <PageHeader title="Featured Listings" description="Properties and services highlighted on the homepage" />

      {loading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load featured items"}
        </div>
      ) : null}

      <section className="rounded-3xl border bg-card p-4 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Building2 className="size-4 text-primary" /> Featured properties ({listings.data?.length ?? 0})
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(listings.data ?? []).map((listing) => (
            <div key={listing.id} className="flex items-start gap-3 rounded-2xl border bg-background p-3">
              {listing.images?.[0] ? (
                <img src={listing.images[0]} alt="" className="size-12 rounded-xl object-cover" />
              ) : (
                <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Building2 className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{listing.title}</p>
                <p className="text-xs text-muted-foreground">
                  {listing.city} · {listing.location} · {formatINR(listing.price)}
                </p>
                <div className="mt-1"><StatusBadge status={listing.status} /></div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <Button size="sm" variant="ghost" className="rounded-lg" asChild>
                  <Link to="/listing/$id" params={{ id: listing.id }}>Open</Link>
                </Button>
                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void unfeatureListing(listing.id)}>
                  <Star className="mr-1 size-3.5" /> Unfeature
                </Button>
              </div>
            </div>
          ))}
          {listings.data && !listings.data.length ? (
            <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground sm:col-span-2">
              No featured properties. Feature listings from the Listings page.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Wrench className="size-4 text-primary" /> Featured services ({services.data?.length ?? 0})
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(services.data ?? []).map((service) => (
            <div key={service.id} className="flex items-start gap-3 rounded-2xl border bg-background p-3">
              {service.image_url ? (
                <img src={service.image_url} alt="" className="size-12 rounded-xl object-cover" />
              ) : (
                <span className="grid size-12 place-items-center rounded-xl bg-muted text-[10px] text-muted-foreground">
                  {service.service_type.slice(0, 2)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{service.name}</p>
                <p className="text-xs text-muted-foreground">
                  {service.service_type} · {service.city}
                  {service.price_from ? ` · from ${formatINR(service.price_from)}` : ""}
                </p>
                <div className="mt-1"><StatusBadge status={service.status} /></div>
              </div>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void unfeatureService(service.id)}>
                <Star className="mr-1 size-3.5" /> Unfeature
              </Button>
            </div>
          ))}
          {services.data && !services.data.length ? (
            <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground sm:col-span-2">
              No featured services. Feature services from the Services page.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
