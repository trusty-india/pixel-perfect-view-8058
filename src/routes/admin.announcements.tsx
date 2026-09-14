import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { DetailDialog } from "@/components/admin/detail-dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { adminAnnouncementsQuery, type AdminAnnouncement } from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Admin announcements — 29Bricks" }] }),
  component: AdminAnnouncements,
});

type AnnouncementForm = {
  title: string;
  message: string;
  type: string;
  button_text: string;
  button_url: string;
  start_at: string;
  end_at: string;
  start_time: string;
  end_time: string;
  image_url: string | null;
  sort_order: string;
};

const EMPTY_FORM: AnnouncementForm = {
  title: "",
  message: "",
  type: "announcement",
  button_text: "",
  button_url: "",
  start_at: "",
  end_at: "",
  start_time: "",
  end_time: "",
  image_url: null,
  sort_order: "",
};

const TYPES = ["greeting", "announcement", "offer", "festival", "notice"];

function AdminAnnouncements() {
  const announcements = useQuery(adminAnnouncementsQuery());
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminAnnouncement | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: AdminAnnouncement) {
    setEditing(item);
    setForm({
      title: item.title,
      message: item.message ?? "",
      type: item.type,
      button_text: item.button_text ?? "",
      button_url: item.button_url ?? "",
      start_at: item.start_at ? item.start_at.slice(0, 10) : "",
      end_at: item.end_at ? item.end_at.slice(0, 10) : "",
      start_time: item.start_time ?? "",
      end_time: item.end_time ?? "",
      image_url: item.image_url,
      sort_order: String(item.sort_order ?? ""),
    });
    setDialogOpen(true);
  }

  async function save() {
    if (form.title.trim().length < 2) {
      toast.error("Add an announcement title.");
      return;
    }
    setBusy(true);
    try {
      const values = {
        title: form.title.trim(),
        message: form.message.trim() || null,
        type: form.type,
        button_text: form.button_text.trim() || null,
        button_url: form.button_url.trim() || null,
        start_at: form.start_at ? `${form.start_at}T00:00:00` : null,
        end_at: form.end_at ? `${form.end_at}T23:59:59` : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        image_url: form.image_url,
        ...(form.sort_order === "" ? {} : { sort_order: Number(form.sort_order) }),
      };
      if (editing) {
        const { error } = await supabase.from("announcements").update(values).eq("id", editing.id);
        if (error) throw error;
        toast.success("Announcement updated");
      } else {
        const { error } = await supabase.from("announcements").insert(values);
        if (error) throw error;
        toast.success("Announcement published");
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save announcement");
    } finally {
      setBusy(false);
    }
  }

  async function toggleField(item: AdminAnnouncement, patch: { is_active?: boolean; is_pinned?: boolean }) {
    try {
      const { error } = await supabase.from("announcements").update(patch).eq("id", item.id);
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", confirmDelete.id);
      if (error) throw error;
      toast.success("Announcement deleted");
      void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setConfirmDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed — RLS may not permit it");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Announcements"
        description="Homepage banners shown to visitors"
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> New announcement
          </Button>
        }
      />

      {announcements.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {announcements.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {announcements.error instanceof Error ? announcements.error.message : "Could not load announcements"}
        </div>
      ) : null}

      <div className="grid gap-2">
        {(announcements.data?.items ?? []).map((item) => (
          <div key={item.id} className="rounded-2xl border bg-card p-3 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <Badge className="capitalize" variant="outline">{item.type}</Badge>
                  <StatusBadge status={item.is_active ? "approved" : "rejected"} />
                  {item.is_pinned ? <Pin className="size-3.5 text-primary" /> : null}
                </div>
                {item.message ? <p className="mt-1 text-xs text-muted-foreground">{item.message}</p> : null}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.start_at ? `From ${item.start_at.slice(0, 10)}` : "No start"}
                  {item.end_at ? ` until ${item.end_at.slice(0, 10)}` : ""}
                  {item.start_time && item.end_time ? ` · daily ${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)}` : ""}
                  {" · "}
                  {item.is_active ? "active" : "paused"}
                </p>
              </div>
              {item.image_url ? (
                <img src={item.image_url} alt="" className="size-12 rounded-xl object-cover" />
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => void toggleField(item, { is_active: !item.is_active })}
              >
                {item.is_active ? "Pause" : "Activate"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => void toggleField(item, { is_pinned: !item.is_pinned })}
              >
                <Pin className="mr-1 size-3.5" /> {item.is_pinned ? "Unpin" : "Pin"}
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openEdit(item)}>
                <Pencil className="mr-1 size-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => setConfirmDelete(item)}>
                <Trash2 className="mr-1 size-3.5" /> Delete
              </Button>
            </div>
          </div>
        ))}
        {announcements.data && !announcements.data.items.length ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No announcements yet.
          </p>
        ) : null}
      </div>

      <DetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit announcement" : "New announcement"}
        description="Announcement text renders as plain text — never HTML."
        wide
        footer={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Publish"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Message</Label>
            <Textarea rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Button text (optional)</Label>
              <Input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Button URL (optional)</Label>
              <Input value={form.button_url} onChange={(e) => setForm({ ...form, button_url: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Start date</Label>
              <Input type="date" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">End date</Label>
              <Input type="date" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Daily start time (optional)</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Daily end time (optional)</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </div>
          </div>
          <ImageUploadField
            label="Image (optional)"
            url={form.image_url}
            onUploaded={(url) => setForm({ ...form, image_url: url })}
            onRemove={() => setForm({ ...form, image_url: null })}
          />
        </div>
      </DetailDialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title={`Delete "${confirmDelete?.title ?? ""}"?`}
        description="Alternatively pause it to keep history."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}