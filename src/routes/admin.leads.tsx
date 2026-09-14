import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PipelineBadge } from "@/components/admin/status-badge";
import { DetailDialog, DetailRow } from "@/components/admin/detail-dialog";
import { AdminPagination } from "@/components/admin/pagination";
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
import { adminBrokersQuery, adminLeadsQuery, type AdminLead } from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";
import { LEAD_STATUSES, formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/leads")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    source: typeof search["source"] === "string" ? search["source"] : undefined,
    broker: typeof search["broker"] === "string" ? search["broker"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin leads — 29Bricks" }] }),
  component: AdminLeads,
});

type SearchParams = {
  status?: string | undefined;
  source?: string | undefined;
  broker?: string | undefined;
  q?: string | undefined;
  page?: number | undefined;
};

const LEAD_SOURCES = ["website", "whatsapp", "phone", "walk_in", "broker", "other"];

function AdminLeads() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(
    adminLeadsQuery(
      { search: search.q, status: search.status, source: search.source, broker_id: search.broker },
      page,
    ),
  );
  const brokers = useQuery(adminBrokersQuery({}, 0));
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

  const [detail, setDetail] = useState<AdminLead | null>(null);
  const [notes, setNotes] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionStatus, setCommissionStatus] = useState<string>("none");
  const [brokerId, setBrokerId] = useState<string>("none");
  const [status, setStatus] = useState<string>("new");
  const [saving, setSaving] = useState(false);

  function openDetail(lead: AdminLead) {
    setDetail(lead);
    setNotes(lead.admin_notes ?? "");
    setCommissionAmount(lead.commission_amount != null ? String(lead.commission_amount) : "");
    setCommissionStatus(lead.commission_status ?? "none");
    setBrokerId(lead.broker_id ?? "none");
    setStatus(lead.status);
  }

  async function saveLead() {
    if (!detail) return;
    setSaving(true);
    try {
      await updateRow("leads", detail.id, {
        admin_notes: notes.trim() || null,
        commission_amount: commissionAmount === "" ? null : Number(commissionAmount),
        commission_status: commissionStatus === "none" ? null : commissionStatus,
        broker_id: brokerId === "none" ? null : brokerId,
        status,
      });
      toast.success("Lead updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      setDetail(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(id: string, nextStatus: string) {
    try {
      await updateRow("leads", id, { status: nextStatus });
      toast.success("Lead updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const brokerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brokers.data?.rows ?? []) map.set(b.id, b.name);
    return (id: string | null) => (id ? (map.get(id) ?? id) : null);
  }, [brokers.data]);

  // Lead context: which listing/requirement/service generated this lead (one fetch when the dialog opens).
  const context = useQuery({
    queryKey: ["admin-lead-context", detail?.id],
    enabled: Boolean(detail),
    staleTime: 60_000,
    queryFn: async () => {
      const lead = detail!;
      if (lead.listing_id) {
        const { data, error } = await supabase.from("listings").select("id, title").eq("id", lead.listing_id).maybeSingle();
        if (error) throw error;
        return data ? { label: "Listing", title: data.title as string, href: `/listing/${data.id}` } : null;
      }
      if (lead.requirement_id) {
        const { data, error } = await supabase.from("requirements").select("id, title").eq("id", lead.requirement_id).maybeSingle();
        if (error) throw error;
        return data ? { label: "Requirement", title: data.title as string, href: null } : null;
      }
      if (lead.service_id) {
        const { data, error } = await supabase.from("services").select("id, name").eq("id", lead.service_id).maybeSingle();
        if (error) throw error;
        return data ? { label: "Service", title: data.name as string, href: null } : null;
      }
      return null;
    },
  });

  const data = query.data;

  return (
    <div className="grid gap-4">
      <PageHeader title="Leads" description={data ? `${data.count} leads` : "Track and manage marketplace leads"} />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone, notes…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={search.status ?? "all"} onValueChange={(v) => setParam({ status: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
          <span className="sr-only">Filter by status</span>
        </Select>
        <Select value={search.source ?? "all"} onValueChange={(v) => setParam({ source: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
          <span className="sr-only">Filter by source</span>
        </Select>
        <Select value={search.broker ?? "all"} onValueChange={(v) => setParam({ broker: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Broker" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brokers</SelectItem>
            {(brokers.data?.rows ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
          <span className="sr-only">Filter by broker</span>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load leads"}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {data.rows.length ? (
            data.rows.map((lead) => (
              <div key={lead.id} className="rounded-2xl border bg-card p-3 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{lead.name ?? "Unnamed lead"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lead.phone ?? "No phone"} · source: {lead.source.replace(/_/g, " ")}
                      {lead.commission_amount ? ` · ${formatINR(lead.commission_amount)}` : ""}
                    </p>
                    {lead.message ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{lead.message}</p>
                    ) : null}
                  </div>
                  <PipelineBadge status={lead.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Select value={lead.status} onValueChange={(v) => void quickStatus(lead.id, v)}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openDetail(lead)}>
                    <Pencil className="mr-1 size-3.5" /> Manage
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No leads match these filters.
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
        title={detail?.name ?? "Lead"}
        description={detail ? `${detail.phone ?? "No phone"} · ${detail.source.replace(/_/g, " ")}` : undefined}
        footer={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setDetail(null)}>Close</Button>
            <Button className="rounded-xl" disabled={saving} onClick={() => void saveLead()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save lead
            </Button>
          </>
        }
      >
        {detail ? (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Created" value={new Date(detail.created_at).toLocaleString()} />
              <DetailRow label="Message" value={detail.message ?? "—"} />
              <DetailRow
                label="Context"
                value={
                  context.isLoading
                    ? "Loading…"
                    : context.error
                      ? "Not available"
                      : context.data
                        ? `${context.data.label}: ${context.data.title}`
                        : "No related record"
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Assigned broker</Label>
                <Select value={brokerId} onValueChange={setBrokerId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {(brokers.data?.rows ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Commission amount (₹)</Label>
                <Input type="number" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Commission status</Label>
                <Select value={commissionStatus} onValueChange={setCommissionStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {["pending_payment", "paid"].map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Admin notes (private)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DetailRow label="Broker (current)" value={brokerName(detail.broker_id) ?? "Unassigned"} />
          </div>
        ) : null}
      </DetailDialog>
    </div>
  );
}
