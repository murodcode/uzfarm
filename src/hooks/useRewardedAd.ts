import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

// Global flag to prevent DB reload during ad flow
export let adFlowActive = false;

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

/* ── Direct link ad (for actions: feed, collect, sell, etc.) ── */
const AD_LINK = "https://omg10.com/4/10644130";
const WAIT_SECONDS = 7;
const MIN_TIME_ON_AD_SITE_MS = 7000; // Must spend at least 7 seconds on ad site

function openAdLink() {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(AD_LINK);
    } else {
      window.open(AD_LINK, "_blank");
    }
  } catch {
    window.open(AD_LINK, "_blank");
  }
}

function showAdOverlay(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);padding:20px;text-align:center;";

    const title = document.createElement("div");
    title.style.cssText = "color:#ff2222;font-size:22px;font-weight:900;margin-bottom:16px;line-height:1.3;";
    title.textContent = "⚠️ Reklama saytiga o'tib 7 sekund o'sha yerda qoling, keyin qaytib bot kiring!";

    const timer = document.createElement("div");
    timer.style.cssText = "color:#ffffff;font-size:48px;font-weight:900;margin-bottom:24px;";
    timer.textContent = String(WAIT_SECONDS);

    const btn = document.createElement("button");
    btn.style.cssText =
      "background:#22c55e;color:#fff;font-size:18px;font-weight:800;border:none;border-radius:14px;padding:14px 40px;cursor:pointer;display:none;";
    btn.textContent = "📺 Reklamani ko'rish";

    const statusText = document.createElement("div");
    statusText.style.cssText = "color:#ffffff;font-size:14px;margin-top:16px;display:none;";

    overlay.appendChild(title);
    overlay.appendChild(timer);
    overlay.appendChild(btn);
    overlay.appendChild(statusText);
    document.body.appendChild(overlay);

    let sec = WAIT_SECONDS;
    const interval = setInterval(() => {
      sec--;
      timer.textContent = String(sec);
      if (sec <= 0) {
        clearInterval(interval);
        timer.style.display = "none";
        btn.style.display = "block";
      }
    }, 1000);

    btn.onclick = () => {
      // Record when user clicked to open ad
      const adOpenTime = Date.now();
      openAdLink();

      // Disable button, show waiting message
      btn.style.display = "none";
      statusText.style.display = "block";
      statusText.textContent = "⏳ Reklama saytida 7 sekund turing...";

      // Listen for when user comes back (visibility change or focus)
      const checkReturn = () => {
        const timeSpent = Date.now() - adOpenTime;
        if (timeSpent >= MIN_TIME_ON_AD_SITE_MS) {
          // User spent enough time
          cleanup();
          recordAdView();
          document.body.removeChild(overlay);
          resolve(true);
        } else {
          // Not enough time
          const remaining = Math.ceil((MIN_TIME_ON_AD_SITE_MS - timeSpent) / 1000);
          statusText.style.display = "block";
          statusText.innerHTML = `<span style="color:#ff4444;font-weight:bold;">❌ Reklama saytida kamida 7 sekund turing!</span><br><span style="color:#ffffff;font-size:12px;">Yana ${remaining} sekund qoldi. Qaytadan urinib ko'ring.</span>`;
          btn.textContent = "🔄 Qayta ochish";
          btn.style.display = "block";
          // Re-enable for retry
          btn.onclick = () => {
            const retryTime = Date.now();
            openAdLink();
            btn.style.display = "none";
            statusText.textContent = "⏳ Reklama saytida 7 sekund turing...";

            const checkRetry = () => {
              const spent = Date.now() - retryTime;
              if (spent >= MIN_TIME_ON_AD_SITE_MS) {
                cleanup2();
                recordAdView();
                document.body.removeChild(overlay);
                resolve(true);
              } else {
                const rem = Math.ceil((MIN_TIME_ON_AD_SITE_MS - spent) / 1000);
                statusText.innerHTML = `<span style="color:#ff4444;font-weight:bold;">❌ Reklama saytida kamida 7 sekund turing!</span><br><span style="color:#ffffff;font-size:12px;">Yana ${rem} sekund qoldi.</span>`;
                btn.textContent = "🔄 Qayta ochish";
                btn.style.display = "block";
              }
            };
            const onReturnRetry = () => { setTimeout(checkRetry, 300); };
            const cleanup2 = () => {
              document.removeEventListener("visibilitychange", onReturnRetry);
              window.removeEventListener("focus", onReturnRetry);
            };
            document.addEventListener("visibilitychange", onReturnRetry);
            window.addEventListener("focus", onReturnRetry);
          };
        }
      };

      const onReturn = () => { setTimeout(checkReturn, 300); };
      const cleanup = () => {
        document.removeEventListener("visibilitychange", onReturn);
        window.removeEventListener("focus", onReturn);
      };
      document.addEventListener("visibilitychange", onReturn);
      window.addEventListener("focus", onReturn);
    };
  });
}

export function useRewardedAd() {
  const showingRef = useRef(false);

  const showAd = useCallback(async (): Promise<boolean> => {
    if (showingRef.current) return false;
    showingRef.current = true;
    adFlowActive = true;
    try {
      const ok = await showAdOverlay();
      showingRef.current = false;
      // Keep adFlowActive true for a short period to let the action complete & sync
      setTimeout(() => { adFlowActive = false; }, 3000);
      return ok;
    } catch {
      showingRef.current = false;
      adFlowActive = false;
      return false;
    }
  }, []);

  const withAd = useCallback(
    (action: () => void) => {
      showAd().then((success) => {
        if (success) action();
      });
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
