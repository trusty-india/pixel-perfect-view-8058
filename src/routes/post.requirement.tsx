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
import { BHK_OPTIONS, PROPERTY_TYPES } from "@/lib/format";

export const Route = createFileRoute("/post/requirement")({
  head: () => ({
    meta: [
      { title: "Post your requirement — 29Bricks" },
      {
        name: "description",
        content: "Tell us the property you need and get matching options from 29Bricks.",
      },
      { property: "og:title", content: "Post your requirement — 29Bricks" },
      { property: "og:description", content: "Share your budget and locality, we will match you." },
    ],
  }),
  component: PostRequirement,
});

function PostRequirement() {
  const { user, profile } = useAuth();
  const { city: activeCity } = useCity();
  const navigate = useNavigate();
  const { data: cities } = useQuery(citiesQuery);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    purpose: "rent",
    property_type: "",
    city: activeCity,
    location: "",
    budget_min: "",
    budget_max: "",
    bhk: "",
    area_size: "",
    preferred_date: "",
    description: "",
    contact_name: profile?.full_name ?? "",
    contact_phone: profile?.phone ?? "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to post a requirement.");
      void navigate({ to: "/auth" });
      return;
    }
    if (!form.title.trim()) {
      toast.error("Please add a short title.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("requirements")
        .insert({
          user_id: user.id,
          title: form.title.trim(),
          purpose: form.purpose,
          property_type: form.property_type || null,
          city: form.city,
          location: form.location || null,
          budget_min: form.budget_min ? Number(form.budget_min) : null,
          budget_max: form.budget_max ? Number(form.budget_max) : null,
          bhk: form.bhk || null,
          area_size: form.area_size || null,
          preferred_date: form.preferred_date || null,
          description: form.description || null,
          contact_name: form.contact_name || null,
          contact_phone: form.contact_phone || null,
          status: "approved",
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("leads").insert({
        source: "requirement",
        requirement_id: data.id,
        user_id: user.id,
        name: form.contact_name || profile?.full_name || null,
        phone: form.contact_phone || profile?.phone || null,
        message: form.title.trim(),
      });

      toast.success("Requirement posted! Our team will contact you.");
      void navigate({ to: "/requirements" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post requirement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Post your requirement</h1>
      <p className="text-xs text-muted-foreground">
        Tell us what you need — we will match it with owners.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-4 rounded-3xl border bg-card p-4 shadow-soft">
        <Field label="Title">
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Need 2 BHK on rent in Gomti Nagar"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Purpose">
            <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="sale">Buy</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Property type">
            <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
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
          <Field label="Preferred locality">
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
          </Field>
          <Field label="Budget min (₹)">
            <Input
              inputMode="numeric"
              value={form.budget_min}
              onChange={(e) => set("budget_min", e.target.value)}
            />
          </Field>
          <Field label="Budget max (₹)">
            <Input
              inputMode="numeric"
              value={form.budget_max}
              onChange={(e) => set("budget_max", e.target.value)}
            />
          </Field>
          <Field label="BHK">
            <Select value={form.bhk} onValueChange={(v) => set("bhk", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {BHK_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Area size">
            <Input value={form.area_size} onChange={(e) => set("area_size", e.target.value)} />
          </Field>
          <Field label="Move-in / visit date">
            <Input
              type="date"
              value={form.preferred_date}
              onChange={(e) => set("preferred_date", e.target.value)}
            />
          </Field>
          <Field label="Your name">
            <Input
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
            />
          </Field>
          <Field label="Your mobile">
            <Input
              inputMode="tel"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Details">
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={saving} className="rounded-xl">
          {saving ? "Posting…" : "Post requirement"}
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
