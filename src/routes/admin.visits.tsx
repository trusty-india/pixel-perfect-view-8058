import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, CalendarX, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PipelineBadge } from "@/components/admin/status-badge";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminVisitsQuery } from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/admin/visits")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin visits — 29Bricks" }] }),
  component: AdminVisits,
});

type SearchParams = { status?: string | undefined; page?: number | undefined };

const STATUS_CHIPS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

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

function AdminVisits() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(adminVisitsQuery({ status: search.status }, page));
  const queryClient = useQueryClient();

  const rows = query.data?.rows ?? [];
  const titles = useListingTitles(Array.from(new Set(rows.map((r) => r.listing_id))));

  const setParam = (patch: Partial<SearchParams>) =>
    void navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch, page: undefined }), replace: true });

  async function setStatus(id: string, status: string) {
    try {
      await updateRow("visit_requests", id, { status });
      toast.success(`Visit ${status}`);
      void queryClient.invalidateQueries({ queryKey: ["admin-visits"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const data = query.data;

  return (
    <div className="grid gap-4">
      <PageHeader title="Visit requests" description={data ? `${data.count} requests` : "Schedule and complete property visits"} />

      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => (
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
          {query.error instanceof Error ? query.error.message : "Could not load visits"}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {rows.length ? (
            rows.map((visit) => (
              <div key={visit.id} className="rounded-2xl border bg-card p-3 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {titles.data?.get(visit.listing_id) ?? "Listing"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {visit.preferred_date ?? "Date flexible"}
                      {visit.preferred_time ? ` · ${visit.preferred_time}` : ""} ·{" "}
                      {new Date(visit.created_at).toLocaleDateString()}
                    </p>
                    {visit.note ? <p className="mt-1 text-xs text-muted-foreground">{visit.note}</p> : null}
                  </div>
                  <PipelineBadge status={visit.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {visit.status === "new" ? (
                    <Button size="sm" className="rounded-lg" onClick={() => void setStatus(visit.id, "scheduled")}>
                      <CalendarCheck className="mr-1 size-3.5" /> Schedule
                    </Button>
                  ) : null}
                  {visit.status !== "completed" && visit.status !== "cancelled" ? (
                    <>
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void setStatus(visit.id, "completed")}>
                        <CheckCircle2 className="mr-1 size-3.5" /> Complete
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void setStatus(visit.id, "cancelled")}>
                        <CalendarX className="mr-1 size-3.5" /> Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No visit requests match this filter.
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
