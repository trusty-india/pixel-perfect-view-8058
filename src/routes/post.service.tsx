import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { citiesQuery } from "@/lib/data";
import { uploadImage } from "@/lib/upload";
import { SERVICE_TYPES } from "@/lib/format";
import { Card, Field, Picker, SignInWall } from "./post.property";

export const Route = createFileRoute("/post/service")({
  head: () => ({
    meta: [
      { title: "List your local service — 29Bricks" },
      {
        name: "description",
        content:
          "Add your packers & movers, electrician, plumber, cleaning or interior business to 29Bricks and get local customers.",
      },
      { property: "og:title", content: "List your local service — 29Bricks" },
      {
        property: "og:description",
        content: "Get discovered by home owners and tenants in your city.",
      },
    ],
  }),
  component: PostService,
});

function PostService() {
  const { user, profile, loading } = useAuth();
  const { city: activeCity } = useCity();
  const navigate = useNavigate();
  const { data: cities } = useQuery(citiesQuery);

  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]!);
  const [city, setCity] = useState(activeCity);
  const [areas, setAreas] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [priceFrom, setPriceFrom] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user && !loading) return <SignInWall />;

  async function submit(): Promise<void> {
    if (name.trim().length < 3) {
      toast.error("Please enter your business name.");
      return;
    }
    if (!phone.trim() || !/^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Enter a valid 10 digit contact number.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("services").insert({
      user_id: user!.id,
      name: name.trim().slice(0, 100),
      service_type: serviceType,
      city,
      areas: areas.trim().slice(0, 200) || null,
      phone: phone.trim().slice(0, 15),
      description: description.trim().slice(0, 1000) || null,
      image_url: imageUrl,
      price_from: priceFrom ? Number(priceFrom) : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Service submitted! It will be live after review.");
    navigate({ to: "/services" });
  }

  return (
    <AppShell>
      <h1 className="text-lg font-bold">List your service</h1>
      <p className="text-xs text-muted-foreground">
        Free listing · goes live after a quick review.
      </p>

      <div className="mt-4 grid gap-4">
        <Card title="Business details">
          <Field label="Business / person name">
            <Input
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarkar Packers & Movers"
            />
          </Field>
          <Field label="Service type">
            <Picker value={serviceType} onChange={setServiceType} options={SERVICE_TYPES} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City">
              <Picker value={city} onChange={setCity} options={(cities ?? []).map((c) => c.name)} />
            </Field>
            <Field label="Areas covered">
              <Input
                value={areas}
                maxLength={200}
                onChange={(e) => setAreas(e.target.value)}
                placeholder="Gomti Nagar, Indira Nagar"
              />
            </Field>
          </div>
          <Field label="Starting price (₹)">
            <Input
              value={priceFrom}
              inputMode="numeric"
              onChange={(e) => setPriceFrom(e.target.value.replace(/\D/g, ""))}
              placeholder="499"
            />
          </Field>
          <Field label="About your service">
            <Textarea
              value={description}
              maxLength={1000}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What you offer, experience, timings…"
            />
          </Field>
        </Card>

        <Card title="Cover photo">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Uploading…" : "Upload a photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try {
                  setImageUrl(await uploadImage(f, "services"));
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Service cover"
              className="mt-3 aspect-[16/9] w-full rounded-2xl object-cover"
            />
          ) : null}
        </Card>

        <Card title="Contact">
          <Field label="Mobile number">
            <Input
              value={phone}
              maxLength={15}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9793045547"
            />
          </Field>
        </Card>

        <Button className="rounded-xl py-6 text-base" disabled={saving} onClick={() => void submit()}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Submit service
        </Button>
      </div>
    </AppShell>
  );
}
