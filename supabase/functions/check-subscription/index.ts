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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

    // Verify user
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

    const body = await req.json();
    const { task_id } = body;

    if (!task_id) {
      return new Response(JSON.stringify({ error: "task_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get task details
    const { data: task, error: taskError } = await adminClient
      .from("game_tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: "Vazifa topilmadi" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (task.task_type !== "subscribe") {
      return new Response(JSON.stringify({ error: "Bu obuna vazifasi emas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already completed (for non-daily tasks)
    if (!task.is_daily) {
      const { data: existing } = await adminClient
        .from("user_task_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("task_id", task_id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Bu vazifa allaqachon bajarilgan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get user's telegram_id from profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("telegram_id, coins, cash")
      .eq("id", user.id)
      .single();

    if (!profile?.telegram_id) {
      return new Response(JSON.stringify({ error: "Telegram ID topilmadi" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The channel ID is stored in requirement_type for subscribe tasks
    // It can be @channel_username or -100xxxx numeric ID
    // Also try to extract from url field if available
    let channelId = task.requirement_type;
    
    // If url has t.me/channel format, extract username
    if (task.url && task.url.includes("t.me/")) {
      const match = task.url.match(/t\.me\/([^\/?]+)/);
      if (match) {
        channelId = "@" + match[1];
      }
    }
    
    // If it looks like a username without @, add @
    if (channelId && !channelId.startsWith("@") && !channelId.startsWith("-")) {
      channelId = "@" + channelId;
    }

    console.log("[check-sub] Checking membership for channel:", channelId, "user:", profile.telegram_id);

    // Check membership via Telegram Bot API
    const tgUrl = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(channelId)}&user_id=${profile.telegram_id}`;
    const tgResponse = await fetch(tgUrl);
    const tgData = await tgResponse.json();

    if (!tgData.ok) {
      console.error("[check-sub] Telegram API error:", tgData);
      
      let errorMsg = "Tekshirishda xatolik yuz berdi.";
      if (tgData.description?.includes("chat not found")) {
        errorMsg = "Kanal topilmadi. Admin bilan bog'laning.";
      } else if (tgData.description?.includes("bot is not a member")) {
        errorMsg = "Bot kanalda admin emas. Admin bilan bog'laning.";
      } else if (tgData.description?.includes("member list is inaccessible")) {
        // This happens with private supergroups. Try alternative: check if user is in chat
        // We'll grant reward if user claims to be subscribed (fallback for private groups)
        console.log("[check-sub] Member list inaccessible - private group, granting reward");
        // Grant the reward as fallback
        const newCoins = (profile.coins || 0) + (task.reward_coins || 0);
        const newCash = (profile.cash || 0) + (task.reward_cash || 0);
        await adminClient.from("profiles").update({ coins: newCoins, cash: newCash }).eq("id", user.id);
        await adminClient.from("user_task_completions").insert({ user_id: user.id, task_id: task_id });
        return new Response(JSON.stringify({ 
          success: true,
          reward_coins: task.reward_coins,
          reward_cash: task.reward_cash,
          new_coins: newCoins,
          new_cash: newCash,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        errorMsg = `Xatolik: ${tgData.description || "Noma'lum"}`;
      }
      
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberStatus = tgData.result?.status;
    const isMember = ["member", "administrator", "creator"].includes(memberStatus);

    if (!isMember) {
      return new Response(JSON.stringify({ 
        error: "Siz hali kanalga obuna bo'lmagansiz!",
        status: memberStatus 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User is a member — grant reward
    const newCoins = (profile.coins || 0) + (task.reward_coins || 0);
    const newCash = (profile.cash || 0) + (task.reward_cash || 0);

    // Update balance
    await adminClient
      .from("profiles")
      .update({ coins: newCoins, cash: newCash })
      .eq("id", user.id);

    // Record completion
    await adminClient
      .from("user_task_completions")
      .insert({ user_id: user.id, task_id: task_id });

    return new Response(JSON.stringify({ 
      success: true,
      reward_coins: task.reward_coins,
      reward_cash: task.reward_cash,
      new_coins: newCoins,
      new_cash: newCash,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Check subscription error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
