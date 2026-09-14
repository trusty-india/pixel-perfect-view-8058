import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DetailDialog, DetailRow } from "@/components/admin/detail-dialog";
import { AdminPagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListingsQuery,
  adminCitiesQuery,
  type AdminListing,
} from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/listings")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    city: typeof search["city"] === "string" ? search["city"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    featured: search["featured"] === "1" ? true : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin listings — 29Bricks" }] }),
  component: AdminListings,
});

type SearchParams = {
  status?: string | undefined;
  city?: string | undefined;
  q?: string | undefined;
  featured?: boolean | undefined;
  page?: number | undefined;
};

function AdminListings() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(search.q ?? "");

  const filters = {
    search: search.q,
    status: search.status,
    city: search.city,
    featured: search.featured,
  };
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(adminListingsQuery(filters, page));
  const cities = useQuery(adminCitiesQuery());
  const queryClient = useQueryClient();

  // Local text input syncs to URL (debounced) so filters are shareable.
  useEffect(() => {
    const current = search.q ?? "";
    if (searchInput === current) return;
    const t = setTimeout(() => {
      void navigate({
        search: (prev: SearchParams) => ({ ...prev, q: searchInput || undefined, page: undefined }),
        replace: true,
      });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, navigate, search.q]);

  const setParam = (patch: Partial<SearchParams>) =>
    void navigate({
      search: (prev: SearchParams) => ({ ...prev, ...patch, page: undefined }),
      replace: true,
    });

  const [detail, setDetail] = useState<AdminListing | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminListing> | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminListing | null>(null);
  const [deleting, setDeleting] = useState(false);

  const owner = useQuery({
    queryKey: ["admin-listing-owner", detail?.id],
    enabled: Boolean(detail),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_private")
        .select("owner_name, owner_phone, owner_email")
        .eq("listing_id", detail!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { owner_name: string | null; owner_phone: string | null; owner_email: string | null } | null;
    },
  });

  async function saveEdit() {
    if (!detail || !editForm) return;
    setSaving(true);
    try {
      await updateRow("listings", detail.id, editForm);
      toast.success("Listing updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      setDetail(null);
      setEditForm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("listings").delete().eq("id", confirmDelete.id);
      if (error) throw error;
      toast.success("Listing deleted");
      void queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      setConfirmDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed — RLS may not permit it");
    } finally {
      setDeleting(false);
    }
  }

  async function quickStatus(id: string, status: string, extra?: Record<string, unknown>) {
    try {
      await updateRow("listings", id, { status, ...(extra ?? {}) });
      toast.success("Listing updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const data = query.data;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Listings"
        description={data ? `${data.count} listings` : "Moderate property listings"}
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, location, description…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <Select value={search.status ?? "all"} onValueChange={(v) => setParam({ status: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {["all", "pending", "approved", "rejected", "hidden"].map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
            ))}
          </SelectContent>
          <span className="sr-only">Filter by status</span>
        </Select>
        <Select value={search.city ?? "all"} onValueChange={(v) => setParam({ city: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {(cities.data?.items ?? []).map((c) => (
              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
          <span className="sr-only">Filter by city</span>
        </Select>
        <Button
          variant={search.featured ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => setParam({ featured: search.featured ? undefined : true })}
        >
          <Star className="mr-1 size-4" /> Featured only
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load listings"}
        </div>
      ) : null}

      {data && !query.isFetching ? (
        <div className="grid gap-2">
          {data.rows.length ? (
            data.rows.map((row) => (
              <div key={row.id} className="rounded-2xl border bg-card p-3 shadow-soft">
                <div className="flex items-start gap-3">
                  {row.images?.[0] ? (
                    <img src={row.images[0]} alt="" className="size-14 rounded-xl object-cover" />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <Building2 />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{row.title}</p>
                      <StatusBadge status={row.status} />
                      {row.is_featured ? <Badge><Star className="mr-1 size-3" />Featured</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.city} · {row.location} · {row.property_type} · {formatINR(row.price)} · {row.views} views
                    </p>
                    {row.rejection_reason ? (
                      <p className="mt-1 text-xs text-destructive">Reason: {row.rejection_reason}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.status !== "approved" ? (
                    <Button size="sm" className="rounded-lg" onClick={() => void quickStatus(row.id, "approved")}>
                      <Check className="mr-1 size-3.5" /> Approve
                    </Button>
                  ) : null}
                  {row.status !== "rejected" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => void quickStatus(row.id, "rejected", { rejection_reason: "Rejected by admin" })}
                    >
                      <X className="mr-1 size-3.5" /> Reject
                    </Button>
                  ) : null}
                  {row.status === "approved" ? (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void quickStatus(row.id, "hidden")}>
                      <EyeOff className="mr-1 size-3.5" /> Hide
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void quickStatus(row.id, "approved")}>
                      <Eye className="mr-1 size-3.5" /> Unhide
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={row.is_featured ? "default" : "outline"}
                    className="rounded-lg"
                    onClick={() => void quickStatus(row.id, row.status, { is_featured: !row.is_featured })}
                  >
                    <Star className="mr-1 size-3.5" /> {row.is_featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => {
                      setDetail(row);
                      setEditForm(row);
                    }}
                  >
                    <Pencil className="mr-1 size-3.5" /> Details / Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg text-destructive"
                    onClick={() => setConfirmDelete(row)}
                  >
                    <Trash2 className="mr-1 size-3.5" /> Delete
                    <Ban className="sr-only" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No listings match these filters.
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

      {/* Detail / edit dialog */}
      <DetailDialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
            setEditForm(null);
          }
        }}
        title={detail?.title ?? "Listing"}
        description={detail ? `${detail.city} · ${detail.location}` : undefined}
        wide
        footer={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => { setDetail(null); setEditForm(null); }}>
              Close
            </Button>
            <Button className="rounded-xl" disabled={saving} onClick={() => void saveEdit()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </>
        }
      >
        {detail && editForm ? (
          <div className="grid gap-3">
            {detail.images?.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {detail.images.map((img) => (
                  <img key={img} src={img} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold">
                Title
                <Input value={editForm.title ?? ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Price (₹)
                <Input
                  type="number"
                  value={editForm.price ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                City
                <Input value={editForm.city ?? ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Location
                <Input value={editForm.location ?? ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Property type
                <Input value={editForm.property_type ?? ""} onChange={(e) => setEditForm({ ...editForm, property_type: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                BHK
                <Input value={editForm.bhk ?? ""} onChange={(e) => setEditForm({ ...editForm, bhk: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Furnishing
                <Input value={editForm.furnishing ?? ""} onChange={(e) => setEditForm({ ...editForm, furnishing: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Area size
                <Input value={editForm.area_size ?? ""} onChange={(e) => setEditForm({ ...editForm, area_size: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Status
                <Select
                  value={editForm.status ?? "pending"}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pending", "approved", "rejected", "hidden"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold">
              Description
              <Textarea rows={3} value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Rejection reason
              <Input
                value={editForm.rejection_reason ?? ""}
                onChange={(e) => setEditForm({ ...editForm, rejection_reason: e.target.value || null })}
              />
            </label>
            <div className="rounded-2xl border bg-muted/40 p-3">
              <p className="text-xs font-semibold">Views & owner (admin-only)</p>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                <DetailRow label="Views" value={detail.views} />
                <DetailRow label="Owner name" value={owner.data?.owner_name ?? (owner.error ? "Not permitted by RLS" : "—")} />
                <DetailRow label="Owner phone" value={owner.data?.owner_phone ?? (owner.error ? "Not permitted by RLS" : "—")} />
              </div>
              {owner.error ? (
                <p className="mt-2 text-[11px] text-warning-foreground">
                  listing_private read blocked: {owner.error.message}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </DetailDialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title={`Delete "${confirmDelete?.title ?? ""}"?`}
        description="This permanently removes the listing. Consider hiding it instead if owners may re-submit."
        confirmLabel="Delete listing"
        destructive
        busy={deleting}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}
