import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BLOCK_ID = "int-23556";

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

let adController: AdController | null = null;

function getAdController(): AdController | null {
  if (adController) return adController;
  if (window.Adsgram) {
    adController = window.Adsgram.init({ blockId: BLOCK_ID });
    return adController;
  }
  return null;
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
  } catch (err) {
    console.error("Failed to record ad view:", err);
  }
}

export function useRewardedAd() {
  const showingRef = useRef(false);

  const showAd = useCallback((): Promise<void> => {
    if (showingRef.current) return Promise.reject(new Error("Ad already showing"));
    
    const controller = getAdController();
    if (!controller) {
      // No adsgram SDK loaded (not in Telegram), resolve silently
      return Promise.resolve();
    }

    showingRef.current = true;

    return controller.show()
      .then((result) => {
        showingRef.current = false;
        if (result.done) {
          recordAdView();
        }
      })
      .catch((result) => {
        showingRef.current = false;
        // Ad was skipped or errored - resolve silently to not block actions
        console.log("Ad skipped/error:", result);
      });
  }, []);

  const withAd = useCallback(
    (action: () => void) => {
      showAd()
        .then(() => {
          action();
        })
        .catch(() => {
          // Ad failed, still execute action
          action();
        });
    },
    [showAd]
  );

  return { showAd, withAd };
}

/**
 * Hook to show an ad once when the app loads
 */
export function useEntryAd() {
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    // Wait a bit for SDK to load
    const timer = setTimeout(() => {
      const controller = getAdController();
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
