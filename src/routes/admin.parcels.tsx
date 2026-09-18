import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminParcelsQuery,
  adminUpdateParcelStatus,
  PARCEL_CONFIG,
  parcelStatusLabel,
  type ParcelStatus,
} from "@/lib/parcel";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/parcels")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin parcels — 29Bricks" }] }),
  component: AdminParcels,
});

type SearchParams = { status?: string | undefined };

/** Filter chips exclude the terminal `rejected` state handled via Reject. */
const STATUS_CHIPS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pickup_pending", label: "Pickup Pending" },
  { id: "picked_up", label: "Picked Up" },
  { id: "delivered", label: "Delivered" },
  { id: "rejected", label: "Rejected" },
];

function AdminParcels() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useQuery(adminParcelsQuery({ status: search.status }));
  const queryClient = useQueryClient();

  const setParam = (patch: Partial<SearchParams>) =>
    void navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch }), replace: true });

  async function setStatus(id: string, status: ParcelStatus, label: string) {
    try {
      await adminUpdateParcelStatus(id, status);
      toast.success(`Parcel ${label.toLowerCase()}`);
      void queryClient.invalidateQueries({ queryKey: ["admin-parcels"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const rows = query.data ?? [];

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Parcel requests"
        description={`${PARCEL_CONFIG.city} → ${PARCEL_CONFIG.city} · ₹${PARCEL_CONFIG.price} flat · up to ${PARCEL_CONFIG.maxWeightKg} KG${query.data ? ` · ${query.data.length} request${query.data.length === 1 ? "" : "s"}` : ""}`}
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setParam({ status: chip.id === "all" ? undefined : chip.id })}
            className={
              (search.status ?? "all") === chip.id
                ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                : "rounded-full border bg-card px-3 py-1.5 text-xs font-semibold"
            }
          >
            {chip.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load parcels"}
        </div>
      ) : null}

      <div className="grid gap-2">
        {rows.length ? (
          rows.map((p) => (
            <ParcelRow key={p.id} parcel={p} onSetStatus={setStatus} />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {query.isLoading ? "Loading…" : "No parcel requests match this filter."}
          </p>
        )}
      </div>
    </div>
  );
}

function ParcelRow({
  parcel,
  onSetStatus,
}: {
  parcel: import("@/lib/parcel").ParcelRequest;
  onSetStatus: (id: string, status: ParcelStatus, label: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busyStatus, setBusyStatus] = useState<ParcelStatus | null>(null);

  const isTerminal = parcel.status === "delivered" || parcel.status === "rejected";
  const nextSteps: ParcelStatus[] =
    parcel.status === "submitted"
      ? ["confirmed", "rejected"]
      : parcel.status === "confirmed"
        ? ["pickup_pending"]
        : parcel.status === "pickup_pending"
          ? ["picked_up"]
          : parcel.status === "picked_up"
            ? ["delivered"]
            : [];

  async function run(status: ParcelStatus, label: string) {
    setBusyStatus(status);
    try {
      await onSetStatus(parcel.id, status, label);
    } finally {
      setBusyStatus(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-extrabold tracking-wide">
            {parcel.token_number}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {parcel.customer_name} · {parcel.customer_mobile} ·{" "}
            {timeAgo(parcel.created_at)}
          </p>
        </div>
        <StatusPill status={parcel.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setOpen(true)}>
          <MapPin className="mr-1 size-3.5" /> View
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg"
          onClick={() => (window.location.href = `tel:${parcel.customer_mobile}`)}
        >
          <Phone className="mr-1 size-3.5" /> Call customer
        </Button>
        {nextSteps.map((s) => (
          <Button
            key={s}
            size="sm"
            className="rounded-lg"
            variant={s === "rejected" ? "outline" : "default"}
            disabled={busyStatus !== null}
            onClick={() => void run(s, parcelStatusLabel(s))}
          >
            {busyStatus === s ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : s === "confirmed" ? (
              <CheckCircle2 className="mr-1 size-3.5" />
            ) : s === "rejected" ? (
              <XCircle className="mr-1 size-3.5" />
            ) : null}
            {parcelStatusLabel(s)}
          </Button>
        ))}
      </div>

      {/* -------- detail dialog -------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md gap-3 overflow-y-auto rounded-3xl p-5 text-left sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center justify-between gap-2 font-display text-base">
              <span className="font-mono">{parcel.token_number}</span>
              <StatusPill status={parcel.status} />
            </DialogTitle>
            <DialogDescription>
              Booked {new Date(parcel.created_at).toLocaleString("en-IN")}
            </DialogDescription>
          </DialogHeader>

          <dl className="grid gap-2 text-sm">
            <Detail label="Customer" value={`${parcel.customer_name} · ${parcel.customer_mobile}`} />
            <Detail label="Pickup address" value={parcel.pickup_address} />
            <Detail label="Receiver" value={`${parcel.receiver_name} · ${parcel.receiver_mobile}`} />
            <Detail label="Delivery address" value={parcel.delivery_address} />
            <Detail label="Weight" value={`${parcel.parcel_weight} KG`} />
            <Detail label="Price" value={`₹${parcel.price}`} />
          </dl>

          {parcel.parcel_image_url ? (
            <a
              href={parcel.parcel_image_url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-2xl border"
            >
              <img
                src={parcel.parcel_image_url}
                alt={`Parcel photo for ${parcel.token_number}`}
                loading="lazy"
                className="max-h-56 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </a>
          ) : (
            <p className="flex items-center gap-1.5 rounded-2xl border border-dashed p-3 text-xs text-muted-foreground">
              <ImageIcon className="size-3.5" /> No parcel photo attached
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {nextSteps.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "rejected" ? "outline" : "default"}
                disabled={busyStatus !== null}
                onClick={() => void run(s, parcelStatusLabel(s))}
              >
                {busyStatus === s ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : s === "confirmed" ? (
                  <CheckCircle2 className="mr-1 size-3.5" />
                ) : s === "rejected" ? (
                  <XCircle className="mr-1 size-3.5" />
                ) : null}
                {parcelStatusLabel(s)}
              </Button>
            ))}
            <a
              href={`tel:${parcel.customer_mobile}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
            >
              <Phone className="size-3.5" /> Call receiver
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-snug">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: ParcelStatus }) {
  const tone =
    status === "delivered"
      ? "bg-success/12 text-success"
      : status === "rejected"
        ? "bg-destructive/12 text-destructive"
        : status === "submitted"
          ? "bg-warning/20 text-warning-foreground"
          : "bg-primary/10 text-primary";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        tone,
      )}
    >
      {parcelStatusLabel(status)}
    </span>
  );
}
