import { motion } from "framer-motion";
import { useGameContext } from "@/contexts/GameStateContext";
import { getMarketPrice } from "@/lib/gameData";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SELL_SPLIT } from "@/lib/gameData";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { supabase } from "@/integrations/supabase/client";

export default function Market() {
  const { state, sellProduct } = useGameContext();
  const { withAd } = useRewardedAd();
  const [eggPrice, setEggPrice] = useState(5); // default 5$
  const [meatPrice, setMeatPrice] = useState(0);
  const [eggQty, setEggQty] = useState(1);
  const [meatQty, setMeatQty] = useState(1);
  const [baseEggPrice, setBaseEggPrice] = useState(5);

  // Load egg price from app_settings
  useEffect(() => {
    const loadPrices = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "market_prices")
        .maybeSingle();

      if (data?.value) {
        const prices = data.value as any;
        const eggBase = prices.egg_price ?? 5;
        setBaseEggPrice(eggBase);
        setEggPrice(eggBase);
      }

      setMeatPrice(getMarketPrice("meat"));
    };
    loadPrices();

    const interval = setInterval(() => {
      setMeatPrice(getMarketPrice("meat"));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSell = (type: "egg" | "meat") => {
    const qty = type === "egg" ? eggQty : meatQty;
    const price = type === "egg" ? eggPrice : meatPrice;
    const available = type === "egg" ? state.eggs : state.meat;

    if (qty > available) {
      toast.error("Yetarli mahsulot yo'q");
      return;
    }

    withAd(() => {
      sellProduct(type, qty, price);
      const total = qty * price;
      const coinShare = Math.floor(total * SELL_SPLIT.coinPercent / 100);
      const cashShare = total - coinShare;
      toast.success(`Sotildi! 🪙 +${coinShare} | 💵 +${cashShare}`);
    });
  };

  const PriceIcon = ({ price, base }: { price: number; base: number }) => {
    if (price > base) return <TrendingUp className="h-4 w-4 text-primary" />;
    if (price < base) return <TrendingDown className="h-4 w-4 text-farm-red" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen safe-bottom">
      <div className="px-4 pt-8 pb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-extrabold text-foreground">📊 Bozor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mahsulotlaringizni soting
          </p>
        </motion.div>
      </div>

      <div className="px-4 space-y-4 pb-4">
        {/* Egg market */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="farm-card"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🥚</span>
              <div>
                <h3 className="font-bold text-foreground">Tuxum</h3>
                <p className="text-xs text-muted-foreground">Mavjud: {state.eggs} ta</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-foreground">{eggPrice} $</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-border bg-muted">
              <button
                onClick={() => setEggQty(Math.max(1, eggQty - 1))}
                className="px-3 py-2 text-sm font-bold text-foreground"
              >
                −
              </button>
              <span className="min-w-[2rem] text-center text-sm font-bold text-foreground">{eggQty}</span>
              <button
                onClick={() => setEggQty(Math.min(state.eggs || 1, eggQty + 1))}
                className="px-3 py-2 text-sm font-bold text-foreground"
              >
                +
              </button>
            </div>
            <button
              onClick={() => { setEggQty(state.eggs || 1); }}
              className="rounded-xl border border-primary bg-primary/10 px-3 py-2 text-xs font-bold text-primary"
            >
              Hammasi
            </button>
            <button
              onClick={() => handleSell("egg")}
              disabled={state.eggs === 0}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Sotish ({(eggQty * eggPrice).toLocaleString()} $)
            </button>
          </div>
        </motion.div>

        {/* Meat market */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="farm-card"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🥩</span>
              <div>
                <h3 className="font-bold text-foreground">Go'sht</h3>
                <p className="text-xs text-muted-foreground">Mavjud: {state.meat} kg</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <PriceIcon price={meatPrice} base={300} />
              <span className="text-lg font-bold text-foreground">{meatPrice} $</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-border bg-muted">
              <button
                onClick={() => setMeatQty(Math.max(1, meatQty - 1))}
                className="px-3 py-2 text-sm font-bold text-foreground"
              >
                −
              </button>
              <span className="min-w-[2rem] text-center text-sm font-bold text-foreground">{meatQty}</span>
              <button
                onClick={() => setMeatQty(Math.min(state.meat || 1, meatQty + 1))}
                className="px-3 py-2 text-sm font-bold text-foreground"
              >
                +
              </button>
            </div>
            <button
              onClick={() => { setMeatQty(state.meat || 1); }}
              className="rounded-xl border border-primary bg-primary/10 px-3 py-2 text-xs font-bold text-primary"
            >
              Hammasi
            </button>
            <button
              onClick={() => handleSell("meat")}
              disabled={state.meat === 0}
              className="flex-1 rounded-xl bg-farm-red py-2.5 text-sm font-bold text-destructive-foreground transition-transform active:scale-95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Sotish ({(meatQty * meatPrice).toLocaleString()} $)
            </button>
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="farm-card bg-farm-gold-light border-farm-gold/20"
        >
          <p className="text-xs font-semibold text-accent-foreground">
            💡 Maslahat: Go'sht narxi har 30 soniyada o'zgaradi, qimmatroq bo'lganda soting!
          </p>
        </motion.div>
      </div>
    </div>
  );
}
