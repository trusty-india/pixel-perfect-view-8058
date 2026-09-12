import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListingCard, type ListingRow } from "@/components/listing-card";
import { EmptyState } from "@/components/section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listingsQuery } from "@/lib/data";
import { useCity } from "@/lib/city";
import { BHK_OPTIONS, FURNISHING, PROPERTY_TYPES } from "@/lib/format";

type SearchParams = {
  q?: string;
  category?: string;
  purpose?: string;
  type?: string;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search['q'] === "string" ? search['q'] : undefined,
    category: typeof search['category'] === "string" ? search['category'] : undefined,
    purpose: typeof search['purpose'] === "string" ? search['purpose'] : undefined,
    type: typeof search['type'] === "string" ? search['type'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search properties — 29Bricks" },
      {
        name: "description",
        content: "Filter houses, flats, rooms, shops and land by budget, BHK and locality.",
      },
      { property: "og:title", content: "Search properties — 29Bricks" },
      { property: "og:description", content: "Find the right property in your city." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const { city } = useCity();
  const [text, setText] = useState(params.q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [bhk, setBhk] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const { data, isLoading } = useQuery(
    listingsQuery({
      city,
      search: params.q,
      category: params.category,
      purpose: params.purpose,
      propertyType: params.type,
      bhk: bhk || undefined,
      furnishing: furnishing || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      limit: 60,
    }),
  );

  return (
    <AppShell>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ search: (prev) => ({ ...prev, q: text || undefined }) });
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search area, title, type…"
          className="rounded-xl"
        />
        <Button type="submit" className="rounded-xl">
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {["all", "sale", "rent"].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() =>
              void navigate({
                search: (prev) => ({ ...prev, purpose: p === "all" ? undefined : p }),
              })
            }
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize tap-scale ${
              (params.purpose ?? "all") === p
                ? "gradient-red border-transparent text-brand-foreground"
                : "bg-card"
            }`}
          >
            {p === "all" ? "All" : `For ${p}`}
          </button>
        ))}
      </div>

      {showFilters ? (
        <div className="mt-3 grid gap-3 rounded-2xl border bg-card p-3 shadow-soft sm:grid-cols-2">
          <Select
            value={params.type ?? ""}
            onValueChange={(v) => void navigate({ search: (prev) => ({ ...prev, type: v }) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Property type" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bhk} onValueChange={setBhk}>
            <SelectTrigger>
              <SelectValue placeholder="BHK" />
            </SelectTrigger>
            <SelectContent>
              {BHK_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={furnishing} onValueChange={setFurnishing}>
            <SelectTrigger>
              <SelectValue placeholder="Furnishing" />
            </SelectTrigger>
            <SelectContent>
              {FURNISHING.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              placeholder="Min ₹"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <Input
              placeholder="Max ₹"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(data as ListingRow[] | undefined)?.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      {!isLoading && !data?.length ? (
        <div className="mt-4">
          <EmptyState text="No properties match your search. Try changing filters or city." />
        </div>
      ) : null}
    </AppShell>
  );
}
