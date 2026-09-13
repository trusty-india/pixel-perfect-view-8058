import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
        content:
          "See what buyers and tenants are looking for in Lucknow, or post your own property requirement.",
      },
      { property: "og:title", content: "Buyer & tenant requirements — 29Bricks" },
      {
        property: "og:description",
        content: "Post what you need and let the right property find you.",
      },
    ],
  }),
  component: RequirementsPage,
});

function RequirementsPage() {
  const { data, isLoading } = useQuery(requirementsQuery(50));

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">Requirements</h1>
          <p className="text-xs text-muted-foreground">
            What buyers and tenants are looking for right now.
          </p>
        </div>
        <Link
          to="/post/requirement"
          className="ml-auto flex items-center gap-1 rounded-xl gradient-red px-3 py-2 text-xs font-semibold text-brand-foreground tap-scale"
        >
          <Plus className="size-4" /> Post need
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex items-start gap-2">
              <p className="text-sm font-bold">{r.title}</p>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {timeAgo(r.created_at)}
              </span>
            </div>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {r.purpose}
              {r.property_type ? ` · ${r.property_type}` : ""} · {r.city}
              {r.location ? `, ${r.location}` : ""}
            </p>
            {r.description ? (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              {r.bhk ? <span className="rounded-full bg-muted px-2 py-0.5">{r.bhk}</span> : null}
              {r.area_size ? (
                <span className="rounded-full bg-muted px-2 py-0.5">{r.area_size}</span>
              ) : null}
              <span className="ml-auto text-sm font-bold text-primary">
                {r.budget_min || r.budget_max
                  ? `${formatINR(r.budget_min ? Number(r.budget_min) : null)} – ${formatINR(
                      r.budget_max ? Number(r.budget_max) : null,
                    )}`
                  : "Budget flexible"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && !data?.length ? (
        <div className="mt-4">
          <EmptyState text="No requirements posted yet. Be the first one." />
        </div>
      ) : null}
    </AppShell>
  );
}
