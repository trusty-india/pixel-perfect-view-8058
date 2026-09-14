import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { DetailDialog } from "@/components/admin/detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminCitiesQuery, type AdminCity } from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/cities")({
  head: () => ({ meta: [{ title: "Admin cities — 29Bricks" }] }),
  component: AdminCities,
});

type CityForm = {
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  sort_order: string;
};

const EMPTY_FORM: CityForm = {
  name: "",
  slug: "",
  description: "",
  image_url: null,
  sort_order: "",
};

function AdminCities() {
  const cities = useQuery(adminCitiesQuery());
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CityForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminCity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(city: AdminCity) {
    setEditing(city);
    setForm({
      name: city.name,
      slug: city.slug,
      description: city.description ?? "",
      image_url: city.image_url,
      sort_order: String(city.sort_order ?? ""),
    });
    setDialogOpen(true);
  }

  async function save() {
    if (form.name.trim().length < 2) {
      toast.error("Add a city name.");
      return;
    }
    setBusy(true);
    try {
      const values = {
        name: form.name.trim(),
        slug:
          form.slug.trim() ||
          form.name.toLowerCase().replace(/\s+/g, "-"),
        description: form.description.trim() || null,
        image_url: form.image_url,
        ...(form.sort_order === "" ? {} : { sort_order: Number(form.sort_order) }),
      };
      if (editing) {
        const { error } = await supabase.from("cities").update(values).eq("id", editing.id);
        if (error) throw error;
        toast.success("City updated");
      } else {
        const { error } = await supabase.from("cities").insert(values);
        if (error) throw error;
        toast.success("City added");
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      void queryClient.invalidateQueries({ queryKey: ["cities"] });
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save city");
    } finally {
      setBusy(false);
    }
  }

  async function toggleField(city: AdminCity, patch: { is_active?: boolean; status?: string }) {
    try {
      const { error } = await supabase.from("cities").update(patch).eq("id", city.id);
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      void queryClient.invalidateQueries({ queryKey: ["cities"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Cities & Locations"
        description={cities.data ? `${cities.data.items.length} cities configured` : "Control which cities are live"}
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> Add city
          </Button>
        }
      />

      {cities.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {cities.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {cities.error instanceof Error ? cities.error.message : "Could not load cities"}
        </div>
      ) : null}

      <div className="grid gap-2">
        {(cities.data?.items ?? []).map((city) => (
          <div key={city.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
            {city.image_url ? (
              <img src={city.image_url} alt="" className="size-12 rounded-xl object-cover" />
            ) : (
              <span className="grid size-12 place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
                {city.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{city.name}</p>
                <StatusBadge status={city.status === "live" ? "approved" : "pending"} />
                {city.is_active ? (
                  <span className="text-[11px] text-muted-foreground">Visible</span>
                ) : (
                  <span className="text-[11px] text-destructive">Hidden</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                /{city.slug} · order {city.sort_order}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => void toggleField(city, { status: city.status === "live" ? "coming_soon" : "live" })}
              >
                {city.status === "live" ? "Set coming soon" : "Set live"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => void toggleField(city, { is_active: !city.is_active })}
              >
                {city.is_active ? <EyeOff className="mr-1 size-3.5" /> : <Eye className="mr-1 size-3.5" />}
                {city.is_active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openEdit(city)}>
                <Pencil className="mr-1 size-3.5" /> Edit
              </Button>
            </div>
          </div>
        ))}
        {cities.data && !cities.data.items.length ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No cities yet.
          </p>
        ) : null}
      </div>

      <DetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Edit ${editing.name}` : "Add city"}
        description="Listings reference cities by name — prefer hiding over renaming existing live cities."
        footer={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Add city"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Slug (optional)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <ImageUploadField
            label="City image"
            url={form.image_url}
            onUploaded={(url) => setForm({ ...form, image_url: url })}
            onRemove={() => setForm({ ...form, image_url: null })}
          />
        </div>
      </DetailDialog>
    </div>
  );
}
