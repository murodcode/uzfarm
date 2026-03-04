import { supabase } from "@/integrations/supabase/client";

export async function logUserAction(action: string, details?: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("user_logs" as any).insert({
      user_id: session.user.id,
      action,
      details: details || null,
    });
  } catch (err) {
    console.error("Log error:", err);
  }
}
