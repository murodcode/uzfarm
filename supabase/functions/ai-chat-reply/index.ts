import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sen "Farm Empire" o'yin botining aqlli biznes yordamchisisan. Foydalanuvchilarga qisqa, aniq va professional javob ber.

O'yin haqida:
- Hayvonlar: Tovuq (500 tanga), Kurka (1200), Echki (2000), Qo'y (3000), Sigir (5000)
- Mahsulotlar: Tuxum (tovuq/kurka), Sut (sigir), Go'sht (qo'y/echki so'yish)
- Ovqatlantirish: Har 15 daqiqada, och qolsa mahsuldorlik tushadi
- Bozor: Mahsulotlarni sotish → 70% tanga + 30% naqd pul
- Pul ishlash: Mahsulot sotish, kunlik vazifalar, referallar, reklama ko'rish
- Pul chiqarish: Minimal 20,000 tanga, karta raqamini kiritish kerak, 24 soatda ko'rib chiqiladi
- Referal: Do'stlarni taklif qilish orqali bonus olish
- Almashtirish: Tangalarni naqd pulga almashtirish mumkin

Qoidalar:
1. Faqat ferma o'yini bilan bog'liq savollarga javob ber
2. Agar savol o'yinga aloqasiz bo'lsa: "Iltimos, ferma bot bo'yicha savol bering 😊" de
3. Javoblar 2-3 gap bo'lsin, ortiqcha uzun bo'lmasin
4. Do'stona va professional ohangda gapir
5. Emoji ishlat, lekin ortiqcha emas`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_message, user_id } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if AI auto-reply is enabled
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: aiSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "ai_auto_reply")
      .single();

    if (!aiSetting?.value || (aiSetting.value as any).enabled !== true) {
      return new Response(JSON.stringify({ enabled: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get custom instructions
    const { data: customInstr } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "ai_custom_instructions")
      .single();

    let systemPrompt = SYSTEM_PROMPT;
    if (customInstr?.value && (customInstr.value as any).text) {
      systemPrompt += `\n\nAdmin qo'shimcha ko'rsatmalari:\n${(customInstr.value as any).text}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: user_message },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Kechirasiz, javob bera olmadim.";

    // Save AI reply to chat_messages
    if (user_id) {
      await adminClient.from("chat_messages").insert({
        user_id,
        message: reply,
        sender: "ai",
      });
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI chat error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
