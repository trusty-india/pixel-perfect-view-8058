import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Phone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/section";
import { servicesQuery, settingsQuery } from "@/lib/data";
import { SERVICE_TYPES, formatINR } from "@/lib/format";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Local home services in Lucknow — 29Bricks" },
      {
        name: "description",
        content:
          "Book electricians, plumbers, packers & movers, painters and cleaning services near you.",
      },
      { property: "og:title", content: "Local home services — 29Bricks" },
      { property: "og:description", content: "Trusted local service providers in your city." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const [type, setType] = useState<string>("");
  const { data, isLoading } = useQuery(servicesQuery(type || undefined));
  const { data: settings } = useQuery(settingsQuery);

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Local services</h1>
      <p className="text-xs text-muted-foreground">Verified helpers for your home and shifting.</p>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {["", ...SERVICE_TYPES].map((t) => (
          <button
            key={t || "all"}
            type="button"
            onClick={() => setType(t)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold tap-scale ${
              type === t ? "gradient-red border-transparent text-brand-foreground" : "bg-card"
            }`}
          >
            {t || "All"}
          </button>
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
                className="h-32 w-full object-cover"
              />
            ) : null}
            <div className="space-y-1 p-3">
              <p className="text-sm font-bold">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {s.service_type} · {s.city}
                {s.areas ? ` · ${s.areas}` : ""}
              </p>
              {s.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
              ) : null}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-primary">
                  {s.price_from ? `From ${formatINR(Number(s.price_from))}` : "Price on request"}
                </span>
                <a
                  href={`tel:${s.phone || settings?.public_contact_number || "9793045547"}`}
                  className="flex items-center gap-1 rounded-full gradient-red px-3 py-1.5 text-xs font-semibold text-brand-foreground tap-scale"
                >
                  <Phone className="size-3.5" /> Call
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && !data?.length ? (
        <div className="mt-4">
          <EmptyState text="No services listed in this category yet." />
        </div>
      ) : null}
    </AppShell>
  );
}
