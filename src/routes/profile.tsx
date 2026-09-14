import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Camera,
  Eye,
  Handshake,
  Loader2,
  LogOut,
  MessageCircle,
  Pencil,
  PhoneCall,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, Section } from "@/components/section";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { MyChatThread } from "@/components/my-chat-thread";
import { EditListingDialog, EditRequirementDialog, EditServiceDialog } from "@/components/my-edit-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/upload";
import { formatINR, statusTone, timeAgo } from "@/lib/format";
import {
  myContactsQuery,
  myConversationsQuery,
  myListingsQuery,
  myOffersQuery,
  myRequirementsQuery,
  myServicesQuery,
  myVisitsQuery,
  statusHint,
  statusLabel,
  type MyListing,
  type MyRequirement,
  type MyService,
} from "@/lib/my-activity";

type Q<T> = { data: T | undefined; isLoading: boolean; error: unknown };

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile — 29Bricks" },
      {
        name: "description",
        content: "Manage your 29Bricks profile, properties, requirements, services, offers, visits and chats.",
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

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusTone(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function ProfilePage() {
  const { user, profile, loading, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState("properties");
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

  // Own profile row: city + verification (owner-readable under RLS).
  const accountInfo = useQuery({
    queryKey: ["my-account-info", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("city, is_verified, created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { city: string | null; is_verified: boolean; created_at: string } | null;
    },
  });

  useEffect(() => {
    setCity(accountInfo.data?.city ?? "");
  }, [accountInfo.data]);

  const listings = useQuery(myListingsQuery(user?.id ?? ""));
  const requirements = useQuery(myRequirementsQuery(user?.id ?? ""));
  const services = useQuery(myServicesQuery(user?.id ?? ""));
  const offers = useQuery(myOffersQuery(user?.id ?? ""));
  const visits = useQuery(myVisitsQuery(user?.id ?? ""));
  const contacts = useQuery(myContactsQuery(user?.id ?? ""));
  const conversations = useQuery(myConversationsQuery(user?.id ?? ""));

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

  const uid = user?.id ?? "";

  return (
    <AppShell>
      <h1 className="text-lg font-bold">My profile</h1>

      {/* Profile card + edit */}
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
            <p className="flex items-center gap-1.5 truncate font-semibold">
              {fullName || "Add your name"}
              {accountInfo.data?.is_verified ? (
                <ShieldCheck className="size-4 shrink-0 text-success" aria-label="Verified" />
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            {accountInfo.data?.created_at ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Member since {new Date(accountInfo.data.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </p>
            ) : null}
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

      {/* Summary counts (real data, from the same queries shown below) */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { id: "properties", label: "Properties", count: listings.data?.length ?? 0 },
          { id: "requirements", label: "Needs", count: requirements.data?.length ?? 0 },
          { id: "services", label: "Services", count: services.data?.length ?? 0 },
          { id: "offers", label: "Offers", count: offers.data?.length ?? 0 },
          { id: "visits", label: "Visits", count: visits.data?.length ?? 0 },
          { id: "contacts", label: "Contacts", count: contacts.data?.length ?? 0 },
          { id: "chats", label: "Chats", count: conversations.data?.items.length ?? 0 },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className="rounded-2xl border bg-card p-2.5 text-center shadow-soft tap-scale"
          >
            <p className="font-display text-lg font-bold">{item.count}</p>
            <p className="truncate text-[10px] text-muted-foreground">{item.label}</p>
          </button>
        ))}
      </div>

      <Section title="My activity">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="no-scrollbar w-full justify-start overflow-x-auto">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="chats">Chats</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="mt-3 grid gap-2">
            <MyPropertiesTab query={listings} />
          </TabsContent>

          <TabsContent value="requirements" className="mt-3 grid gap-2">
            <MyRequirementsTab query={requirements} />
          </TabsContent>

          <TabsContent value="services" className="mt-3 grid gap-2">
            <MyServicesTab query={services} />
          </TabsContent>

          <TabsContent value="offers" className="mt-3 grid gap-2">
            <MyOffersTab query={offers} />
          </TabsContent>

          <TabsContent value="visits" className="mt-3 grid gap-2">
            <MyVisitsTab query={visits} />
          </TabsContent>

          <TabsContent value="contacts" className="mt-3 grid gap-2">
            <MyContactsTab query={contacts} />
          </TabsContent>

          <TabsContent value="leads" className="mt-3 grid gap-2">
            <EmptyState text="Your enquiries are personally handled by the 29Bricks team. Live progress appears in your chats — our team updates the status of every conversation as it moves forward." />
          </TabsContent>

          <TabsContent value="chats" className="mt-3 grid gap-2">
            <MyChatsTab conversations={conversations} />
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

/* ---------------- Properties ---------------- */

function MyPropertiesTab({ query }: { query: Q<MyListing[]> }) {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<MyListing | null>(null);
  const [deleteItem, setDeleteItem] = useState<MyListing | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("listings").delete().eq("id", deleteItem.id);
      if (error) throw error;
      toast.success("Property deleted");
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
      setDeleteItem(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (query.isLoading) return <LoadingRows />;
  if (query.error) return <ErrorRows error={query.error} label="properties" />;

  if (!query.data?.length) {
    return (
      <EmptyState
        text={
          <span>
            No properties yet.{" "}
            <Link to="/post/property" className="font-semibold text-primary">
              Post your first property
            </Link>
          </span>
        }
      />
    );
  }

  return (
    <>
      {query.data.map((l) => (
        <div key={l.id} className="rounded-2xl border bg-card p-3 shadow-soft">
          <div className="flex items-start gap-3">
            {l.images?.[0] ? (
              <img src={l.images[0]} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-xs text-muted-foreground">—</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{l.title}</p>
                <StatusPill status={l.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {l.property_type} · for {l.purpose} · {formatINR(l.price ? Number(l.price) : null)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {l.location}, {l.city} · posted {timeAgo(l.created_at)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {l.is_featured ? <Badge className="bg-warning/20 text-warning-foreground">Featured</Badge> : null}
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Eye className="size-3" /> {l.views ?? 0} views
                </span>
              </div>
              {l.rejection_reason ? (
                <p className="mt-1 rounded-lg bg-destructive/8 p-2 text-[11px] text-destructive">
                  Team note: {l.rejection_reason}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">{statusHint(l.status)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-lg" asChild>
              <Link to="/listing/$id" params={{ id: l.id }}>View</Link>
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditItem(l)}>
              <Pencil className="mr-1 size-3.5" /> {l.status === "approved" ? "View details" : "Edit"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg text-destructive"
              onClick={() => setDeleteItem(l)}
            >
              <Trash2 className="mr-1 size-3.5" /> Delete
            </Button>
          </div>
        </div>
      ))}

      <EditListingDialog item={editItem} onClose={() => setEditItem(null)} />
      <ConfirmDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this property?"
        description={deleteItem?.title}
        confirmLabel="Delete permanently"
        destructive
        busy={deleting}
        onConfirm={() => void doDelete()}
      />
    </>
  );
}

/* ---------------- Requirements ---------------- */

function MyRequirementsTab({ query }: { query: Q<MyRequirement[]> }) {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<MyRequirement | null>(null);
  const [deleteItem, setDeleteItem] = useState<MyRequirement | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("requirements").delete().eq("id", deleteItem.id);
      if (error) throw error;
      toast.success("Requirement deleted");
      void qc.invalidateQueries({ queryKey: ["my-requirements"] });
      setDeleteItem(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (query.isLoading) return <LoadingRows />;
  if (query.error) return <ErrorRows error={query.error} label="requirements" />;

  if (!query.data?.length) {
    return (
      <EmptyState
        text={
          <span>
            No requirements yet.{" "}
            <Link to="/post/requirement" className="font-semibold text-primary">
              Tell us what property you need
            </Link>
          </span>
        }
      />
    );
  }

  return (
    <>
      {query.data.map((r) => (
        <div key={r.id} className="rounded-2xl border bg-card p-3 shadow-soft">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{r.title}</p>
            <StatusPill status={r.status} />
          </div>
          <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
            {r.purpose} · {r.property_type ?? "Any type"} · {r.bhk ?? "Any BHK"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {r.location ? `${r.location}, ` : ""}
            {r.city} · budget {formatINR(r.budget_min ?? null)}–{formatINR(r.budget_max ?? null)}
          </p>
          {r.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-muted-foreground">
            posted {timeAgo(r.created_at)} · {statusHint(r.status)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditItem(r)}>
              <Pencil className="mr-1 size-3.5" /> Edit
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => setDeleteItem(r)}>
              <Trash2 className="mr-1 size-3.5" /> Delete
            </Button>
          </div>
        </div>
      ))}

      <EditRequirementDialog item={editItem} onClose={() => setEditItem(null)} />
      <ConfirmDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this requirement?"
        description={deleteItem?.title}
        confirmLabel="Delete permanently"
        destructive
        busy={deleting}
        onConfirm={() => void doDelete()}
      />
    </>
  );
}

/* ---------------- Services ---------------- */

function MyServicesTab({ query }: { query: Q<MyService[]> }) {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<MyService | null>(null);
  const [deleteItem, setDeleteItem] = useState<MyService | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("services").delete().eq("id", deleteItem.id);
      if (error) throw error;
      toast.success("Service deleted");
      void qc.invalidateQueries({ queryKey: ["my-services"] });
      setDeleteItem(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (query.isLoading) return <LoadingRows />;
  if (query.error) return <ErrorRows error={query.error} label="services" />;

  if (!query.data?.length) {
    return (
      <EmptyState
        text={
          <span>
            No services yet.{" "}
            <Link to="/post/service" className="font-semibold text-primary">
              Add your service
            </Link>
          </span>
        }
      />
    );
  }

  return (
    <>
      {query.data.map((s) => (
        <div key={s.id} className="rounded-2xl border bg-card p-3 shadow-soft">
          <div className="flex items-start gap-3">
            {s.image_url ? (
              <img src={s.image_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
                {s.service_type.slice(0, 2)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{s.name}</p>
                <StatusPill status={s.status} />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {s.service_type} · {s.city}
                {s.areas ? ` · ${s.areas}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {s.is_featured ? <Badge className="bg-warning/20 text-warning-foreground">Featured</Badge> : null}
                {s.price_from != null ? (
                  <span className="text-[11px] text-muted-foreground">from {formatINR(s.price_from)}</span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                posted {timeAgo(s.created_at)} · {statusHint(s.status)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditItem(s)}>
              <Pencil className="mr-1 size-3.5" /> Edit
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => setDeleteItem(s)}>
              <Trash2 className="mr-1 size-3.5" /> Delete
            </Button>
          </div>
        </div>
      ))}

      <EditServiceDialog item={editItem} onClose={() => setEditItem(null)} />
      <ConfirmDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Delete this service?"
        description={deleteItem?.name}
        confirmLabel="Delete permanently"
        destructive
        busy={deleting}
        onConfirm={() => void doDelete()}
      />
    </>
  );
}

/* ---------------- Shared title lookup for offers/visits/contacts ---------------- */

function useListingTitles(ids: string[]) {
  const key = Array.from(new Set(ids)).sort().join(",");
  return useQuery({
    queryKey: ["my-listing-titles", key],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, city, location, price, images")
        .in("id", Array.from(new Set(ids)));
      if (error) throw error;
      return new Map((data ?? []).map((row) => [row.id, row]));
    },
  });
}

/* ---------------- Offers (read-only under RLS) ---------------- */

function offerStatusLabel(status: string): string {
  switch (status) {
    case "new":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

type OfferRow = { id: string; listing_id: string; amount: number; counter_amount: number | null; status: string; created_at: string };

function MyOffersTab({ query }: { query: Q<OfferRow[]> }) {
  const rows = query.data ?? [];
  const titles = useListingTitles(rows.map((r) => r.listing_id));

  if (query.isLoading) return <LoadingRows />;
  if (query.error) return <ErrorRows error={query.error} label="offers" />;

  if (!rows.length) {
    return (
      <EmptyState
        text={
          <span>
            No offers yet.{" "}
            <Link to="/search" className="font-semibold text-primary">
              Make an offer on a property
            </Link>
          </span>
        }
      />
    );
  }

  return (
    <>
      {rows.map((o) => {
        const listing = titles.data?.get(o.listing_id);
        return (
          <div key={o.id} className="rounded-2xl border bg-card p-3 shadow-soft">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                {listing?.title ?? "Property"}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(o.status === "accepted" ? "approved" : o.status === "rejected" ? "rejected" : "pending")}`}
              >
                {offerStatusLabel(o.status)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Handshake className="mr-1 inline size-3.5" />
              You offered {formatINR(o.amount)}
              {o.counter_amount ? ` · counter from team: ${formatINR(o.counter_amount)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {listing ? `${listing.location}, ${listing.city} · ` : ""}
              {timeAgo(o.created_at)}
            </p>
            <div className="mt-2">
              <Button size="sm" variant="outline" className="rounded-lg" asChild>
                <Link to="/listing/$id" params={{ id: o.listing_id }}>View property</Link>
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------------- Visits (read-only under RLS) ---------------- */

function visitStatusLabel(status: string): string {
  switch (status) {
    case "new":
      return "Pending";
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

type VisitRow = { id: string; listing_id: string; preferred_date: string | null; preferred_time: string | null; status: string; created_at: string };

function MyVisitsTab({ query }: { query: Q<VisitRow[]> }) {
  const rows = query.data ?? [];
  const titles = useListingTitles(rows.map((r) => r.listing_id));

  if (query.isLoading) return <LoadingRows />;
  if (query.error) return <ErrorRows error={query.error} label="visits" />;

  if (!rows.length) {
    return (
      <EmptyState
        text={
          <span>
            No visits yet.{" "}
            <Link to="/search" className="font-semibold text-primary">
              Book a property visit
            </Link>
          </span>
        }
      />
    );
  }

  return (
    <>
      {rows.map((v) => {
        const listing = titles.data?.get(v.listing_id);
        return (
          <div key={v.id} className="rounded-2xl border bg-card p-3 shadow-soft">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                {listing?.title ?? "Property"}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(v.status === "completed" ? "approved" : v.status === "cancelled" ? "rejected" : "pending")}`}
              >
                {visitStatusLabel(v.status)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <CalendarDays className="mr-1 inline size-3.5" />
              {v.preferred_date
                ? new Date(v.preferred_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "Date flexible"}
              {v.preferred_time ? ` · ${v.preferred_time}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {listing ? `${listing.location}, ${listing.city} · ` : ""}
              requested {timeAgo(v.created_at)}
            </p>
            {v.status === "scheduled" ? (
              <p className="mt-1 text-[11px] text-success">Confirmed by the team — be at the property on time.</p>
            ) : null}
            <div className="mt-2">
              <Button size="sm" variant="outline" className="rounded-lg" asChild>
                <Link to="/listing/$id" params={{ id: v.listing_id }}>View property</Link>
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------------- Contact requests (read-only under RLS) ---------------- */

type ContactRow = { id: string; listing_id: string | null; status: string; created_at: string };

function MyContactsTab({ query }: { query: Q<ContactRow[]> }) {
  const rows = query.data ?? [];
  const titles = useListingTitles(rows.map((r) => r.listing_id).filter((id): id is string => Boolean(id)));

  if (query.isLoading) return <LoadingRows />;
  if (query.error) return <ErrorRows error={query.error} label="contact requests" />;

  if (!rows.length) {
    return (
      <EmptyState
        text={
          <span>
            No contact requests yet.{" "}
            <Link to="/search" className="font-semibold text-primary">
              Browse properties and request a callback
            </Link>
          </span>
        }
      />
    );
  }

  return (
    <>
      {rows.map((c) => {
        const listing = c.listing_id ? titles.data?.get(c.listing_id) : null;
        return (
          <div key={c.id} className="rounded-2xl border bg-card p-3 shadow-soft">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                {listing?.title ?? "General enquiry"}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(c.status === "contacted" ? "approved" : "pending")}`}
              >
                {c.status === "contacted" ? "Team contacted you" : "Waiting for callback"}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <PhoneCall className="size-3.5" />
              {listing ? `${listing.location}, ${listing.city} · ` : ""}
              {timeAgo(c.created_at)}
            </p>
            {c.listing_id ? (
              <div className="mt-2">
                <Button size="sm" variant="outline" className="rounded-lg" asChild>
                  <Link to="/listing/$id" params={{ id: c.listing_id }}>View property</Link>
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/* ---------------- Chats ---------------- */

function MyChatsTab({ conversations }: { conversations: Q<{ items: { id: string; listing_id: string | null; subject: string | null; lead_status: string; is_closed: boolean; last_message_at: string; listing: { id: string; title: string; city: string; location: string; price: number | null; images: string[] | null } | null }[] }> }) {
  const items = conversations.data?.items ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = items.find((c) => c.id === openId) ?? null;

  // Unread counts: one query for all my conversations' unread admin messages (read_at is the existing field).
  const unread = useQuery({
    queryKey: ["my-unread", items.map((c) => c.id).join(",")],
    enabled: items.length > 0,
    queryFn: async () => {
      const ids = items.map((c) => c.id);
      const { data, error } = await supabase
        .from("messages")
        .select("conversation_id, read_at, is_admin")
        .in("conversation_id", ids);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const m of data ?? []) {
        if (m.is_admin && !m.read_at) {
          counts.set(m.conversation_id, (counts.get(m.conversation_id) ?? 0) + 1);
        }
      }
      return counts;
    },
  });

  if (conversations.isLoading) return <LoadingRows />;
  if (conversations.error) return <ErrorRows error={conversations.error} label="chats" />;

  if (!items.length) {
    return (
      <EmptyState
        text={
          <span>
            No chats yet.{" "}
            <Link to="/search" className="font-semibold text-primary">
              Start a conversation from a property
            </Link>
          </span>
        }
      />
    );
  }

  return (
    <>
      {items.map((c) => {
        const count = unread.data?.get(c.id) ?? 0;
        const isOpen = selected?.id === c.id;
        return (
          <div key={c.id} className="rounded-2xl border bg-card shadow-soft">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : c.id)}
              className="flex w-full items-start gap-3 p-3 text-left tap-scale"
            >
              {c.listing?.images?.[0] ? (
                <img src={c.listing.images[0]} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <MessageCircle className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.listing?.title ?? c.subject ?? "Conversation"}</p>
                {c.listing ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {c.listing.location}, {c.listing.city} · {formatINR(c.listing.price ? Number(c.listing.price) : null)}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {c.subject ?? "Enquiry"} · last activity {timeAgo(c.last_message_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {c.is_closed ? (
                  <Badge variant="outline">Closed</Badge>
                ) : (
                  <Badge variant="secondary" className="capitalize">
                    {c.lead_status.replace(/_/g, " ")}
                  </Badge>
                )}
                {count > 0 ? (
                  <span className="rounded-full gradient-red px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                    {count}
                  </span>
                ) : null}
              </div>
            </button>
            {isOpen ? (
              <div className="border-t p-3">
                <MyChatThread conversation={{ id: c.id, subject: c.subject, is_closed: c.is_closed }} />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/* ---------------- Shared states ---------------- */

function LoadingRows() {
  return (
    <div className="grid min-h-32 place-items-center rounded-2xl border bg-card">
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  );
}

function ErrorRows({ error, label }: { error: unknown; label: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {error instanceof Error ? error.message : `Could not load your ${label}`}
    </div>
  );
}
