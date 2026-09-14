import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PipelineBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { adminConversationsQuery } from "@/lib/admin-queries";
import { useConversationMutation } from "@/lib/admin-mutations";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/chat")({
  head: () => ({ meta: [{ title: "Admin chat — 29Bricks" }] }),
  component: AdminChat,
});

const LEAD_STATUS_OPTIONS = [
  "new",
  "contacted",
  "interested",
  "visit_scheduled",
  "negotiation",
  "booked",
  "closed",
  "lost",
];

function AdminChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const conversations = useQuery(adminConversationsQuery());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const conversationMutation = useConversationMutation();

  const filtered = (conversations.data?.items ?? []).filter((c) => {
    if (!searchInput.trim()) return true;
    const needle = searchInput.toLowerCase();
    return (
      (c.subject ?? "").toLowerCase().includes(needle) ||
      (c.party ?? "").toLowerCase().includes(needle)
    );
  });

  const selected =
    filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  // Listing context for the selected conversation (shown as a link in the thread header).
  const listingContext = useQuery({
    queryKey: ["admin-chat-listing", selected?.listing_id],
    enabled: Boolean(selected?.listing_id),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title")
        .eq("id", selected!.listing_id!)
        .maybeSingle();
      if (error) throw error;
      return data ? { id: data.id, title: data.title as string } : null;
    },
  });

  const messages = useQuery({
    queryKey: ["admin-messages", selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selected!.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime: preserved from the original admin page (postgres_changes on messages).
  useEffect(() => {
    if (!selected?.id) return;
    const channel = supabase
      .channel(`admin-chat-${selected.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${selected.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["admin-messages", selected.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selected?.id, queryClient]);

  useEffect(() => {
    setNotes(selected?.admin_notes ?? "");
  }, [selected?.id, selected?.admin_notes]);

  async function sendMessage(): Promise<void> {
    if (!selected || !user || !message.trim()) return;
    // NOTE: is_admin is set by convention for the UI; the messages RLS policy must
    // validate the caller's actual role server-side. If it trusts this flag, any
    // authenticated user could spoof admin messages.
    const { error } = await supabase.from("messages").insert({
      conversation_id: selected.id,
      sender_id: user.id,
      is_admin: true,
      body: message.trim().slice(0, 2000),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selected.id);
    setMessage("");
    void queryClient.invalidateQueries({ queryKey: ["admin-messages", selected.id] });
    void queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
  }

  const data = conversations.data;

  return (
    <div className="grid gap-4">
      <PageHeader title="Chat" description={data ? `${data.items.length} conversations` : "Property conversations with users"} />

      <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className="rounded-3xl border bg-card p-3 shadow-soft">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search conversations…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="mt-3 grid max-h-[420px] gap-2 overflow-y-auto">
            {conversations.isLoading ? (
              <div className="grid place-items-center py-8">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : filtered.length ? (
              filtered.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left",
                    selected?.id === conversation.id ? "border-primary bg-primary/5" : "bg-background",
                  )}
                >
                  <p className="truncate text-xs font-semibold">{conversation.subject ?? "Property enquiry"}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {conversation.party} · {conversation.is_closed ? "closed" : conversation.lead_status.replace(/_/g, " ")}
                  </p>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                No conversations.
              </p>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="rounded-3xl border bg-card p-4 shadow-soft">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{selected.subject ?? "Property conversation"}</p>
                  {listingContext.data ? (
                    <Link
                      to="/listing/$id"
                      params={{ id: listingContext.data.id }}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {listingContext.data.title}
                    </Link>
                  ) : null}
                </div>
                <PipelineBadge status={selected.is_closed ? "closed" : selected.lead_status} />
              </div>

              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-2xl bg-muted/40 p-3">
                {messages.isLoading ? (
                  <div className="grid place-items-center py-6">
                    <Loader2 className="size-4 animate-spin text-primary" />
                  </div>
                ) : messages.data?.length ? (
                  messages.data.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3 py-2 text-sm",
                        item.is_admin ? "ml-auto bg-primary text-primary-foreground" : "bg-card",
                      )}
                    >
                      <p>{item.deleted ? "Message removed" : item.body}</p>
                      <p className="mt-1 text-[10px] opacity-70">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">No messages in this thread.</p>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Reply to this user…"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button className="rounded-xl" onClick={() => void sendMessage()}>Send</Button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Select
                  value={selected.lead_status}
                  onValueChange={(v) => conversationMutation.mutate({ id: selected.id, values: { lead_status: v } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => conversationMutation.mutate({ id: selected.id, values: { is_closed: !selected.is_closed } })}
                >
                  {selected.is_closed ? "Reopen conversation" : "Close conversation"}
                </Button>
              </div>

              <Textarea
                className="mt-3"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Private admin notes (never shown to users)"
              />
              <Button
                variant="outline"
                className="mt-2 rounded-xl"
                onClick={() => conversationMutation.mutate({ id: selected.id, values: { admin_notes: notes.slice(0, 2000) } })}
              >
                Save private notes
              </Button>
            </>
          ) : (
            <p className="grid place-items-center py-16 text-sm text-muted-foreground">
              Select a conversation to manage it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
