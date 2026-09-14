import { Link } from "@tanstack/react-router";
import { BedDouble, ImageIcon, MapPin, Ruler, Star } from "lucide-react";
import { priceLabel, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ListingRow = {
  id: string;
  title: string;
  property_type: string;
  purpose: string;
  price: number | null;
  location: string;
  city: string;
  bhk: string | null;
  area_size: string | null;
  images: string[];
  is_featured: boolean;
  created_at: string;
};

export function ListingCard({ listing, compact }: { listing: ListingRow; compact?: boolean }) {
  const cover = listing.images?.[0];
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className={cn(
        "block overflow-hidden rounded-2xl border bg-card shadow-card tap-scale",
        compact && "w-[240px] shrink-0",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-soft",
              listing.purpose === "rent" ? "bg-primary/90" : "gradient-red",
            )}
          >
            For {listing.purpose === "rent" ? "Rent" : "Sale"}
          </span>
          {listing.is_featured ? (
            <span className="flex items-center gap-0.5 rounded-full gradient-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-foreground shadow-soft">
              <Star className="size-3 fill-current" /> Featured
            </span>
          ) : null}
        </div>
        <p className="absolute bottom-2.5 left-3 text-shadow-hero font-display text-lg font-bold text-white">
          {priceLabel(listing.price, listing.purpose)}
        </p>
        <p className="absolute bottom-3 right-3 text-[10px] font-medium text-white/85">
          {timeAgo(listing.created_at)}
        </p>
      </div>
      <div className="space-y-1.5 p-3">
        <p className="line-clamp-1 text-sm font-semibold">{listing.title}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0 text-brand" />
          <span className="line-clamp-1">
            {listing.location}, {listing.city}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] font-medium text-muted-foreground">
          {listing.bhk ? (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
              <BedDouble className="size-3" />
              {listing.bhk}
            </span>
          ) : null}
          {listing.area_size ? (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
              <Ruler className="size-3" />
              {listing.area_size}
            </span>
          ) : null}
          <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{listing.property_type}</span>
        </div>
      </div>
    </Link>
  );
}
