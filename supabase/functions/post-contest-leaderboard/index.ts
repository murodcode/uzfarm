import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { contest_id } = body;

    if (!contest_id) {
      return new Response(JSON.stringify({ error: "contest_id kerak" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get contest
    const { data: contest } = await adminClient
      .from("contests")
      .select("*")
      .eq("id", contest_id)
      .single();

    if (!contest) {
      return new Response(JSON.stringify({ error: "Konkurs topilmadi" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contest.channel_id) {
      return new Response(JSON.stringify({ error: "Kanal ID kiritilmagan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get referral counts
    const { data: refs } = await adminClient
      .from("contest_referrals")
      .select("referrer_id")
      .eq("contest_id", contest_id);

    const countMap = new Map<string, number>();
    (refs || []).forEach((r: any) => {
      countMap.set(r.referrer_id, (countMap.get(r.referrer_id) || 0) + 1);
    });

    const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Get profiles for top users
    const userIds = sorted.map(([id]) => id);
    let profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, first_name, username")
        .in("id", userIds);
      profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    }

    // Get prizes
    const { data: prizes } = await adminClient
      .from("contest_prizes")
      .select("place, reward_coins, reward_description")
      .eq("contest_id", contest_id)
      .order("place");

    // Build message
    const isFinished = contest.status === "finished";
    const endTime = new Date(contest.end_time).getTime();
    const now = Date.now();
    const diffMs = endTime - now;

    let header = isFinished
      ? `🏆 <b>${contest.name} — Natijalar!</b>\n\n`
      : `📊 <b>${contest.name} — Reyting</b>\n\n`;

    let leaderboardText = "";
    if (sorted.length === 0) {
      leaderboardText = "Hali ishtirokchilar yo'q.\n";
    } else {
      sorted.forEach(([userId, count], i) => {
        const profile = profileMap.get(userId);
        const name = profile?.first_name || profile?.username || "Noma'lum";
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        const prize = (prizes || []).find((p: any) => p.place === i + 1);
        const prizeText = prize ? ` — 🪙 ${prize.reward_coins.toLocaleString()}` : "";
        leaderboardText += `${medal} <b>${name}</b> — ${count} ta referal${prizeText}\n`;
      });
    }

    let footer = "";
    if (!isFinished && diffMs > 0) {
      const days = Math.floor(diffMs / 86400000);
      const hours = Math.floor((diffMs % 86400000) / 3600000);
      footer = `\n⏳ Konkurs tugashiga: <b>${days} kun ${hours} soat</b> qoldi`;
    } else if (isFinished) {
      footer = "\n🎉 Tabriklaymiz g'oliblarga!";
    }

    // Prizes section
    let prizesText = "";
    if ((prizes || []).length > 0) {
      prizesText = "\n🎁 <b>Sovg'alar:</b>\n";
      (prizes || []).forEach((p: any) => {
        const medal = p.place === 1 ? "🥇" : p.place === 2 ? "🥈" : p.place === 3 ? "🥉" : `${p.place}.`;
        prizesText += `${medal} ${p.reward_coins.toLocaleString()} tanga`;
        if (p.reward_description) prizesText += ` — ${p.reward_description}`;
        prizesText += "\n";
      });
    }

    const fullMessage = header + leaderboardText + prizesText + footer;

    // Send to Telegram channel
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: contest.channel_id,
        text: fullMessage,
        parse_mode: "HTML",
      }),
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error("Telegram error:", tgData);
      return new Response(JSON.stringify({ error: `Telegram xatolik: ${tgData.description}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
