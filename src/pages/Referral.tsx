import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Copy, Gift, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import TelegramBackButton from "@/components/TelegramBackButton";

interface ReferralSettings {
  enabled: boolean;
  referrer_bonus: number;
  referee_bonus: number;
  min_tasks_required: number;
}

export default function Referral() {
  const { profile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const botUsername = "Farm_Market_bot";

  useEffect(() => {
    refreshProfile();
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "referral")
      .single()
      .then(({ data }) => {
        if (data?.value) setSettings(data.value as unknown as ReferralSettings);
        setLoading(false);
      });
  }, []);

  const referralCount = profile?.referral_count ?? 0;
  const referralLevel = Math.min(Math.floor(referralCount / 10), 10);
  const referralPercent = referralLevel; // 1-10%
  const nextLevelAt = (referralLevel + 1) * 10;
  const referralsToNextLevel = referralLevel >= 10 ? 0 : nextLevelAt - referralCount;

  // Bot start link - ref goes through bot /start for proper tracking
  const referralLink = profile?.telegram_id
    ? `https://t.me/${botUsername}?start=ref_${profile.telegram_id}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Havola nusxalandi!");
  };

  const shareLink = () => {
    const tgApp = (window as any).Telegram?.WebApp;
    const text = `🌾 Farm Empire o'yiniga qo'shiling va bonus oling!`;
    if (tgApp?.openTelegramLink) {
      tgApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`);
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen safe-bottom pb-4">
      <TelegramBackButton />
      <div className="gradient-hero px-4 pb-6 pt-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Users className="h-10 w-10 text-primary-foreground mx-auto mb-2" />
          <h1 className="text-xl font-extrabold text-primary-foreground">👥 Referal dasturi</h1>
          <p className="text-xs text-primary-foreground/70 mt-1">
            Do'stlaringizni taklif qiling va bonus oling!
          </p>
        </motion.div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
          <div className="farm-card text-center py-4">
            <p className="text-2xl font-black text-foreground">{referralCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Referallar</p>
          </div>
          <div className="farm-card text-center py-4">
            <p className="text-2xl font-black text-foreground">{referralPercent}%</p>
            <p className="text-xs text-muted-foreground mt-1">Daraja</p>
          </div>
          <div className="farm-card text-center py-4">
            <p className="text-2xl font-black text-foreground">🪙 {(profile?.referral_earnings ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Daromad</p>
          </div>
        </motion.div>

        {/* Level progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="farm-card">
          <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" /> Foiz darajasi
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hozirgi daraja</span>
              <span className="font-bold text-foreground">{referralPercent}% (Level {referralLevel})</span>
            </div>
            {referralLevel < 10 && (
              <>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${((referralCount % 10) / 10) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Keyingi daraja ({referralPercent + 1}%) uchun yana <span className="font-bold text-foreground">{referralsToNextLevel} ta</span> referal kerak
                </p>
              </>
            )}
            {referralLevel >= 10 && (
              <p className="text-xs font-bold text-primary">🎉 Maksimal darajaga yetdingiz!</p>
            )}
          </div>
        </motion.div>

        {/* Referral link */}
        {settings?.enabled !== false && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="farm-card">
            <h2 className="text-sm font-bold text-foreground mb-2">Sizning havolangiz</h2>
            <div className="flex gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-xs text-foreground truncate"
              />
              <button onClick={copyLink} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={shareLink}
              className="w-full mt-3 rounded-xl bg-accent/10 py-2.5 text-xs font-bold text-accent-foreground transition-transform active:scale-95"
            >
              📤 Telegramda ulashish
            </button>
          </motion.div>
        )}

        {/* Bonus info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="farm-card">
          <h2 className="text-sm font-bold text-foreground mb-2">
            <Gift className="inline h-4 w-4 mr-1" /> Bonus tizimi
          </h2>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Siz olasiz (bir martalik):</span>
              <span className="font-bold text-foreground">🪙 +{settings?.referrer_bonus ?? 1000}</span>
            </div>
            <div className="flex justify-between">
              <span>Do'stingiz oladi:</span>
              <span className="font-bold text-foreground">🪙 +{settings?.referee_bonus ?? 200}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between">
              <span>Foiz daromad:</span>
              <span className="font-bold text-foreground">Do'stingiz pul yechganda {referralPercent}%</span>
            </div>
          </div>
        </motion.div>

        {/* How levels work */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="farm-card">
          <h2 className="text-sm font-bold text-foreground mb-2">📊 Darajalar</h2>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
              <div
                key={lvl}
                className={`rounded-lg py-1.5 text-xs font-bold ${
                  lvl <= referralLevel
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {lvl}%
                <p className="text-[9px] font-normal">{lvl * 10}+</p>
              </div>
            ))}
          </div>
        </motion.div>

        {settings?.enabled === false && (
          <div className="farm-card bg-destructive/5 border-destructive/20 text-center">
            <p className="text-xs font-semibold text-destructive">Referal tizimi hozircha o'chirilgan</p>
          </div>
        )}
      </div>
    </div>
  );
}
