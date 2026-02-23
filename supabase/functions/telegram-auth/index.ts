import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

function verifyWebAppData(initData: string, botToken: string): TelegramWebAppUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const dataCheckArr: string[] = [];
  params.sort();
  params.forEach((val, key) => dataCheckArr.push(`${key}=${val}`));
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (hmac !== hash) return null;

  const userStr = params.get("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as TelegramWebAppUser;
  } catch {
    return null;
  }
}

async function processReferral(
  supabase: any,
  newUserId: string,
  startParam: string
): Promise<{ processed: boolean; referrerTelegramId?: number; referrerBonus?: number } | null> {
  console.log("[referral] Processing referral for user:", newUserId, "param:", startParam);

  if (!startParam || !startParam.startsWith("ref_")) {
    console.log("[referral] No valid ref param, skipping");
    return null;
  }

  const referrerIdentifier = startParam.replace("ref_", "");
  if (!referrerIdentifier) {
    console.log("[referral] Empty referrer identifier");
    return null;
  }

  // Check if user already has a referrer
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", newUserId)
    .single();

  if (currentProfile?.referred_by) {
    console.log("[referral] User already has referrer:", currentProfile.referred_by);
    return null;
  }

  // Find referrer by telegram_id (numeric) or UUID
  let referrerUserId: string | null = null;
  const numericId = Number(referrerIdentifier);

  if (!isNaN(numericId) && numericId > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", numericId)
      .single();
    referrerUserId = data?.id ?? null;
    console.log("[referral] Lookup by telegram_id:", numericId, "→", referrerUserId);
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", referrerIdentifier)
      .single();
    referrerUserId = data?.id ?? null;
    console.log("[referral] Lookup by UUID:", referrerIdentifier, "→", referrerUserId);
  }

  if (!referrerUserId) {
    console.log("[referral] ❌ Referrer not found");
    return null;
  }

  if (referrerUserId === newUserId) {
    console.log("[referral] ❌ Self-referral blocked");
    return null;
  }

  // Get referral settings
  const { data: settingsData } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "referral")
    .single();

  const settings = settingsData?.value as any;
  if (settings?.enabled === false) {
    console.log("[referral] ❌ Referral system disabled");
    return null;
  }

  const referrerBonus = settings?.referrer_bonus ?? 1000;
  const refereeBonus = settings?.referee_bonus ?? 200;

  // 1. Set referred_by on new user
  const { error: refErr } = await supabase
    .from("profiles")
    .update({ referred_by: referrerUserId })
    .eq("id", newUserId);

  if (refErr) {
    console.error("[referral] ❌ Failed to set referred_by:", refErr.message);
    return null;
  }
  console.log("[referral] ✅ Set referred_by");

  // 2. Update referrer stats + get telegram_id for notification
  const { data: referrer } = await supabase
    .from("profiles")
    .select("coins, referral_count, referral_earnings, referral_level, telegram_id")
    .eq("id", referrerUserId)
    .single();

  let referrerTelegramId: number | undefined;

  if (referrer) {
    referrerTelegramId = referrer.telegram_id || undefined;
    const newCount = (referrer.referral_count || 0) + 1;
    const newLevel = Math.min(Math.floor(newCount / 10), 10);
    const newCoins = (referrer.coins || 0) + referrerBonus;
    const newEarnings = (referrer.referral_earnings || 0) + referrerBonus;

    const { error: updateErr } = await supabase.from("profiles").update({
      coins: newCoins,
      referral_count: newCount,
      referral_earnings: newEarnings,
      referral_level: newLevel,
    }).eq("id", referrerUserId);

    console.log("[referral] Referrer update:", updateErr
      ? `❌ ${updateErr.message}`
      : `✅ count:${newCount}, level:${newLevel}, bonus:+${referrerBonus}, totalEarnings:${newEarnings}`);
  }

  // 3. Give referee (new user) bonus
  if (refereeBonus > 0) {
    const { data: newUserProfile } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", newUserId)
      .single();

    if (newUserProfile) {
      const { error: bonusErr } = await supabase.from("profiles").update({
        coins: (newUserProfile.coins || 0) + refereeBonus,
      }).eq("id", newUserId);

      console.log("[referral] Referee bonus:", bonusErr
        ? `❌ ${bonusErr.message}`
        : `✅ +${refereeBonus} coins`);
    }
  }

  console.log(`[referral] ✅ COMPLETE: ${newUserId} referred by ${referrerUserId}`);
  return { processed: true, referrerTelegramId, referrerBonus };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, start_param } = await req.json();
    console.log("[auth] ===== NEW AUTH REQUEST =====");
    console.log("[auth] start_param:", start_param);

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telegramUser = verifyWebAppData(initData, botToken);
    if (!telegramUser) {
      return new Response(
        JSON.stringify({ error: "Invalid Telegram data" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[auth] Verified user:", telegramUser.id, telegramUser.first_name);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const email = `tg_${telegramUser.id}@telegram.farm-empire.local`;

    let userId: string | null = null;
    let isNewUser = false;

    // 1. Check if profile exists by telegram_id
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, referred_by")
      .eq("telegram_id", telegramUser.id)
      .single();

    if (existingProfile) {
      userId = existingProfile.id;
      console.log("[auth] EXISTING user:", userId);
    } else {
      console.log("[auth] No existing profile, checking auth users...");

      // 2. Check auth users by email
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingAuthUser = userList?.users?.find(u => u.email === email);

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log("[auth] Auth user exists:", userId);
      } else {
        // 3. Create new auth user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name,
            username: telegramUser.username,
            photo_url: telegramUser.photo_url,
          },
        });
        if (createError) {
          console.error("[auth] createUser error:", createError);
          throw createError;
        }
        userId = newUser.user.id;
        console.log("[auth] NEW user created:", userId);
      }
      isNewUser = true;
    }

    // Upsert profile
    await supabase.from("profiles").upsert({
      id: userId,
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      username: telegramUser.username || null,
      photo_url: telegramUser.photo_url || null,
    }, { onConflict: "id" });

    console.log("[auth] Profile upserted for:", userId);

    // Process referral - check both start_param and pending referral from bot
    let effectiveStartParam = start_param;
    if (!effectiveStartParam) {
      // Check for pending referral stored by bot
      const { data: pendingRef } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `pending_ref_${telegramUser.id}`)
        .single();
      
      if (pendingRef?.value?.referrer_tg_id) {
        effectiveStartParam = `ref_${pendingRef.value.referrer_tg_id}`;
        console.log("[auth] Found pending referral from bot:", effectiveStartParam);
        // Delete pending referral
        await supabase.from("app_settings").delete().eq("key", `pending_ref_${telegramUser.id}`);
      }
    }

    if (effectiveStartParam) {
      try {
        const referralResult = await processReferral(supabase, userId!, effectiveStartParam);
        
        // Send notification to referrer via bot
        if (referralResult?.processed) {
          const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
          if (BOT_TOKEN && referralResult.referrerTelegramId) {
            const bonus = referralResult.referrerBonus || 0;
            const newUserName = telegramUser.first_name || telegramUser.username || `ID:${telegramUser.id}`;
            const notifMsg = `🎉 <b>Yangi referal!</b>\n\n👤 <b>${newUserName}</b> sizning havolangiz orqali o'yinga qo'shildi!\n\n🪙 Sizga +${bonus} bonus berildi!`;
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: referralResult.referrerTelegramId, text: notifMsg, parse_mode: "HTML" }),
            });
          }
        }
      } catch (err) {
        console.error("[auth] Referral processing error (non-fatal):", err);
      }
    } else {
      console.log("[auth] Skip referral. No start_param or pending referral");
    }

    // Auto-assign admin role
    const ADMIN_TELEGRAM_IDS = [6854856230];
    if (ADMIN_TELEGRAM_IDS.includes(telegramUser.id)) {
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" }
      );
    }

    // Generate session via magic link
    const { data: sessionData, error: sessionError } =
      await supabase.auth.admin.generateLink({ type: "magiclink", email });

    if (sessionError) throw sessionError;

    const url = new URL(sessionData.properties.action_link);
    const token_hash = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey);

    const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
      token_hash: token_hash!,
      type: type as any,
    });

    if (verifyError) throw verifyError;

    console.log("[auth] ===== AUTH COMPLETE tg_id:", telegramUser.id, "=====");

    return new Response(
      JSON.stringify({
        session: verifyData.session,
        user: verifyData.user,
        profile: {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[auth] FATAL ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
