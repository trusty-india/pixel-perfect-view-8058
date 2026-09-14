import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, PhoneCall } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PipelineBadge } from "@/components/admin/status-badge";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminContactsQuery } from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/admin/contacts")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin contacts — 29Bricks" }] }),
  component: AdminContacts,
});

type SearchParams = { status?: string | undefined; page?: number | undefined };

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

function AdminContacts() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(adminContactsQuery({ status: search.status }, page));
  const queryClient = useQueryClient();

  const rows = query.data?.rows ?? [];
  const listingIds = Array.from(new Set(rows.map((r) => r.listing_id).filter((id): id is string => Boolean(id))));
  const titles = useListingTitles(listingIds);

  const setParam = (patch: Partial<SearchParams>) =>
    void navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch, page: undefined }), replace: true });

  async function setStatus(id: string, status: string) {
    try {
      await updateRow("contact_requests", id, { status });
      toast.success("Contact request updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const data = query.data;

  return (
    <div className="grid gap-4">
      <PageHeader title="Contact requests" description={data ? `${data.count} requests` : "Track who asked to be contacted"} />

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All" },
          { id: "new", label: "New" },
          { id: "contacted", label: "Contacted" },
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
          {query.error instanceof Error ? query.error.message : "Could not load contact requests"}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {rows.length ? (
            rows.map((contact) => (
              <div key={contact.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3 shadow-soft">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {contact.listing_id
                      ? (titles.data?.get(contact.listing_id) ?? "Listing enquiry")
                      : "General enquiry"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(contact.created_at).toLocaleString()} · user {contact.user_id.slice(0, 8)}…
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PipelineBadge status={contact.status} />
                  {contact.status !== "contacted" ? (
                    <Button size="sm" className="rounded-lg" onClick={() => void setStatus(contact.id, "contacted")}>
                      <PhoneCall className="mr-1 size-3.5" /> Mark contacted
                    </Button>
                  ) : (
                    <CheckCircle2 className="size-4 text-success" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No contact requests match this filter.
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
