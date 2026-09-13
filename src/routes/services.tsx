import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Phone, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/section";
import { servicesQuery } from "@/lib/data";
import { SERVICE_TYPES, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Local home services in Lucknow — 29Bricks" },
      {
        name: "description",
        content:
          "Hire trusted packers & movers, electricians, plumbers, painters, cleaners and more in Lucknow.",
      },
      { property: "og:title", content: "Local home services — 29Bricks" },
      {
        property: "og:description",
        content: "Verified local service providers for your home and shop.",
      },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const [type, setType] = useState<string | undefined>(undefined);
  const { data, isLoading } = useQuery(servicesQuery(type));

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">Local services</h1>
          <p className="text-xs text-muted-foreground">
            Trusted helpers for your home, shop and shifting needs.
          </p>
        </div>
        <Link
          to="/post/service"
          className="ml-auto flex items-center gap-1 rounded-xl gradient-red px-3 py-2 text-xs font-semibold text-brand-foreground tap-scale"
        >
          <Plus className="size-4" /> List service
        </Link>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!type} onClick={() => setType(undefined)} label="All" />
        {SERVICE_TYPES.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)} label={t} />
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((s) => (
          <div key={s.id} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            {s.image_url ? (
              <img
                src={s.image_url}
                alt={s.name}
                loading="lazy"
                className="aspect-[16/9] w-full object-cover"
              />
            ) : null}
            <div className="space-y-1 p-4">
              <div className="flex items-start gap-2">
                <p className="text-sm font-bold">{s.name}</p>
                {s.is_featured ? (
                  <span className="ml-auto rounded-full gradient-red px-2 py-0.5 text-[10px] font-semibold text-brand-foreground">
                    Featured
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.service_type} · {s.city}
                {s.areas ? ` · ${s.areas}` : ""}
              </p>
              {s.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
              ) : null}
              <div className="flex items-center gap-2 pt-2">
                <p className="text-sm font-bold text-primary">
                  {s.price_from ? `From ${formatINR(Number(s.price_from))}` : "Price on request"}
                </p>
                {s.phone ? (
                  <a
                    href={`tel:${s.phone}`}
                    className="ml-auto flex items-center gap-1 rounded-xl bg-success/12 px-3 py-1.5 text-xs font-semibold text-success tap-scale"
                  >
                    <Phone className="size-3.5" /> Call
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && !data?.length ? (
        <div className="mt-4">
          <EmptyState text="No services found for this category yet." />
        </div>
      ) : null}
    </AppShell>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold tap-scale",
        active ? "gradient-red border-transparent text-brand-foreground" : "bg-card",
      )}
    >
      {label}
    </button>
  );
}
