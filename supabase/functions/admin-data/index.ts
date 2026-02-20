import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;
    console.log("Admin action:", action, "by user:", userId);
    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // === GET STATS ===
    if (action === "get_stats") {
      const { data: allProfiles } = await adminClient.from("profiles").select("id, coins, cash, ad_views, is_blocked, created_at");
      const profiles = allProfiles || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const totalUsers = profiles.length;
      const todayUsers = profiles.filter((p: any) => p.created_at >= todayStr).length;
      const blockedUsers = profiles.filter((p: any) => p.is_blocked).length;
      const totalCoins = profiles.reduce((s: number, p: any) => s + (p.coins || 0), 0);
      const totalCash = profiles.reduce((s: number, p: any) => s + (p.cash || 0), 0);
      const totalAdViews = profiles.reduce((s: number, p: any) => s + (p.ad_views || 0), 0);

      const { count: pendingWithdrawals } = await adminClient
        .from("withdrawal_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      return json({
        stats: { totalUsers, todayUsers, blockedUsers, totalCoins, totalCash, totalAdViews, pendingWithdrawals: pendingWithdrawals || 0 }
      });
    }

    // === GET WITHDRAWALS ===
    if (action === "get_withdrawals") {
      const { data: withdrawals } = await adminClient
        .from("withdrawal_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      const userIds = [...new Set((withdrawals || []).map((w: any) => w.user_id))];
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, first_name, username, telegram_id")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const enriched = (withdrawals || []).map((w: any) => ({
        ...w,
        // Show FULL card number to admin
        card_display: w.card_number || null,
        profile: profileMap.get(w.user_id) || null,
      }));

      return json({ withdrawals: enriched });
    }

    // === GET USERS ===
    if (action === "get_users") {
      const { data: users } = await adminClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      return json({ users: users || [] });
    }

    // === UPDATE WITHDRAWAL ===
    if (action === "update_withdrawal") {
      const { withdrawal_id, status } = body;
      await adminClient
        .from("withdrawal_requests")
        .update({ status, processed_at: new Date().toISOString() })
        .eq("id", withdrawal_id);

      // If rejected, return cash to user
      if (status === "rejected") {
        const { data: wd } = await adminClient
          .from("withdrawal_requests")
          .select("user_id, amount")
          .eq("id", withdrawal_id)
          .single();
        if (wd) {
          const { data: userProfile } = await adminClient
            .from("profiles")
            .select("cash")
            .eq("id", wd.user_id)
            .single();
          if (userProfile) {
            await adminClient.from("profiles").update({
              cash: (userProfile.cash || 0) + wd.amount,
            }).eq("id", wd.user_id);
          }
        }
      }

      // Send notification to user via bot
      try {
        const { data: wd } = await adminClient
          .from("withdrawal_requests")
          .select("user_id, amount")
          .eq("id", withdrawal_id)
          .single();
        if (wd) {
          const { data: userProfile } = await adminClient
            .from("profiles")
            .select("telegram_id")
            .eq("id", wd.user_id)
            .single();
          if (userProfile?.telegram_id) {
            const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
            if (botToken) {
              const msg = status === "approved"
                ? `✅ Sizning 💵 ${wd.amount.toLocaleString()} tangalik pul chiqarish so'rovingiz <b>tasdiqlandi</b>!`
                : `❌ Sizning 💵 ${wd.amount.toLocaleString()} tangalik pul chiqarish so'rovingiz <b>rad etildi</b>. Pul balansingizga qaytarildi.`;
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: userProfile.telegram_id, text: msg, parse_mode: "HTML" }),
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to notify user via bot:", e);
      }

      return json({ success: true });
    }

    // === BLOCK/UNBLOCK USER ===
    if (action === "toggle_block") {
      const { target_user_id, blocked } = body;
      const { error: blockErr } = await adminClient
        .from("profiles")
        .update({ is_blocked: blocked })
        .eq("id", target_user_id);
      if (blockErr) return json({ error: blockErr.message }, 500);

      // Log transaction
      await adminClient.from("admin_transactions").insert({
        admin_id: userId,
        target_user_id,
        action_type: blocked ? "block" : "unblock",
        field: null,
        amount: 0,
        old_value: 0,
        new_value: 0,
      });

      return json({ success: true });
    }

    // === ADJUST BALANCE ===
    if (action === "adjust_balance") {
      const { target_user_id, field, amount } = body;
      if (!["coins", "cash"].includes(field)) {
        return json({ error: "Invalid field" }, 400);
      }
      if (typeof amount !== "number" || amount === 0) {
        return json({ error: "Invalid amount" }, 400);
      }

      const { data: profile } = await adminClient
        .from("profiles")
        .select(field)
        .eq("id", target_user_id)
        .single();

      if (!profile) return json({ error: "User not found" }, 404);

      const currentValue = (profile as any)[field] || 0;
      const newValue = currentValue + amount;

      if (newValue < 0) {
        return json({ error: `Balans yetarli emas. Hozirgi: ${currentValue}` }, 400);
      }

      const { error: updateErr } = await adminClient
        .from("profiles")
        .update({ [field]: newValue })
        .eq("id", target_user_id);
      if (updateErr) return json({ error: updateErr.message }, 500);

      // Log transaction
      await adminClient.from("admin_transactions").insert({
        admin_id: userId,
        target_user_id,
        action_type: amount > 0 ? "add" : "subtract",
        field,
        amount: Math.abs(amount),
        old_value: currentValue,
        new_value: newValue,
      });

      return json({ success: true, newValue });
    }

    // === TASK CRUD ===
    if (action === "get_tasks") {
      const { data: tasks } = await adminClient
        .from("game_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      return json({ tasks: tasks || [] });
    }

    if (action === "create_task") {
      const { task } = body;
      const { error } = await adminClient.from("game_tasks").insert(task);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "delete_task") {
      const { task_id } = body;
      await adminClient.from("user_task_completions").delete().eq("task_id", task_id);
      await adminClient.from("game_tasks").delete().eq("id", task_id);
      return json({ success: true });
    }

    // === GET/UPDATE APP SETTINGS ===
    if (action === "get_settings") {
      const { data } = await adminClient.from("app_settings").select("*");
      const settings: Record<string, any> = {};
      (data || []).forEach((s: any) => { settings[s.key] = s.value; });
      return json({ settings });
    }

    if (action === "update_settings") {
      const { key, value } = body;
      await adminClient.from("app_settings").upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      return json({ success: true });
    }

    // === NOTIFY WITHDRAWAL TO BOT ===
    if (action === "notify_withdrawal_bot") {
      const { user_id, amount, card_number } = body;
      try {
        const { data: userProfile } = await adminClient
          .from("profiles")
          .select("first_name, username, telegram_id")
          .eq("id", user_id)
          .single();

        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (botToken && userProfile) {
          const ADMIN_CHAT_ID = 6854856230;
          const cardFormatted = card_number?.length === 16
            ? card_number.replace(/(.{4})/g, "$1 ").trim()
            : card_number || "—";
          const somAmount = Math.floor(amount / 10);
          
          // Get withdrawal ID for callback buttons
          const { data: latestWd } = await adminClient
            .from("withdrawal_requests")
            .select("id")
            .eq("user_id", user_id)
            .order("requested_at", { ascending: false })
            .limit(1)
            .single();

          const msg =
            `💰 <b>Yangi pul chiqarish so'rovi!</b>\n\n` +
            `👤 <b>${userProfile.first_name || "Noma'lum"}</b> (@${userProfile.username || "—"})\n` +
            `🆔 TG: <code>${userProfile.telegram_id || "—"}</code>\n\n` +
            `💵 Miqdor: <b>${amount.toLocaleString()} tanga</b> (${somAmount.toLocaleString()} so'm)\n\n` +
            `💳 Karta raqami:\n<code>${cardFormatted}</code>`;

          const replyMarkup = latestWd ? {
            inline_keyboard: [
              [
                { text: "✅ Tasdiqlash", callback_data: `approve_wd_${latestWd.id}` },
                { text: "❌ Rad etish", callback_data: `reject_wd_${latestWd.id}` },
              ],
            ],
          } : undefined;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              text: msg,
              parse_mode: "HTML",
              reply_markup: replyMarkup,
            }),
          });
        }
      } catch (e) {
        console.error("Failed to notify admin via bot:", e);
      }
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("Admin data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
