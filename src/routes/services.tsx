import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Phone, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/section";
import { servicesQuery, settingsQuery } from "@/lib/data";
import { SERVICE_TYPES, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

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

/** Coherent 29Bricks palette for category tiles (soft, not neon). */
const TYPE_ICONS: Record<string, string> = {
  "Packers & Movers": "🚚",
  Electrician: "⚡",
  Plumber: "🔧",
  Carpenter: "🪚",
  Painter: "🎨",
  "AC Repair": "❄️",
  "RO Service": "💧",
  Cleaning: "🧹",
  "Pest Control": "🐜",
  CCTV: "📹",
  "Interior Design": "🛋️",
  Architect: "📐",
  "Civil Contractor": "🏗️",
  Renovation: "🧱",
  Furniture: "🪑",
  "Appliance Repair": "🔌",
  "Water Tanker": "🚰",
  Security: "🛡️",
  "Other Services": "🛠️",
};

const TILE_TINTS = [
  "bg-primary/10 text-primary",
  "bg-brand/10 text-brand",
  "bg-sky/12 text-sky-foreground",
  "bg-success/12 text-success",
  "bg-warning/15 text-warning-foreground",
  "bg-accent text-accent-foreground",
];

function ServicesPage() {
  const [type, setType] = useState<string>("");
  const [text, setText] = useState("");
  const { data, isLoading } = useQuery(servicesQuery(type || undefined));
  const { data: settings } = useQuery(useMemo(() => settingsQuery, []));

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!text.trim()) return rows;
    const q = text.trim().toLowerCase();
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.service_type.toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q),
    );
  }, [data, text]);

  return (
    <AppShell>
      {/* Hero */}
      <div className="rise-in relative overflow-hidden rounded-3xl gradient-hero p-5 text-primary-foreground shadow-card">
        <div className="relative">
          <h1 className="font-display text-2xl font-bold leading-tight">
            Trusted Local Services
            <br />
            for Your Home & Business
          </h1>
          <p className="mt-1 text-xs opacity-90">
            {settings?.powered_by ?? "Sarkar Properties"} · Verified helpers near you
          </p>
        </div>
        <ShieldCheck className="float-soft absolute -right-2 -top-2 size-20 text-primary-foreground/15" />
      </div>

      {/* Search */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl border bg-card px-3.5 py-2.5 shadow-soft">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search services…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Search services"
        />
      </div>

      {/* Category grid */}
      <h2 className="mt-6 text-base font-bold">Categories</h2>
      <div className="mt-3 grid grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setType("")}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center shadow-soft tap-scale",
            type === "" ? "border-brand/50 bg-brand/5" : "bg-card",
          )}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-xl">
            🧰
          </span>
          <span className="text-[11px] font-semibold leading-tight">All</span>
        </button>
        {["Packers & Movers", "Electrician", "Plumber", "Painter", "AC Repair", "Cleaning", "Pest Control"].map(
          (t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t === type ? "" : t)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center shadow-soft tap-scale",
                type === t ? "border-brand/50 bg-brand/5" : "bg-card",
              )}
            >
              <span
                className={cn(
                  "grid size-12 place-items-center rounded-2xl text-xl",
                  TILE_TINTS[SERVICE_TYPES.indexOf(t) % TILE_TINTS.length],
                )}
              >
                {TYPE_ICONS[t] ?? "🛠️"}
              </span>
              <span className="text-[11px] font-semibold leading-tight">{t}</span>
            </button>
          ),
        )}
      </div>

      {/* Type chips for the full list */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {["", ...SERVICE_TYPES].map((t) => (
          <button
            key={t || "all"}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold tap-scale",
              type === t
                ? "gradient-red border-transparent text-brand-foreground"
                : "bg-card",
            )}
          >
            {t || "All"}
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-base font-bold">Popular Services</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {filtered.map((s) => (
          <div key={s.id} className="overflow-hidden rounded-2xl border bg-card shadow-soft tap-scale">
            {s.image_url ? (
              <img
                src={s.image_url}
                alt={s.name}
                loading="lazy"
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="grid h-24 w-full place-items-center gradient-sky text-3xl">
                {TYPE_ICONS[s.service_type] ?? "🛠️"}
              </div>
            )}
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

      {!isLoading && !filtered.length ? (
        <div className="mt-4">
          <EmptyState text="No services listed in this category yet." />
        </div>
      ) : null}
    </AppShell>
  );
}
