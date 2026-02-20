import { motion } from "framer-motion";
import { useState } from "react";
import { useGameContext } from "@/contexts/GameStateContext";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
import TelegramBackButton from "@/components/TelegramBackButton";

const RATE = 10;

export default function Exchange() {
  const { state, exchangeCurrency } = useGameContext();
  const [direction, setDirection] = useState<"cashToCoins" | "coinsToCash">("cashToCoins");
  const [amount, setAmount] = useState("");

  const coins = state.coins;
  const cash = state.cash;

  const isCashToCoins = direction === "cashToCoins";
  const numAmount = parseInt(amount) || 0;
  const result = isCashToCoins ? numAmount * RATE : Math.floor(numAmount / RATE);
  const maxAmount = isCashToCoins ? cash : coins;
  const isValid = numAmount > 0 && numAmount <= maxAmount && (isCashToCoins || result > 0);

  const handleExchange = () => {
    if (!isValid) return;
    exchangeCurrency(isCashToCoins ? "cash" : "coins", numAmount);
    if (isCashToCoins) {
      toast.success(`💵 ${numAmount} → 🪙 ${numAmount * RATE}`);
    } else {
      toast.success(`🪙 ${numAmount} → 💵 ${result}`);
    }
    setAmount("");
  };

  return (
    <div className="min-h-screen safe-bottom">
      <TelegramBackButton />
      <div className="px-4 pt-8 pb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-extrabold text-foreground">💱 Ayirboshlash</h1>
          <p className="text-sm text-muted-foreground mt-1">Kurs: 1 💵 = {RATE} 🪙</p>
        </motion.div>
      </div>

      <div className="px-4 space-y-4 pb-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
          <div className="farm-card text-center">
            <p className="text-xs text-muted-foreground">🪙 Tangalar</p>
            <p className="text-2xl font-black text-foreground">{coins.toLocaleString()}</p>
          </div>
          <div className="farm-card text-center">
            <p className="text-xs text-muted-foreground">💵 Naqd pul</p>
            <p className="text-2xl font-black text-foreground">{cash.toLocaleString()}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="farm-card">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${isCashToCoins ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              💵 Naqd pul
            </div>
            <button
              onClick={() => setDirection(d => d === "cashToCoins" ? "coinsToCash" : "cashToCoins")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform active:scale-90"
            >
              <ArrowLeftRight className="h-5 w-5" />
            </button>
            <div className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${!isCashToCoins ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              🪙 Tanga
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                {isCashToCoins ? "💵 Naqd pul miqdori" : "🪙 Tanga miqdori"}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Miqdorni kiriting"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">Mavjud: {maxAmount.toLocaleString()}</p>
                <button
                  onClick={() => setAmount(String(isCashToCoins ? maxAmount : Math.floor(maxAmount / RATE) * RATE))}
                  className="text-xs font-bold text-primary"
                >
                  Hammasi
                </button>
              </div>
            </div>

            {numAmount > 0 && (
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Siz olasiz</p>
                <p className="text-xl font-black text-foreground">
                  {isCashToCoins ? `🪙 ${(numAmount * RATE).toLocaleString()}` : `💵 ${result.toLocaleString()}`}
                </p>
              </div>
            )}

            <button
              onClick={handleExchange}
              disabled={!isValid}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Ayirboshlash
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
