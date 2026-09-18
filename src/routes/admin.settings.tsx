import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  announcementsQuery,
  categoriesQuery,
  CATEGORY_IMAGES_KEY,
  HERO_CONFIG_KEY,
  parseCategoryImages,
  parseHeroConfig,
  settingsQuery,
  type HeroConfig,
  type SiteSettings,
} from "@/lib/data";
import { useSiteSettingsMutation } from "@/lib/admin-mutations";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Business profile — 29Bricks" }] }),
  component: AdminSettings,
});

type SettingsForm = {
  business_name: string;
  powered_by: string;
  management_name: string;
  mobile: string;
  whatsapp: string;
  public_contact_number: string;
  email: string;
  address: string;
  description: string;
  logo_url: string | null;
  admin_avatar_url: string | null;
};

type SocialLink = { label: string; url: string };

function toForm(settings: SiteSettings): SettingsForm {
  return {
    business_name: settings.business_name,
    powered_by: settings.powered_by,
    management_name: settings.management_name,
    mobile: settings.mobile,
    whatsapp: settings.whatsapp,
    public_contact_number: settings.public_contact_number,
    email: settings.email ?? "",
    address: settings.address,
    description: settings.description ?? "",
    logo_url: settings.logo_url,
    admin_avatar_url: settings.admin_avatar_url,
  };
}

function parseSocialLinks(raw: Record<string, string> | null | undefined): SocialLink[] {
  if (!raw) return [];
  return Object.entries(raw)
    // Skip the reserved hero config key — it is not a social link.
    .filter(([key]) => key !== HERO_CONFIG_KEY)
    .map(([label, url]) => ({ label, url: String(url) }));
}

function AdminSettings() {
  const { data: settings, isLoading, error } = useQuery(settingsQuery);
  const mutation = useSiteSettingsMutation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [hero, setHero] = useState<HeroConfig>({
    image_url: null,
    title: "",
    description: "",
    cta_text: "",
    cta_url: "",
  });
  const [heroBusy, setHeroBusy] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [categoryImagesBusy, setCategoryImagesBusy] = useState(false);

  // Announcement images the admin can reuse as the hero background (existing
  // announcement data — no duplicate image upload required).
  const { data: announcements } = useQuery(announcementsQuery);
  // Live category list (same DB-driven source the Home page uses) so every
  // active category gets an image upload block, including admin-added ones.
  const { data: categories } = useQuery(categoriesQuery);
  const announcementChoices = useMemo(() => {
    return (announcements ?? [])
      .filter((a) => a.image_url)
      .map((a) => ({ id: a.id, label: a.title, image_url: a.image_url as string }));
  }, [announcements]);

  useEffect(() => {
    if (!settings || form) return;
    setForm(toForm(settings));
    setSocialLinks(parseSocialLinks(settings.social_links));
    setHero(parseHeroConfig(settings.social_links));
    setCategoryImages(parseCategoryImages(settings.social_links));
  }, [settings, form]);

  if (isLoading || !form) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Business Profile & Settings" />
        <div className="grid min-h-48 place-items-center rounded-3xl border bg-card">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Business Profile & Settings" />
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load settings"}
        </div>
      </div>
    );
  }

  const update = (key: keyof SettingsForm, value: string | null) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  /**
   * Shared writer for the flexible social_links JSON: merges the given
   * category-image overrides with the current local social links + hero state
   * (all hydrated from the server on load) so every save path preserves the
   * reserved keys it doesn't own. No schema change — same JSON column.
   */
  async function writeSocialLinks(categoryImageOverrides: Record<string, string>) {
    const links: Record<string, string> = {};
    for (const link of socialLinks) {
      if (link.label.trim() && link.url.trim()) {
        links[link.label.trim()] = link.url.trim();
      }
    }
    links[HERO_CONFIG_KEY] = JSON.stringify(hero);
    // Always write the category-images key: local state is hydrated from the
    // server before any save button renders, so an empty map here means the
    // admin deliberately removed every image — the key must be cleared too.
    links[CATEGORY_IMAGES_KEY] = JSON.stringify(categoryImageOverrides);
    const { error: saveError } = await supabase
      .from("site_settings")
      .update({ social_links: links })
      .eq("id", true);
    if (saveError) throw saveError;
  }

  async function saveCategoryImages() {
    setCategoryImagesBusy(true);
    try {
      await writeSocialLinks(categoryImages);
      void queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Category images saved");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save category images");
    } finally {
      setCategoryImagesBusy(false);
    }
  }

  async function saveHero() {
    setHeroBusy(true);
    try {
      // Persist inside the existing social_links JSON (reserved "__hero" key)
      // so no schema change is needed. Category images and social links are
      // preserved via the shared writer.
      await writeSocialLinks(categoryImages);
      void queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : "Could not save hero");
    } finally {
      setHeroBusy(false);
    }
  }

  async function save() {
    if (!form) return;
    mutation.mutate({
      business_name: form.business_name.trim(),
      powered_by: form.powered_by.trim(),
      management_name: form.management_name.trim(),
      mobile: form.mobile.trim(),
      whatsapp: form.whatsapp.trim(),
      public_contact_number: form.public_contact_number.trim(),
      email: form.email.trim() || null,
      address: form.address.trim(),
      description: form.description.trim() || null,
      logo_url: form.logo_url,
      admin_avatar_url: form.admin_avatar_url,
    });
  }

  async function saveSocialLinks() {
    setSavingSocial(true);
    try {
      // Category images + hero preserved via the shared writer.
      await writeSocialLinks(categoryImages);
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : "Could not save social links");
    } finally {
      setSavingSocial(false);
    }
  }

  const fields: Array<[keyof SettingsForm, string]> = [
    ["business_name", "Business name"],
    ["powered_by", "Powered by"],
    ["management_name", "Management name"],
    ["mobile", "Business mobile"],
    ["whatsapp", "WhatsApp number"],
    ["public_contact_number", "Public contact number"],
    ["email", "Public email"],
    ["address", "Address"],
  ];

  return (
    <div className="grid gap-4">
      <PageHeader title="Business Profile & Settings" description="Public business information shown across the marketplace" />

      <section className="rounded-3xl border bg-card p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-bold">Public business information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <label key={key} className="grid gap-1.5 text-xs font-semibold">
              {label}
              <Input value={form[key] ?? ""} onChange={(event) => update(key, event.target.value)} />
            </label>
          ))}
        </div>
        <label className="mt-3 grid gap-1.5 text-xs font-semibold">
          Business description
          <Textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
        </label>
        <Button className="mt-4 rounded-xl" disabled={mutation.isPending} onClick={() => void save()}>
          <Save className="mr-2 size-4" /> Save public profile
        </Button>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-bold">Logo & admin profile photo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            label="Business logo"
            url={form.logo_url}
            onUploaded={(url) => update("logo_url", url)}
            onRemove={() => update("logo_url", null)}
          />
          <ImageUploadField
            label="Admin DP"
            url={form.admin_avatar_url}
            onUploaded={(url) => update("admin_avatar_url", url)}
            onRemove={() => update("admin_avatar_url", null)}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Uploads save to storage immediately; press “Save public profile” to apply them site-wide.
        </p>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-soft">
        <h2 className="text-sm font-bold">Home Hero</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Exactly what appears on the public Home hero — image and text are fully admin-controlled.
        </p>

        <div className="mt-3">
          <ImageUploadField
            label="Hero image"
            url={hero.image_url}
            folder="hero"
            previewClassName="h-28 w-48"
            onUploaded={(url) => setHero((h) => ({ ...h, image_url: url }))}
            onRemove={() => setHero((h) => ({ ...h, image_url: null }))}
          />
        </div>

        {announcementChoices.length ? (
          <div className="mt-3">
            <p className="text-xs font-semibold">Use announcement image</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {announcementChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setHero((h) => ({ ...h, image_url: choice.image_url }))}
                  className="flex items-center gap-2 rounded-xl border bg-background p-1.5 pr-2.5 text-xs font-semibold tap-scale hover:border-wine/50"
                >
                  <img
                    src={choice.image_url}
                    alt=""
                    aria-hidden
                    className="h-8 w-12 rounded-lg object-cover"
                  />
                  <span className="max-w-40 truncate">{choice.label}</span>
                </button>
              ))}
            </div>
          </div>
 ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold">
            Hero title
            <Input
              value={hero.title}
              placeholder="e.g. New Property Deals"
              onChange={(event) => setHero((h) => ({ ...h, title: event.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            CTA text (optional)
            <Input
              value={hero.cta_text}
              placeholder="e.g. Explore Properties"
              onChange={(event) => setHero((h) => ({ ...h, cta_text: event.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">
            Hero description
            <Textarea
              value={hero.description}
              placeholder="e.g. Explore verified properties in Lucknow"
              onChange={(event) => setHero((h) => ({ ...h, description: event.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">
            CTA action/link (optional)
            <Input
              value={hero.cta_url}
              placeholder="/search or https://…"
              onChange={(event) => setHero((h) => ({ ...h, cta_url: event.target.value }))}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button className="rounded-xl" disabled={heroBusy} onClick={() => void saveHero()}>
            {heroBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Hero
          </Button>
          {hero.image_url && hero.title.trim() ? null : (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ImageIcon className="size-3.5" />
              {hero.image_url ? "Add a title to complete the hero" : "No image set — clean built-in fallback shows"}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-soft">
        <h2 className="text-sm font-bold">Category images</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Per-category card artwork shown on the Home “Explore by Category” carousel. Cards keep a fixed size and crop any upload with object-cover; without an upload each category uses its bundled artwork.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(categories ?? []).map((category) => (
            <ImageUploadField
              key={category.id}
              label={category.name}
              url={categoryImages[category.slug] ?? null}
              folder={`category-images/${category.slug}`}
              previewClassName="h-24 w-20"
              onUploaded={(url) =>
                setCategoryImages((current) => ({ ...current, [category.slug]: url }))
              }
              onRemove={() =>
                setCategoryImages((current) => {
                  const next = { ...current };
                  delete next[category.slug];
                  return next;
                })
              }
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            className="rounded-xl"
            disabled={categoryImagesBusy || !(categories ?? []).length}
            onClick={() => void saveCategoryImages()}
          >
            {categoryImagesBusy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save category images
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Uploads save to storage immediately; press “Save category images” to apply them on Home.
          </span>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-soft">
        <h2 className="text-sm font-bold">Social links</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Stored as JSON on the existing site_settings record. Rendered site-wide as plain links.
        </p>
        <div className="mt-3 grid gap-2">
          {socialLinks.map((link, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[200px_1fr_auto]">
              <Input
                placeholder="Label (e.g. Facebook)"
                value={link.label}
                onChange={(event) =>
                  setSocialLinks((current) =>
                    current.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)),
                  )
                }
              />
              <Input
                placeholder="https://…"
                value={link.url}
                onChange={(event) =>
                  setSocialLinks((current) =>
                    current.map((item, i) => (i === index ? { ...item, url: event.target.value } : item)),
                  )
                }
              />
              <Button
                size="icon"
                variant="ghost"
                className="rounded-lg text-destructive"
                aria-label="Remove link"
                onClick={() => setSocialLinks((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setSocialLinks((current) => [...current, { label: "", url: "" }])}
          >
            <Plus className="mr-1.5 size-4" /> Add link
          </Button>
          <Button className="rounded-xl" disabled={savingSocial} onClick={() => void saveSocialLinks()}>
            {savingSocial ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save social links
          </Button>
        </div>
      </section>
    </div>
  );
}
