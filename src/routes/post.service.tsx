import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { citiesQuery } from "@/lib/data";
import { uploadImage } from "@/lib/upload";
import { SERVICE_TYPES } from "@/lib/format";

export const Route = createFileRoute("/post/service")({
  head: () => ({
    meta: [
      { title: "List your service — 29Bricks" },
      {
        name: "description",
        content: "Add your home service business — electrician, plumber, movers and more.",
      },
      { property: "og:title", content: "List your service — 29Bricks" },
      { property: "og:description", content: "Reach customers looking for local services." },
    ],
  }),
  component: PostService,
});

function PostService() {
  const { user, profile } = useAuth();
  const { city: activeCity } = useCity();
  const navigate = useNavigate();
  const { data: cities } = useQuery(citiesQuery);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    service_type: "Electrician",
    city: activeCity,
    areas: "",
    phone: profile?.phone ?? "",
    price_from: "",
    description: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to list a service.");
      void navigate({ to: "/auth" });
      return;
    }
    if (!form.name.trim()) {
      toast.error("Business name is required.");
      return;
    }
    setSaving(true);
    try {
      const image_url = file ? await uploadImage(file, "services") : null;
      const { data, error } = await supabase
        .from("services")
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          service_type: form.service_type,
          city: form.city,
          areas: form.areas || null,
          phone: form.phone || null,
          price_from: form.price_from ? Number(form.price_from) : null,
          description: form.description || null,
          image_url,
          status: "approved",
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("leads").insert({
        source: "service",
        service_id: data.id,
        user_id: user.id,
        name: form.name.trim(),
        phone: form.phone || profile?.phone || null,
        message: `New service listed: ${form.service_type}`,
      });

      toast.success("Service listed! It is live now.");
      void navigate({ to: "/services" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not list service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">List your service</h1>
      <p className="text-xs text-muted-foreground">
        Get calls from customers near you in {form.city}.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-4 rounded-3xl border bg-card p-4 shadow-soft">
        <Field label="Business / your name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service type">
            <Select value={form.service_type} onValueChange={(v) => set("service_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="City">
            <Select value={form.city} onValueChange={(v) => set("city", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(cities ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.name} disabled={c.status !== "live"}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Areas covered">
            <Input
              value={form.areas}
              onChange={(e) => set("areas", e.target.value)}
              placeholder="Gomti Nagar, Indira Nagar"
            />
          </Field>
          <Field label="Contact mobile">
            <Input
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Starting price (₹)">
            <Input
              inputMode="numeric"
              value={form.price_from}
              onChange={(e) => set("price_from", e.target.value)}
            />
          </Field>
          <Field label="Cover photo">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        <Field label="About your service">
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={saving} className="rounded-xl">
          {saving ? "Listing…" : "List service"}
        </Button>
      </form>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}
