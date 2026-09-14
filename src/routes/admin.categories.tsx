import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { DetailDialog } from "@/components/admin/detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { adminCategoriesQuery, type AdminCategory } from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Admin categories — 29Bricks" }] }),
  component: AdminCategories,
});

type CategoryForm = {
  name: string;
  slug: string;
  kind: string;
  icon: string;
  subtitle: string;
  sort_order: string;
};

const EMPTY_FORM: CategoryForm = {
  name: "",
  slug: "",
  kind: "property",
  icon: "",
  subtitle: "",
  sort_order: "",
};

const KINDS = ["property", "service", "requirement"];

function AdminCategories() {
  const categories = useQuery(adminCategoriesQuery());
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(category: AdminCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      kind: category.kind,
      icon: category.icon ?? "",
      subtitle: category.subtitle ?? "",
      sort_order: String(category.sort_order ?? ""),
    });
    setDialogOpen(true);
  }

  async function save() {
    if (form.name.trim().length < 2) {
      toast.error("Add a category name.");
      return;
    }
    setBusy(true);
    try {
      const values = {
        name: form.name.trim(),
        slug: form.slug.trim() || form.name.toLowerCase().replace(/\s+/g, "-"),
        kind: form.kind,
        icon: form.icon.trim() || null,
        subtitle: form.subtitle.trim() || null,
        ...(form.sort_order === "" ? {} : { sort_order: Number(form.sort_order) }),
      };
      if (editing) {
        const { error } = await supabase.from("categories").update(values).eq("id", editing.id);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        const { error } = await supabase.from("categories").insert(values);
        if (error) throw error;
        toast.success("Category added");
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(category: AdminCategory) {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Categories"
        description={categories.data ? `${categories.data.items.length} categories` : "Manage homepage categories"}
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> Add category
          </Button>
        }
      />

      {categories.isLoading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {categories.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {categories.error instanceof Error ? categories.error.message : "Could not load categories"}
        </div>
      ) : null}

      <div className="grid gap-2">
        {(categories.data?.items ?? []).map((category) => (
          <div key={category.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{category.name}</p>
                <Badge variant="outline" className="capitalize">{category.kind}</Badge>
                {category.is_active ? (
                  <Badge className="bg-success/12 text-success">Active</Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                /{category.slug}{category.subtitle ? ` · ${category.subtitle}` : ""} · order {category.sort_order}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void toggleActive(category)}>
                {category.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openEdit(category)}>
                <Pencil className="mr-1 size-3.5" /> Edit
              </Button>
            </div>
          </div>
        ))}
        {categories.data && !categories.data.items.length ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No categories yet.
          </p>
        ) : null}
      </div>

      <DetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Edit ${editing.name}` : "Add category"}
        footer={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Add category"}
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
              <Label className="text-xs font-semibold">Kind</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Icon (name)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. home" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Subtitle</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
          </div>
        </div>
      </DetailDialog>
    </div>
  );
}
