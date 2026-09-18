import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  Store,
  Timer,
  Truck,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/section";
import { settingsQuery } from "@/lib/data";
import { uploadImage } from "@/lib/upload";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { cn } from "@/lib/utils";
import {
  PARCEL_CONFIG,
  bookParcel,
  parcelStatusLabel,
  timelineIndex,
  trackParcelByToken,
  TRACK_TIMELINE,
  type ParcelRequest,
} from "@/lib/parcel";

/**
 * Parcel Services section (Home).
 *
 * Book  → real booking form → `book_parcel` RPC → persisted row + token.
 * Track → real RLS-backed lookup of the customer's own parcel by token.
 * Safe  → describes the ACTUAL manual workflow (no invented guarantees).
 *
 * The animated map/van above is decorative branding only — never real
 * tracking (stated explicitly in the track dialog).
 */

const PARCEL_CITY = PARCEL_CONFIG.city;

type ParcelDialog = "book" | "track" | "safety";

type FeatureCard = {
  id: ParcelDialog;
  art: string;
  title: string;
  desc: string;
  cta: string;
  icon: LucideIcon;
  iconBg: string;
  overlay: string;
  btn: string;
};

const CARDS: FeatureCard[] = [
  {
    id: "book",
    art: "/parcel/book-parcel.svg",
    title: "Book Your Parcel",
    desc: "Quick & easy parcel booking in just a few steps.",
    cta: "Book Now",
    icon: Package,
    iconBg: "bg-rose-600",
    overlay: "bg-gradient-to-t from-rose-950/95 via-rose-800/80 to-transparent",
    btn: "bg-white text-rose-700",
  },
  {
    id: "track",
    art: "/parcel/track-parcel.svg",
    title: "Track in Real-Time",
    desc: "Know exactly where your parcel is.",
    cta: "Track Now",
    icon: MapPin,
    iconBg: "bg-blue-600",
    overlay: "bg-gradient-to-t from-blue-950/95 via-blue-800/80 to-transparent",
    btn: "bg-white text-blue-700",
  },
  {
    id: "safety",
    art: "/parcel/safe-parcel.svg",
    title: "Safe & Reliable",
    desc: "Your parcel is in safe hands.",
    cta: "Learn More",
    icon: ShieldCheck,
    iconBg: "bg-teal-600",
    overlay: "bg-gradient-to-t from-teal-950/95 via-teal-800/80 to-transparent",
    btn: "bg-white text-teal-700",
  },
];

export function ParcelServices() {
  const { city } = useCity();
  const [dialog, setDialog] = useState<ParcelDialog | null>(null);
  const [trackSeed, setTrackSeed] = useState("");

  const inLucknow = city === PARCEL_CITY;

  const { data: settings } = useQuery(settingsQuery);
  const phone = settings?.mobile?.trim() || "9793045547";
  const waNumber = (settings?.whatsapp ?? settings?.mobile ?? "9793045547")
    .replace(/\D/g, "")
    .slice(-10);
  const waBase = `https://wa.me/91${waNumber}`;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragThreshold: 8,
    duration: 22,
  });
  const [selectedSnap, setSelectedSnap] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedSnap(emblaApi.selectedScrollSnap());
    const onReInit = () => {
      setSnapCount(emblaApi.scrollSnapList().length);
      onSelect();
    };
    onReInit();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onReInit);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onReInit);
    };
  }, [emblaApi]);

  if (!inLucknow) {
    return (
      <section className="mt-6">
        <SectionHeader />
        <EmptyState text="Parcel delivery is currently available only within Lucknow. Switch your city to Lucknow to book, track or learn more." />
      </section>
    );
  }

  return (
    <section className="mt-6">
      <SectionHeader />

      {/* Banner — illustrated Lucknow map + animated pickup → transit → drop
          route. Vector art only (sharp at any size), no blur, no heavy
          overlay; motion is transform/stroke based and reduced-motion aware.
          Desktop keeps the full-bleed background map (unchanged); mobile gets
          a dedicated in-flow map sized to the exact viewBox aspect so the
          route, pins and van are never cropped. */}
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-soft">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-rose-50"
        />
        {/* Desktop full-bleed background map — exact previous markup. */}
        <div
          aria-hidden
          className="map-pan absolute -inset-x-[6%] inset-y-0 hidden lg:block"
        >
          <RouteMap idPrefix="pd" crop="slice" className="h-full w-full" />
        </div>
        <div
          aria-hidden
          className="absolute -right-12 -top-14 size-48 rounded-full bg-amber-200/50 blur-2xl"
        />

        <div className="relative p-4 sm:p-5">
          <div className="grid items-center gap-4 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl gradient-red text-white shadow-soft">
                  <Package className="size-4" />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  29Bricks · Local Courier
                </p>
              </div>
              <p className="fade-up mt-2.5 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                Your Parcel,{" "}
                <span className="text-brand">Our Priority</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  { icon: Timer, label: "Fast" },
                  { icon: ShieldCheck, label: "Safe" },
                  { icon: MapPin, label: "Local" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 rounded-full border bg-card/80 px-2.5 py-1 text-[11px] font-bold text-foreground/85 shadow-soft"
                  >
                    <Icon className="size-3 text-brand" />
                    {label}
                  </span>
                ))}
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full gradient-red px-3.5 py-1.5 text-xs font-bold text-white shadow-soft">
                <MapPin className="size-3.5" />
                {PARCEL_CITY} → {PARCEL_CITY}
              </span>
            </div>

            {/* Route legend card — mirrors the animation below it */}
            <div className="rounded-2xl border bg-card/85 p-3 shadow-soft">
              <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <span className="flex items-center gap-1 text-rose-700">
                  <span className="size-2 rounded-full bg-rose-600" />
                  Pickup
                </span>
                <Truck className="size-3.5 text-foreground/50" />
                <span className="text-foreground/70">In transit</span>
                <ArrowRight className="size-3 text-foreground/40" />
                <span className="flex items-center gap-1 text-teal-700">
                  <span className="size-2 rounded-full bg-teal-600" />
                  Delivered
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Same-city pickup and door delivery across {PARCEL_CITY} —{" "}
                ₹{PARCEL_CONFIG.price} flat, up to {PARCEL_CONFIG.maxWeightKg} KG.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile map — in-flow, exact viewBox aspect ratio (560:300):
            "meet" keeps every route point, pin and the van fully inside the
            visible box at any phone width. Van animation uses the pure-SMIL
            fallback (identical visuals) so it renders on all mobile engines,
            including iOS Safari where CSS offset-path on SVG is unsupported. */}
        <div aria-hidden className="border-t border-border/60 p-2 pb-0 lg:hidden">
          <RouteMap idPrefix="pm" crop="meet" className="h-auto w-full" />
        </div>
      </div>

      {/* Three separate, clickable feature cards (mobile carousel / md+ row).
          Card anatomy is flex-column: artwork on top (in-flow), text block
          below (in-flow, never absolutely positioned) so titles, description
          and the action chip can never clip or overlap at any width. The
          artwork still fills its area edge-to-edge (object-cover) so the
          premium look is unchanged. */}
      <div className="relative mt-3">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="-ml-3 flex">
            {CARDS.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.id} className="parcel-slide min-w-0 pl-3">
                  <button
                    type="button"
                    onClick={() => setDialog(c.id)}
                    aria-label={`${c.title} — ${c.cta}`}
                    className="card-lift tap-scale flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-soft"
                  >
                    <span className="relative block h-32 w-full shrink-0 overflow-hidden sm:h-36">
                      <img
                        src={c.art}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-0 bottom-0 h-3/5",
                          c.overlay,
                        )}
                      />
                      <span
                        className={cn(
                          "absolute left-3 top-3 grid size-9 place-items-center rounded-xl text-white shadow-soft",
                          c.iconBg,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                    </span>
                    <span className="flex grow flex-col items-start gap-1 p-4 text-foreground">
                      <span className="font-display text-base font-bold leading-snug">
                        {c.title}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {c.desc}
                      </span>
                      <span
                        className={cn(
                          "mt-2 inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-soft",
                          c.btn,
                        )}
                      >
                        {c.cta}
                        <ArrowRight className="size-3.5" />
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {snapCount > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous card"
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute -left-0.5 top-[88px] hidden size-8 place-items-center rounded-full border bg-card/95 shadow-soft sm:grid"
            >
              <ArrowRight className="size-4 rotate-180" />
            </button>
            <button
              type="button"
              aria-label="Next card"
              onClick={() => emblaApi?.scrollNext()}
              className="absolute -right-0.5 top-[88px] hidden size-8 place-items-center rounded-full border bg-card/95 shadow-soft sm:grid"
            >
              <ArrowRight className="size-4" />
            </button>
          </>
        ) : null}
      </div>

      {snapCount > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: snapCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              aria-current={selectedSnap === i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                "size-2 rounded-full transition-all",
                selectedSnap === i ? "w-5 bg-brand" : "bg-brand/25",
              )}
            />
          ))}
        </div>
      ) : null}

      {/* ---- Dialog A: Book Your Parcel (REAL booking) ---- */}
      <BookParcelDialog
        open={dialog === "book"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        phone={phone}
        waBase={waBase}
        onBooked={(token) => {
          setDialog(null);
          setTrackSeed(token);
          setDialog("track");
        }}
      />

      {/* ---- Dialog B: Track (REAL status by token, RLS-scoped) ---- */}
      <TrackParcelDialog
        open={dialog === "track"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        seedToken={trackSeed}
        phone={phone}
      />

      {/* ---- Dialog C: Safe & Reliable (the actual manual workflow) ---- */}
      <Dialog
        open={dialog === "safety"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-3 rounded-3xl p-5 text-left sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-600 text-white">
                <ShieldCheck className="size-4" />
              </span>
              Safe &amp; Reliable
            </DialogTitle>
            <DialogDescription className="pt-0.5">
              How every {PARCEL_CITY} → {PARCEL_CITY} parcel is handled, step
              by step.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-2">
            {[
              {
                icon: Package,
                title: "You submit the request",
                text: "Pickup and delivery details come straight from your booking form, with a parcel photo if you add one.",
              },
              {
                icon: Phone,
                title: "We review and call you",
                text: "The 29Bricks team checks the request and calls you to confirm the booking before anything moves.",
              },
              {
                icon: CheckCircle2,
                title: "Status updates at every step",
                text: "Confirmed → Pickup pending → Picked up → Delivered. Track your token anytime to see the current stage.",
              },
              {
                icon: Store,
                title: "A real office behind it",
                text: `29Bricks runs from ${settings?.address?.trim() || "Vastu Khand, Lucknow"} — call ${phone} or WhatsApp anytime about your parcel.`,
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className="flex items-start gap-2.5 rounded-2xl border bg-muted/40 p-3"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700">
                  <Icon className="size-3.5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {i + 1}. {title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`${waBase}?text=${encodeURIComponent("Hi 29Bricks! I have a question about parcel delivery.")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-full bg-success/12 px-4 py-2.5 text-xs font-bold text-success tap-scale"
            >
              <MessageCircle className="size-3.5" /> Ask a question
            </a>
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-bold text-foreground tap-scale"
            >
              <Phone className="size-3.5" /> Call us
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ================= Book dialog ================= */

function BookParcelDialog({
  open,
  onOpenChange,
  phone,
  waBase,
  onBooked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  waBase: string;
  onBooked: (token: string) => void;
}) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    customer_name: "",
    customer_mobile: "",
    pickup_address: "",
    receiver_name: "",
    receiver_mobile: "",
    delivery_address: "",
    parcel_weight: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Prefill from the existing profile once, when the dialog opens signed-in.
  useEffect(() => {
    if (!open) return;
    setForm((f) => ({
      ...f,
      customer_name: f.customer_name || profile?.full_name || "",
      customer_mobile: f.customer_mobile || profile?.phone || "",
    }));
  }, [open, profile?.full_name, profile?.phone]);

  // Reset the whole flow when the dialog closes.
  useEffect(() => {
    if (open) return;
    setToken(null);
    setBusy(false);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function removeImage() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      // Image uploads only AFTER validation, into the customer's own
      // public-media folder (existing storage architecture). If the upload
      // fails the booking still goes through — the photo is optional.
      let imageUrl: string | null = null;
      if (file) {
        try {
          imageUrl = await uploadImage(file, "parcel");
        } catch {
          toast.warning(
            "Parcel photo could not be uploaded — booking will continue without it.",
          );
        }
      }
      const newToken = await bookParcel({
        customer_name: form.customer_name,
        customer_mobile: form.customer_mobile,
        pickup_address: form.pickup_address,
        receiver_name: form.receiver_name,
        receiver_mobile: form.receiver_mobile,
        delivery_address: form.delivery_address,
        parcel_weight: Number(form.parcel_weight),
        parcel_image_url: imageUrl,
      });
      setToken(newToken);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit your parcel request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md gap-3 overflow-y-auto rounded-3xl p-5 text-left sm:p-6">
        {token ? (
          /* ---------- success state ---------- */
          <div className="grid gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-8 shrink-0 text-success" />
              <DialogTitle className="font-display text-lg">
                ✓ Parcel Request Submitted
              </DialogTitle>
            </div>
            <div className="grid gap-2 rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Token No:</span>
                <span className="font-display text-base font-extrabold tracking-wide text-wine-deep">
                  {token}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Parcel Charge:</span>
                <span className="font-bold">₹{PARCEL_CONFIG.price}</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Our team will call you shortly to confirm your booking.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onBooked(token)}
                className="flex items-center justify-center gap-1.5 rounded-full gradient-wine px-4 py-2.5 text-xs font-bold text-white shadow-soft tap-scale"
              >
                <MapPin className="size-3.5" /> Track Parcel
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full border px-4 py-2.5 text-xs font-bold text-foreground tap-scale"
              >
                Done
              </button>
            </div>
          </div>
        ) : !user ? (
          /* ---------- sign-in gate (existing auth flow) ---------- */
          <div className="grid gap-3 text-left">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
                  <Package className="size-4" />
                </span>
                Book Your Parcel
              </DialogTitle>
              <DialogDescription className="pt-0.5">
                {PARCEL_CITY} → {PARCEL_CITY} · ₹{PARCEL_CONFIG.price} · up to{" "}
                {PARCEL_CONFIG.maxWeightKg} KG
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-2xl border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
              Sign in with your 29Bricks account to book a parcel — this keeps
              your request and token secure and lets you track it anytime.
            </p>
            <div className="grid gap-2">
              <Link
                to="/auth"
                search={{ returnTo: "/" }}
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-center gap-1.5 rounded-full gradient-wine px-4 py-2.5 text-xs font-bold text-white shadow-soft tap-scale"
              >
                Sign in to book
                <ArrowRight className="size-3.5" />
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`${waBase}?text=${encodeURIComponent("Hi 29Bricks! I want to book a parcel (pickup & drop within Lucknow).")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-full bg-success/12 px-4 py-2.5 text-xs font-bold text-success tap-scale"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
                <a
                  href={`tel:${phone}`}
                  className="flex items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-bold text-foreground tap-scale"
                >
                  <Phone className="size-3.5" /> Call to book
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* ---------- booking form ---------- */
          <form className="grid gap-3" onSubmit={submit}>
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
                  <Package className="size-4" />
                </span>
                Book Your Parcel
              </DialogTitle>
              <DialogDescription className="pt-0.5">
                <span className="font-bold text-foreground">
                  {PARCEL_CITY} → {PARCEL_CITY}
                </span>{" "}
                · ₹{PARCEL_CONFIG.price} · up to {PARCEL_CONFIG.maxWeightKg} KG
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-1.5">
              <Label htmlFor="p-name" className="text-xs">
                Your name
              </Label>
              <Input
                id="p-name"
                required
                value={form.customer_name}
                onChange={set("customer_name")}
                placeholder="Full name"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-mobile" className="text-xs">
                Your mobile number
              </Label>
              <Input
                id="p-mobile"
                required
                type="tel"
                inputMode="numeric"
                value={form.customer_mobile}
                onChange={set("customer_mobile")}
                placeholder="10-digit mobile"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-pickup" className="text-xs">
                Pickup address (in {PARCEL_CITY})
              </Label>
              <Textarea
                id="p-pickup"
                required
                rows={2}
                value={form.pickup_address}
                onChange={set("pickup_address")}
                placeholder="House / street / area"
                className="rounded-xl text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="p-rname" className="text-xs">
                  Receiver&apos;s name
                </Label>
                <Input
                  id="p-rname"
                  required
                  value={form.receiver_name}
                  onChange={set("receiver_name")}
                  placeholder="Receiver"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-rmobile" className="text-xs">
                  Receiver&apos;s mobile
                </Label>
                <Input
                  id="p-rmobile"
                  required
                  type="tel"
                  inputMode="numeric"
                  value={form.receiver_mobile}
                  onChange={set("receiver_mobile")}
                  placeholder="10-digit mobile"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-drop" className="text-xs">
                Delivery address (in {PARCEL_CITY})
              </Label>
              <Textarea
                id="p-drop"
                required
                rows={2}
                value={form.delivery_address}
                onChange={set("delivery_address")}
                placeholder="House / street / area"
                className="rounded-xl text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="p-weight" className="text-xs">
                  Parcel weight (KG)
                </Label>
                <Input
                  id="p-weight"
                  required
                  type="number"
                  min="0.1"
                  max={PARCEL_CONFIG.maxWeightKg}
                  step="0.1"
                  value={form.parcel_weight}
                  onChange={set("parcel_weight")}
                  placeholder="e.g. 1.5"
                  className="rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">
                  Maximum {PARCEL_CONFIG.maxWeightKg} KG
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-image" className="text-xs">
                  Parcel photo (optional)
                </Label>
                {preview ? (
                  <div className="relative overflow-hidden rounded-xl border">
                    <img
                      src={preview}
                      alt="Parcel preview"
                      className="h-16 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      aria-label="Remove parcel photo"
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <Input
                    id="p-image"
                    type="file"
                    accept="image/*"
                    onChange={pickImage}
                    className="rounded-xl text-xs"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border bg-wine-soft/60 p-3">
              <span className="text-xs font-semibold text-foreground/80">
                Parcel Charge
              </span>
              <span className="font-display text-lg font-extrabold text-wine-deep">
                ₹{PARCEL_CONFIG.price}
              </span>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-full gradient-wine px-4 py-3 text-sm font-bold text-white shadow-wine-glow tap-scale disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  Submit Parcel Request
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ================= Track dialog ================= */

function TrackParcelDialog({
  open,
  onOpenChange,
  seedToken,
  phone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedToken: string;
  phone: string;
}) {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<ParcelRequest | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A fresh booking seeds the token and looks it up immediately.
  useEffect(() => {
    if (open && seedToken && token !== seedToken) {
      setToken(seedToken);
      void lookup(seedToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedToken]);

  useEffect(() => {
    if (!open) {
      setSearched(false);
      setResult(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function lookup(t?: string) {
    const target = (t ?? token).trim();
    if (!target) {
      setError("Please enter your token number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const row = await trackParcelByToken(target);
      setResult(row);
      setSearched(true);
      if (!row)
        setError(
          "No parcel found for this token. Check the token and make sure you're signed in with the account used for booking.",
        );
    } catch {
      setError("Could not look up that token. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const idx = result ? timelineIndex(result.status) : -1;
  const rejected = result?.status === "rejected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md gap-3 overflow-y-auto rounded-3xl p-5 text-left sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
              <MapPin className="size-4" />
            </span>
            Track Your Parcel
          </DialogTitle>
          <DialogDescription className="pt-0.5">
            Enter your token number (e.g. 29B-P-10482).
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
        >
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="29B-P-XXXXXX"
            aria-label="Parcel token number"
            className="rounded-xl font-mono text-sm uppercase tracking-wide"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white tap-scale disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <MapPin className="size-3.5" />
            )}
            Track
          </button>
        </form>

        {error ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="grid gap-3">
            <div className="rounded-2xl border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-extrabold tracking-wide text-wine-deep">
                  {result.token_number}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    rejected
                      ? "bg-destructive/12 text-destructive"
                      : "bg-blue-600/10 text-blue-700",
                  )}
                >
                  {parcelStatusLabel(result.status)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/70">Pickup:</span>{" "}
                {result.pickup_address}
                <br />
                <span className="font-semibold text-foreground/70">
                  Delivery:
                </span>{" "}
                {result.delivery_address}
              </p>
            </div>

            {rejected ? (
              <p className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
                This request was rejected by our team. If this is unexpected,
                call {phone} and we&apos;ll sort it out.
              </p>
            ) : (
              <ol className="grid gap-1.5">
                {TRACK_TIMELINE.map((stage, i) => {
                  const done = i <= idx;
                  return (
                    <li
                      key={stage}
                      className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2"
                    >
                      {done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-success" />
                      ) : (
                        <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          done ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {parcelStatusLabel(stage)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Status is updated by the 29Bricks team at each step. The animated
              map on the home page is decorative branding — parcels are
              confirmed and updated manually by phone, so this page always
              shows the real recorded status.
            </p>
          </div>
        ) : null}

        {!result ? (
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            You can track parcels booked from your account. The home-page
            route animation is decorative branding, not live tracking —
            statuses here are the real updates our team records.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader() {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="font-display text-base font-bold">📦 Parcel Services</h2>
        <p className="text-xs text-muted-foreground">
          Send parcels across {PARCEL_CONFIG.city} with local pickup &amp;
          delivery
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[11px] font-bold shadow-soft">
        <MapPin className="size-3.5 text-brand" />
        {PARCEL_CONFIG.city} → {PARCEL_CONFIG.city}
      </span>
    </div>
  );
}

/** Illustrated map-style Lucknow: soft blocks, roads, river, a landmark and
 *  the animated pickup → delivery route with a moving courier van. Pure SVG.
 *
 *  Motion architecture (all CSS/SMIL, zero JS loops):
 *  • route-march — CSS stroke-dashoffset on the dashed route
 *  • pin-pulse — CSS scale pulse on the pin halos
 *  • van — <animateMotion> SMIL along the SAME path string (parsed from the
 *    path attribute itself, so it can never drift from the visible route),
 *    plus a CSS offset-path twin guarded by @supports. SMIL runs everywhere
 *    (Chrome, Safari/iOS, Firefox); where CSS motion-path is also supported
 *    the SMIL animation is paused via CSS so only the CSS twin animates —
 *    both implementations produce identical visuals, so either alone is
 *    correct. Decorative only — never real tracking. */
function RouteMap({
  className,
  idPrefix,
  crop = "slice",
}: {
  className?: string;
  /** Unique prefix for SMIL <mpath> ids when the map renders twice. */
  idPrefix: string;
  /** slice = full-bleed desktop crop; meet = fully visible (mobile). */
  crop?: "slice" | "meet";
}) {
  const route =
    "M96 208 C170 208 190 140 280 140 C370 140 370 96 464 96";
  return (
    <svg
      viewBox="0 0 560 300"
      className={className}
      preserveAspectRatio={`xMidYMid ${crop}`}
      role="img"
      aria-label="Illustrated map of Lucknow showing a parcel route from pickup to delivery"
    >
      {/* city blocks */}
      <g fill="#E3EAF4" opacity="0.9">
        <rect x="24" y="30" width="88" height="52" rx="8" />
        <rect x="136" y="20" width="70" height="44" rx="8" />
        <rect x="150" y="150" width="96" height="46" rx="8" />
        <rect x="250" y="30" width="92" height="52" rx="8" />
        <rect x="368" y="150" width="80" height="52" rx="8" />
        <rect x="470" y="40" width="66" height="48" rx="8" />
        <rect x="30" y="120" width="70" height="48" rx="8" />
      </g>
      {/* roads */}
      <g stroke="#FFFFFF" strokeWidth="9" opacity="0.9">
        <line x1="0" y1="104" x2="560" y2="104" />
        <line x1="0" y1="212" x2="560" y2="212" />
        <line x1="128" y1="0" x2="128" y2="300" />
        <line x1="356" y1="0" x2="356" y2="300" />
      </g>
      {/* river */}
      <path
        d="M20 268 C120 236 210 292 330 254 C430 222 500 268 552 244"
        fill="none"
        stroke="#BFDBFE"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* landmark (Bara Imambara-inspired) */}
      <g transform="translate(452 210)" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2">
        <rect x="-40" y="-44" width="80" height="44" />
        <rect x="-48" y="-54" width="96" height="10" rx="3" />
        <path d="M-13 0 L-13 -24 A13 13 0 0 1 13 -24 L13 0 Z" fill="#E2E8F0" />
        <path d="M-35 0 L-35 -17 A7 7 0 0 1 -21 -17 L-21 0 Z" fill="#E2E8F0" />
        <path d="M21 0 L21 -17 A7 7 0 0 1 35 -17 L35 0 Z" fill="#E2E8F0" />
        <circle cx="0" cy="-59" r="5" fill="#E2E8F0" />
      </g>
      {/* trees */}
      <g>
        <rect x="118" y="182" width="5" height="14" fill="#A16207" />
        <circle cx="120" cy="178" r="9" fill="#BBF7D0" />
        <rect x="372" y="250" width="5" height="14" fill="#A16207" />
        <circle cx="374" cy="246" r="9" fill="#BBF7D0" />
      </g>
      {/* animated dashed route (id referenced by the van's <mpath>) */}
      <path
        id={`${idPrefix}-route`}
        d={route}
        fill="none"
        stroke="#E11D48"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="10 9"
        className="route-march"
      />
      {/* pickup pin */}
      <g transform="translate(96 208)">
        <circle r="15" fill="#E11D48" opacity="0.3" className="pin-pulse" />
        <circle r="11" fill="#E11D48" stroke="#FFFFFF" strokeWidth="3" />
      </g>
      {/* delivery pin */}
      <g transform="translate(464 96)">
        <circle
          r="15"
          fill="#16A34A"
          opacity="0.3"
          className="pin-pulse"
          style={{ animationDelay: "1.2s" }}
        />
        <circle r="11" fill="#16A34A" stroke="#FFFFFF" strokeWidth="3" />
      </g>
      {/* courier van travelling along the route. Primary engine: SMIL
          <animateMotion> (universal support incl. iOS Safari). Where CSS
          motion-path is also available, SMIL is paused and the CSS twin
          animates instead — identical keyframes, identical visuals. */}
      <g className="parcel-travel" style={{ offsetPath: `path("${route}")`, offsetRotate: "0deg" }}>
        <g transform="translate(0 -13)">
          <rect
            x="-15"
            y="-10"
            width="30"
            height="19"
            rx="4"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="2"
          />
          <rect x="1" y="-7" width="12" height="12" rx="2" fill="#E11D48" />
          <rect x="-12" y="-6" width="9" height="7" rx="1.5" fill="#93C5FD" />
          <circle cx="-7" cy="10" r="4" fill="#334155" />
          <circle cx="8" cy="10" r="4" fill="#334155" />
        </g>
        <animateMotion
          dur="9s"
          repeatCount="indefinite"
          keyPoints="0;1"
          keyTimes="0;1"
          calcMode="linear"
          rotate="auto"
        >
          <mpath href={`#${idPrefix}-route`} />
        </animateMotion>
      </g>
    </svg>
  );
}
