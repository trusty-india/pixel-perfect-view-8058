import { Link } from "@tanstack/react-router";
import { BedDouble, ImageIcon, MapPin, Ruler, Star } from "lucide-react";
import { priceLabel, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

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
      className={
        compact
          ? "block w-[240px] shrink-0 overflow-hidden rounded-2xl border bg-card shadow-soft tap-scale"
          : "block overflow-hidden rounded-2xl border bg-card shadow-soft tap-scale"
      }
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
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge className="rounded-full bg-primary/90 text-primary-foreground capitalize">
            {listing.purpose}
          </Badge>
          {listing.is_featured ? (
            <Badge className="rounded-full gradient-red text-brand-foreground">
              <Star className="mr-1 size-3" /> Featured
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <p className="font-display text-base font-bold text-primary">
          {priceLabel(listing.price, listing.purpose)}
        </p>
        <p className="line-clamp-1 text-sm font-semibold">{listing.title}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">
            {listing.location}, {listing.city}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">{listing.property_type}</span>
          {listing.bhk ? (
            <span className="flex items-center gap-1">
              <BedDouble className="size-3" />
              {listing.bhk}
            </span>
          ) : null}
          {listing.area_size ? (
            <span className="flex items-center gap-1">
              <Ruler className="size-3" />
              {listing.area_size}
            </span>
          ) : null}
          <span className="ml-auto">{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
