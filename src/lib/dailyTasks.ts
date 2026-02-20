import { supabase } from "@/integrations/supabase/client";

export interface DailyTaskDef {
  key: string;
  name: string;
  description: string;
  target: number;
  reward_coins: number;
  emoji: string;
}

export const DAILY_TASK_DEFS: DailyTaskDef[] = [
  { key: "watch_ads", name: "Reklama ko'rish", description: "10 ta reklama ko'ring", target: 10, reward_coins: 500, emoji: "🎥" },
  { key: "collect_eggs", name: "Tuxum yig'ish", description: "5 ta tuxum yig'ing", target: 5, reward_coins: 200, emoji: "🥚" },
  { key: "buy_animal", name: "Hayvon sotib olish", description: "1 ta hayvon sotib oling", target: 1, reward_coins: 300, emoji: "🐄" },
  { key: "sell_product", name: "Mahsulot sotish", description: "1 marta mahsulot soting", target: 1, reward_coins: 150, emoji: "💰" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export async function incrementDailyTask(userId: string, taskKey: string, amount = 1) {
  const today = todayStr();
  const def = DAILY_TASK_DEFS.find((t) => t.key === taskKey);
  if (!def) return;

  const { data: existing } = await supabase
    .from("daily_task_progress" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("task_key", taskKey)
    .eq("task_date", today)
    .maybeSingle();

  if (existing) {
    if ((existing as any).reward_claimed) return;
    await supabase
      .from("daily_task_progress" as any)
      .update({ progress: Math.min(def.target, (existing as any).progress + amount) })
      .eq("id", (existing as any).id);
  } else {
    await supabase.from("daily_task_progress" as any).insert({
      user_id: userId,
      task_key: taskKey,
      progress: Math.min(def.target, amount),
      target: def.target,
      reward_coins: def.reward_coins,
      task_date: today,
    });
  }
}

export async function claimDailyReward(userId: string, taskKey: string): Promise<number> {
  const today = todayStr();
  const def = DAILY_TASK_DEFS.find((t) => t.key === taskKey);
  if (!def) return 0;

  const { data } = await supabase
    .from("daily_task_progress" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("task_key", taskKey)
    .eq("task_date", today)
    .maybeSingle();

  if (!data || (data as any).progress < def.target || (data as any).reward_claimed) return 0;

  await supabase
    .from("daily_task_progress" as any)
    .update({ reward_claimed: true })
    .eq("id", (data as any).id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("coins")
    .eq("id", userId)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({ coins: profile.coins + def.reward_coins })
      .eq("id", userId);
  }

  return def.reward_coins;
}

export async function getDailyProgress(userId: string) {
  const today = todayStr();
  const { data } = await supabase
    .from("daily_task_progress" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("task_date", today);
  return (data || []) as any[];
}
