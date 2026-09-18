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
 * Display-only enrichment for the DB-driven categories, matched by name:
 * a bundled artwork image, a per-category color wash, an icon-chip tint and a
 * short tagline. Everything here is presentational — the database stays the
 * single source of truth for names, icons, slugs and ordering. Categories that
 * match no pattern fall back to their own DB subtitle and a rotating tint, so
 * admin-added categories keep working (clean gradient card, never broken).
 */
type CategoryTheme = {
  tagline: string;
  /** Bundled local artwork (public/categories/*) — no external URLs. */
  image?: string;
  /** Bottom-up color wash over the artwork (text-readability + identity). */
  overlay: string;
  /** Full-card gradient used when no image exists (fallback categories). */
  cardBg: string;
  chip: string;
};

const CATEGORY_THEMES: { match: RegExp; theme: CategoryTheme }[] = [
  {
    match: /buy|sale|sell|purchase/,
    theme: {
      tagline: "Find your dream property",
      image: "/categories/buy-property.svg",
      overlay: "from-rose-700 via-rose-900/60",
      cardBg: "from-rose-600 to-rose-900",
      chip: "bg-rose-600",
    },
  },
  {
    match: /rent|lease/,
    theme: {
      tagline: "Comfortable homes on rent",
      image: "/categories/rent-property.svg",
      overlay: "from-orange-600 via-orange-800/55",
      cardBg: "from-orange-500 to-orange-800",
      chip: "bg-orange-500",
    },
  },
  {
    match: /land|plot/,
    theme: {
      tagline: "Plots for your future",
      image: "/categories/land-plot.svg",
      overlay: "from-emerald-600 via-emerald-800/55",
      cardBg: "from-emerald-500 to-emerald-800",
      chip: "bg-emerald-600",
    },
  },
  {
    match: /shop|commercial|office/,
    theme: {
      tagline: "Spaces for your business",
      image: "/categories/shop-commercial.svg",
      overlay: "from-violet-700 via-violet-900/55",
      cardBg: "from-violet-600 to-violet-900",
      chip: "bg-violet-600",
    },
  },
  {
    match: /\broom\b|\bpg\b|accommodat/,
    theme: {
      tagline: "Rooms that fit your needs",
      image: "/categories/room-pg.svg",
      overlay: "from-blue-700 via-blue-900/55",
      cardBg: "from-blue-600 to-blue-900",
      chip: "bg-blue-600",
    },
  },
  {
    match: /student|hostel|colleg/,
    theme: {
      tagline: "Affordable student living",
      image: "/categories/student-stay.svg",
      overlay: "from-teal-600 via-teal-800/55",
      cardBg: "from-teal-500 to-teal-800",
      chip: "bg-teal-600",
    },
  },
  {
    match: /service/,
    theme: {
      tagline: "Property services made easy",
      image: "/categories/services.svg",
      overlay: "from-purple-700 via-purple-900/55",
      cardBg: "from-purple-600 to-purple-900",
      chip: "bg-purple-600",
    },
  },
  {
    match: /packer|mover|relocat|shift/,
    theme: {
      tagline: "Move without the hassle",
      image: "/categories/packers-movers.svg",
      overlay: "from-rose-600 via-rose-800/55",
      cardBg: "from-rose-500 to-rose-800",
      chip: "bg-rose-500",
    },
  },
];

/** Tint rotation for categories outside the standard set. */
const FALLBACK_THEMES: CategoryTheme[] = [
  {
    tagline: "Explore now",
    overlay: "from-wine via-wine-deep/60",
    cardBg: "from-[#991b1b] to-[#5c1010]",
    chip: "bg-wine",
  },
  {
    tagline: "Explore now",
    overlay: "from-blue-700 via-blue-900/55",
    cardBg: "from-blue-600 to-blue-900",
    chip: "bg-blue-600",
  },
  {
    tagline: "Explore now",
    overlay: "from-emerald-600 via-emerald-800/55",
    cardBg: "from-emerald-500 to-emerald-800",
    chip: "bg-emerald-600",
  },
  {
    tagline: "Explore now",
    overlay: "from-violet-700 via-violet-900/55",
    cardBg: "from-violet-600 to-violet-900",
    chip: "bg-violet-600",
  },
];

function categoryTheme(name: string, index: number): CategoryTheme {
  const n = name.toLowerCase();
  const found = CATEGORY_THEMES.find((t) => t.match.test(n));
  return found?.theme ?? FALLBACK_THEMES[index % FALLBACK_THEMES.length]!;
}

/**
 * Premium "Explore by Category" section, modeled on the reference design:
 * tall artwork-covered cards with per-category color washes, top-left icon
 * chips, white title + tagline and a circular arrow button.
 *
 * One embla carousel at every breakpoint (`.cat-slide` widths): exactly 3
 * full cards visible on phones (4th starts precisely at the viewport edge,
 * hidden until the user swipes), 5 on ≥640px screens. Arrows float over the
 * carousel edges; pagination dots sit below.
 *
 * Tapping a card does not navigate instantly — the page wires `onSelect` to
 * play the slide-out transition first, then opens the existing category page
 * (/search?category=slug, the same mapping the home grid always used).
 */
export function CategoryExplorer({
  categories,
  images,
  onSelect,
}: {
  categories: CategoryRow[] | undefined;
  /** Admin-uploaded image overrides keyed by category slug (from site settings). */
  images?: Record<string, string> | undefined;
  onSelect: (slug: string) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
    // Claim drags after 6px of movement (embla default is 10px) so touch
    // feels immediate, and snap a touch quicker than the default duration of
    // 25. Embla already applies touch-action: pan-y on the container so
    // vertical page scrolling stays native.
    dragThreshold: 6,
    duration: 20,
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
  const showArrows = snapCount > 1;

  return (
    <section className="mt-6" aria-labelledby="explore-categories-title">
      {/* Centered section header, as in the reference design */}
      <div className="mb-4 text-center">
        <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-wine">
          <span aria-hidden className="h-px w-6 bg-wine/50" />
          Find your perfect space
          <span aria-hidden className="h-px w-6 bg-wine/50" />
        </p>
        <h2
          id="explore-categories-title"
          className="mt-1.5 font-display text-xl font-bold leading-tight sm:text-2xl"
        >
          Explore by <span className="text-wine">Category</span>
        </h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Find the right property or service for your needs
        </p>
      </div>

      <div className="relative">
        {/* Full-bleed viewport so the next card peeks at the screen edge */}
        <div ref={emblaRef} className="-mx-4 overflow-hidden">
          <div className="-ml-3 flex">
            {categories.map((c, i) => (
              <div key={c.id} className="cat-slide min-w-0 shrink-0 grow-0 pl-3">
                <CategoryCard
                  category={c}
                  index={i}
                  adminImage={images?.[c.slug]}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </div>

        {showArrows ? (
          <>
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={selected === 0}
              aria-label="Previous categories"
              className="absolute left-0.5 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border bg-card text-wine-deep shadow-card tap-scale disabled:opacity-40 md:grid"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={selected >= snapCount - 1}
              aria-label="Next categories"
              className="absolute right-0.5 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border bg-card text-wine-deep shadow-card tap-scale disabled:opacity-40 md:grid"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>

      {showArrows ? (
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
    </section>
  );
}

function CategoryCard({
  category,
  index,
  adminImage,
  onSelect,
}: {
  category: CategoryRow;
  index: number;
  adminImage?: string | undefined;
  onSelect: (slug: string) => void;
}) {
  const Icon = categoryIcon(category.icon);
  const theme = categoryTheme(category.name, index);
  const blurb = theme.tagline || category.subtitle || "Explore now";
  // Admin upload first; bundled artwork second; gradient-only card last.
  // A failed admin image swaps to the bundled artwork exactly once (never loops,
  // never shows a broken-image icon). Reset when the admin picks a new image.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [adminImage]);
  const effectiveImage = adminImage && !broken ? adminImage : theme.image;

  return (
    <button
      type="button"
      onClick={() => onSelect(category.slug)}
      aria-label={`Browse ${category.name}`}
      className={cn(
        "group card-lift tap-scale relative flex aspect-[5/11] w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-b text-left shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine md:rounded-3xl",
        theme.cardBg,
      )}
    >
      {/* Admin image (priority) or bundled artwork, object-cover full-bleed.
          The card's fixed aspect ratio controls size — an uploaded image can
          never change card dimensions, only be cropped to fill them. */}
      {effectiveImage ? (
        <img
          src={effectiveImage}
          alt=""
          aria-hidden
          loading={index < 4 ? "eager" : "lazy"}
          decoding="async"
          onError={() => setBroken(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}

      {/* Per-category color wash: saturates the bottom, artwork stays visible up top */}
      <span
        aria-hidden
        className={cn("absolute inset-0 bg-gradient-to-t to-transparent", theme.overlay)}
      />
      {/* Bottom readability gradient so white text always wins */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/50 via-black/20 to-transparent"
      />

      {/* Icon chip — real Lucide icon on a colored tile, top-left */}
      <span
        className={cn(
          "absolute left-2 top-2 grid size-8 place-items-center rounded-xl text-white shadow-soft ring-1 ring-white/40 md:left-3 md:top-3 md:size-11 md:rounded-2xl",
          theme.chip,
        )}
      >
        <Icon className="size-4 transition-transform duration-300 group-hover:scale-110 md:size-5" />
      </span>

      {/* Title, tagline, circular arrow — bottom of the card */}
      <span className="relative mt-auto flex flex-col gap-0.5 p-2.5 pt-8 md:gap-1 md:p-4 md:pt-10">
        <span className="font-display text-[11px] font-bold leading-tight text-white md:text-base">
          {category.name}
        </span>
        <span className="line-clamp-2 text-[9px] leading-snug text-white/85 md:text-xs">
          {blurb}
        </span>
        <span className="mt-1.5 flex size-6 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/50 backdrop-blur-sm transition-colors duration-200 group-hover:bg-white/40 md:size-8">
          <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5 md:size-4" />
        </span>
      </span>
    </button>
  );
}
