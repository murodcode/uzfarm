import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGameContext } from "@/contexts/GameStateContext";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { CheckCircle2, Clock, Gift, Star, ExternalLink, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { DAILY_TASK_DEFS, getDailyProgress, claimDailyReward } from "@/lib/dailyTasks";

interface GameTask {
  id: string;
  name: string;
  description: string;
  reward_coins: number;
  reward_cash: number;
  is_daily: boolean;
  requirement_type: string;
  requirement_value: number;
  task_type: string;
  url: string | null;
}

interface DailyProgressItem {
  task_key: string;
  progress: number;
  target: number;
  reward_coins: number;
  reward_claimed: boolean;
}

export default function Tasks() {
  const { user, refreshProfile } = useAuth();
  const { refreshFromDb } = useGameContext();
  const { showAd } = useRewardedAd();
  const [tasks, setTasks] = useState<GameTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgressItem[]>([]);
  const [claimingDaily, setClaimingDaily] = useState<string | null>(null);

  const loadDailyProgress = useCallback(async () => {
    if (!user) return;
    const data = await getDailyProgress(user.id);
    setDailyProgress(
      data.map((d: any) => ({
        task_key: d.task_key,
        progress: d.progress,
        target: d.target,
        reward_coins: d.reward_coins,
        reward_claimed: d.reward_claimed,
      }))
    );
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: tasksData } = await supabase.from("game_tasks").select("*");
      if (tasksData) setTasks(tasksData);

      if (user) {
        const { data: completions } = await supabase
          .from("user_task_completions")
          .select("task_id")
          .eq("user_id", user.id);
        if (completions) {
          setCompletedTaskIds(new Set(completions.map((c) => c.task_id)));
        }
        await loadDailyProgress();
      }
      setLoading(false);
    };
    fetchData();
  }, [user, loadDailyProgress]);

  const handleSubscribe = (task: GameTask) => {
    const channelUrl = task.url || `https://t.me/${task.requirement_type.replace("@", "").replace("-100", "")}`;
    const tgApp = (window as any).Telegram?.WebApp;
    if (tgApp?.openTelegramLink) {
      tgApp.openTelegramLink(channelUrl);
    } else {
      window.open(channelUrl, "_blank");
    }
  };

  const handleVerify = async (task: GameTask) => {
    setVerifying(task.id);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        body: { task_id: task.id },
      });

      if (error) {
        let msg = "Tekshirishda xatolik";
        try {
          if (error.context) {
            const resp = await error.context.json();
            msg = resp?.error || msg;
          }
        } catch {}
        toast.error(msg);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        toast.success(
          `Tabriklaymiz! ${data.reward_coins > 0 ? `🪙 +${data.reward_coins}` : ""} ${data.reward_cash > 0 ? `💵 +${data.reward_cash}` : ""}`
        );
        setCompletedTaskIds((prev) => new Set([...prev, task.id]));
        await refreshProfile();
      }
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleWatchAd = () => {
    showAd()
      .then(() => {
        toast.success("Reklama ko'rildi! 🎥");
        // Refresh daily progress after a short delay
        setTimeout(loadDailyProgress, 1000);
      })
      .catch(() => {
        toast.error("Reklama ko'rsatilmadi");
      });
  };

  const handleClaimDaily = async (taskKey: string) => {
    if (!user) return;
    setClaimingDaily(taskKey);
    try {
      const coins = await claimDailyReward(user.id, taskKey);
      if (coins > 0) {
        toast.success(`Mukofot olindi! 🪙 +${coins}`);
        await loadDailyProgress();
        await refreshFromDb();
        await refreshProfile();
      } else {
        toast.error("Mukofotni olishda xatolik");
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    } finally {
      setClaimingDaily(null);
    }
  };

  const oneTimeTasks = tasks.filter((t) => !t.is_daily);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen safe-bottom">
      <div className="px-4 pt-8 pb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-extrabold text-foreground">📋 Vazifalar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vazifalarni bajaring va mukofot oling!
          </p>
        </motion.div>
      </div>

      <div className="px-4 space-y-4 pb-4">
        {/* Daily tasks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Kunlik vazifalar</h2>
          </div>
          <div className="space-y-3">
            {DAILY_TASK_DEFS.map((def, i) => {
              const progress = dailyProgress.find((p) => p.task_key === def.key);
              const currentProgress = progress?.progress || 0;
              const isClaimed = progress?.reward_claimed || false;
              const isComplete = currentProgress >= def.target;
              const isWatchAds = def.key === "watch_ads";
              const isClaiming = claimingDaily === def.key;

              return (
                <motion.div
                  key={def.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className={`farm-card ${isClaimed ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                        {def.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground">{def.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{currentProgress}/{def.target}</span>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                              🪙 +{def.reward_coins}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(100, (currentProgress / def.target) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {isClaimed && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isClaimed && (
                      <div className="flex gap-2 mt-3">
                        {isWatchAds && !isComplete && (
                          <button
                            onClick={handleWatchAd}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-accent/10 py-2.5 text-xs font-bold text-accent-foreground"
                          >
                            🎥 Reklama ko'rish
                          </button>
                        )}
                        {isComplete && (
                          <button
                            onClick={() => handleClaimDaily(def.key)}
                            disabled={isClaiming}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                          >
                            {isClaiming ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trophy className="h-3.5 w-3.5" />
                            )}
                            Mukofotni olish
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Subscribe tasks */}
        {oneTimeTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold text-foreground">Kanalga obuna vazifalari</h2>
            </div>
            <div className="space-y-3">
              {oneTimeTasks.map((task, i) => {
                const isCompleted = completedTaskIds.has(task.id);
                const isSubscribeTask = task.task_type === "subscribe";
                const isVerifyingThis = verifying === task.id;

                return (
                  <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <div className={`farm-card ${isCompleted ? "opacity-60" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Star className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground">{task.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {task.reward_coins > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                🪙 +{task.reward_coins}
                              </span>
                            )}
                            {task.reward_cash > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent-foreground">
                                💵 +{task.reward_cash}
                              </span>
                            )}
                          </div>
                        </div>
                        {isCompleted && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>

                      {isSubscribeTask && !isCompleted && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleSubscribe(task)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-accent/10 py-2.5 text-xs font-bold text-accent-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Obuna bo'lish
                          </button>
                          <button
                            onClick={() => handleVerify(task)}
                            disabled={isVerifyingThis}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                          >
                            {isVerifyingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Tekshirish
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {tasks.length === 0 && DAILY_TASK_DEFS.length === 0 && (
          <div className="farm-card text-center py-12">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground">Vazifalar yo'q</h3>
            <p className="text-sm text-muted-foreground">Tez orada yangi vazifalar qo'shiladi</p>
          </div>
        )}
      </div>
    </div>
  );
}
