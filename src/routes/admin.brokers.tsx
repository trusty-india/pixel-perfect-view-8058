import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Search, X } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { AdminPagination } from "@/components/admin/pagination";
import { DetailDialog, DetailRow } from "@/components/admin/detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { adminBrokersQuery, type AdminBroker } from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/admin/brokers")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin brokers — 29Bricks" }] }),
  component: AdminBrokers,
});

type SearchParams = {
  status?: string | undefined;
  q?: string | undefined;
  page?: number | undefined;
};

const BROKER_STATUSES = ["pending", "approved", "rejected", "hidden"];
const COMMISSION_TYPES = ["percentage", "flat", "fixed_per_deal", "none"];

function AdminBrokers() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(adminBrokersQuery({ search: search.q, status: search.status }, page));
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

  const [detail, setDetail] = useState<AdminBroker | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminBroker> | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveEdit() {
    if (!detail || !editForm) return;
    setSaving(true);
    try {
      await updateRow("brokers", detail.id, editForm);
      toast.success("Broker updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-brokers"] });
      setDetail(null);
      setEditForm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(id: string, status: string) {
    try {
      await updateRow("brokers", id, { status });
      toast.success("Broker updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-brokers"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const data = query.data;

  return (
    <div className="grid gap-4">
      <PageHeader title="Brokers" description={data ? `${data.count} broker registrations` : "Review broker registrations and set commissions"} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, areas, phone…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={search.status ?? "all"} onValueChange={(v) => setParam({ status: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {["all", ...BROKER_STATUSES].map((s) => (
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
          {query.error instanceof Error ? query.error.message : "Could not load brokers"}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {data.rows.length ? (
            data.rows.map((row) => (
              <div key={row.id} className="rounded-2xl border bg-card p-3 shadow-soft">
                <div className="flex items-start gap-3">
                  {row.photo_url ? (
                    <img src={row.photo_url} alt="" className="size-14 rounded-xl object-cover" />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {row.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{row.name}</p>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.phone ?? "No phone"} · {row.experience_years ?? 0} yrs ·{" "}
                      {row.commission_type
                        ? `${row.commission_type}${row.commission_value != null ? ` (${row.commission_value})` : ""}`
                        : "Commission not set"}
                    </p>
                    {row.service_areas ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">Areas: {row.service_areas}</p>
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
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void quickStatus(row.id, "rejected")}>
                      <X className="mr-1 size-3.5" /> Reject
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setDetail(row); setEditForm(row); }}>
                    <Pencil className="mr-1 size-3.5" /> Details / Edit
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No brokers match these filters.
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
        title={detail?.name ?? "Broker"}
        description={detail ? `${detail.phone ?? "No phone"} · ${detail.experience_years ?? 0} yrs experience` : undefined}
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
            {detail.photo_url ? (
              <img src={detail.photo_url} alt="" className="size-24 rounded-2xl object-cover" />
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
                Experience (years)
                <Input
                  type="number"
                  value={editForm.experience_years ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Status
                <Select value={editForm.status ?? "pending"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BROKER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Commission type
                <Select
                  value={editForm.commission_type ?? "none"}
                  onValueChange={(v) => setEditForm({ ...editForm, commission_type: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMISSION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Commission value
                <Input
                  type="number"
                  value={editForm.commission_value ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, commission_value: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold">
              Service areas
              <Input value={editForm.service_areas ?? ""} onChange={(e) => setEditForm({ ...editForm, service_areas: e.target.value })} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Categories (comma separated)
              <Input
                value={(editForm.categories ?? []).join(", ")}
                onChange={(e) => setEditForm({ ...editForm, categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </label>
            <DetailRow label="Linked user id" value={detail.user_id} />
          </div>
        ) : null}
      </DetailDialog>
    </div>
  );
}
