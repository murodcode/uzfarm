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

    // Parse body early to check action
    const body = await req.json();
    const { action } = body;

    // Helper: send Telegram message
    const sendTgMessage = async (chatId: number | string, text: string) => {
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!botToken) return;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
    };

    const PAYMENT_CHANNEL = "@farm_market_pay";

    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // === NOTIFY WITHDRAWAL TO BOT (allowed for any authenticated user) ===
    if (action === "notify_withdrawal_bot") {
      const { user_id, amount, card_number } = body;
      try {
        const { data: userProfile } = await adminClient
          .from("profiles")
          .select("first_name, username, telegram_id")
          .eq("id", user_id)
          .single();

        let coinsPerSom = 4;
        const { data: settingsData } = await adminClient
          .from("app_settings").select("value").eq("key", "withdrawal").single();
        if (settingsData?.value && typeof settingsData.value === "object") {
          const sv = settingsData.value as any;
          if (sv.coins_per_som) coinsPerSom = sv.coins_per_som;
        }

        if (userProfile) {
          const ADMIN_CHAT_ID = 6854856230;
          const cardFormatted = card_number?.length === 16
            ? card_number.replace(/(.{4})/g, "$1 ").trim()
            : card_number || "—";
          const somAmount = Math.floor(amount / coinsPerSom);

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

          const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
          if (botToken) {
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
        }
      } catch (e) {
        console.error("Failed to notify admin via bot:", e);
      }
      return json({ success: true });
    }

    // All other actions require admin role
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

    console.log("Admin action:", action, "by user:", userId);

    // === GET STATS ===
    if (action === "get_stats") {
      // Use count queries to avoid 1000-row limit
      const { count: totalUsers } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: blockedUsers } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_blocked", true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const { count: todayUsers } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStr);

      // Get aggregated totals using multiple paginated queries
      let totalCoins = 0, totalCash = 0, totalAdViews = 0, totalReferrals = 0;
      let offset = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data: batch } = await adminClient
          .from("profiles")
          .select("coins, cash, ad_views, referral_count")
          .range(offset, offset + PAGE_SIZE - 1);
        if (!batch || batch.length === 0) break;
        for (const p of batch) {
          totalCoins += p.coins || 0;
          totalCash += p.cash || 0;
          totalAdViews += p.ad_views || 0;
          totalReferrals += p.referral_count || 0;
        }
        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      // Today's ad views from daily_task_progress
      const { data: todayAdData } = await adminClient
        .from("daily_task_progress")
        .select("progress")
        .eq("task_key", "watch_ad")
        .eq("task_date", today.toISOString().split('T')[0]);
      const todayAdViews = (todayAdData || []).reduce((s: number, d: any) => s + (d.progress || 0), 0);

      // Today's referrals
      const { count: todayReferrals } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("referred_by", "is", null)
        .gte("created_at", todayStr);

      const { count: pendingWithdrawals } = await adminClient
        .from("withdrawal_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      return json({
        stats: {
          totalUsers: totalUsers || 0,
          todayUsers: todayUsers || 0,
          blockedUsers: blockedUsers || 0,
          totalCoins,
          totalCash,
          totalAdViews,
          todayAdViews,
          totalReferrals,
          todayReferrals: todayReferrals || 0,
          pendingWithdrawals: pendingWithdrawals || 0,
        }
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
      // Paginate to get all users beyond 1000 limit
      let allUsers: any[] = [];
      let offset = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data: batch } = await adminClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (!batch || batch.length === 0) break;
        allUsers = allUsers.concat(batch);
        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      // Get all animal counts
      let allAnimals: any[] = [];
      offset = 0;
      while (true) {
        const { data: batch } = await adminClient
          .from("animals")
          .select("user_id")
          .range(offset, offset + PAGE_SIZE - 1);
        if (!batch || batch.length === 0) break;
        allAnimals = allAnimals.concat(batch);
        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      
      const animalCountMap = new Map<string, number>();
      allAnimals.forEach((a: any) => {
        animalCountMap.set(a.user_id, (animalCountMap.get(a.user_id) || 0) + 1);
      });

      const enrichedUsers = allUsers.map((u: any) => ({
        ...u,
        animal_count: animalCountMap.get(u.id) || 0,
      }));

      return json({ users: enrichedUsers });
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

      // Send notification to user via bot + payment channel
      try {
        const { data: wd } = await adminClient
          .from("withdrawal_requests")
          .select("user_id, amount, requested_at, card_number")
          .eq("id", withdrawal_id)
          .single();
        if (wd) {
          // Get dynamic conversion rate
          let coinsPerSom = 4;
          const { data: sData } = await adminClient.from("app_settings").select("value").eq("key", "withdrawal").single();
          if (sData?.value && typeof sData.value === "object") {
            const sv = sData.value as any;
            if (sv.coins_per_som) coinsPerSom = sv.coins_per_som;
          }

          const somAmount = Math.floor(wd.amount / coinsPerSom);

          const { data: userProfile } = await adminClient
            .from("profiles")
            .select("telegram_id, first_name, username")
            .eq("id", wd.user_id)
            .single();

          if (userProfile?.telegram_id) {
            const msg = status === "approved"
              ? `✅ Sizning 💵 ${wd.amount.toLocaleString()} tangalik (${somAmount.toLocaleString()} so'm) pul chiqarish so'rovingiz <b>tasdiqlandi</b>!`
              : `❌ Sizning 💵 ${wd.amount.toLocaleString()} tangalik pul chiqarish so'rovingiz <b>rad etildi</b>. Pul balansingizga qaytarildi.`;
            await sendTgMessage(userProfile.telegram_id, msg);
          }

          // Send payment channel notification on approval
          if (status === "approved" && userProfile) {
            const { count: approvedCount } = await adminClient.from("withdrawal_requests")
              .select("*", { count: "exact", head: true })
              .eq("status", "approved");

            const paymentNumber = approvedCount || 1;
            const cardDigits = wd.card_number?.replace(/\D/g, "") || "";
            const maskedCard = cardDigits.length >= 8
              ? `${cardDigits.slice(0, 4)}****${cardDigits.slice(-4)}`
              : "****";

            const requestedDate = wd.requested_at
              ? new Date(wd.requested_at).toLocaleString("uz-UZ", {
                  year: "numeric", month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                })
              : "—";

            const nowDate = new Date().toLocaleDateString("uz-UZ", {
              year: "numeric", month: "2-digit", day: "2-digit",
            });

            const name = userProfile.first_name || "Noma'lum";
            const uname = userProfile.username ? `@${userProfile.username}` : "—";
            const tgId = userProfile.telegram_id || "—";

            const channelMsg =
              `📣 <b>Farm Market— navbatdagi to'lov amalga oshirildi #${paymentNumber} ✅</b>\n\n` +
              `😀 Foydalanuvchi: <b>${name}</b>\n` +
              `👤 Username: ${uname}\n` +
              `📇 Telegram ID: <code>${tgId}</code>\n` +
              `💰 Miqdor: <b>${wd.amount.toLocaleString()} tanga</b>\n` +
              `🍀 Pul ekvivalenti: <b>${somAmount.toLocaleString()} so'm</b>\n` +
              `📥 Hamyon: <code>${maskedCard}</code>\n` +
              `⏱ Yechib olish vaqti: ${requestedDate}\n\n` +
              `✅ Holat: <b>TO'LANDI</b>\n` +
              `🧾 To'lov vaqti: ${nowDate}\n` +
              `🛫 Rasmiy kanal: ${PAYMENT_CHANNEL}`;

            await sendTgMessage(PAYMENT_CHANNEL, channelMsg);
            console.log("[admin] Payment channel notification sent");
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

      // Notify user via bot about balance change
      try {
        const { data: targetProfile } = await adminClient
          .from("profiles")
          .select("telegram_id")
          .eq("id", target_user_id)
          .single();

        if (targetProfile?.telegram_id) {
          const fieldName = field === "coins" ? "🪙 Tanga" : "💵 Naqd pul";
          const action = amount > 0 ? "qo'shildi" : "ayirildi";
          const msg = `${fieldName} balansingizga admin tomonidan <b>${Math.abs(amount).toLocaleString()}</b> ${action}.\n\n📊 Yangi balans: <b>${newValue.toLocaleString()}</b>`;
          await sendTgMessage(targetProfile.telegram_id, msg);
        }
      } catch (e) {
        console.error("Failed to notify user about balance change:", e);
      }

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

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("Admin data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
