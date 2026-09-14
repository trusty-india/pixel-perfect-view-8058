import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Replaces the ad-hoc <Badge className={statusTone(status)}> pattern from the old admin page. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <Badge className={cn("capitalize", statusTone(status), className)}>{status.replace(/_/g, " ")}</Badge>;
}

const SPECIAL_TONES: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  contacted: "bg-sky/40 text-sky-foreground",
  interested: "bg-accent text-accent-foreground",
  visit_scheduled: "bg-warning/20 text-warning-foreground",
  negotiation: "bg-warning/20 text-warning-foreground",
  booked: "bg-success/12 text-success",
  sold: "bg-success/12 text-success",
  rented: "bg-success/12 text-success",
  closed: "bg-muted text-muted-foreground",
  lost: "bg-destructive/12 text-destructive",
  accepted: "bg-success/12 text-success",
  rejected: "bg-destructive/12 text-destructive",
  resolved: "bg-success/12 text-success",
  dismissed: "bg-muted text-muted-foreground",
  open: "bg-warning/20 text-warning-foreground",
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-success/12 text-success",
  cancelled: "bg-destructive/12 text-destructive",
  paid: "bg-success/12 text-success",
  pending_payment: "bg-warning/20 text-warning-foreground",
};

export function PipelineBadge({ status, className }: { status: string; className?: string }) {
  const tone = SPECIAL_TONES[status] ?? "bg-muted text-muted-foreground";
  return (
    <Badge className={cn("capitalize", tone, className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
