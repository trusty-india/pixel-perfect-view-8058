import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Flag,
  LayoutDashboard,
  Loader2,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Settings,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/data";
import { formatINR, statusTone } from "@/lib/format";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — 29Bricks" },
      {
        name: "description",
        content: "Manage 29Bricks listings, leads, cities, announcements and business settings.",
      },
    ],
  }),
  component: AdminPage,
});

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "moderation", label: "Moderation", icon: ShieldAlert },
  { id: "leads", label: "Leads & requests", icon: CircleDollarSign },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "content", label: "Homepage", icon: Megaphone },
  { id: "settings", label: "Business profile", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];
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

function AdminPage() {
  const { user, isAdmin, loading, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("overview");
  const adminExists = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw error;
      return Boolean(data);
    },
    enabled: Boolean(user),
  });

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <AccessCard
          title="Sign in to open Admin"
          description="Only an authenticated 29Bricks administrator can manage the marketplace."
        />
      </AppShell>
    );
  }

  if (!isAdmin) {
    if (!adminExists.isLoading && !adminExists.data) {
      return (
        <AppShell>
          <AccessCard
            title="Set up the first administrator"
            description="No administrator exists yet. This one-time action gives your signed-in account control of the marketplace."
            actionLabel="Make this account admin"
            onAction={async () => {
              const { data, error } = await supabase.rpc("claim_admin");
              if (error) {
                toast.error(error.message);
                return;
              }
              if (!data) {
                toast.error("Another administrator already claimed setup.");
                void adminExists.refetch();
                return;
              }
              await refresh();
              void queryClient.invalidateQueries({ queryKey: ["admin-exists"] });
              toast.success("Admin access enabled");
            }}
          />
        </AppShell>
      );
    }
    return (
      <AppShell>
        <AccessCard
          title="Admin access required"
          description="Your account does not have the admin role. Ask the existing administrator to grant access."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Sarkar Properties</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Admin control centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review submissions, manage leads and keep public business details current.
          </p>
        </div>
        <Link to="/" className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold tap-scale">
          View marketplace
        </Link>
      </div>

      <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold tap-scale",
              tab === id ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <Overview onNavigate={setTab} /> : null}
      {tab === "moderation" ? <Moderation /> : null}
      {tab === "leads" ? <Leads /> : null}
      {tab === "chat" ? <AdminChat /> : null}
      {tab === "content" ? <HomepageControls /> : null}
      {tab === "settings" ? <BusinessSettings /> : null}
    </AppShell>
  );
}

function useAdminData() {
  return useQuery({
    queryKey: ["admin-data"],
    queryFn: async () => {
      const [
        listings,
        requirements,
        services,
        users,
        brokers,
        offers,
        visits,
        contacts,
        reports,
        conversations,
      ] = await Promise.all([
        supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("requirements").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("services").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("brokers").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("offers").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("visit_requests").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("contact_requests").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("conversations").select("*").order("last_message_at", { ascending: false }).limit(100),
      ]);
      const firstError = [
        listings,
        requirements,
        services,
        users,
        brokers,
        offers,
        visits,
        contacts,
        reports,
        conversations,
      ].find((result) => result.error)?.error;
      if (firstError) throw firstError;
      return {
        listings: listings.data ?? [],
        requirements: requirements.data ?? [],
        services: services.data ?? [],
        users: users.data ?? [],
        brokers: brokers.data ?? [],
        offers: offers.data ?? [],
        visits: visits.data ?? [],
        contacts: contacts.data ?? [],
        reports: reports.data ?? [],
        conversations: conversations.data ?? [],
      };
    },
  });
}

function useAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      table,
      id,
      values,
    }: {
      table: "listings" | "requirements" | "services" | "brokers" | "offers" | "visit_requests" | "contact_requests" | "reports";
      id: string;
      values: Record<string, unknown>;
    }) => {
      const result =
        table === "listings"
          ? await supabase.from("listings").update(values as never).eq("id", id)
          : table === "requirements"
            ? await supabase.from("requirements").update(values as never).eq("id", id)
            : table === "services"
              ? await supabase.from("services").update(values as never).eq("id", id)
              : table === "brokers"
                ? await supabase.from("brokers").update(values as never).eq("id", id)
                : table === "offers"
                  ? await supabase.from("offers").update(values as never).eq("id", id)
                  : table === "visit_requests"
                    ? await supabase.from("visit_requests").update(values as never).eq("id", id)
                    : table === "contact_requests"
                      ? await supabase.from("contact_requests").update(values as never).eq("id", id)
                      : await supabase.from("reports").update(values as never).eq("id", id);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      void queryClient.invalidateQueries({ queryKey: ["listings"] });
      void queryClient.invalidateQueries({ queryKey: ["requirements"] });
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

function Overview({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { data, isLoading, error } = useAdminData();
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : "Could not load admin data"} />;

  const cards = [
    ["Pending listings", data.listings.filter((x) => x.status === "pending").length, "moderation"],
    ["Pending requirements", data.requirements.filter((x) => x.status === "pending").length, "moderation"],
    ["Pending services", data.services.filter((x) => x.status === "pending").length, "moderation"],
    ["New leads", data.offers.filter((x) => x.status === "new").length + data.visits.filter((x) => x.status === "new").length, "leads"],
    ["Users", data.users.length, "leads"],
    ["Open chats", data.conversations.filter((x) => !x.is_closed).length, "chat"],
  ] as const;

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([label, value, destination]) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(destination)}
            className="rounded-2xl border bg-card p-4 text-left shadow-soft tap-scale"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            <span className="mt-2 inline-flex items-center text-[11px] font-semibold text-primary">
              Open <ChevronRight className="ml-1 size-3" />
            </span>
          </button>
        ))}
      </div>
      <AdminCard title="What needs attention">
        <div className="grid gap-2 sm:grid-cols-2">
          <AttentionRow
            icon={<ShieldAlert className="size-4" />}
            label="Review new marketplace submissions"
            value={data.listings.filter((x) => x.status === "pending").length + data.requirements.filter((x) => x.status === "pending").length}
            onClick={() => onNavigate("moderation")}
          />
          <AttentionRow
            icon={<CircleDollarSign className="size-4" />}
            label="Process offers and visit requests"
            value={data.offers.filter((x) => x.status === "new").length + data.visits.filter((x) => x.status === "new").length}
            onClick={() => onNavigate("leads")}
          />
          <AttentionRow
            icon={<MessageCircle className="size-4" />}
            label="Reply to open property conversations"
            value={data.conversations.filter((x) => !x.is_closed).length}
            onClick={() => onNavigate("chat")}
          />
          <AttentionRow
            icon={<Settings className="size-4" />}
            label="Update public business information"
            value={1}
            onClick={() => onNavigate("settings")}
          />
        </div>
      </AdminCard>
    </div>
  );
}

function Moderation() {
  const { data, isLoading, error } = useAdminData();
  const mutation = useAdminMutation();
  const [section, setSection] = useState<"listings" | "requirements" | "services" | "brokers" | "users">("listings");
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : "Could not load moderation data"} />;

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["listings", "requirements", "services", "brokers", "users"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSection(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize",
              section === item ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {section === "listings" ? (
        <ModerationList
          title="Property listings"
          empty="No property submissions."
          rows={data.listings}
          getTitle={(row) => row.title}
          getMeta={(row) => `${row.city} · ${row.location} · ${formatINR(row.price)}`}
          getStatus={(row) => row.status}
          onStatus={(id, status) => mutation.mutate({ table: "listings", id, values: { status, rejection_reason: status === "rejected" ? "Rejected by admin" : null } })}
          onFeature={(id, isFeatured) => mutation.mutate({ table: "listings", id, values: { is_featured: isFeatured } })}
          featuredKey="is_featured"
        />
      ) : null}
      {section === "requirements" ? (
        <ModerationList
          title="People looking for property"
          empty="No requirement submissions."
          rows={data.requirements}
          getTitle={(row) => row.title}
          getMeta={(row) => `${row.city} · ${row.location ?? "Any area"} · ${row.purpose}`}
          getStatus={(row) => row.status}
          onStatus={(id, status) => mutation.mutate({ table: "requirements", id, values: { status } })}
        />
      ) : null}
      {section === "services" ? (
        <ModerationList
          title="Local services"
          empty="No service submissions."
          rows={data.services}
          getTitle={(row) => row.name}
          getMeta={(row) => `${row.service_type} · ${row.city} · ${row.phone ?? "No phone"}`}
          getStatus={(row) => row.status}
          onStatus={(id, status) => mutation.mutate({ table: "services", id, values: { status } })}
          onFeature={(id, isFeatured) => mutation.mutate({ table: "services", id, values: { is_featured: isFeatured } })}
          featuredKey="is_featured"
        />
      ) : null}
      {section === "brokers" ? (
        <ModerationList
          title="Broker registrations"
          empty="No broker registrations."
          rows={data.brokers}
          getTitle={(row) => row.name}
          getMeta={(row) => `${row.service_areas ?? "No service areas"} · ${row.experience_years ?? 0} years`}
          getStatus={(row) => row.status}
          onStatus={(id, status) => mutation.mutate({ table: "brokers", id, values: { status } })}
        />
      ) : null}
      {section === "users" ? <UsersList users={data.users} /> : null}
    </div>
  );
}

function ModerationList<T extends { id: string }>({
  title,
  empty,
  rows,
  getTitle,
  getMeta,
  getStatus,
  onStatus,
  onFeature,
  featuredKey,
}: {
  title: string;
  empty: string;
  rows: T[];
  getTitle: (row: T) => string;
  getMeta: (row: T) => string;
  getStatus: (row: T) => string;
  onStatus: (id: string, status: string) => void;
  onFeature?: (id: string, featured: boolean) => void;
  featuredKey?: keyof T;
}) {
  return (
    <AdminCard title={`${title} (${rows.length})`}>
      {rows.length ? (
        <div className="grid gap-3">
          {rows.map((row) => {
            const status = getStatus(row);
            const featured = featuredKey ? Boolean(row[featuredKey]) : false;
            return (
              <div key={row.id} className="rounded-2xl border bg-background p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{getTitle(row)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{getMeta(row)}</p>
                  </div>
                  <Badge className={cn("capitalize", statusTone(status))}>{status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {status !== "approved" ? (
                    <Button size="sm" className="rounded-lg" onClick={() => onStatus(row.id, "approved")}>
                      <Check className="mr-1 size-3.5" /> Approve
                    </Button>
                  ) : null}
                  {status !== "rejected" ? (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => onStatus(row.id, "rejected")}>
                      <X className="mr-1 size-3.5" /> Reject
                    </Button>
                  ) : null}
                  {status === "approved" ? (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => onStatus(row.id, "hidden")}>
                      <Eye className="mr-1 size-3.5" /> Hide
                    </Button>
                  ) : null}
                  {onFeature ? (
                    <Button size="sm" variant={featured ? "default" : "outline"} className="rounded-lg" onClick={() => onFeature(row.id, !featured)}>
                      {featured ? "Featured" : "Feature"}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text={empty} />
      )}
    </AdminCard>
  );
}

function Leads() {
  const { data, isLoading, error } = useAdminData();
  const mutation = useAdminMutation();
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : "Could not load leads"} />;

  return (
    <div className="mt-5 grid gap-4">
      <AdminCard title={`Offers (${data.offers.length})`}>
        <LeadRows
          empty="No offers yet."
          rows={data.offers}
          title={(row) => `Offer ${formatINR(row.amount)}`}
          meta={(row) => `Listing ${row.listing_id} · ${new Date(row.created_at).toLocaleString()}`}
          status={(row) => row.status}
          actions={(row) => (
            <>
              <Button size="sm" className="rounded-lg" onClick={() => mutation.mutate({ table: "offers", id: row.id, values: { status: "accepted" } })}>
                Accept
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => mutation.mutate({ table: "offers", id: row.id, values: { status: "rejected" } })}>
                Reject
              </Button>
            </>
          )}
        />
      </AdminCard>
      <AdminCard title={`Visit requests (${data.visits.length})`}>
        <LeadRows
          empty="No visit requests yet."
          rows={data.visits}
          title={(row) => `Visit for ${row.listing_id}`}
          meta={(row) => `${row.preferred_date ?? "Date flexible"} · ${row.note ?? "No note"}`}
          status={(row) => row.status}
          actions={(row) => (
            <Button size="sm" className="rounded-lg" onClick={() => mutation.mutate({ table: "visit_requests", id: row.id, values: { status: "scheduled" } })}>
              Mark scheduled
            </Button>
          )}
        />
      </AdminCard>
      <AdminCard title={`Contact requests (${data.contacts.length})`}>
        <LeadRows
          empty="No contact requests yet."
          rows={data.contacts}
          title={(row) => `Listing ${row.listing_id ?? "general enquiry"}`}
          meta={(row) => `User ${row.user_id} · ${new Date(row.created_at).toLocaleString()}`}
          status={(row) => row.status}
          actions={(row) => (
            <Button size="sm" className="rounded-lg" onClick={() => mutation.mutate({ table: "contact_requests", id: row.id, values: { status: "contacted" } })}>
              Mark contacted
            </Button>
          )}
        />
      </AdminCard>
      <AdminCard title={`Reports (${data.reports.length})`}>
        <LeadRows
          empty="No reports."
          rows={data.reports}
          title={(row) => `Listing ${row.listing_id ?? "unknown"}`}
          meta={(row) => row.reason}
          status={(row) => row.status}
          actions={(row) => (
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => mutation.mutate({ table: "reports", id: row.id, values: { status: "resolved" } })}>
              Resolve
            </Button>
          )}
        />
      </AdminCard>
    </div>
  );
}

function LeadRows<T extends { id: string }>({
  rows,
  empty,
  title,
  meta,
  status,
  actions,
}: {
  rows: T[];
  empty: string;
  title: (row: T) => string;
  meta: (row: T) => string;
  status: (row: T) => string;
  actions: (row: T) => React.ReactNode;
}) {
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-2xl border bg-background p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{title(row)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{meta(row)}</p>
            </div>
            <Badge className="capitalize">{status(row)}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{actions(row)}</div>
        </div>
      ))}
    </div>
  );
}

function AdminChat() {
  const { data, isLoading, error } = useAdminData();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const selected = data?.conversations.find((conversation) => conversation.id === selectedId) ?? data?.conversations[0];
  const messages = useQuery({
    queryKey: ["admin-messages", selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const { data: rows, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selected!.id)
        .order("created_at");
      if (messageError) throw messageError;
      return rows ?? [];
    },
  });

  useEffect(() => {
    if (!selected?.id) return;
    const channel = supabase
      .channel(`admin-chat-${selected.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${selected.id}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-messages", selected.id] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selected?.id, queryClient]);

  useEffect(() => {
    setSelectedId((current) => current ?? data?.conversations[0]?.id ?? null);
    setNotes(selected?.admin_notes ?? "");
  }, [data?.conversations, selected?.admin_notes]);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : "Could not load conversations"} />;

  async function sendMessage(): Promise<void> {
    if (!selected || !user || !message.trim()) return;
    const { error: sendError } = await supabase.from("messages").insert({
      conversation_id: selected.id,
      sender_id: user.id,
      is_admin: true,
      body: message.trim().slice(0, 2000),
    });
    if (sendError) {
      toast.error(sendError.message);
      return;
    }
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selected.id);
    setMessage("");
    void queryClient.invalidateQueries({ queryKey: ["admin-messages", selected.id] });
    void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
  }

  async function saveConversation(values: Record<string, unknown>): Promise<void> {
    if (!selected) return;
    const { error: updateError } = await supabase
      .from("conversations")
      .update(values as never)
      .eq("id", selected.id);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success("Conversation updated");
    void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
      <AdminCard title={`Conversations (${data.conversations.length})`}>
        <div className="grid gap-2">
          {data.conversations.length ? data.conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedId(conversation.id)}
              className={cn("rounded-xl border p-3 text-left", selected?.id === conversation.id ? "border-primary bg-primary/5" : "bg-background")}
            >
              <p className="truncate text-xs font-semibold">{conversation.subject ?? "Property enquiry"}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {conversation.party} · {conversation.is_closed ? "closed" : conversation.lead_status}
              </p>
            </button>
          )) : <EmptyState text="No chats yet." />}
        </div>
      </AdminCard>
      <AdminCard title={selected ? selected.subject ?? "Property conversation" : "Select a conversation"}>
        {selected ? (
          <>
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl bg-muted/40 p-3">
              {messages.data?.length ? messages.data.map((item) => (
                <div key={item.id} className={cn("max-w-[88%] rounded-2xl px-3 py-2 text-sm", item.is_admin ? "ml-auto bg-primary text-primary-foreground" : "bg-card")}>
                  <p>{item.deleted ? "Message removed" : item.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              )) : <p className="py-6 text-center text-xs text-muted-foreground">No messages in this thread.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reply to this user…" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
              <Button className="rounded-xl" onClick={() => void sendMessage()}>Send</Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selected.lead_status} onChange={(event) => void saveConversation({ lead_status: event.target.value })}>
                {["new", "contacted", "interested", "visit_scheduled", "negotiation", "booked", "closed", "lost"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
              </select>
              <Button variant="outline" className="rounded-xl" onClick={() => void saveConversation({ is_closed: !selected.is_closed })}>
                {selected.is_closed ? "Reopen conversation" : "Close conversation"}
              </Button>
            </div>
            <Textarea className="mt-3" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Private admin notes (never shown to users)" />
            <Button variant="outline" className="mt-2 rounded-xl" onClick={() => void saveConversation({ admin_notes: notes.slice(0, 2000) })}>
              Save private notes
            </Button>
          </>
        ) : <EmptyState text="Select a conversation to manage it." />}
      </AdminCard>
    </div>
  );
}

function HomepageControls() {
  const { data: settings } = useQuery(settingsQuery);
  const { data, isLoading, error } = useAdminData();
  const queryClient = useQueryClient();
  const [announcement, setAnnouncement] = useState({ title: "", message: "", type: "announcement", button_text: "", button_url: "", start_at: "", end_at: "" });
  const [city, setCity] = useState({ name: "", slug: "", status: "coming_soon" });
  const cities = useQuery({
    queryKey: ["admin-cities"],
    queryFn: async () => {
      const { data: rows, error: cityError } = await supabase.from("cities").select("*").order("sort_order");
      if (cityError) throw cityError;
      return rows ?? [];
    },
  });
  const announcements = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data: rows, error: announcementError } = await supabase.from("announcements").select("*").order("sort_order");
      if (announcementError) throw announcementError;
      return rows ?? [];
    },
  });
  const [busy, setBusy] = useState(false);

  async function addAnnouncement(): Promise<void> {
    if (!announcement.title.trim()) {
      toast.error("Add an announcement title.");
      return;
    }
    setBusy(true);
    const { error: insertError } = await supabase.from("announcements").insert({
      title: announcement.title.trim(),
      message: announcement.message.trim() || null,
      type: announcement.type,
      button_text: announcement.button_text.trim() || null,
      button_url: announcement.button_url.trim() || null,
      start_at: announcement.start_at ? `${announcement.start_at}T00:00:00` : null,
      end_at: announcement.end_at ? `${announcement.end_at}T23:59:59` : null,
    });
    setBusy(false);
    if (insertError) {
      toast.error(insertError.message);
      return;
    }
    setAnnouncement({ title: "", message: "", type: "announcement", button_text: "", button_url: "", start_at: "", end_at: "" });
    toast.success("Announcement published to the homepage");
    void announcements.refetch();
    void queryClient.invalidateQueries({ queryKey: ["announcements"] });
  }

  async function updateAnnouncement(id: string, values: Record<string, unknown>): Promise<void> {
    const { error: updateError } = await supabase
      .from("announcements")
      .update(values as never)
      .eq("id", id);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    void announcements.refetch();
    void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    toast.success("Announcement updated");
  }

  async function addCity(): Promise<void> {
    if (city.name.trim().length < 2) {
      toast.error("Add a city name.");
      return;
    }
    const { error: insertError } = await supabase.from("cities").insert({ name: city.name.trim(), slug: city.slug.trim() || city.name.toLowerCase().replace(/\s+/g, "-"), status: city.status, sort_order: (cities.data?.length ?? 0) + 1 });
    if (insertError) {
      toast.error(insertError.message);
      return;
    }
    setCity({ name: "", slug: "", status: "coming_soon" });
    void cities.refetch();
    void queryClient.invalidateQueries({ queryKey: ["cities"] });
    toast.success("City added");
  }

  async function updateCity(id: string, values: Record<string, unknown>): Promise<void> {
    const { error: updateError } = await supabase
      .from("cities")
      .update(values as never)
      .eq("id", id);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    void cities.refetch();
    void queryClient.invalidateQueries({ queryKey: ["cities"] });
    toast.success("City updated");
  }

  if (isLoading || cities.isLoading || announcements.isLoading) return <LoadingState />;
  if (error || !data || cities.error || announcements.error) return <ErrorState message="Could not load homepage controls" />;

  return (
    <div className="mt-5 grid gap-4">
      <AdminCard title="Create homepage announcement">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Title, e.g. 🎉 Special Offer" value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={announcement.type} onChange={(event) => setAnnouncement({ ...announcement, type: event.target.value })}>
            {["greeting", "announcement", "offer", "festival", "notice"].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <Textarea className="mt-3" placeholder="Message shown below the title" value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input placeholder="Button text (optional)" value={announcement.button_text} onChange={(event) => setAnnouncement({ ...announcement, button_text: event.target.value })} />
          <Input placeholder="Button action URL (optional)" value={announcement.button_url} onChange={(event) => setAnnouncement({ ...announcement, button_url: event.target.value })} />
          <Input type="date" value={announcement.start_at} onChange={(event) => setAnnouncement({ ...announcement, start_at: event.target.value })} />
          <Input type="date" value={announcement.end_at} onChange={(event) => setAnnouncement({ ...announcement, end_at: event.target.value })} />
        </div>
        <Button className="mt-3 rounded-xl" disabled={busy} onClick={() => void addAnnouncement()}><Plus className="mr-2 size-4" /> Publish announcement</Button>
      </AdminCard>

      <AdminCard title="Live announcements">
        <div className="grid gap-2">
          {announcements.data?.length ? announcements.data.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl border bg-background p-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.message}</p></div>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void updateAnnouncement(item.id, { is_active: !item.is_active })}>{item.is_active ? "Pause" : "Activate"}</Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => void updateAnnouncement(item.id, { is_active: false })}><Trash2 className="size-4" /></Button>
            </div>
          )) : <EmptyState text="No announcements created yet." />}
        </div>
      </AdminCard>

      <AdminCard title="Cities & activation">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="New city" value={city.name} onChange={(event) => setCity({ ...city, name: event.target.value })} />
          <Input placeholder="Slug (optional)" value={city.slug} onChange={(event) => setCity({ ...city, slug: event.target.value })} />
          <Button className="rounded-xl" onClick={() => void addCity()}><Plus className="mr-1 size-4" /> Add</Button>
        </div>
        <div className="mt-3 grid gap-2">
          {cities.data?.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{item.is_active ? "Visible" : "Hidden"} · {item.status.replace("_", " ")}</p></div>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void updateCity(item.id, { status: item.status === "live" ? "coming_soon" : "live" })}>{item.status === "live" ? "Coming soon" : "Set live"}</Button>
              <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => void updateCity(item.id, { is_active: !item.is_active })}>{item.is_active ? "Hide" : "Show"}</Button>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}

function BusinessSettings() {
  const { data: settings, isLoading, error } = useQuery(settingsQuery);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings || form) return;
    setForm({
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
    });
  }, [settings, form]);

  if (isLoading || !form) return <LoadingState />;
  if (error) return <ErrorState message={error.message} />;

  const currentForm = form;
  const update = (key: keyof SettingsForm, value: string | null) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));
  async function save(): Promise<void> {
    setSaving(true);
    const { error: saveError } = await supabase
      .from("site_settings")
      .update({
        business_name: currentForm.business_name.trim(),
        powered_by: currentForm.powered_by.trim(),
        management_name: currentForm.management_name.trim(),
        mobile: currentForm.mobile.trim(),
        whatsapp: currentForm.whatsapp.trim(),
        public_contact_number: currentForm.public_contact_number.trim(),
        email: currentForm.email.trim() || null,
        address: currentForm.address.trim(),
        description: currentForm.description.trim() || null,
        logo_url: currentForm.logo_url,
        admin_avatar_url: currentForm.admin_avatar_url,
      })
      .eq("id", true);
    setSaving(false);
    if (saveError) {
      toast.error(saveError.message);
      return;
    }
    toast.success("Public business profile updated");
    void queryClient.invalidateQueries({ queryKey: ["site-settings"] });
  }

  async function uploadSetting(file: File, key: "logo_url" | "admin_avatar_url") {
    try {
      const url = await uploadImage(file, key === "logo_url" ? "business" : "admin");
      update(key, url);
      toast.success("Image uploaded. Save settings to apply it.");
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }
  }

  return (
    <div className="mt-5 grid gap-4">
      <AdminCard title="Public business information">
        <p className="mb-3 text-xs text-muted-foreground">These values replace the defaults everywhere in the marketplace without a code change.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["business_name", "Business name"],
            ["powered_by", "Powered by"],
            ["management_name", "Management name"],
            ["mobile", "Business mobile"],
            ["whatsapp", "WhatsApp number"],
            ["public_contact_number", "Public contact number"],
            ["email", "Public email"],
            ["address", "Address"],
          ] as const).map(([key, label]) => (
            <label key={key} className="grid gap-1.5 text-xs font-semibold">
              {label}
              <Input value={form[key] ?? ""} onChange={(event) => update(key, event.target.value)} />
            </label>
          ))}
        </div>
        <label className="mt-3 grid gap-1.5 text-xs font-semibold">Business description<Textarea value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
        <Button className="mt-4 rounded-xl" disabled={saving} onClick={() => void save()}><Save className="mr-2 size-4" /> Save public profile</Button>
      </AdminCard>
      <AdminCard title="Logo & admin profile photo">
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageSetting label="Business logo" url={form.logo_url} onUpload={(file) => void uploadSetting(file, "logo_url")} onRemove={() => update("logo_url", null)} />
          <ImageSetting label="Admin DP" url={form.admin_avatar_url} onUpload={(file) => void uploadSetting(file, "admin_avatar_url")} onRemove={() => update("admin_avatar_url", null)} />
        </div>
      </AdminCard>
    </div>
  );
}

function ImageSetting({ label, url, onUpload, onRemove }: { label: string; url: string | null; onUpload: (file: File) => void; onRemove: () => void }) {
  return (
    <div className="rounded-2xl border bg-background p-3">
      <p className="text-xs font-semibold">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-muted text-xs text-muted-foreground">
          {url ? <img src={url} alt={label} className="size-full object-cover" /> : <Building2 className="size-5" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold tap-scale">
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} />
          </label>
          {url ? <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={onRemove}>Remove</Button> : null}
        </div>
      </div>
    </div>
  );
}

function UsersList({ users }: { users: Array<{ id: string; full_name: string | null; phone: string | null; is_blocked: boolean; is_verified: boolean; created_at: string }> }) {
  const mutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: { is_blocked?: boolean; is_verified?: boolean } }) => {
      const { error } = await supabase.from("profiles").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("User updated"),
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <AdminCard title={`Users (${users.length})`}>
      <div className="grid gap-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
            <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold">{(user.full_name ?? "U").slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.full_name ?? "Unnamed user"}</p><p className="text-xs text-muted-foreground">{user.phone ?? "No phone"}</p></div>
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => mutation.mutate({ id: user.id, values: { is_verified: !user.is_verified } })}>{user.is_verified ? "Verified" : "Verify"}</Button>
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => mutation.mutate({ id: user.id, values: { is_blocked: !user.is_blocked } })}>{user.is_blocked ? "Unblock" : "Block"}</Button>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

function AdminCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border bg-card p-4 shadow-soft"><h2 className="mb-3 text-sm font-bold">{title}</h2>{children}</section>;
}

function AttentionRow({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-2xl border bg-background p-3 text-left tap-scale"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><span className="min-w-0 flex-1 text-xs font-semibold">{label}</span><Badge>{value}</Badge></button>;
}

function AccessCard({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl border bg-card p-8 text-center shadow-soft">
      <ShieldAlert className="mx-auto size-10 text-primary" />
      <h1 className="mt-3 font-display text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5 rounded-xl" onClick={() => void onAction()}>
          <CheckCircle2 className="mr-2 size-4" /> {actionLabel}
        </Button>
      ) : (
        <Link to="/auth" className="mt-5 inline-block rounded-xl gradient-red px-5 py-2.5 text-sm font-semibold text-brand-foreground">
          Sign in
        </Link>
      )}
    </div>
  );
}

function LoadingState() {
  return <div className="grid min-h-48 place-items-center rounded-3xl border bg-card"><Loader2 className="size-6 animate-spin text-primary" /></div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{message}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}