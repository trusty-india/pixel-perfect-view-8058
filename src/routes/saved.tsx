import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { ListingCard, type ListingRow } from "@/components/listing-card";
import { EmptyState } from "@/components/section";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved properties — 29Bricks" },
      { name: "description", content: "All the properties you shortlisted on 29Bricks." },
      { property: "og:title", content: "Saved properties — 29Bricks" },
      { property: "og:description", content: "Your shortlisted homes in one place." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { user, loading } = useAuth();
  const { data } = useQuery({
    queryKey: ["saved-listings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.listing_id);
      if (!ids.length) return [];
      const { data: listings } = await supabase.from("listings").select("*").in("id", ids);
      return listings ?? [];
    },
  });

  return (
    <AppShell>
      <h1 className="text-lg font-bold">Saved properties</h1>
      {!user && !loading ? (
        <div className="mt-4 rounded-2xl border bg-card p-6 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">Sign in to see your saved properties.</p>
          <Link
            to="/auth"
            className="mt-3 inline-block rounded-xl gradient-red px-4 py-2 text-sm font-semibold text-brand-foreground"
          >
            Sign in
          </Link>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(data as ListingRow[] | undefined)?.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      {user && data && !data.length ? (
        <div className="mt-4">
          <EmptyState text="Nothing saved yet. Tap the heart on any property." />
        </div>
      ) : null}
    </AppShell>
  );
}
