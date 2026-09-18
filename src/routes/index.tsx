import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CategoryExplorer, type CategoryRow } from "@/components/category-carousel";
import { ListingCard, type ListingRow } from "@/components/listing-card";
import { EmptyState, HScroll, Section } from "@/components/section";
import { Input } from "@/components/ui/input";
import {
  categoriesQuery,
  listingsQuery,
  parseCategoryImages,
  parseHeroConfig,
  requirementsQuery,
  servicesQuery,
  settingsQuery,
} from "@/lib/data";
import { useCity } from "@/lib/city";
import { formatINR } from "@/lib/format";
import {
  armPageTransition,
  clearPageTransition,
  hasPageTransition,
} from "@/lib/page-transition";
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

const PAGE_OUT_FORWARD = "page-out-forward";
const PAGE_IN_BACK = "page-in-back";

function Index() {
  const { city } = useCity();
  const navigate = useNavigate();
  // Sliding page transitions, split into two independent states:
  //
  // • enterClass — the cosmetic "page-in-back" slide when the user returns
  //   here from the search page. Read via peek (hasPageTransition), not
  //   consume, in the initial state so the class exists from the very first
  //   painted frame (StrictMode-safe). It is VISUAL ONLY and must never gate
  //   click handlers — it used to share state with the exit guard, which kept
  //   it set forever after returning Home and made every category card dead.
  //
  // • slideOut — the "page-out-forward" exit while a category tap slides the
  //   home content away before navigating. Only this guards openCategory, so
  //   cards stay tappable on every fresh mount.
  const [enterClass] = useState<null | typeof PAGE_IN_BACK>(() =>
    hasPageTransition("back") ? PAGE_IN_BACK : null,
  );
  const [slideOut, setSlideOut] = useState<null | typeof PAGE_OUT_FORWARD>(null);
  const [q, setQ] = useState("");
  const { data: settings } = useQuery(settingsQuery);
  const { data: categories } = useQuery(categoriesQuery);
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

  // Category tap → let the section play its scale transition, slide the home
  // page out, then open the existing category page. Plain timeouts (not CSS
  // events) so repeated taps and reduced-motion stay predictable. Guarded only
  // by slideOut — never by the cosmetic enter animation — so cards remain
  // clickable every time the user returns Home.
  const openCategory = useCallback(
    (slug: string) => {
      if (slideOut) return; // exit transition already running
      setSlideOut(PAGE_OUT_FORWARD);
      window.setTimeout(() => {
        armPageTransition("forward");
        void navigate({ to: "/search", search: { category: slug } });
      }, 260);
    },
    [navigate, slideOut],
  );

  // Clear stale transition flags shortly after the enter animation finishes,
  // so a later plain navigation (e.g. bottom-nav "Home") doesn't replay it.
  useEffect(() => {
    if (!enterClass) return;
    const t = window.setTimeout(clearPageTransition, 500);
    return () => window.clearTimeout(t);
  }, [enterClass]);

  const popularLocations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of (latest as ListingRow[] | undefined) ?? []) {
      counts.set(l.city, (counts.get(l.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [latest]);

  return (
    <AppShell>
      <div className={cn(enterClass, slideOut)}>
      {/* Home hero — full-bleed rectangular banner. Admin-controlled text
          only; the -mx-4 breaks out of the page px-4 so the banner touches
          both screen edges with no white gaps and no horizontal overflow.
          Image stays SHARP: no blur, no card-wide wash — readability comes
          from a localized bottom gradient + text-shadow on the text only. */}
      <div
        className="rise-in relative -mx-4 overflow-hidden bg-gradient-to-b from-[#1f3a73] to-[#5c1010] shadow-card"
        style={{ aspectRatio: "16 / 9" }}
      >
        {hero.image_url ? (
          <img
            src={hero.image_url}
            alt={hero.title || "Home hero"}
            onError={withFallback}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <img
            src={HERO_FALLBACK}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {/* Localized readability gradient — bottom quarter only; the rest of
            the image stays fully visible */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 via-black/25 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-4">
          <h1 className="text-shadow-hero font-display text-xl font-bold leading-tight text-white">
            {hero.title.trim() || settings?.business_name || "29Bricks"}
          </h1>
          <p className="text-shadow-hero mt-0.5 line-clamp-2 text-xs leading-snug text-white/95">
            {hero.description.trim() ||
              settings?.description ||
              "Property, rooms, shops, land and trusted local services."}
          </p>
          {hero.cta_text.trim() ? (
            <a
              href={hero.cta_url.trim() || "/search"}
              className="mt-2 inline-flex items-center gap-1 rounded-full gradient-wine px-4 py-2 text-xs font-bold text-white shadow-wine-glow tap-scale"
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

      <CategoryExplorer
        categories={categories as CategoryRow[] | undefined}
        images={parseCategoryImages(settings?.social_links)}
        onSelect={openCategory}
      />

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
      </div>
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
