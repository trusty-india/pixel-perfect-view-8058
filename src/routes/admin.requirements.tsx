import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, Eye, EyeOff, Loader2, Pencil, Search, X } from "lucide-react";
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
import { adminRequirementsQuery, type AdminRequirement } from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/requirements")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin requirements — 29Bricks" }] }),
  component: AdminRequirements,
});

type SearchParams = {
  status?: string | undefined;
  q?: string | undefined;
  page?: number | undefined;
};

function AdminRequirements() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(adminRequirementsQuery({ search: search.q, status: search.status }, page));
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

  const [detail, setDetail] = useState<AdminRequirement | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminRequirement> | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminRequirement | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveEdit() {
    if (!detail || !editForm) return;
    setSaving(true);
    try {
      await updateRow("requirements", detail.id, editForm);
      toast.success("Requirement updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-requirements"] });
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
      const { error } = await supabase.from("requirements").delete().eq("id", confirmDelete.id);
      if (error) throw error;
      toast.success("Requirement deleted");
      void queryClient.invalidateQueries({ queryKey: ["admin-requirements"] });
      setConfirmDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed — RLS may not permit it");
    } finally {
      setDeleting(false);
    }
  }

  async function quickStatus(id: string, status: string) {
    try {
      await updateRow("requirements", id, { status });
      toast.success("Requirement updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-requirements"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const data = query.data;

  return (
    <div className="grid gap-4">
      <PageHeader title="Requirements" description={data ? `${data.count} requirements` : "Moderate buyer/tenant requirements"} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title, location…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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
          {query.error instanceof Error ? query.error.message : "Could not load requirements"}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {data.rows.length ? (
            data.rows.map((row) => (
              <div key={row.id} className="rounded-2xl border bg-card p-3 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.city} · {row.location ?? "Any area"} · {row.purpose}
                      {row.budget_max ? ` · up to ${formatINR(row.budget_max)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
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
              No requirements match these filters.
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
        title={detail?.title ?? "Requirement"}
        description={detail ? `${detail.city} · ${detail.purpose}` : undefined}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Status" value={<StatusBadge status={detail.status} />} />
              <DetailRow label="Submitted" value={new Date(detail.created_at).toLocaleString()} />
              <label className="grid gap-1.5 text-xs font-semibold">
                Title
                <Input value={editForm.title ?? ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                City
                <Input value={editForm.city ?? ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Budget min (₹)
                <Input type="number" value={editForm.budget_min ?? ""} onChange={(e) => setEditForm({ ...editForm, budget_min: e.target.value === "" ? null : Number(e.target.value) })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Budget max (₹)
                <Input type="number" value={editForm.budget_max ?? ""} onChange={(e) => setEditForm({ ...editForm, budget_max: e.target.value === "" ? null : Number(e.target.value) })} />
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
        title={`Delete "${confirmDelete?.title ?? ""}"?`}
        description="This permanently removes the requirement."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}
