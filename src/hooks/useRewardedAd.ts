import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ── Adsgram (entry ad only) ── */
const ADSGRAM_BLOCK_ID = "int-23556";

interface AdController {
  show: () => Promise<{ done: boolean; description: string; state: string; error: boolean }>;
  destroy: () => void;
}

declare global {
  interface Window {
    Adsgram?: {
      init: (config: { blockId: string; debug?: boolean }) => AdController;
    };
    show_10612725?: () => Promise<void>;
  }
}

let adsgramController: AdController | null = null;

function getAdsgramController(): AdController | null {
  if (adsgramController) return adsgramController;
  if (window.Adsgram) {
    adsgramController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
    return adsgramController;
  }
  return null;
}

/* ── Record ad view in DB ── */
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
  } catch (err) {
    console.error("Failed to record ad view:", err);
  }
}

/* ── Monetag rewarded ad (for actions: feed, collect, sell, etc.) ── */
export function useRewardedAd() {
  const showingRef = useRef(false);

  const showAd = useCallback((): Promise<void> => {
    if (showingRef.current) return Promise.reject(new Error("Ad already showing"));

    const monetagShow = window.show_10612725;
    if (!monetagShow) {
      // SDK not loaded – resolve silently so actions still work
      return Promise.resolve();
    }

    showingRef.current = true;

    return monetagShow()
      .then(() => {
        showingRef.current = false;
        recordAdView();
      })
      .catch((err) => {
        showingRef.current = false;
        console.log("Monetag ad skipped/error:", err);
        // Resolve so actions still execute
      });
  }, []);

  const withAd = useCallback(
    (action: () => void) => {
      showAd()
        .then(() => action())
        .catch(() => action());
    },
    [showAd]
  );

  return { showAd, withAd };
}

/* ── Adsgram entry ad (shown once on app load) ── */
export function useEntryAd() {
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    const timer = setTimeout(() => {
      const controller = getAdsgramController();
      if (controller) {
        controller.show()
          .then((result) => {
            if (result.done) {
              recordAdView();
            }
          })
          .catch(() => {
            // silently ignore
          });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);
}
