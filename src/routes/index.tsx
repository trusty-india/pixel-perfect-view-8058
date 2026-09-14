import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, Sparkles, Wrench, Megaphone, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListingCard, type ListingRow } from "@/components/listing-card";
import { EmptyState, HScroll, Section } from "@/components/section";
import { Input } from "@/components/ui/input";
import {
  announcementsQuery,
  activeAnnouncement,
  categoriesQuery,
  listingsQuery,
  requirementsQuery,
  servicesQuery,
  settingsQuery,
} from "@/lib/data";
import { useCity } from "@/lib/city";
import { formatINR } from "@/lib/format";

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

/**
 * Time-of-day greeting. Client-only: rendering it during SSR embeds the
 * server's clock (UTC) into the HTML, which then mismatches the browser's
 * local time during hydration (React error #418).
 */
function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
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

function heroBanners(rows: BannerRow[] | undefined): BannerRow[] {
  if (!rows?.length) return [];
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 8);
  const inWindow = rows.filter((r) => {
    if (r.start_at && new Date(r.start_at) > now) return false;
    if (r.end_at && new Date(r.end_at) < now) return false;
    if (r.start_time && r.end_time) return hhmm >= r.start_time && hhmm <= r.end_time;
    return true;
  });
  // Pinned announcements lead the carousel; the rest follow in admin order.
  return [...inWindow].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
}

function Index() {
  const { city } = useCity();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [greeting, setGreeting] = useState("");
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    setGreeting(timeGreeting());
  }, []);
  const { data: settings } = useQuery(settingsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const { data: announcements } = useQuery(announcementsQuery);
  const { data: featured } = useQuery(listingsQuery({ city, featured: true, limit: 10 }));
  const { data: latest } = useQuery(listingsQuery({ city, limit: 12 }));
  const { data: services } = useQuery(servicesQuery());
  const { data: requirements } = useQuery(requirementsQuery(6));

  const banners = heroBanners(announcements as BannerRow[] | undefined);
  const banner = banners[slide] ?? null;

  // Gentle auto-advance for multi-banner carousels (lightweight; no library).
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  return (
    <AppShell>
      {/* Hero: admin-controlled announcement card first, brand greeting fallback */}
      {banner ? (
        <div
          key={banner.id}
          className="rise-in relative overflow-hidden rounded-3xl shadow-card"
          style={{ aspectRatio: "16 / 10" }}
        >
          {banner.image_url ? (
            <img
              src={banner.image_url}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.25_0.08_260/0.92)] via-[oklch(0.3_0.1_262/0.55)] to-[oklch(0.4_0.14_264/0.25)]" />
          <div className="relative flex size-full flex-col justify-end p-5 text-primary-foreground">
            <p className="text-xs font-medium opacity-90">{greeting ? `${greeting} 👋` : city}</p>
            <h1 className="text-shadow-hero mt-1 font-display text-2xl font-bold leading-tight">
              {banner.title}
            </h1>
            {banner.message ? (
              <p className="text-shadow-hero mt-1 line-clamp-2 text-sm opacity-95">{banner.message}</p>
            ) : null}
            {banner.button_text ? (
              <a
                href={banner.button_url || "/search"}
                className="mt-3 inline-flex w-fit items-center gap-1 rounded-full gradient-red px-4 py-2 text-xs font-bold text-brand-foreground shadow-glow tap-scale"
              >
                {banner.button_text} →
              </a>
            ) : null}
          </div>
          {banners.length > 1 ? (
            <div className="absolute right-4 top-4 flex gap-1.5">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Announcement ${i + 1}`}
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === slide ? "w-5 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rise-in relative overflow-hidden rounded-3xl gradient-hero shadow-card">
          <div className="p-5 text-primary-foreground">
            <p className="text-xs opacity-90">
              {greeting ? `${greeting} 🌞 · ` : ""}
              {city}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold leading-tight">
              Find your perfect home
              <br />
              with 29Bricks
            </h1>
            <p className="mt-1 text-xs opacity-90">
              {settings?.description ?? "Property, rooms, shops, land and trusted local services."}
            </p>
            <Link
              to="/search"
              className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-primary-foreground px-4 py-2 text-xs font-bold text-primary shadow-glow tap-scale"
            >
              Explore Now →
            </Link>
          </div>
          <Sparkles className="float-soft absolute -right-3 -top-3 size-24 text-primary-foreground/15" />
        </div>
      )}

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
          className="shrink-0 rounded-xl gradient-red px-4 py-2 text-xs font-semibold text-brand-foreground tap-scale"
        >
          Search
        </button>
      </form>

      <Section title="Browse categories">
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to="/search"
              search={{ category: c.slug }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-2.5 text-center shadow-soft tap-scale"
            >
              <span className="grid size-12 place-items-center rounded-2xl gradient-sky text-xl shadow-soft">
                {c.icon ?? "🏠"}
              </span>
              <span className="text-[11px] font-semibold leading-tight">{c.name}</span>
            </Link>
          ))}
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

      <Section title="🚚 Popular services" action="View all" actionTo="/services">
        {services?.length ? (
          <HScroll>
            {services.slice(0, 10).map((s) => (
              <div
                key={s.id}
                className="w-[190px] shrink-0 overflow-hidden rounded-2xl border bg-card shadow-soft tap-scale"
              >
                {s.image_url ? (
                  <img src={s.image_url} alt={s.name} loading="lazy" className="h-24 w-full object-cover" />
                ) : null}
                <div className="space-y-1 p-3">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.service_type}</p>
                  <p className="text-xs font-semibold text-primary">
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
                <p className="mt-1 text-xs font-semibold text-primary">
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

      <footer className="mt-10 rounded-3xl border bg-card p-5 text-center shadow-soft">
        <p className="font-display text-lg font-bold">{settings?.business_name ?? "29Bricks"}</p>
        <p className="text-xs text-muted-foreground">
          Powered by {settings?.powered_by ?? "Sarkar Properties"} · Managed by{" "}
          {settings?.management_name ?? "Seema Sarkar"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{settings?.address}</p>
        <div className="mt-3 flex justify-center gap-2">
          <a
            href={`tel:${settings?.mobile ?? "9793045547"}`}
            className="rounded-full gradient-red px-4 py-2 text-xs font-semibold text-brand-foreground tap-scale"
          >
            Call us
          </a>
          <a
            href={`https://wa.me/91${(settings?.whatsapp ?? "9793045547").replace(/\D/g, "").slice(-10)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-success/12 px-4 py-2 text-xs font-semibold text-success tap-scale"
          >
            WhatsApp
          </a>
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
      <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      {label}
    </Link>
  );
}
