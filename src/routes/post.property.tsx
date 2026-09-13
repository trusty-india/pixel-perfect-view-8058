import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/post/property")({
  head: () => ({
    meta: [
      { title: "Post your property free — 29Bricks" },
      {
        name: "description",
        content:
          "List your house, flat, room, PG, shop or land for sale or rent on 29Bricks in minutes.",
      },
      { property: "og:title", content: "Post your property free — 29Bricks" },
      {
        property: "og:description",
        content: "Reach genuine buyers and tenants in Lucknow for free.",
      },
    ],
  }),
  component: PostProperty,
});

function PostProperty() {
  const { user, profile, loading } = useAuth();
  const { city: activeCity } = useCity();
  const navigate = useNavigate();
  const { data: cities } = useQuery(citiesQuery);
  const { data: categories } = useQuery(categoriesQuery);

  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]!);
  const [purpose, setPurpose] = useState("sell");
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(activeCity);
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [areaSize, setAreaSize] = useState("");
  const [bhk, setBhk] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [facilities, setFacilities] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("everyone");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ownerName, setOwnerName] = useState(profile?.full_name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  if (!user && !loading) return <SignInWall />;

  async function onFiles(files: FileList) {
    setUploading(true);
    try {
      const urls = await uploadImages(files, "listings");
      setImages((prev) => [...prev, ...urls].slice(0, 10));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (title.trim().length < 5) return toast.error("Title should be at least 5 characters.");
    if (!location.trim()) return toast.error("Please add the area / locality.");
    if (!ownerPhone.trim() || !/^\d{10}$/.test(ownerPhone.replace(/\D/g, "").slice(-10)))
      return toast.error("Enter a valid 10 digit contact number.");

    setSaving(true);
    const { data, error } = await supabase
      .from("listings")
      .insert({
        owner_id: user!.id,
        title: title.trim().slice(0, 120),
        property_type: propertyType,
        purpose,
        category_slug: categorySlug || null,
        price: price ? Number(price) : null,
        city,
        location: location.trim().slice(0, 120),
        address: address.trim().slice(0, 240) || null,
        area_size: areaSize.trim().slice(0, 60) || null,
        bhk: bhk || null,
        furnishing: furnishing || null,
        facilities,
        description: description.trim().slice(0, 2000) || null,
        audience,
        images,
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Could not post property");
      return;
    }

    await supabase.from("listing_private").insert({
      listing_id: data.id,
      owner_name: ownerName.trim().slice(0, 100) || null,
      owner_phone: ownerPhone.trim().slice(0, 15),
    });

    setSaving(false);
    toast.success("Property submitted! It will be live after admin review.");
    navigate({ to: "/profile" });
  }

  return (
    <AppShell>
      <h1 className="text-lg font-bold">Post your property</h1>
      <p className="text-xs text-muted-foreground">Free listing · reviewed before going live.</p>

      <div className="mt-4 grid gap-4">
        <Card title="Basic details">
          <Field label="Title">
            <Input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="2 BHK flat near Vastu Khand"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="I want to">
              <Picker
                value={purpose}
                onChange={setPurpose}
                options={["sell", "rent", "lease", "pg"]}
              />
            </Field>
            <Field label="Property type">
              <Picker value={propertyType} onChange={setPropertyType} options={PROPERTY_TYPES} />
            </Field>
          </div>
          <Field label="Category (optional)">
            <Picker
              value={categorySlug}
              onChange={setCategorySlug}
              options={(categories ?? []).map((c) => c.slug)}
              labels={Object.fromEntries((categories ?? []).map((c) => [c.slug, c.name]))}
            />
          </Field>
        </Card>

        <Card title="Location & price">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City">
              <Picker
                value={city}
                onChange={setCity}
                options={(cities ?? []).map((c) => c.name)}
              />
            </Field>
            <Field label="Area / locality">
              <Input
                value={location}
                maxLength={120}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Gomti Nagar"
              />
            </Field>
          </div>
          <Field label="Full address (optional)">
            <Input
              value={address}
              maxLength={240}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House no, street, landmark"
            />
          </Field>
          <Field label="Price (₹)">
            <Input
              value={price}
              inputMode="numeric"
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="2500000"
            />
          </Field>
        </Card>

        <Card title="Property info">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="BHK">
              <Picker value={bhk} onChange={setBhk} options={BHK_OPTIONS} />
            </Field>
            <Field label="Furnishing">
              <Picker value={furnishing} onChange={setFurnishing} options={FURNISHING} />
            </Field>
          </div>
          <Field label="Area size">
            <Input
              value={areaSize}
              maxLength={60}
              onChange={(e) => setAreaSize(e.target.value)}
              placeholder="1200 sqft"
            />
          </Field>
          <Field label="Suitable for">
            <Picker
              value={audience}
              onChange={setAudience}
              options={["everyone", "family", "bachelor", "student", "girls", "boys", "office"]}
            />
          </Field>
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
                        on ? prev.filter((x) => x !== f) : [...prev, f],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold tap-scale",
                      on ? "gradient-sky border-transparent text-sky-foreground" : "bg-card",
                    )}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              maxLength={2000}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell buyers what makes this property special."
            />
          </Field>
        </Card>

        <Card title="Photos">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading ? "Uploading…" : "Upload photos (up to 10)"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void onFiles(e.target.files);
              }}
            />
          </label>
          {images.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((url) => (
                <div key={url} className="relative overflow-hidden rounded-xl">
                  <img src={url} alt="Property" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((u) => u !== url))}
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90"
                    aria-label="Remove photo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card title="Contact details">
          <Field label="Your name">
            <Input
              value={ownerName}
              maxLength={100}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Name"
            />
          </Field>
          <Field label="Mobile number">
            <Input
              value={ownerPhone}
              maxLength={15}
              inputMode="tel"
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="9793045547"
            />
          </Field>
          <p className="text-[11px] text-muted-foreground">
            Your number stays private — buyers reach you through 29Bricks.
          </p>
        </Card>

        <Button
          className="rounded-xl py-6 text-base"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Submit property
        </Button>
      </div>
    </AppShell>
  );
}

export function SignInWall() {
  return (
    <AppShell>
      <div className="mt-10 rounded-3xl border bg-card p-8 text-center shadow-soft">
        <h1 className="font-display text-xl font-bold">Sign in to post</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a free account to post on 29Bricks.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-block rounded-xl gradient-red px-5 py-2.5 text-sm font-semibold text-brand-foreground tap-scale"
        >
          Sign in
        </Link>
      </div>
    </AppShell>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-3xl border bg-card p-4 shadow-soft">
      <h2 className="text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function Picker({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="capitalize">
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
