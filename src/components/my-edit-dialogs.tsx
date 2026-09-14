import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog as DialogRoot,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRow, type AdminTable } from "@/lib/admin-mutations";
import { SERVICE_TYPES } from "@/lib/format";
import type { MyListing, MyRequirement, MyService } from "@/lib/my-activity";

function useInvalidateMy() {
  const qc = useQueryClient();
  return (keys: string[][]) => {
    for (const key of keys) void qc.invalidateQueries({ queryKey: key });
  };
}

/** Rejected/hidden rows go back to pending when the owner edits them (matches listings/requirements/services policies). */
function resubmitStatus(status: string): string | null {
  return status === "rejected" || status === "hidden" || status === "unpublished" ? "pending" : null;
}

function MyEditDialog({
  open,
  onOpenChange,
  title,
  children,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Changes go to the 29Bricks team when a review is needed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">{children}</div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

export function EditRequirementDialog({ item, onClose }: { item: MyRequirement | null; onClose: () => void }) {
  const invalidate = useInvalidateMy();
  const [form, setForm] = useState({ title: "", location: "", budget_min: "", budget_max: "", description: "" });
  const [saving, setSaving] = useState(false);
  const current = item;

  useEffect(() => {
    if (current) {
      setForm({
        title: current.title,
        location: current.location ?? "",
        budget_min: current.budget_min != null ? String(current.budget_min) : "",
        budget_max: current.budget_max != null ? String(current.budget_max) : "",
        description: current.description ?? "",
      });
    }
  }, [current]);

  if (!current) return null;

  async function save() {
    const row = current;
    if (!row) return;
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        title: form.title.trim().slice(0, 160),
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        ...(form.budget_min === "" ? {} : { budget_min: Number(form.budget_min) }),
        ...(form.budget_max === "" ? {} : { budget_max: Number(form.budget_max) }),
      };
      const resub = resubmitStatus(row.status);
      if (resub) patch["status"] = resub;
      await updateRow("requirements" as AdminTable, row.id, patch);
      toast.success(resub ? "Updated and resubmitted for review" : "Requirement updated");
      invalidate([["my-requirements"]]);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MyEditDialog
      open={Boolean(item)}
      onOpenChange={(o) => !o && onClose()}
      title="Edit requirement"
      saving={saving}
      onSave={() => void save()}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="rq-title">Title</Label>
        <Input id="rq-title" value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="rq-loc">Preferred locality</Label>
        <Input id="rq-loc" value={form.location} maxLength={120} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rq-min">Budget min (₹)</Label>
          <Input id="rq-min" inputMode="numeric" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rq-max">Budget max (₹)</Label>
          <Input id="rq-max" inputMode="numeric" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="rq-desc">Description</Label>
        <Textarea id="rq-desc" rows={3} value={form.description} maxLength={1000} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
    </MyEditDialog>
  );
}

export function EditServiceDialog({ item, onClose }: { item: MyService | null; onClose: () => void }) {
  const invalidate = useInvalidateMy();
  const [form, setForm] = useState({ name: "", service_type: "", areas: "" });
  const [saving, setSaving] = useState(false);
  const current = item;

  useEffect(() => {
    if (current) {
      setForm({
        name: current.name,
        service_type: current.service_type,
        areas: current.areas ?? "",
      });
    }
  }, [current]);

  if (!current) return null;

  async function save() {
    const row = current;
    if (!row) return;
    if (!form.name.trim()) {
      toast.error("Service name is required.");
      return;
    }
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        name: form.name.trim().slice(0, 120),
        service_type: form.service_type || row.service_type,
        areas: form.areas.trim() || null,
      };
      const resub = resubmitStatus(row.status);
      if (resub) patch["status"] = resub;
      await updateRow("services" as AdminTable, row.id, patch);
      toast.success(resub ? "Updated and resubmitted for review" : "Service updated");
      invalidate([["my-services"]]);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MyEditDialog
      open={Boolean(item)}
      onOpenChange={(o) => !o && onClose()}
      title="Edit service"
      saving={saving}
      onSave={() => void save()}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="sv-name">Service name</Label>
        <Input id="sv-name" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid gap-1.5">
        <Label>Category</Label>
        <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sv-areas">Service areas</Label>
        <Input
          id="sv-areas"
          value={form.areas}
          maxLength={160}
          placeholder="Gomti Nagar, Hazratganj"
          onChange={(e) => setForm({ ...form, areas: e.target.value })}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Images and pricing changes are handled by the 29Bricks team during review.
      </p>
    </MyEditDialog>
  );
}

export function EditListingDialog({ item, onClose }: { item: MyListing | null; onClose: () => void }) {
  const invalidate = useInvalidateMy();
  const [form, setForm] = useState({ title: "", location: "", price: "" });
  const [saving, setSaving] = useState(false);
  const current = item;

  useEffect(() => {
    if (current) {
      setForm({
        title: current.title,
        location: current.location,
        price: current.price != null ? String(current.price) : "",
      });
    }
  }, [current]);

  if (!current) return null;

  // RLS: owners may only update listings whose status is not 'approved'.
  const locked = current.status === "approved";

  async function save() {
    const row = current;
    if (!row) return;
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        title: form.title.trim().slice(0, 160),
        location: form.location.trim().slice(0, 120),
        ...(form.price === "" ? {} : { price: Number(form.price) }),
      };
      const resub = resubmitStatus(row.status);
      if (resub) patch["status"] = resub;
      await updateRow("listings" as AdminTable, row.id, patch);
      toast.success(resub ? "Updated and resubmitted for review" : "Property updated");
      invalidate([["my-listings"]]);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save — approved properties are managed by the team");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MyEditDialog
      open={Boolean(item)}
      onOpenChange={(o) => !o && onClose()}
      title={locked ? "View property" : "Edit property"}
      saving={saving}
      onSave={() => void save()}
    >
      {locked ? (
        <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          This property is live. Contact the 29Bricks team to change approved listings.
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="ls-title">Title</Label>
        <Input id="ls-title" value={form.title} maxLength={160} disabled={locked} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ls-loc">Locality</Label>
          <Input id="ls-loc" value={form.location} maxLength={120} disabled={locked} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ls-price">Price (₹)</Label>
          <Input id="ls-price" inputMode="numeric" value={form.price} disabled={locked} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
      </div>
    </MyEditDialog>
  );
}
