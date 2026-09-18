import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

/** Minimal shape of a row from the existing database-driven `categories` table. */
export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  subtitle: string | null;
};

/**
 * Display-only enrichment for the DB-driven categories: a short tagline and a
 * tinted icon chip (existing brand palette + the wine accent) matched by name.
 * Everything here is presentational — the database stays the single source of
 * truth for names, icons, slugs and ordering. Categories that match no pattern
 * fall back to their own DB subtitle and a rotating tint, so admin-added
 * categories keep working.
 */
type CategoryVisual = { tagline: string; chip: string };

const NAME_VISUALS: { match: RegExp; visual: CategoryVisual }[] = [
  {
    match: /buy|sale|sell|purchase/,
    visual: { tagline: "Find your dream property", chip: "bg-wine-soft text-wine-deep" },
  },
  {
    match: /rent|lease/,
    visual: { tagline: "Comfortable homes on rent", chip: "bg-sky/25 text-sky-foreground" },
  },
  {
    match: /land|plot/,
    visual: { tagline: "Plots for your future", chip: "bg-success/12 text-success" },
  },
  {
    match: /shop|commercial|office/,
    visual: { tagline: "Spaces for your business", chip: "bg-warning/20 text-warning-foreground" },
  },
  {
    match: /\broom\b|\bpg\b|accommodat/,
    visual: { tagline: "Rooms that fit your needs", chip: "bg-primary/10 text-primary" },
  },
  {
    match: /student|hostel|colleg/,
    visual: { tagline: "Affordable student living", chip: "bg-accent text-accent-foreground" },
  },
  {
    match: /packer|mover|relocat|shift/,
    visual: { tagline: "Move without the hassle", chip: "bg-sky/25 text-sky-foreground" },
  },
  {
    match: /service/,
    visual: { tagline: "Property services made easy", chip: "bg-brand/10 text-brand" },
  },
];

/** Tint rotation for categories outside the standard set. */
const FALLBACK_TINTS = [
  "bg-wine-soft text-wine-deep",
  "bg-sky/25 text-sky-foreground",
  "bg-primary/10 text-primary",
  "bg-brand/10 text-brand",
  "bg-success/12 text-success",
  "bg-warning/20 text-warning-foreground",
  "bg-accent text-accent-foreground",
  "bg-muted text-foreground",
];

function categoryVisual(name: string, index: number): CategoryVisual {
  const n = name.toLowerCase();
  const found = NAME_VISUALS.find((v) => v.match.test(n));
  return (
    found?.visual ?? {
      tagline: "",
      chip: FALLBACK_TINTS[index % FALLBACK_TINTS.length] ?? "bg-muted text-foreground",
    }
  );
}

/**
 * Premium "Explore by Category" section.
 *
 * Mobile: 2-up swipeable embla carousel (arrows + pagination dots).
 * Desktop: all categories in a clean 4-column grid.
 *
 * Tapping a card does not navigate instantly — the page wires `onSelect` to
 * play the slide-out transition first, then opens the existing category page
 * (/search?category=slug, the same mapping the home grid always used).
 */
export function CategoryExplorer({
  categories,
  onSelect,
}: {
  categories: CategoryRow[] | undefined;
  onSelect: (slug: string) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 2,
    containScroll: "trimSnaps",
  });
  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      setSelected(emblaApi.selectedScrollSnap());
      setSnapCount(emblaApi.scrollSnapList().length);
    };
    sync();
    emblaApi.on("select", sync).on("reInit", sync);
    return () => {
      emblaApi.off("select", sync).off("reInit", sync);
    };
  }, [emblaApi]);

  if (!categories?.length) return null;

  return (
    <section className="mt-6" aria-labelledby="explore-categories-title">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-5 w-1.5 shrink-0 rounded-full gradient-wine" />
            <h2 id="explore-categories-title" className="font-display text-lg font-bold leading-tight">
              Explore by Category
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Find the right property or service for your needs
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={selected === 0}
            aria-label="Previous categories"
            className="grid size-8 place-items-center rounded-full border bg-card text-wine-deep shadow-soft tap-scale disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={selected >= snapCount - 1}
            aria-label="Next categories"
            className="grid size-8 place-items-center rounded-full border bg-card text-wine-deep shadow-soft tap-scale disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Mobile: horizontal swipe carousel, ~2 cards per view with a small peek. */}
      <div className="md:hidden">
        <div ref={emblaRef} className="-mx-4 overflow-hidden">
          <div className="-ml-3 flex">
            {categories.map((c, i) => (
              <div key={c.id} className="min-w-0 shrink-0 grow-0 basis-[calc(50%-12px)] pl-3">
                <CategoryCard category={c} index={i} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
        {snapCount > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: snapCount }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to category page ${i + 1}`}
                aria-current={i === selected}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 tap-scale",
                  i === selected ? "w-5 bg-wine" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Desktop: all categories visible in a clean row-based grid. */}
      <div className="hidden gap-3 md:grid md:grid-cols-4">
        {categories.map((c, i) => (
          <CategoryCard key={c.id} category={c} index={i} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  index,
  onSelect,
}: {
  category: CategoryRow;
  index: number;
  onSelect: (slug: string) => void;
}) {
  const Icon = categoryIcon(category.icon);
  const { tagline, chip } = categoryVisual(category.name, index);
  const blurb = tagline || category.subtitle || "Explore now";

  return (
    <button
      type="button"
      onClick={() => onSelect(category.slug)}
      aria-label={`Browse ${category.name}`}
      className="group relative flex h-full w-full flex-col items-center gap-2 overflow-hidden rounded-3xl border bg-card p-4 pt-5 text-center shadow-soft tap-scale card-lift hover:border-wine/40 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 right-[-14%] size-24 rounded-full bg-wine-soft opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className={cn("grid size-16 place-items-center rounded-2xl shadow-soft", chip)}>
        <Icon className="icon-lift size-7" />
      </span>
      <span className="font-display text-[13px] font-bold uppercase leading-tight tracking-wide">
        {category.name}
      </span>
      <span className="line-clamp-2 min-h-8 text-[11px] leading-snug text-muted-foreground">
        {blurb}
      </span>
      <span className="mt-auto flex size-7 items-center justify-center rounded-full bg-wine-soft text-wine-deep transition-colors duration-200 group-hover:bg-wine group-hover:text-white">
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
