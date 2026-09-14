import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery, type SiteSettings } from "@/lib/data";
import { useSiteSettingsMutation } from "@/lib/admin-mutations";
import { uploadImage } from "@/lib/upload";

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
  return Object.entries(raw).map(([label, url]) => ({ label, url: String(url) }));
}

function AdminSettings() {
  const { data: settings, isLoading, error } = useQuery(settingsQuery);
  const mutation = useSiteSettingsMutation();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    if (!settings || form) return;
    setForm(toForm(settings));
    setSocialLinks(parseSocialLinks(settings.social_links));
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

  async function uploadSetting(file: File, key: "logo_url" | "admin_avatar_url") {
    try {
      const url = await uploadImage(file, key === "logo_url" ? "business" : "admin");
      update(key, url);
    } catch (uploadError) {
      console.error(uploadError);
    }
  }

  async function saveSocialLinks() {
    setSavingSocial(true);
    try {
      const links: Record<string, string> = {};
      for (const link of socialLinks) {
        if (link.label.trim() && link.url.trim()) {
          links[link.label.trim()] = link.url.trim();
        }
      }
      const { error: saveError } = await supabase
        .from("site_settings")
        .update({ social_links: links })
        .eq("id", true);
      if (saveError) throw saveError;
    } catch (saveError) {
      // fall through to finally; mutation-free save so surface via alert below
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
