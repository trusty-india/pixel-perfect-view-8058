import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Loader2, Camera } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, Section } from "@/components/section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/upload";
import { formatINR, statusTone } from "@/lib/format";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile — 29Bricks" },
      {
        name: "description",
        content: "Manage your 29Bricks profile, properties, requirements and services.",
      },
      { property: "og:title", content: "My profile — 29Bricks" },
      {
        property: "og:description",
        content: "Edit your details and manage everything you posted on 29Bricks.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, loading, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setAvatar(profile.avatar_url ?? null);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("city")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setCity((data?.city as string) ?? ""));
  }, [user]);

  const mine = useQuery({
    queryKey: ["my-posts", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [listings, requirements, services] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title, status, price, purpose, city, location")
          .eq("owner_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("requirements")
          .select("id, title, status, city, purpose")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("services")
          .select("id, name, status, service_type, city")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
      ]);
      return {
        listings: listings.data ?? [],
        requirements: requirements.data ?? [],
        services: services.data ?? [],
      };
    },
  });

  async function onAvatar(file: File) {
    try {
      const url = await uploadImage(file, "avatars");
      setAvatar(url);
      toast.success("Photo uploaded. Tap save to apply.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function save() {
    if (!user) return;
    if (fullName.trim().length < 2) {
      toast.error("Please enter your name.");
      return;
    }
    if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Enter a valid 10 digit mobile number.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim().slice(0, 100),
        phone: phone.trim().slice(0, 15) || null,
        city: city.trim().slice(0, 60) || null,
        avatar_url: avatar,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    void qc.invalidateQueries();
    toast.success("Profile updated");
  }

  if (!user && !loading) {
    return (
      <AppShell>
        <div className="mt-10 rounded-3xl border bg-card p-8 text-center shadow-soft">
          <h1 className="font-display text-xl font-bold">Your 29Bricks account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to edit your profile and manage your posts.
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

  return (
    <AppShell>
      <h1 className="text-lg font-bold">My profile</h1>

      <div className="mt-4 rounded-3xl border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="grid size-16 place-items-center overflow-hidden rounded-2xl gradient-sky text-xl font-bold text-sky-foreground">
              {avatar ? (
                <img src={avatar} alt="Profile photo" className="size-full object-cover" />
              ) : (
                (fullName || user?.email || "U").slice(0, 1).toUpperCase()
              )}
            </span>
            <label className="absolute -bottom-1 -right-1 grid size-7 cursor-pointer place-items-center rounded-full gradient-red text-brand-foreground shadow-soft">
              <Camera className="size-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onAvatar(f);
                }}
              />
            </label>
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{fullName || "Add your name"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={fullName}
              maxLength={100}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              value={phone}
              maxLength={15}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9793045547"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              maxLength={60}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Lucknow"
            />
          </div>
          <Button onClick={() => void save()} disabled={saving} className="rounded-xl">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </div>

      <Section title="My posts">
        <Tabs defaultValue="listings">
          <TabsList className="w-full">
            <TabsTrigger value="listings" className="flex-1">
              Properties
            </TabsTrigger>
            <TabsTrigger value="requirements" className="flex-1">
              Requirements
            </TabsTrigger>
            <TabsTrigger value="services" className="flex-1">
              Services
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-3 grid gap-2">
            {mine.data?.listings.length ? (
              mine.data.listings.map((l) => (
                <Link
                  key={l.id}
                  to="/listing/$id"
                  params={{ id: l.id }}
                  className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft tap-scale"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{l.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.location}, {l.city} · {formatINR(l.price ? Number(l.price) : null)}
                    </p>
                  </div>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusTone(l.status)}`}
                  >
                    {l.status}
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState text="You haven't posted any property yet." />
            )}
          </TabsContent>

          <TabsContent value="requirements" className="mt-3 grid gap-2">
            {mine.data?.requirements.length ? (
              mine.data.requirements.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {r.purpose} · {r.city}
                    </p>
                  </div>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusTone(r.status)}`}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState text="No requirements posted yet." />
            )}
          </TabsContent>

          <TabsContent value="services" className="mt-3 grid gap-2">
            {mine.data?.services.length ? (
              mine.data.services.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.service_type} · {s.city}
                    </p>
                  </div>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusTone(s.status)}`}
                  >
                    {s.status}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState text="No services listed yet." />
            )}
          </TabsContent>
        </Tabs>
      </Section>

      <Button
        variant="outline"
        className="mt-6 w-full rounded-xl"
        onClick={async () => {
          await qc.cancelQueries();
          qc.clear();
          await signOut();
          navigate({ to: "/", replace: true });
        }}
      >
        <LogOut className="mr-2 size-4" /> Sign out
      </Button>
    </AppShell>
  );
}
