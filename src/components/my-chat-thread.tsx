import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export type ThreadConversation = {
  id: string;
  subject: string | null;
  is_closed: boolean;
};

/**
 * User-side chat thread. Mirrors the app's existing realtime pattern
 * (postgres_changes on messages scoped to one conversation). Shows only
 * customer-facing messages — admin_notes never appear here (and are not
 * readable by users under RLS).
 */
export function MyChatThread({ conversation }: { conversation: ThreadConversation }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messages = useQuery({
    queryKey: ["my-messages", conversation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, is_admin, body, image_url, read_at, deleted, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime: same postgres_changes approach as the admin chat (preserved architecture).
  useEffect(() => {
    const channel = supabase
      .channel(`my-chat-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["my-messages", conversation.id] });
          void qc.invalidateQueries({ queryKey: ["my-conversations"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation.id, qc]);

  // Mark admin messages as read (allowed by the existing messages update policy).
  useEffect(() => {
    if (!user) return;
    const unread = (messages.data ?? []).filter((m) => m.is_admin && !m.read_at);
    if (!unread.length) return;
    void supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((m) => m.id),
      )
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["my-conversations"] });
      });
  }, [messages.data, user, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      if (!draft.trim()) return;
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        is_admin: false,
        body: draft.trim().slice(0, 2000),
      });
      if (error) throw error;
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);
    },
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["my-messages", conversation.id] });
      void qc.invalidateQueries({ queryKey: ["my-conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-2">
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl bg-muted/40 p-3">
        {messages.isLoading ? (
          <div className="grid place-items-center py-6">
            <Loader2 className="size-4 animate-spin text-primary" />
          </div>
        ) : messages.data?.length ? (
          messages.data.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                !m.is_admin && m.sender_id === user?.id
                  ? "ml-auto gradient-red text-brand-foreground"
                  : "bg-card",
              )}
            >
              <p>{m.deleted ? "Message removed" : m.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {new Date(m.created_at).toLocaleString()}
                {!m.is_admin && m.sender_id === user?.id ? " · you" : " · 29Bricks team"}
              </p>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No messages yet. Say hello — our team replies here.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {conversation.is_closed ? (
        <Badge variant="outline" className="justify-self-start">
          This conversation is closed. Start a new enquiry from a property page.
        </Badge>
      ) : (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message…"
            maxLength={2000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send.mutate();
              }
            }}
          />
          <Button size="icon" className="rounded-xl" aria-label="Send message" disabled={send.isPending || !draft.trim()} onClick={() => send.mutate()}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
