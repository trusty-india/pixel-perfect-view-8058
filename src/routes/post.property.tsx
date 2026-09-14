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
import { citiesQuery, categoriesQuery } from "@/lib/data";
import { uploadImages } from "@/lib/upload";
import { BHK_OPTIONS, FACILITIES, FURNISHING, PROPERTY_TYPES } from "@/lib/format";

export const Route = createFileRoute("/post/property")({
  head: () => ({
    meta: [
      { title: "Post your property — 29Bricks" },
      {
        name: "description",
        content: "List your house, flat, room, shop or land for sale or rent on 29Bricks.",
      },
      { property: "og:title", content: "Post your property — 29Bricks" },
      { property: "og:description", content: "Free property listing for owners in Lucknow." },
    ],
  }),
  component: PostProperty,
});

function PostProperty() {
  const { user, profile } = useAuth();
  const { city: activeCity } = useCity();
  const navigate = useNavigate();
  const { data: cities } = useQuery(citiesQuery);
  const { data: categories } = useQuery(categoriesQuery);

  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    purpose: "rent",
    property_type: "Room",
    category_slug: "",
    city: activeCity,
    location: "",
    address: "",
    price: "",
    price_unit: "total",
    bhk: "",
    furnishing: "",
    area_size: "",
    availability: "",
    audience: "",
    description: "",
    owner_name: profile?.full_name ?? "",
    owner_phone: profile?.phone ?? "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to post a property.");
      void navigate({ to: "/auth" });
      return;
    }
    if (!form.title.trim() || !form.location.trim()) {
      toast.error("Title and locality are required.");
      return;
    }
    setSaving(true);
    try {
      const images = files.length ? await uploadImages(files.slice(0, 10), "listings") : [];
      const { data, error } = await supabase
        .from("listings")
        .insert({
          owner_id: user.id,
          title: form.title.trim(),
          purpose: form.purpose,
          property_type: form.property_type,
          category_slug: form.category_slug || null,
          city: form.city,
          location: form.location.trim(),
          address: form.address || null,
          price: form.price ? Number(form.price) : null,
          price_unit: form.price_unit,
          bhk: form.bhk || null,
          furnishing: form.furnishing || null,
          area_size: form.area_size || null,
          availability: form.availability || null,
          audience: form.audience || null,
          description: form.description || null,
          facilities,
          images,
          status: "approved",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (form.owner_name || form.owner_phone) {
        await supabase.from("listing_private").insert({
          listing_id: data.id,
          owner_name: form.owner_name || null,
          owner_phone: form.owner_phone || null,
        });
      }
      await supabase.from("leads").insert({
        source: "listing",
        listing_id: data.id,
        user_id: user.id,
        name: form.owner_name || profile?.full_name || null,
        phone: form.owner_phone || profile?.phone || null,
        message: `New property listed: ${form.title}`,
      });

      toast.success("Property posted! It is live now.");
      void navigate({ to: "/listing/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post property");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Post your property</h1>
      <p className="text-xs text-muted-foreground">
        Add clear photos and correct locality for faster enquiries.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-4 rounded-3xl border bg-card p-4 shadow-soft">
        <Field label="Title">
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="2 BHK flat near Vastu Khand"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Purpose">
            <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">For Rent</SelectItem>
                <SelectItem value="sale">For Sale</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Property type">
            <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
              <SelectTrigger>
                <SelectValue />
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
          <Field label="Category">
            <Select value={form.category_slug} onValueChange={(v) => set("category_slug", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.slug}>
                    {c.name}
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
          <Field label="Locality / area">
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Vastu Khand, Gomti Nagar"
            />
          </Field>
          <Field label="Full address (private)">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Price (₹)">
            <Input
              inputMode="numeric"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="12000"
            />
          </Field>
          <Field label="BHK">
            <Select value={form.bhk} onValueChange={(v) => set("bhk", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select BHK" />
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
          <Field label="Furnishing">
            <Select value={form.furnishing} onValueChange={(v) => set("furnishing", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select furnishing" />
              </SelectTrigger>
              <SelectContent>
                {FURNISHING.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Area size">
            <Input
              value={form.area_size}
              onChange={(e) => set("area_size", e.target.value)}
              placeholder="900 sqft"
            />
          </Field>
          <Field label="Availability">
            <Input
              value={form.availability}
              onChange={(e) => set("availability", e.target.value)}
              placeholder="Immediate"
            />
          </Field>
          <Field label="Best suited for">
            <Select value={form.audience} onValueChange={(v) => set("audience", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="bachelor">Bachelors</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="girls">Girls only</SelectItem>
                <SelectItem value="boys">Boys only</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Facilities">
          <div className="flex flex-wrap gap-2">
            {FACILITIES.map((f) => {
              const on = facilities.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setFacilities((prev) =>
                      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold tap-scale ${
                    on ? "gradient-red border-transparent text-brand-foreground" : "bg-card"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Description">
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Tell buyers about the property, nearby landmarks, rules…"
          />
        </Field>

        <Field label="Photos (up to 10)">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length ? (
            <p className="mt-1 text-xs text-muted-foreground">{files.length} photo(s) selected</p>
          ) : null}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name (private)">
            <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
          </Field>
          <Field label="Your mobile (private)">
            <Input
              inputMode="tel"
              value={form.owner_phone}
              onChange={(e) => set("owner_phone", e.target.value)}
            />
          </Field>
        </div>

        <Button type="submit" disabled={saving} className="rounded-xl">
          {saving ? "Posting…" : "Post property"}
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
