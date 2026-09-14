import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Loader2, Search, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { DetailDialog, DetailRow } from "@/components/admin/detail-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { AdminPagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { adminProfilesQuery, type AdminProfile } from "@/lib/admin-queries";
import { updateRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/admin/users")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    page: typeof search["page"] === "string" ? Number(search["page"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin users — 29Bricks" }] }),
  component: AdminUsers,
});

type SearchParams = {
  q?: string | undefined;
  page?: number | undefined;
};

function AdminUsers() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const page = Math.max(0, (search.page ?? 1) - 1);
  const query = useQuery(adminProfilesQuery({ search: search.q }, page));
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

  const [detail, setDetail] = useState<AdminProfile | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<AdminProfile | null>(null);

  // user_roles has no write policy — roles are shown READ-ONLY here.
  const roles = useQuery({
    queryKey: ["admin-user-roles", detail?.id],
    enabled: Boolean(detail),
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", detail!.id);
      if (error) throw error;
      return (data ?? []).map((row) => String(row.role));
    },
  });

  const activity = useQuery({
    queryKey: ["admin-user-activity", detail?.id],
    enabled: Boolean(detail),
    queryFn: async () => {
      const userId = detail!.id;
      const [listings, requirements, leads] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_id", userId),
        supabase.from("requirements").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      const firstError = [listings, requirements, leads].find((r) => r.error)?.error;
      if (firstError) throw firstError;
      return {
        listings: listings.count ?? 0,
        requirements: requirements.count ?? 0,
        leads: leads.count ?? 0,
      };
    },
  });

  const data = query.data;

  async function toggle(profile: AdminProfile, patch: { is_blocked?: boolean; is_verified?: boolean }) {
    try {
      await updateRow("profiles", profile.id, patch);
      toast.success("User updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Users" description={data ? `${data.count} registered users` : "Verify or block marketplace users"} />

      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name, phone, city…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      </div>

      {query.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load users"}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-2">
          {data.rows.length ? (
            data.rows.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
                <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {(user.full_name ?? "U").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{user.full_name ?? "Unnamed user"}</p>
                    {user.is_verified ? <Badge className="bg-success/12 text-success">Verified</Badge> : null}
                    {user.is_blocked ? <Badge className="bg-destructive/12 text-destructive">Blocked</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user.phone ?? "No phone"} · {user.city ?? "Unknown city"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => void toggle(user, { is_verified: !user.is_verified })}
                  >
                    <CheckCircle2 className="mr-1 size-3.5" />
                    {user.is_verified ? "Unverify" : "Verify"}
                  </Button>
                  <Button
                    size="sm"
                    variant={user.is_blocked ? "default" : "outline"}
                    className="rounded-lg"
                    onClick={() => (user.is_blocked ? void toggle(user, { is_blocked: false }) : setConfirmBlock(user))}
                  >
                    {user.is_blocked ? <ShieldOff className="mr-1 size-3.5" /> : <Ban className="mr-1 size-3.5" />}
                    {user.is_blocked ? "Unblock" : "Block"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setDetail(user)}>
                    Details
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No users match this search.
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
        title={detail?.full_name ?? "User"}
        description={detail ? detail.phone ?? "No phone" : undefined}
      >
        {detail ? (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="User id" value={detail.id} />
              <DetailRow label="City" value={detail.city ?? "—"} />
              <DetailRow label="Verified" value={detail.is_verified ? "Yes" : "No"} />
              <DetailRow label="Blocked" value={detail.is_blocked ? "Yes" : "No"} />
              <DetailRow label="Joined" value={new Date(detail.created_at).toLocaleDateString()} />
            </div>
            <div className="rounded-2xl border bg-muted/40 p-3">
              <p className="text-xs font-semibold">Role</p>
              {roles.isLoading ? (
                <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
              ) : roles.error ? (
                <p className="mt-2 text-xs text-destructive">{roles.error.message}</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {roles.data?.length ? (
                    roles.data.map((role) => (
                      <Badge key={role} variant="outline" className="capitalize">{role}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No explicit role (standard user)</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">Read-only — role writes are not permitted by RLS.</span>
                </div>
              )}
            </div>
            <div className="rounded-2xl border bg-muted/40 p-3">
              <p className="text-xs font-semibold">Activity</p>
              {activity.isLoading ? (
                <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
              ) : activity.error ? (
                <p className="mt-2 text-xs text-destructive">{activity.error.message}</p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-background p-2">
                    <p className="font-display text-lg font-bold">{activity.data?.listings ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Listings</p>
                  </div>
                  <div className="rounded-xl bg-background p-2">
                    <p className="font-display text-lg font-bold">{activity.data?.requirements ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Requirements</p>
                  </div>
                  <div className="rounded-xl bg-background p-2">
                    <p className="font-display text-lg font-bold">{activity.data?.leads ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DetailDialog>

      <ConfirmDialog
        open={Boolean(confirmBlock)}
        onOpenChange={(open) => { if (!open) setConfirmBlock(null); }}
        title={`Block ${confirmBlock?.full_name ?? "this user"}?`}
        description="Blocked users lose access to posting listings, requirements and enquiries. You can unblock them at any time."
        confirmLabel="Block user"
        destructive
        busy={false}
        onConfirm={async () => {
          if (!confirmBlock) return;
          await toggle(confirmBlock, { is_blocked: true });
          setConfirmBlock(null);
        }}
      />
    </div>
  );
}
