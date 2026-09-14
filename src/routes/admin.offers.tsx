import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PipelineBadge } from "@/components/admin/status-badge";
import { DetailDialog, DetailRow } from "@/components/admin/detail-dialog";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminOffersQuery, type AdminOffer } from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/offers")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin offers — 29Bricks" }] }),
  component: AdminOffers,
});

type SearchParams = { status?: string | undefined; page?: number | undefined };

/** Fetches titles for a set of listing ids in one query. */
function useListingTitles(ids: string[]) {
  const key = ids.join(",");
  return useQuery({
    queryKey: ["admin-listing-titles", key],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("id, title").in("id", ids);
      if (error) throw error;
      return new Map((data ?? []).map((row) => [row.id, row.title as string]));
    },
  });
}

function AdminOffers() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(adminOffersQuery({ status: search.status }, page));
  const queryClient = useQueryClient();

  const rows = query.data?.rows ?? [];
  const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));
  const titles = useListingTitles(listingIds);

  const setParam = (patch: Partial<SearchParams>) =>
    void navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch, page: undefined }), replace: true });

  const [detail, setDetail] = useState<AdminOffer | null>(null);
  const [counter, setCounter] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function openDetail(offer: AdminOffer) {
    setDetail(offer);
    setCounter(offer.counter_amount != null ? String(offer.counter_amount) : "");
    setNotes(offer.admin_notes ?? "");
  }

  async function saveOffer() {
    if (!detail) return;
    setSaving(true);
    try {
      await updateRow("offers", detail.id, {
        counter_amount: counter === "" ? null : Number(counter),
        admin_notes: notes.trim() || null,
      });
      toast.success("Offer updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      setDetail(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await updateRow("offers", id, { status });
      toast.success(`Offer ${status}`);
      void queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const data = query.data;

  return (
    <div className="grid gap-4">
      <PageHeader title="Offers" description={data ? `${data.count} offers` : "Buyer offers on listings"} />

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All" },
          { id: "new", label: "New" },
          { id: "accepted", label: "Accepted" },
          { id: "rejected", label: "Rejected" },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setParam({ status: chip.id === "all" ? undefined : chip.id })}
            className={
              (search.status ?? "all") === chip.id
                ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                : "rounded-full border bg-card px-3 py-1.5 text-xs font-semibold"
            }
          >
            {chip.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load offers"}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {rows.length ? (
            rows.map((offer) => (
              <div key={offer.id} className="rounded-2xl border bg-card p-3 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{formatINR(offer.amount)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {titles.data?.get(offer.listing_id) ?? "Listing"} ·{" "}
                      {new Date(offer.created_at).toLocaleDateString()}
                    </p>
                    {offer.counter_amount ? (
                      <p className="text-xs text-muted-foreground">Counter: {formatINR(offer.counter_amount)}</p>
                    ) : null}
                  </div>
                  <PipelineBadge status={offer.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {offer.status !== "accepted" ? (
                    <Button size="sm" className="rounded-lg" onClick={() => void setStatus(offer.id, "accepted")}>
                      <Check className="mr-1 size-3.5" /> Accept
                    </Button>
                  ) : null}
                  {offer.status !== "rejected" ? (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void setStatus(offer.id, "rejected")}>
                      <X className="mr-1 size-3.5" /> Reject
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openDetail(offer)}>
                    <Pencil className="mr-1 size-3.5" /> Manage
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No offers match this filter.
            </p>
          )}

          {data.count > data.pageSize ? (
            <AdminPagination
              page={page + 1}
              totalPages={Math.ceil(data.count / data.pageSize)}
              onPage={(p) => void navigate({ search: (prev: SearchParams) => ({ ...prev, page: p }), replace: true })}
            />
          ) : null}
        </div>
      ) : null}

      <DetailDialog
        open={Boolean(detail)}
        onOpenChange={(open) => { if (!open) setDetail(null); }}
        title={detail ? `Offer ${formatINR(detail.amount)}` : "Offer"}
        description={detail ? titles.data?.get(detail.listing_id) ?? detail.listing_id : undefined}
        footer={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setDetail(null)}>Close</Button>
            <Button className="rounded-xl" disabled={saving} onClick={() => void saveOffer()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save
            </Button>
          </>
        }
      >
        {detail ? (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Offer" value={formatINR(detail.amount)} />
              <DetailRow label="Buyer message" value={detail.message ?? "—"} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Counter amount (₹)</Label>
              <Input type="number" value={counter} onChange={(e) => setCounter(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Admin notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        ) : null}
      </DetailDialog>
    </div>
  );
}
