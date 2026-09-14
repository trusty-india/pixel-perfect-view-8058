import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/section";
import { requirementsQuery } from "@/lib/data";
import { formatINR, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/requirements")({
  head: () => ({
    meta: [
      { title: "Buyer & tenant requirements — 29Bricks" },
      {
        name: "description",
        content: "See what buyers and tenants are looking for in Lucknow and match your property.",
      },
      { property: "og:title", content: "Buyer & tenant requirements — 29Bricks" },
      { property: "og:description", content: "Live property requirements from real people." },
    ],
  }),
  component: RequirementsPage,
});

function RequirementsPage() {
  const { data, isLoading } = useQuery(requirementsQuery(50));

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Requirements</h1>
          <p className="text-xs text-muted-foreground">What buyers and tenants need right now.</p>
        </div>
        <Link
          to="/post/requirement"
          className="rounded-full gradient-red px-4 py-2 text-xs font-semibold text-brand-foreground tap-scale"
        >
          Post yours
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-3 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold">{r.title}</p>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {timeAgo(r.created_at)}
              </span>
            </div>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {r.purpose} · {r.property_type ?? "Any type"} · {r.city}
              {r.location ? `, ${r.location}` : ""}
            </p>
            {r.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
            ) : null}
            <p className="mt-2 text-xs font-bold text-primary">
              {r.budget_min || r.budget_max
                ? `${formatINR(Number(r.budget_min ?? 0))} – ${formatINR(Number(r.budget_max ?? 0))}`
                : "Budget flexible"}
              {r.bhk ? ` · ${r.bhk}` : ""}
            </p>
          </div>
        ))}
      </div>

      {!isLoading && !data?.length ? (
        <div className="mt-4">
          <EmptyState text="No requirements posted yet." />
        </div>
      ) : null}
    </AppShell>
  );
}
