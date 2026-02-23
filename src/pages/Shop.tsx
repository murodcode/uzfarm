import { motion } from "framer-motion";
import { ANIMAL_TYPES } from "@/lib/gameData";
import ShopCard from "@/components/ShopCard";
import { useGameContext } from "@/contexts/GameStateContext";
import { toast } from "sonner";
import { useRewardedAd } from "@/hooks/useRewardedAd";

export default function Shop() {
  const { state, buyAnimal } = useGameContext();
  const { showAd } = useRewardedAd();

  const handleBuy = async (typeId: string) => {
    const result = await buyAnimal(typeId);
    if (result) {
      toast.success("Hayvon sotib olindi! 🎉");
      // Show ad after successful purchase
      showAd().catch(() => {});
    } else {
      toast.error("Mablag' yetarli emas");
    }
  };

  return (
    <div className="min-h-screen safe-bottom">
      <div className="px-4 pt-8 pb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-extrabold text-foreground">🏪 Do'kon</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Balans: <span className="font-bold text-primary">🪙 {state.coins.toLocaleString()}</span>
          </p>
        </motion.div>
      </div>

      <div className="px-4 space-y-3 pb-4">
        {ANIMAL_TYPES.map((animal, i) => (
          <motion.div
            key={animal.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <ShopCard
              animal={animal}
              balance={state.coins}
              onBuy={() => handleBuy(animal.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
