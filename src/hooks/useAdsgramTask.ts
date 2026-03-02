import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADSGRAM_BLOCK_ID = "int-23556";
const COOLDOWN_MS = 60_000; // 1 minute
const MIN_AD_VIEW_MS = 10_000; // 10 seconds
const REWARD_COINS = 30;

interface AdController {
  show: () => Promise<{ done: boolean; description: string; state: string; error: boolean }>;
  destroy: () => void;
}

declare global {
  interface Window {
    Adsgram?: {
      init: (config: { blockId: string; debug?: boolean }) => AdController;
    };
  }
}

let controller: AdController | null = null;

function getController(): AdController | null {
  if (controller) return controller;
  if (window.Adsgram) {
    controller = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
    return controller;
  }
  return null;
}

export function useAdsgramTask() {
  const [adsgramLoading, setAdsgramLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const lastWatchRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastWatchRef.current;
      const remaining = Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      setCooldownRemaining(remaining);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const watchAdsgramAd = useCallback(async (): Promise<boolean> => {
    if (adsgramLoading) return false;

    // Cooldown check
    if (Date.now() - lastWatchRef.current < COOLDOWN_MS) {
      toast.info("⏳ 1 daqiqa kutishingiz kerak!");
      return false;
    }

    const ctrl = getController();
    if (!ctrl) {
      toast.error("Reklama yuklanmadi");
      return false;
    }

    setAdsgramLoading(true);
    const startTime = Date.now();

    try {
      const result = await ctrl.show();

      const elapsed = Date.now() - startTime;

      if (elapsed < MIN_AD_VIEW_MS) {
        toast.error(
          `❌ Reklamadagi tugmani bosmadingiz va ${Math.ceil(MIN_AD_VIEW_MS / 1000)} soniya reklamani ko'rmadingiz!`,
          { duration: 5000, style: { fontSize: "16px", fontWeight: "bold" } }
        );
        setAdsgramLoading(false);
        return false;
      }

      if (!result.done) {
        toast.error(
          `❌ Reklamadagi tugmani bosmadingiz va ${Math.ceil(MIN_AD_VIEW_MS / 1000)} soniya reklamani ko'rmadingiz!`,
          { duration: 5000, style: { fontSize: "16px", fontWeight: "bold" } }
        );
        setAdsgramLoading(false);
        return false;
      }

      // Reward user
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("coins, ad_views")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              coins: profile.coins + REWARD_COINS,
              ad_views: (profile.ad_views || 0) + 1,
            })
            .eq("id", session.user.id);
        }
      }

      lastWatchRef.current = Date.now();
      toast.success(`✅ Reklama ko'rildi! 🪙 +${REWARD_COINS}`);
      setAdsgramLoading(false);
      return true;
    } catch {
      toast.error(
        `❌ Reklamadagi tugmani bosmadingiz va ${Math.ceil(MIN_AD_VIEW_MS / 1000)} soniya reklamani ko'rmadingiz!`,
        { duration: 5000, style: { fontSize: "16px", fontWeight: "bold" } }
      );
      setAdsgramLoading(false);
      return false;
    }
  }, [adsgramLoading]);

  return { watchAdsgramAd, cooldownRemaining, adsgramLoading };
}
