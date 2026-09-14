import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Eye, EyeOff, Loader2, Pencil, Search, Star, X } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { AdminPagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DetailDialog, DetailRow } from "@/components/admin/detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { adminServicesQuery, type AdminService } from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/services")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin services — 29Bricks" }] }),
  component: AdminServices,
});

type SearchParams = {
  status?: string | undefined;
  q?: string | undefined;
  page?: number | undefined;
};

function AdminServices() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(adminServicesQuery({ search: search.q, status: search.status }, page));
  const queryClient = useQueryClient();

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
    void navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch, page: undefined }), replace: true });

  const [detail, setDetail] = useState<AdminService | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminService> | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminService | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveEdit() {
    if (!detail || !editForm) return;
    setSaving(true);
    try {
      await updateRow("services", detail.id, editForm);
      toast.success("Service updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-services"] });
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
      const { error } = await supabase.from("services").delete().eq("id", confirmDelete.id);
      if (error) throw error;
      toast.success("Service deleted");
      void queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      setConfirmDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed — RLS may not permit it");
    } finally {
      setDeleting(false);
    }
  }

  async function quickStatus(id: string, status: string, extra?: Record<string, unknown>) {
    try {
      await updateRow("services", id, { status, ...(extra ?? {}) });
      toast.success("Service updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const data = query.data;

  return (
    <div className="grid gap-4">
      <PageHeader title="Services" description={data ? `${data.count} services` : "Moderate local service listings"} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, type, city…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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
      </div>

      {query.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load services"}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {data.rows.length ? (
            data.rows.map((row) => (
              <div key={row.id} className="rounded-2xl border bg-card p-3 shadow-soft">
                <div className="flex items-start gap-3">
                  {row.image_url ? (
                    <img src={row.image_url} alt="" className="size-14 rounded-xl object-cover" />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
                      {row.service_type.slice(0, 2)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{row.name}</p>
                      <StatusBadge status={row.status} />
                      {row.is_featured ? <Badge className="capitalize">Featured</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.service_type} · {row.city} · {row.phone ?? "No phone"}
                      {row.price_from ? ` · from ${formatINR(row.price_from)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.status !== "approved" ? (
                    <Button size="sm" className="rounded-lg" onClick={() => void quickStatus(row.id, "approved")}>
                      <Check className="mr-1 size-3.5" /> Approve
                    </Button>
                  ) : null}
                  {row.status !== "rejected" ? (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void quickStatus(row.id, "rejected")}>
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
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setDetail(row); setEditForm(row); }}>
                    <Pencil className="mr-1 size-3.5" /> Details / Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => setConfirmDelete(row)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No services match these filters.
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
        onOpenChange={(open) => { if (!open) { setDetail(null); setEditForm(null); } }}
        title={detail?.name ?? "Service"}
        description={detail ? `${detail.service_type} · ${detail.city}` : undefined}
        footer={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => { setDetail(null); setEditForm(null); }}>Close</Button>
            <Button className="rounded-xl" disabled={saving} onClick={() => void saveEdit()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </>
        }
      >
        {detail && editForm ? (
          <div className="grid gap-3">
            {detail.image_url ? (
              <img src={detail.image_url} alt="" className="h-36 w-full rounded-2xl object-cover" />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold">
                Name
                <Input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Phone
                <Input value={editForm.phone ?? ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                City
                <Input value={editForm.city ?? ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Price from (₹)
                <Input type="number" value={editForm.price_from ?? ""} onChange={(e) => setEditForm({ ...editForm, price_from: e.target.value === "" ? null : Number(e.target.value) })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Areas
                <Input value={editForm.areas ?? ""} onChange={(e) => setEditForm({ ...editForm, areas: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Status
                <Select value={editForm.status ?? "pending"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
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
          </div>
        ) : null}
      </DetailDialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title={`Delete "${confirmDelete?.name ?? ""}"?`}
        description="This permanently removes the service listing."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}