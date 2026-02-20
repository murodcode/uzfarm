import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Called when a withdrawal is approved to give referrer their percentage
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { withdrawal_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the withdrawal
    const { data: withdrawal, error: wErr } = await supabase
      .from("withdrawal_requests")
      .select("id, user_id, amount, status")
      .eq("id", withdrawal_id)
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: "Withdrawal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's referrer
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", withdrawal.user_id)
      .single();

    if (!userProfile?.referred_by) {
      return new Response(JSON.stringify({ message: "No referrer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get referrer's level
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, coins, referral_earnings, referral_level")
      .eq("id", userProfile.referred_by)
      .single();

    if (!referrer || referrer.referral_level <= 0) {
      return new Response(JSON.stringify({ message: "Referrer has 0% level" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if bonus already given for this withdrawal
    const { data: existing } = await supabase
      .from("referral_transactions")
      .select("id")
      .eq("referrer_id", referrer.id)
      .eq("referred_user_id", withdrawal.user_id)
      .eq("amount", withdrawal.amount)
      .gte("created_at", new Date(Date.now() - 60000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ message: "Bonus already given" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const percent = referrer.referral_level; // 1-10
    const bonus = Math.floor(withdrawal.amount * percent / 100);

    if (bonus <= 0) {
      return new Response(JSON.stringify({ message: "Bonus is 0" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Give bonus to referrer
    await supabase.from("profiles").update({
      coins: (referrer.coins || 0) + bonus,
      referral_earnings: (referrer.referral_earnings || 0) + bonus,
    }).eq("id", referrer.id);

    // Log transaction
    await supabase.from("referral_transactions").insert({
      referrer_id: referrer.id,
      referred_user_id: withdrawal.user_id,
      amount: withdrawal.amount,
      percent: percent,
    });

    console.log(`Referral bonus: ${bonus} coins (${percent}%) to ${referrer.id} from withdrawal ${withdrawal_id}`);

    return new Response(
      JSON.stringify({ success: true, bonus, percent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Referral bonus error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
