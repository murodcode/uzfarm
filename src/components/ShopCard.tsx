import { motion } from "framer-motion";
import { AnimalType } from "@/lib/gameData";
import { ShoppingCart, Clock, Utensils } from "lucide-react";

interface ShopCardProps {
  animal: AnimalType;
  balance: number;
  onBuy: () => void;
}

export default function ShopCard({ animal, balance, onBuy }: ShopCardProps) {
  const canAfford = balance >= animal.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="farm-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{animal.emoji}</span>
          <div>
            <h3 className="text-lg font-bold text-foreground">{animal.name}</h3>
            <p className="text-sm font-semibold text-primary">🪙 {animal.price.toLocaleString()}</p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {animal.productType === "egg" ? "🥚 Tuxum" : "🥩 Go'sht"}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted p-2">
          <Clock className="mx-auto mb-0.5 h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">{animal.growthDurationHours} soat</p>
          <p className="text-[10px] text-muted-foreground">O'sish</p>
        </div>
        <div className="rounded-xl bg-muted p-2">
          <Utensils className="mx-auto mb-0.5 h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">{animal.feedCost} $</p>
          <p className="text-[10px] text-muted-foreground">Ozuqa</p>
        </div>
        <div className="rounded-xl bg-muted p-2">
          <span className="text-sm">{animal.productType === "egg" ? "🥚" : "🥩"}</span>
          <p className="text-xs font-semibold text-foreground">
            {animal.productType === "egg" ? animal.eggYield : animal.meatYield}
          </p>
          <p className="text-[10px] text-muted-foreground">Hosil</p>
        </div>
      </div>

      <button
        onClick={onBuy}
        disabled={!canAfford}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-transform active:scale-95 ${
          canAfford
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        <ShoppingCart className="h-4 w-4" />
        {canAfford ? "Sotib olish" : "Mablag' yetarli emas"}
      </button>
    </motion.div>
  );
}
