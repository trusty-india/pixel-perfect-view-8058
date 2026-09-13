import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { citiesQuery } from "@/lib/data";
import { BHK_OPTIONS, PROPERTY_TYPES } from "@/lib/format";
import { Card, Field, Picker, SignInWall } from "./post.property";

export const Route = createFileRoute("/post/requirement")({
  head: () => ({
    meta: [
      { title: "Post your property requirement — 29Bricks" },
      {
        name: "description",
        content:
          "Tell us the home, room, shop or land you need in Lucknow and get matching options from 29Bricks.",
      },
      { property: "og:title", content: "Post your property requirement — 29Bricks" },
      {
        property: "og:description",
        content: "Share your budget and area, and let the right property reach you.",
      },
    ],
  }),
  component: PostRequirement,
});

function PostRequirement() {
  const { user, profile, loading } = useAuth();
  const { city: activeCity } = useCity();
  const navigate = useNavigate();
  const { data: cities } = useQuery(citiesQuery);

  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("buy");
  const [propertyType, setPropertyType] = useState("");
  const [city, setCity] = useState(activeCity);
  const [location, setLocation] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [bhk, setBhk] = useState("");
  const [areaSize, setAreaSize] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  if (!user && !loading) return <SignInWall />;

  async function submit(): Promise<void> {
    if (title.trim().length < 5) {
      toast.error("Please describe your need in the title.");
      return;
    }
    if (!phone.trim() || !/^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Enter a valid 10 digit contact number.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("requirements").insert({
      user_id: user!.id,
      title: title.trim().slice(0, 120),
      purpose,
      property_type: propertyType || null,
      city,
      location: location.trim().slice(0, 120) || null,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      bhk: bhk || null,
      area_size: areaSize.trim().slice(0, 60) || null,
      preferred_date: preferredDate || null,
      description: description.trim().slice(0, 1000) || null,
      contact_name: name.trim().slice(0, 100) || null,
      contact_phone: phone.trim().slice(0, 15),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Requirement posted! Our team will reach out soon.");
    navigate({ to: "/requirements" });
  }

  return (
    <AppShell>
      <h1 className="text-lg font-bold">Post your requirement</h1>
      <p className="text-xs text-muted-foreground">
        Tell us what you need — we will match it with the right property.
      </p>

      <div className="mt-4 grid gap-4">
        <Card title="What are you looking for?">
          <Field label="Title">
            <Input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Need 2 BHK on rent in Gomti Nagar"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Purpose">
              <Picker value={purpose} onChange={setPurpose} options={["buy", "rent", "pg", "lease"]} />
            </Field>
            <Field label="Property type">
              <Picker value={propertyType} onChange={setPropertyType} options={PROPERTY_TYPES} />
            </Field>
          </div>
        </Card>

        <Card title="Where & budget">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City">
              <Picker value={city} onChange={setCity} options={(cities ?? []).map((c) => c.name)} />
            </Field>
            <Field label="Preferred area">
              <Input
                value={location}
                maxLength={120}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Vastu Khand, Gomti Nagar"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Budget from (₹)">
              <Input
                value={budgetMin}
                inputMode="numeric"
                onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ""))}
                placeholder="500000"
              />
            </Field>
            <Field label="Budget up to (₹)">
              <Input
                value={budgetMax}
                inputMode="numeric"
                onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ""))}
                placeholder="2500000"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="BHK">
              <Picker value={bhk} onChange={setBhk} options={BHK_OPTIONS} />
            </Field>
            <Field label="Area size">
              <Input
                value={areaSize}
                maxLength={60}
                onChange={(e) => setAreaSize(e.target.value)}
                placeholder="1000 sqft"
              />
            </Field>
          </div>
          <Field label="Need it by">
            <Input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
            />
          </Field>
          <Field label="More details">
            <Textarea
              value={description}
              maxLength={1000}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any specific needs — parking, floor, furnishing…"
            />
          </Field>
        </Card>

        <Card title="Contact details">
          <Field label="Your name">
            <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </Field>
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
          Post requirement
        </Button>
      </div>
    </AppShell>
  );
}
