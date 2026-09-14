import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Tables the admin panel is allowed to write through the anon client (RLS remains the boundary). */
export type AdminTable =
  | "listings"
  | "requirements"
  | "services"
  | "brokers"
  | "profiles"
  | "leads"
  | "offers"
  | "visit_requests"
  | "contact_requests"
  | "reports"
  | "cities"
  | "categories"
  | "announcements"
  | "conversations";

/**
 * Update a row via the anon client. RLS on each table decides whether the
 * signed-in admin is actually allowed the write — errors surface to callers.
 */
export async function updateRow(
  table: AdminTable,
  id: string,
  values: object,
): Promise<void> {
  const { error } = await supabase.from(table).update(values as never).eq("id", id as never);
  if (error) throw error;
}

/** Conversation-level writes from the admin chat page (lead status, notes, close/reopen). */
export function useConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: object }) => {
      const { error } = await supabase.from("conversations").update(values as never).eq("id", id as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conversation updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/** Singleton site_settings write (business profile, logo, admin avatar, social links). */
export function useSiteSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: object) => {
      const { error } = await supabase.from("site_settings").update(values as never).eq("id", true as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business profile saved");
      void queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
