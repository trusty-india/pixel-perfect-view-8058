import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminShell } from "@/components/admin/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin panel — 29Bricks" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminGate>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </AdminGate>
  );
}

/** Preserves the existing /admin access behavior: sign-in gate, admin_exists + claim_admin bootstrap, denied state. */
function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, refresh } = useAuth();
  const queryClient = useQueryClient();
  const adminExists = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw error;
      return Boolean(data);
    },
    enabled: Boolean(user),
  });

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <AccessCard
        title="Sign in to open Admin"
        description="Only an authenticated 29Bricks administrator can manage the marketplace."
      />
    );
  }

  if (!isAdmin) {
    if (!adminExists.isLoading && !adminExists.data) {
      return (
        <AccessCard
          title="Set up the first administrator"
          description="No administrator exists yet. This one-time action gives your signed-in account control of the marketplace."
          actionLabel="Make this account admin"
          onAction={async () => {
            const { data, error } = await supabase.rpc("claim_admin");
            if (error) {
              toast.error(error.message);
              return;
            }
            if (!data) {
              toast.error("Another administrator already claimed setup.");
              void adminExists.refetch();
              return;
            }
            await refresh();
            void queryClient.invalidateQueries({ queryKey: ["admin-exists"] });
            toast.success("Admin access enabled");
          }}
        />
      );
    }
    return (
      <AccessCard
        title="Admin access required"
        description="Your account does not have the admin role. Ask the existing administrator to grant access."
      />
    );
  }

  return <>{children}</>;
}

function AccessCard({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border bg-card p-8 text-center shadow-soft">
        <ShieldAlert className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 font-display text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {actionLabel && onAction ? (
          <Button className="mt-5 rounded-xl" onClick={() => void onAction()}>
            <CheckCircle2 className="mr-2 size-4" /> {actionLabel}
          </Button>
        ) : (
          <Link
            to="/auth"
            className="mt-5 inline-block rounded-xl gradient-red px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
