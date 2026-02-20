import { useCallback, useRef } from "react";
import createAdHandler from "monetag-tg-sdk";
import { supabase } from "@/integrations/supabase/client";
import { incrementDailyTask } from "@/lib/dailyTasks";

const ZONE_ID = 10612725;

let adHandlerInstance: ReturnType<typeof createAdHandler> | null = null;

function getAdHandler() {
  if (!adHandlerInstance) {
    adHandlerInstance = createAdHandler(ZONE_ID);
  }
  return adHandlerInstance;
}

async function recordAdView() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const userId = session.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("ad_views")
      .eq("id", userId)
      .single();
    if (profile) {
      await supabase
        .from("profiles")
        .update({ ad_views: (profile.ad_views || 0) + 1 })
        .eq("id", userId);
    }

    // Track daily task progress
    await incrementDailyTask(userId, "watch_ads");
  } catch (err) {
    console.error("Failed to record ad view:", err);
  }
}

export function useRewardedAd() {
  const showingRef = useRef(false);

  const showAd = useCallback((): Promise<void> => {
    if (showingRef.current) return Promise.reject(new Error("Ad already showing"));
    showingRef.current = true;

    const handler = getAdHandler();
    return handler()
      .then(() => {
        showingRef.current = false;
        recordAdView();
      })
      .catch((err: unknown) => {
        showingRef.current = false;
        throw err;
      });
  }, []);

  const withAd = useCallback(
    (action: () => void) => {
      showAd()
        .then(() => {
          action();
        })
        .catch(() => {
          // Ad failed or skipped
        });
    },
    [showAd]
  );

  return { showAd, withAd };
}
