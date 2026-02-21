import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = () => Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = () => Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ADMIN_CHAT_ID = 6854856230;
const BOT_USERNAME = "Farm_Market_bot";
const MINI_APP_URL = "https://id-preview--f0cb7cbd-43c8-4da1-a499-5c0a0e2cab2b.lovable.app";
const PAYMENT_CHANNEL = "@farm_market_pay";

async function sendMessage(chatId: number | string, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) console.error("[bot] sendMessage error:", data);
  return data;
}

// === DB-based admin state (replaces in-memory Map) ===
async function getAdminState(supabase: any): Promise<{ action: string; data?: any } | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "admin_bot_state")
    .single();
  if (!data?.value || !data.value.action) return null;
  return data.value as { action: string; data?: any };
}

async function setAdminState(supabase: any, state: { action: string; data?: any } | null) {
  await supabase.from("app_settings").upsert(
    { key: "admin_bot_state", value: state || {}, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}

async function processReferralInDB(
  supabase: any,
  newTelegramId: number,
  newUserName: string,
  referrerIdentifier: string
): Promise<{ referrerProfile: any; alreadyReferred: boolean } | null> {
  console.log("[bot-referral] Processing referral in DB:", newTelegramId, "ref:", referrerIdentifier);

  const numericId = Number(referrerIdentifier);
  if (isNaN(numericId) || numericId <= 0) return null;
  if (numericId === newTelegramId) return null;

  const { data: referrerProfile } = await supabase
    .from("profiles")
    .select("id, telegram_id, first_name, username, coins, referral_count, referral_earnings, referral_level")
    .eq("telegram_id", numericId)
    .single();

  if (!referrerProfile) return null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, referred_by")
    .eq("telegram_id", newTelegramId)
    .single();

  if (existingProfile?.referred_by) {
    return { referrerProfile, alreadyReferred: true };
  }

  const { data: settingsData } = await supabase
    .from("app_settings").select("value").eq("key", "referral").single();
  const settings = settingsData?.value as any;
  if (settings?.enabled === false) return null;

  const referrerBonus = settings?.referrer_bonus ?? 500;
  const refereeBonus = settings?.referee_bonus ?? 300;

  if (existingProfile) {
    await supabase.from("profiles").update({ referred_by: referrerProfile.id }).eq("id", existingProfile.id);
    if (refereeBonus > 0) {
      const { data: refProfile } = await supabase.from("profiles").select("coins").eq("id", existingProfile.id).single();
      if (refProfile) {
        await supabase.from("profiles").update({ coins: (refProfile.coins || 0) + refereeBonus }).eq("id", existingProfile.id);
      }
    }
  }

  const newCount = (referrerProfile.referral_count || 0) + 1;
  const newLevel = Math.min(Math.floor(newCount / 10), 10);
  const newCoins = (referrerProfile.coins || 0) + referrerBonus;
  const newEarnings = (referrerProfile.referral_earnings || 0) + referrerBonus;

  await supabase.from("profiles").update({
    coins: newCoins, referral_count: newCount, referral_earnings: newEarnings, referral_level: newLevel,
  }).eq("id", referrerProfile.id);

  return { referrerProfile, alreadyReferred: false };
}

async function handleAdminPanel(chatId: number) {
  await sendMessage(chatId, "🛡 <b>Admin Panel</b>\n\nQuyidagi buyruqlardan foydalaning:", {
    inline_keyboard: [
      [{ text: "📊 Statistika", callback_data: "admin_stats" }],
      [{ text: "📢 Umumiy xabar yuborish", callback_data: "admin_broadcast" }],
      [{ text: "🏆 Referal reyting", callback_data: "admin_referral_ranking" }],
      [{ text: "👥 Foydalanuvchilar soni", callback_data: "admin_user_count" }],
    ],
  });
}

async function handleAdminStats(supabase: any, chatId: number) {
  const { data: profiles } = await supabase.from("profiles").select("id, coins, cash, ad_views, is_blocked, created_at, referral_count");
  const all = profiles || [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const totalUsers = all.length;
  const todayUsers = all.filter((p: any) => p.created_at >= todayStr).length;
  const blockedUsers = all.filter((p: any) => p.is_blocked).length;
  const totalCoins = all.reduce((s: number, p: any) => s + (p.coins || 0), 0);
  const totalCash = all.reduce((s: number, p: any) => s + (p.cash || 0), 0);
  const totalReferrals = all.reduce((s: number, p: any) => s + (p.referral_count || 0), 0);

  const { count: pendingWithdrawals } = await supabase
    .from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending");

  await sendMessage(chatId,
    `📊 <b>Statistika</b>\n\n` +
    `👥 Jami foydalanuvchilar: <b>${totalUsers}</b>\n` +
    `🆕 Bugun qo'shilgan: <b>${todayUsers}</b>\n` +
    `🚫 Bloklangan: <b>${blockedUsers}</b>\n` +
    `🪙 Jami tangalar: <b>${totalCoins.toLocaleString()}</b>\n` +
    `💵 Jami naqd pul: <b>${totalCash.toLocaleString()}</b>\n` +
    `👥 Jami referallar: <b>${totalReferrals}</b>\n` +
    `⏳ Kutilayotgan so'rovlar: <b>${pendingWithdrawals || 0}</b>`
  );
}

async function handleReferralRanking(supabase: any, chatId: number) {
  const { data: topUsers } = await supabase.from("profiles")
    .select("first_name, username, telegram_id, referral_count, referral_earnings")
    .gt("referral_count", 0).order("referral_count", { ascending: false }).limit(20);

  if (!topUsers?.length) {
    await sendMessage(chatId, "🏆 Hali referal qilgan foydalanuvchilar yo'q.");
    return;
  }

  let text = "🏆 <b>Referal Reyting</b>\n\n";
  topUsers.forEach((u: any, i: number) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    const name = u.first_name || u.username || `ID:${u.telegram_id}`;
    text += `${medal} <b>${name}</b> — ${u.referral_count} ta referal (🪙 ${(u.referral_earnings || 0).toLocaleString()})\n`;
  });

  await sendMessage(chatId, text);
}

// Send payment confirmation to the payment channel
async function sendPaymentChannelNotification(
  supabase: any,
  wdId: string,
  userId: string,
  amount: number
) {
  try {
    const { data: userProfile } = await supabase.from("profiles")
      .select("first_name, username, telegram_id")
      .eq("id", userId).single();

    if (!userProfile) return;

    const { data: wd } = await supabase.from("withdrawal_requests")
      .select("requested_at, card_number")
      .eq("id", wdId).single();

    const { count: approvedCount } = await supabase.from("withdrawal_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    // Get dynamic conversion rate
    let coinsPerSom = 4;
    const { data: settingsData } = await supabase.from("app_settings").select("value").eq("key", "withdrawal").single();
    if (settingsData?.value && typeof settingsData.value === "object") {
      const sv = settingsData.value as any;
      if (sv.coins_per_som) coinsPerSom = sv.coins_per_som;
    }

    const paymentNumber = approvedCount || 1;
    const somAmount = Math.floor(amount / coinsPerSom);
    const cardDigits = wd?.card_number?.replace(/\D/g, "") || "";
    const maskedCard = cardDigits.length >= 8
      ? `${cardDigits.slice(0, 4)}****${cardDigits.slice(-4)}`
      : "****";

    const requestedDate = wd?.requested_at
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

    const msg =
      `📣 <b>Farm Market— navbatdagi to'lov amalga oshirildi #${paymentNumber} ✅</b>\n\n` +
      `😀 Foydalanuvchi: <b>${name}</b>\n` +
      `👤 Username: ${uname}\n` +
      `📇 Telegram ID: <code>${tgId}</code>\n` +
      `💰 Miqdor: <b>${amount.toLocaleString()} tanga</b>\n` +
      `🍀 Pul ekvivalenti: <b>${somAmount.toLocaleString()} so'm</b>\n` +
      `📥 Hamyon: <code>${maskedCard}</code>\n` +
      `⏱ Yechib olish vaqti: ${requestedDate}\n\n` +
      `✅ Holat: <b>TO'LANDI</b>\n` +
      `🧾 To'lov vaqti: ${nowDate}\n` +
      `🛫 Rasmiy kanal: ${PAYMENT_CHANNEL}`;

    await sendMessage(PAYMENT_CHANNEL, msg);
    console.log("[bot] Payment notification sent to channel");
  } catch (e) {
    console.error("[bot] Failed to send payment channel notification:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "Bot webhook is active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const update = await req.json();
    console.log("[bot] Update received:", JSON.stringify(update).slice(0, 500));

    const supabase = createClient(SUPABASE_URL(), SERVICE_ROLE_KEY());

    // Handle callback queries
    if (update.callback_query) {
      const cbq = update.callback_query;
      const chatId = cbq.message.chat.id;
      const data = cbq.data;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN()}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cbq.id }),
      });

      if (chatId !== ADMIN_CHAT_ID) {
        return new Response("OK", { status: 200 });
      }

      if (data === "admin_stats") {
        await handleAdminStats(supabase, chatId);
      } else if (data === "admin_broadcast") {
        await setAdminState(supabase, { action: "broadcast" });
        await sendMessage(chatId, "📢 Umumiy xabar matnini yozing.\n\n⚠️ Bu xabar barcha foydalanuvchilarga yuboriladi.\n\nBekor qilish: /cancel");
      } else if (data === "admin_referral_ranking") {
        await handleReferralRanking(supabase, chatId);
      } else if (data === "admin_user_count") {
        const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        await sendMessage(chatId, `👥 Jami foydalanuvchilar: <b>${count || 0}</b>`);
      } else if (data.startsWith("approve_wd_")) {
        const wdId = data.replace("approve_wd_", "");
        await supabase.from("withdrawal_requests").update({ status: "approved", processed_at: new Date().toISOString() }).eq("id", wdId);

        const { data: wd } = await supabase.from("withdrawal_requests").select("user_id, amount").eq("id", wdId).single();
        if (wd) {
          // Get dynamic conversion rate
          let coinsPerSom = 4;
          const { data: sData } = await supabase.from("app_settings").select("value").eq("key", "withdrawal").single();
          if (sData?.value && typeof sData.value === "object") {
            const sv = sData.value as any;
            if (sv.coins_per_som) coinsPerSom = sv.coins_per_som;
          }

          const { data: userProfile } = await supabase.from("profiles").select("telegram_id").eq("id", wd.user_id).single();
          if (userProfile?.telegram_id) {
            const somAmt = Math.floor(wd.amount / coinsPerSom);
            await sendMessage(userProfile.telegram_id, `✅ Sizning 💵 ${wd.amount.toLocaleString()} tangalik (${somAmt.toLocaleString()} so'm) pul chiqarish so'rovingiz <b>tasdiqlandi</b>!`);
          }
          await sendPaymentChannelNotification(supabase, wdId, wd.user_id, wd.amount);
        }

        await sendMessage(chatId, `✅ So'rov tasdiqlandi: <code>${wdId.slice(0, 8)}</code>`);
      } else if (data.startsWith("reject_wd_")) {
        const wdId = data.replace("reject_wd_", "");
        await supabase.from("withdrawal_requests").update({ status: "rejected", processed_at: new Date().toISOString() }).eq("id", wdId);
        const { data: wd } = await supabase.from("withdrawal_requests").select("user_id, amount").eq("id", wdId).single();
        if (wd) {
          const { data: userProfile } = await supabase.from("profiles").select("telegram_id, cash").eq("id", wd.user_id).single();
          if (userProfile) {
            await supabase.from("profiles").update({ cash: (userProfile.cash || 0) + wd.amount }).eq("id", wd.user_id);
            if (userProfile.telegram_id) {
              await sendMessage(userProfile.telegram_id, `❌ Sizning 💵 ${wd.amount.toLocaleString()} tangalik pul chiqarish so'rovingiz <b>rad etildi</b>. Pul balansingizga qaytarildi.`);
            }
          }
        }
        await sendMessage(chatId, `❌ So'rov rad etildi: <code>${wdId.slice(0, 8)}</code>`);
      } else if (data.startsWith("reply_to_")) {
        const targetTgId = parseInt(data.replace("reply_to_", ""));
        if (!isNaN(targetTgId)) {
          await setAdminState(supabase, { action: "reply", data: { targetTgId } });
          await sendMessage(chatId, `💬 Foydalanuvchiga javob yozing (TG ID: <code>${targetTgId}</code>).\n\nBekor qilish: /cancel`);
        }
      }

      return new Response("OK", { status: 200 });
    }

    const message = update.message;
    if (!message?.text) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const fromUser = message.from;

    // Handle /cancel
    if (text === "/cancel") {
      await setAdminState(supabase, null);
      await sendMessage(chatId, "❌ Bekor qilindi.");
      return new Response("OK", { status: 200 });
    }

    // Check if admin has a pending action (DB-based)
    if (chatId === ADMIN_CHAT_ID) {
      const state = await getAdminState(supabase);
      if (state) {
        // Clear state immediately
        await setAdminState(supabase, null);

        if (state.action === "broadcast") {
          const { data: allProfiles } = await supabase.from("profiles").select("telegram_id").not("telegram_id", "is", null);
          const users = allProfiles || [];
          let sent = 0, failed = 0;
          
          await sendMessage(chatId, `📢 Xabar yuborilmoqda... (${users.length} ta foydalanuvchi)`);
          
          for (const u of users) {
            try {
              await sendMessage(u.telegram_id, text);
              sent++;
            } catch { failed++; }
            if (sent % 25 === 0) await new Promise(r => setTimeout(r, 1000));
          }
          
          await sendMessage(chatId, `✅ Xabar yuborildi!\n\n📤 Yuborildi: ${sent}\n❌ Xatolik: ${failed}`);
          return new Response("OK", { status: 200 });
        }

        if (state.action === "reply") {
          const targetTgId = state.data?.targetTgId;
          if (targetTgId) {
            await sendMessage(targetTgId, `💬 <b>Admin javobi:</b>\n\n${text}`);
            await sendMessage(chatId, `✅ Javob yuborildi (TG ID: ${targetTgId})`);
          }
          return new Response("OK", { status: 200 });
        }
      }
    }

    // Handle /start command
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const startParam = parts.length > 1 ? parts[1] : null;
      let miniAppStartParam = "";

      if (startParam?.startsWith("ref_")) {
        miniAppStartParam = startParam;
        const referrerIdentifier = startParam.replace("ref_", "");
        const newUserName = fromUser.first_name || fromUser.username || `ID:${fromUser.id}`;

        const result = await processReferralInDB(supabase, fromUser.id, newUserName, referrerIdentifier);

        if (result && !result.alreadyReferred && result.referrerProfile?.telegram_id) {
          const s = (await supabase.from("app_settings").select("value").eq("key", "referral").single())?.data?.value as any;
          const bonus = s?.referrer_bonus ?? 500;
          await sendMessage(result.referrerProfile.telegram_id,
            `🎉 <b>Yangi referal!</b>\n\n👤 <b>${newUserName}</b> sizning havolangiz orqali botga qo'shildi!\n\n🪙 Sizga +${bonus} bonus berildi!`
          );
        }
      }

      const miniAppButton = { text: "🎮 O'yinni ochish", web_app: { url: "https://c294.coresuz.ru" } };

      await sendMessage(chatId,
        `🌾 <b>Farm Empire</b>ga xush kelibsiz!\n\n🐔 Hayvonlar sotib oling\n🥚 Mahsulot yig'ing\n💰 Pul ishlang\n\nO'yinni boshlash uchun quyidagi tugmani bosing 👇`,
        {
          inline_keyboard: [
            [miniAppButton],
            [{ text: "📞 Admin bilan aloqa", url: `https://t.me/${BOT_USERNAME}?start=contact_admin` }],
            [{ text: "👥 Do'stlarni taklif qilish", url: `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${BOT_USERNAME}?start=ref_${fromUser.id}`)}&text=${encodeURIComponent("🌾 Farm Empire o'yiniga qo'shiling va bonus oling!")}` }],
          ],
        }
      );

      if (startParam === "contact_admin") {
        await sendMessage(chatId, `📞 <b>Admin bilan aloqa</b>\n\nSavolingizni shu yerga yozing, admin javob beradi.`);
        const userName = fromUser.first_name || fromUser.username || `ID:${fromUser.id}`;
        await sendMessage(ADMIN_CHAT_ID, `📩 <b>Yangi xabar!</b>\n\n👤 <b>${userName}</b> (@${fromUser.username || "noma'lum"})\n🆔 ID: <code>${fromUser.id}</code>\n\nFoydalanuvchi aloqa so'radi.`);
      }

      return new Response("OK", { status: 200 });
    }

    // Handle /admin command
    if (text === "/admin" || text === "/panel") {
      if (chatId === ADMIN_CHAT_ID) {
        await handleAdminPanel(chatId);
      } else {
        await sendMessage(chatId, "⛔ Sizda ruxsat yo'q.");
      }
      return new Response("OK", { status: 200 });
    }

    // Forward user messages to admin with reply button
    if (chatId !== ADMIN_CHAT_ID) {
      const userName = fromUser.first_name || fromUser.username || `ID:${fromUser.id}`;
      await sendMessage(ADMIN_CHAT_ID,
        `📩 <b>Xabar</b> — ${userName} (@${fromUser.username || "noma'lum"})\n🆔 <code>${fromUser.id}</code>\n\n${text}`,
        { inline_keyboard: [[{ text: "💬 Javob berish", callback_data: `reply_to_${fromUser.id}` }]] }
      );
      await sendMessage(chatId, "✅ Xabaringiz adminga yuborildi. Javob kutib turing.");
    } else {
      if (!text.startsWith("/")) {
        await sendMessage(chatId, "ℹ️ Admin panel uchun /admin buyrug'ini yozing.");
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[bot] Error:", error);
    return new Response("OK", { status: 200 });
  }
});
