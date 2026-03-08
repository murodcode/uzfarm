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

// Store pending referral in app_settings so telegram-auth can process it
async function storePendingReferral(
  supabase: any,
  newTelegramId: number,
  referrerIdentifier: string
): Promise<void> {
  console.log("[bot-referral] Storing pending referral:", newTelegramId, "ref:", referrerIdentifier);
  
  const numericId = Number(referrerIdentifier);
  if (isNaN(numericId) || numericId <= 0) return;
  if (numericId === newTelegramId) return;

  // Store as pending referral
  await supabase.from("app_settings").upsert(
    { 
      key: `pending_ref_${newTelegramId}`, 
      value: { referrer_tg_id: numericId, created_at: new Date().toISOString() },
      updated_at: new Date().toISOString() 
    },
    { onConflict: "key" }
  );
  console.log("[bot-referral] ✅ Pending referral stored for tg:", newTelegramId);
}

async function handleAdminPanel(chatId: number) {
  await sendMessage(chatId, "🛡 <b>Admin Panel</b>\n\nQuyidagi buyruqlardan foydalaning:", {
    inline_keyboard: [
      [{ text: "📊 Statistika", callback_data: "admin_stats" }],
      [{ text: "📢 Umumiy xabar yuborish", callback_data: "admin_broadcast" }],
      [{ text: "🏆 Referal reyting", callback_data: "admin_referral_ranking" }],
      [{ text: "👥 Foydalanuvchilar soni", callback_data: "admin_user_count" }],
      [{ text: "🔗 Majburiy azolik sozlamalari", callback_data: "admin_subscription" }],
    ],
  });
}

// Fetch all rows bypassing 1000-row limit
async function fetchAllProfiles(supabase: any, columns: string) {
  const allRows: any[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data } = await supabase.from("profiles").select(columns).range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

async function handleAdminStats(supabase: any, chatId: number) {
  const all = await fetchAllProfiles(supabase, "id, coins, cash, ad_views, is_blocked, created_at, referral_count");
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
      `💰 Miqdor: <b>${amount.toLocaleString()} pul</b>\n` +
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
            await sendMessage(userProfile.telegram_id, `✅ Sizning 💵 ${wd.amount.toLocaleString()} pullik (${somAmt.toLocaleString()} so'm) pul chiqarish so'rovingiz <b>tasdiqlandi</b>!`);
          }
          await sendPaymentChannelNotification(supabase, wdId, wd.user_id, wd.amount);
        }

        await sendMessage(chatId, `✅ So'rov tasdiqlandi: <code>${wdId.slice(0, 8)}</code>`);
      } else if (data.startsWith("reject_wd_")) {
        const wdId = data.replace("reject_wd_", "");
        await supabase.from("withdrawal_requests").update({ status: "rejected", processed_at: new Date().toISOString() }).eq("id", wdId);
        const { data: wd } = await supabase.from("withdrawal_requests").select("user_id, amount, referrals_consumed").eq("id", wdId).single();
        if (wd) {
          const { data: userProfile } = await supabase.from("profiles").select("telegram_id, cash, referral_count").eq("id", wd.user_id).single();
          if (userProfile) {
            const updates: any = { cash: (userProfile.cash || 0) + wd.amount };
            if (wd.referrals_consumed > 0) {
              updates.referral_count = (userProfile.referral_count || 0) + wd.referrals_consumed;
            }
            await supabase.from("profiles").update(updates).eq("id", wd.user_id);
            if (userProfile.telegram_id) {
              const refText = wd.referrals_consumed > 0 ? `\n👤 ${wd.referrals_consumed} ta referal qaytarildi.` : "";
              await sendMessage(userProfile.telegram_id, `❌ Sizning 💵 ${wd.amount.toLocaleString()} pullik pul chiqarish so'rovingiz <b>rad etildi</b>. Pul balansingizga qaytarildi.${refText}`);
            }
          }
        }
        await sendMessage(chatId, `❌ So'rov rad etildi: <code>${wdId.slice(0, 8)}</code>`);
      } else if (data === "bot_help" || data === "back_to_start") {
        // Redirect to help or start via deeplink
        const url = data === "bot_help" 
          ? `https://t.me/${BOT_USERNAME}?start=help`
          : `https://t.me/${BOT_USERNAME}?start=main`;
        await sendMessage(chatId, data === "bot_help" ? "📖 Qo'llanmani ko'rish uchun tugmani bosing:" : "🏠 Bosh menyu:", {
          inline_keyboard: [[{ text: data === "bot_help" ? "📖 Qo'llanma" : "🏠 Bosh menyu", url }]],
        });
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
            // Save admin reply to chat_messages
            const { data: targetProfile } = await supabase.from("profiles")
              .select("id")
              .eq("telegram_id", targetTgId)
              .single();
            if (targetProfile?.id) {
              await supabase.from("chat_messages").insert({
                user_id: targetProfile.id,
                message: text,
                sender: "admin",
              });
            }
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

      if (startParam?.startsWith("ref_")) {
        const referrerIdentifier = startParam.replace("ref_", "");
        // Just store pending referral - telegram-auth will process it
        await storePendingReferral(supabase, fromUser.id, referrerIdentifier);
      }

      if (startParam === "contact_admin") {
        await sendMessage(chatId, `📞 <b>Admin bilan aloqa</b>\n\nSavolingizni shu yerga yozing, admin javob beradi.`);
        const userName = fromUser.first_name || fromUser.username || `ID:${fromUser.id}`;
        await sendMessage(ADMIN_CHAT_ID, `📩 <b>Yangi xabar!</b>\n\n👤 <b>${userName}</b> (@${fromUser.username || "noma'lum"})\n🆔 ID: <code>${fromUser.id}</code>\n\nFoydalanuvchi aloqa so'radi.`);
        return new Response("OK", { status: 200 });
      }

      // Help/guide command
      if (startParam === "help") {
        await sendMessage(chatId,
          `📖 <b>Farm Empire — To'liq Qo'llanma</b>\n\n` +
          `🌾 <b>Farm Empire</b> — bu virtual ferma o'yini. Hayvonlar sotib oling, boqing, mahsulotlarni yig'ing va haqiqiy pul ishlang!\n\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `🎮 <b>QANDAY O'YNASH KERAK?</b>\n━━━━━━━━━━━━━━━━\n\n` +
          `1️⃣ <b>Hayvon sotib oling</b>\n` +
          `   🐔 Tovuq — 500 tanga\n` +
          `   🦃 Kurka — 1,200 tanga\n` +
          `   🐐 Echki — 2,000 tanga\n` +
          `   🐑 Qo'y — 3,000 tanga\n` +
          `   🐄 Sigir — 5,000 tanga\n\n` +
          `2️⃣ <b>Hayvonlarni boqing</b>\n` +
          `   🍽 Har 15 daqiqada ovqat bering\n` +
          `   📈 Har boqishda o'sish foizi oshadi\n` +
          `   ⚠️ Och qolsa — mahsuldorlik tushadi\n\n` +
          `3️⃣ <b>Mahsulot yig'ing</b>\n` +
          `   🥚 Tovuq/Kurka → Tuxum\n` +
          `   🥛 Sigir → Sut\n` +
          `   🥩 Qo'y/Echki → Go'sht (so'yish)\n\n` +
          `4️⃣ <b>Bozorda soting</b>\n` +
          `   💰 Mahsulotlarni bozorda soting\n` +
          `   🪙 70% tanga + 💵 30% naqd pul\n\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `💰 <b>PUL ISHLASH USULLARI</b>\n━━━━━━━━━━━━━━━━\n\n` +
          `✅ Mahsulotlarni bozorda sotish\n` +
          `✅ Kunlik vazifalarni bajarish\n` +
          `✅ Do'stlarni taklif qilish (referal)\n` +
          `✅ Reklama ko'rish\n\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `💵 <b>PUL CHIQARISH</b>\n━━━━━━━━━━━━━━━━\n\n` +
          `📌 Minimal: 20,000 tanga\n` +
          `💳 Karta raqamini kiriting\n` +
          `⏳ 24 soat ichida ko'rib chiqiladi\n\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `👥 <b>REFERAL TIZIM</b>\n━━━━━━━━━━━━━━━━\n\n` +
          `🔗 Havolangizni do'stlarga yuboring\n` +
          `🪙 Har bir referal uchun bonus oling\n` +
          `📈 Ko'proq referal = yuqori daraja\n`,
          {
            inline_keyboard: [
              [{ text: "🎮 O'yinni ochish", web_app: { url: "https://c294.coresuz.ru" } }],
              [{ text: "🔙 Bosh menyu", callback_data: "back_to_start" }],
            ],
          }
        );
        return new Response("OK", { status: 200 });
      }

      const miniAppUrl = startParam?.startsWith("ref_")
        ? `https://c294.coresuz.ru?startapp=${startParam}`
        : "https://c294.coresuz.ru";
      const miniAppButton = { text: "🎮 O'yinni ochish", web_app: { url: miniAppUrl } };

      await sendMessage(chatId,
        `🌾 <b>Farm Empire</b>ga xush kelibsiz!\n\n` +
        `🐔 Hayvonlar sotib oling\n` +
        `🥚 Mahsulot yig'ing\n` +
        `💰 Haqiqiy pul ishlang\n\n` +
        `O'yinni boshlash uchun quyidagi tugmani bosing 👇`,
        {
          inline_keyboard: [
            [miniAppButton],
            [{ text: "📢 Rasmiy kanal", url: "https://t.me/farm_market_news" }, { text: "📞 Aloqa", url: "https://t.me/Boglanish_mazkazi_Bot" }],
          ],
        }
      );

      return new Response("OK", { status: 200 });
    }

    // Handle /help command
    if (text === "/help" || text === "/yordam") {
      // Redirect to help
      await sendMessage(chatId, "📖 Qo'llanmani ko'rish uchun pastdagi tugmani bosing:", {
        inline_keyboard: [[{ text: "📖 Qo'llanmani ochish", url: `https://t.me/${BOT_USERNAME}?start=help` }]],
      });
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

    // Forward user messages to admin with reply button + save to chat_messages
    if (chatId !== ADMIN_CHAT_ID) {
      const userName = fromUser.first_name || fromUser.username || `ID:${fromUser.id}`;
      
      // Find user profile to get user_id
      const { data: userProfile } = await supabase.from("profiles")
        .select("id")
        .eq("telegram_id", fromUser.id)
        .single();

      // Save to chat_messages DB
      if (userProfile?.id) {
        await supabase.from("chat_messages").insert({
          user_id: userProfile.id,
          telegram_id: fromUser.id,
          username: fromUser.username || null,
          first_name: fromUser.first_name || null,
          message: text,
          sender: "user",
        });

        // Check AI auto-reply setting
        const { data: aiSetting } = await supabase.from("app_settings")
          .select("value")
          .eq("key", "ai_auto_reply")
          .single();

        if (aiSetting?.value && (aiSetting.value as any).enabled === true) {
          try {
            const aiRes = await fetch(`${SUPABASE_URL()}/functions/v1/ai-chat-reply`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_ROLE_KEY()}`,
              },
              body: JSON.stringify({ user_message: text, user_id: userProfile.id }),
            });
            const aiData = await aiRes.json();
            if (aiData.reply) {
              await sendMessage(chatId, `🤖 ${aiData.reply}`);
            }
          } catch (e) {
            console.error("[bot] AI reply error:", e);
          }
        }
      }

      // Forward to admin
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
