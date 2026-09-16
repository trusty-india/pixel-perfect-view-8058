import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Search,
  Wrench,
  Megaphone,
  GraduationCap,
  MapPin,
  Phone,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListingCard, type ListingRow } from "@/components/listing-card";
import { EmptyState, HScroll, Section } from "@/components/section";
import { Input } from "@/components/ui/input";
import {
  announcementsQuery,
  categoriesQuery,
  listingsQuery,
  parseHeroConfig,
  requirementsQuery,
  servicesQuery,
  settingsQuery,
} from "@/lib/data";
import { useCity } from "@/lib/city";
import { categoryIcon } from "@/lib/category-icons";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "29Bricks — Property, Rooms & Local Services in Lucknow" },
      {
        name: "description",
        content:
          "Find houses, flats, rooms, PGs, shops and land for sale or rent in Lucknow, plus verified local home services.",
      },
      { property: "og:title", content: "29Bricks — Property & Local Services" },
      {
        property: "og:description",
        content: "Buy, rent or list property in Lucknow and hire trusted local services.",
      },
    ],
  }),
  component: Index,
});

/** Bundled, always-available hero image (no network dependency, no broken images). */
const HERO_FALLBACK = "/hero-fallback.svg";

/** Swap a failed image for the bundled fallback exactly once (never loop). */
function withFallback(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset["fallback"]) return;
  img.dataset["fallback"] = "1";
  img.src = HERO_FALLBACK;
}

type BannerRow = {
  id: string;
  title: string;
  message: string | null;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  start_time: string | null;
  end_time: string | null;
  start_at: string | null;
  end_at: string | null;
  is_pinned: boolean;
};

/** Announcements currently inside their admin-configured window (promo strips). */
function activeBanners(rows: BannerRow[] | undefined): BannerRow[] {
  if (!rows?.length) return [];
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 8);
  const inWindow = rows.filter((r) => {
    if (r.start_at && new Date(r.start_at) > now) return false;
    if (r.end_at && new Date(r.end_at) < now) return false;
    if (r.start_time && r.end_time) return hhmm >= r.start_time && hhmm <= r.end_time;
    return true;
  });
  // Pinned announcements lead; the rest follow in admin sort order.
  return [...inWindow].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
}

/** Soft tile tints rotated across category cards — existing brand palette + wine. */
const CATEGORY_TINTS = [
  "bg-sky/25 text-sky-foreground",
  "bg-wine-soft text-wine-deep",
  "bg-primary/10 text-primary",
  "bg-brand/10 text-brand",
  "bg-success/12 text-success",
  "bg-warning/20 text-warning-foreground",
  "bg-accent text-accent-foreground",
  "bg-muted text-foreground",
];

function Index() {
  const { city } = useCity();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: settings } = useQuery(settingsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const { data: announcements } = useQuery(announcementsQuery);
  const { data: featured } = useQuery(listingsQuery({ city, featured: true, limit: 10 }));
  const { data: latest } = useQuery(listingsQuery({ city, limit: 12 }));
  const { data: rooms } = useQuery(listingsQuery({ city, propertyType: "Room", limit: 10 }));
  const { data: studentPicks } = useQuery(listingsQuery({ city, audience: "student", limit: 10 }));
  const { data: shops } = useQuery(listingsQuery({ city, propertyType: "Shop", limit: 10 }));
  const { data: services } = useQuery(servicesQuery());
  const { data: requirements } = useQuery(requirementsQuery(6));

  // Home hero: fully admin-controlled (Business Profile & Settings → Home Hero).
  // No automatic greeting or city text is ever rendered here.
  const hero = parseHeroConfig(settings?.social_links);

  const banners = activeBanners(announcements as BannerRow[] | undefined);

  // Popular locations derived from the same live listings query (DB-driven).
  const popularLocations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of (latest as ListingRow[] | undefined) ?? []) {
      counts.set(l.city, (counts.get(l.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [latest]);

  return (
    <AppShell>
      {/* Home hero: admin-selected image (or clean built-in fallback) with
          admin title, description and CTA. Nothing here is auto-generated. */}
      <div
        className="rise-in relative overflow-hidden rounded-3xl shadow-card"
        style={{ aspectRatio: "16 / 10" }}
      >
        {hero.image_url ? (
          <img
            src={hero.image_url}
            alt={hero.title || "Home hero"}
            onError={withFallback}
            className="hero-img-zoom absolute inset-0 size-full object-cover"
          />
        ) : (
          <img
            src={HERO_FALLBACK}
            alt=""
            aria-hidden
            className="hero-img-zoom absolute inset-0 size-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.2_0.05_26/0.94)] via-[oklch(0.28_0.07_26/0.55)] to-[oklch(0.35_0.1_264/0.25)]" />
        <div className="relative flex size-full flex-col justify-end p-5 text-primary-foreground">
          <h1 className="fade-up text-shadow-hero font-display text-2xl font-bold leading-tight [animation-delay:80ms]">
            {hero.title.trim() || settings?.business_name || "29Bricks"}
          </h1>
          <p className="fade-up text-shadow-hero mt-1 line-clamp-2 text-sm opacity-95 [animation-delay:160ms]">
            {hero.description.trim() ||
              settings?.description ||
              "Property, rooms, shops, land and trusted local services."}
          </p>
          {hero.cta_text.trim() ? (
            <a
              href={hero.cta_url.trim() || "/search"}
              className="fade-up mt-3 inline-flex w-fit items-center gap-1 rounded-full gradient-wine px-4 py-2 text-xs font-bold text-white shadow-wine-glow tap-scale [animation-delay:240ms]"
            >
              {hero.cta_text}
              <ArrowRight className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      {/* Search bar */}
      <form
        className="mt-4 flex items-center gap-2 rounded-2xl border bg-card p-2 pl-3.5 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search", search: { q } });
        }}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search property, room, shop, land or location…"
          className="border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl gradient-wine px-4 py-2 text-xs font-bold text-white shadow-soft tap-scale"
        >
          Search
        </button>
      </form>

      <Section title="Browse categories">
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4">
          {(categories ?? []).map((c, i) => {
            const Icon = categoryIcon(c.icon);
            return (
              <Link
                key={c.id}
                to="/search"
                search={{ category: c.slug }}
                className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-2.5 text-center shadow-soft tap-scale hover:border-wine/40"
              >
                <span
                  className={cn(
                    "grid size-12 place-items-center rounded-2xl shadow-soft transition-transform duration-200",
                    CATEGORY_TINTS[i % CATEGORY_TINTS.length],
                  )}
                >
                  <Icon className="size-5.5" />
                </span>
                <span className="text-[11px] font-semibold leading-tight">{c.name}</span>
                {c.subtitle ? (
                  <span className="line-clamp-1 text-[9px] leading-tight text-muted-foreground">
                    {c.subtitle}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </Section>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <QuickLink to="/services" icon={<Wrench className="size-4" />} label="Services" />
        <QuickLink to="/requirements" icon={<Megaphone className="size-4" />} label="Requirements" />
        <QuickLink to="/student" icon={<GraduationCap className="size-4" />} label="Student Zone" />
      </div>

      <Section title="🔥 Featured properties" action="View all" actionTo="/search">
        {featured?.length ? (
          <HScroll>
            {(featured as ListingRow[]).map((l) => (
              <ListingCard key={l.id} listing={l} compact />
            ))}
          </HScroll>
        ) : (
          <EmptyState text="No featured properties in this city yet." />
        )}
      </Section>

      {/* Premium promo strips — existing admin-controlled announcements */}
      {banners.length ? (
        <section className="mt-5 grid gap-2.5">
          {banners.map((b) => (
            <a
              key={b.id}
              href={b.button_url || "/search"}
              className="flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-2 shadow-soft tap-scale"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-wine-soft">
                {b.image_url ? (
                  <img
                    src={b.image_url}
                    alt=""
                    aria-hidden
                    onError={withFallback}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center bg-wine-soft text-wine-deep">
                    <Megaphone className="size-6" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{b.title}</p>
                {b.message ? (
                  <p className="truncate text-xs text-muted-foreground">{b.message}</p>
                ) : (
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-wine">
                    29Bricks special
                  </p>
                )}
              </div>
              {b.button_text ? (
                <span className="shrink-0 rounded-full gradient-wine px-3 py-1.5 text-[11px] font-bold text-white">
                  {b.button_text}
                </span>
              ) : null}
            </a>
          ))}
        </section>
      ) : null}

      <Section title="🏠 Latest listings" action="View all" actionTo="/search">
        {latest?.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(latest as ListingRow[]).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <EmptyState text="No listings yet. Be the first to post one!" />
        )}
      </Section>

      <Section
        title="🛏️ Rooms near you"
        action="View all"
        actionTo="/search"
        actionSearch={{ type: "Room" }}
      >
        {rooms?.length ? (
          <HScroll>
            {(rooms as ListingRow[]).map((l) => (
              <ListingCard key={l.id} listing={l} compact />
            ))}
          </HScroll>
        ) : (
          <EmptyState text="No rooms listed in this city yet." />
        )}
      </Section>

      <Section title="🎓 Student zone" action="View all" actionTo="/student">
        {studentPicks?.length ? (
          <HScroll>
            {(studentPicks as ListingRow[]).map((l) => (
              <ListingCard key={l.id} listing={l} compact />
            ))}
          </HScroll>
        ) : (
          <EmptyState text="No student stays listed yet." />
        )}
      </Section>

      <Section
        title="🏪 Shops & commercial"
        action="View all"
        actionTo="/search"
        actionSearch={{ type: "Shop" }}
      >
        {shops?.length ? (
          <HScroll>
            {(shops as ListingRow[]).map((l) => (
              <ListingCard key={l.id} listing={l} compact />
            ))}
          </HScroll>
        ) : (
          <EmptyState text="No shops or commercial spaces yet." />
        )}
      </Section>

      <Section title="🔎 People looking for property" action="View all" actionTo="/requirements">
        {requirements?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {requirements.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-card p-3 shadow-soft">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.purpose} · {r.city}
                  {r.location ? `, ${r.location}` : ""}
                </p>
                <p className="mt-1 text-xs font-semibold text-wine-deep">
                  {r.budget_min || r.budget_max
                    ? `${formatINR(Number(r.budget_min ?? 0))} – ${formatINR(Number(r.budget_max ?? 0))}`
                    : "Budget flexible"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="No requirements posted yet." />
        )}
      </Section>

      <Section title="🚚 Popular services" action="View all" actionTo="/services">
        {services?.length ? (
          <HScroll>
            {services.slice(0, 10).map((s) => (
              <div
                key={s.id}
                className="w-[190px] shrink-0 overflow-hidden rounded-2xl border bg-card shadow-soft tap-scale"
              >
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt={s.name}
                    loading="lazy"
                    onError={withFallback}
                    className="h-24 w-full object-cover"
                  />
                ) : null}
                <div className="space-y-1 p-3">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.service_type}</p>
                  <p className="text-xs font-semibold text-wine-deep">
                    {s.price_from ? `From ${formatINR(Number(s.price_from))}` : "Price on request"}
                  </p>
                </div>
              </div>
            ))}
          </HScroll>
        ) : (
          <EmptyState text="No services listed yet." />
        )}
      </Section>

      {popularLocations.length ? (
        <Section title="📍 Popular locations">
          <div className="flex flex-wrap gap-2">
            {popularLocations.map(([name, count]) => (
              <Link
                key={name}
                to="/search"
                search={{ q: name }}
                className="flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-xs font-semibold shadow-soft tap-scale hover:border-wine/40"
              >
                <MapPin className="size-3.5 text-wine" />
                {name}
                <span className="text-[10px] font-medium text-muted-foreground">
                  {count} listing{count === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <footer className="mt-10 overflow-hidden rounded-3xl border bg-card shadow-soft">
        <div className="gradient-wine p-5 text-center text-white">
          <p className="font-display text-lg font-bold">{settings?.business_name ?? "29Bricks"}</p>
          <p className="mt-0.5 text-xs text-white/85">
            Powered by {settings?.powered_by ?? "Sarkar Properties"} · Managed by{" "}
            {settings?.management_name ?? "Seema Sarkar"}
          </p>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-center text-xs text-muted-foreground">{settings?.address}</p>
          <div className="flex justify-center gap-2">
            <a
              href={`tel:${settings?.mobile ?? "9793045547"}`}
              className="flex items-center gap-1.5 rounded-full gradient-wine px-4 py-2 text-xs font-bold text-white shadow-soft tap-scale"
            >
              <Phone className="size-3.5" /> Call us
            </a>
            <a
              href={`https://wa.me/91${(settings?.whatsapp ?? "9793045547").replace(/\D/g, "").slice(-10)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-success/12 px-4 py-2 text-xs font-semibold text-success tap-scale"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1 text-xs font-semibold text-muted-foreground">
            <Link to="/search" className="hover:text-wine-deep">
              Browse properties
            </Link>
            <Link to="/services" className="hover:text-wine-deep">
              Services
            </Link>
            <Link to="/requirements" className="hover:text-wine-deep">
              Requirements
            </Link>
            <Link to="/student" className="hover:text-wine-deep">
              Student Zone
            </Link>
          </div>
        </div>
      </footer>
    </AppShell>
  );
}

function QuickLink({
  to,
  icon,
  label,
}: {
  to: "/services" | "/requirements" | "/student";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 rounded-2xl border bg-card p-3 text-xs font-semibold shadow-soft tap-scale"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-wine-soft text-wine-deep">
        {icon}
      </span>
      {label}
    </Link>
  );
}
