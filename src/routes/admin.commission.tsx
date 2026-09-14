import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PipelineBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { adminBrokersQuery, adminLeadsQuery } from "@/lib/admin-queries";
import { AdminPagination } from "@/components/admin/pagination";
import { updateRow } from "@/lib/admin-mutations";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/commission")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    broker: typeof search["broker"] === "string" ? search["broker"] : undefined,
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin commission — 29Bricks" }] }),
  component: AdminCommission,
});

type SearchParams = { broker?: string | undefined; status?: string | undefined; page?: number | undefined };

const COMMISSION_STATUS_OPTIONS = ["pending_payment", "paid"];

function AdminCommission() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = Math.max(0, (search.page ?? 1) - 1);

  // Commission-relevant leads: any lead that has commission data recorded.
  const leads = useQuery(
    adminLeadsQuery({ broker_id: search.broker }, page),
  );
  const brokers = useQuery(adminBrokersQuery({}, 0));
  const queryClient = useQueryClient();

  const setParam = (patch: Partial<SearchParams>) =>
    void navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch, page: undefined }), replace: true });

  const brokerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brokers.data?.rows ?? []) map.set(b.id, b.name);
    return (id: string | null) => (id ? (map.get(id) ?? id) : null);
  }, [brokers.data]);

  // Only leads with commission_amount are commission rows; dashboard "count" mirrors this.
  const commissionLeads = (leads.data?.rows ?? []).filter(
    (l) =>
      l.commission_amount != null &&
      (!search.status || (l.commission_status ?? "pending_payment") === search.status),
  );

  const total = commissionLeads.reduce((sum, l) => sum + (l.commission_amount ?? 0), 0);
  const pending = commissionLeads
    .filter((l) => (l.commission_status ?? "pending_payment") !== "paid")
    .reduce((sum, l) => sum + (l.commission_amount ?? 0), 0);
  const paid = commissionLeads
    .filter((l) => l.commission_status === "paid")
    .reduce((sum, l) => sum + (l.commission_amount ?? 0), 0);

  const byBroker = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const lead of commissionLeads) {
      if (!lead.broker_id) continue;
      const key = lead.broker_id;
      const existing = map.get(key) ?? { name: brokerName(key) ?? key, total: 0, count: 0 };
      existing.total += lead.commission_amount ?? 0;
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [commissionLeads, brokerName]);

  const data = leads.data;

  async function setCommissionStatus(leadId: string, status: string) {
    try {
      await updateRow("leads", leadId, { commission_status: status });
      toast.success("Commission status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Commission" description="Track broker commissions recorded on leads" />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Total commission</p>
          <p className="mt-1 font-display text-2xl font-bold">{formatINR(total)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Pending payment</p>
          <p className="mt-1 font-display text-2xl font-bold text-warning-foreground">{formatINR(pending)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="mt-1 font-display text-2xl font-bold text-success">{formatINR(paid)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={search.broker ?? "all"} onValueChange={(v) => setParam({ broker: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Broker" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brokers</SelectItem>
            {(brokers.data?.rows ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={search.status ?? "all"} onValueChange={(v) => setParam({ status: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_payment">pending payment</SelectItem>
            <SelectItem value="paid">paid</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {commissionLeads.length} leads with commission
        </span>
      </div>

      {leads.isLoading || brokers.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {leads.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {leads.error instanceof Error ? leads.error.message : "Could not load commission data"}
        </div>
      ) : null}

      {byBroker.length ? (
        <section className="rounded-3xl border bg-card p-4 shadow-soft">
          <h2 className="text-sm font-bold">Broker-wise commission</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byBroker.map((row) => (
              <div key={row.id} className="rounded-2xl border bg-background p-3">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                <p className="mt-1 font-display text-lg font-bold">{formatINR(row.total)}</p>
                <p className="text-[11px] text-muted-foreground">{row.count} leads</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {commissionLeads.length ? (
            commissionLeads.map((lead) => (
              <div key={lead.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3 shadow-soft">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{lead.name ?? "Unnamed lead"}</p>
                  <p className="text-xs text-muted-foreground">
                    {brokerName(lead.broker_id) ?? "No broker"} · {formatINR(lead.commission_amount)} ·{" "}
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PipelineBadge status={lead.commission_status ?? "pending_payment"} />
                  {lead.commission_status !== "paid" ? (
                    <Button size="sm" className="rounded-lg" onClick={() => void setCommissionStatus(lead.id, "paid")}>
                      Mark paid
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No commission recorded on leads yet. Set commission amounts from the Leads page.
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
    </div>
  );
}