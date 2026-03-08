import { motion } from "framer-motion";
import { ANIMAL_TYPES, countAnimalsByTypeInField, getFieldMaxOwned, FIELD_NAMES, FIELD_EMOJIS } from "@/lib/gameData";
import ShopCard from "@/components/ShopCard";
import { useGameContext } from "@/contexts/GameStateContext";
import { toast } from "sonner";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { useSearchParams } from "react-router-dom";

export default function Shop() {
  const { state, buyAnimal } = useGameContext();
  const { showFeedAd } = useRewardedAd();
  const [searchParams] = useSearchParams();
  const fieldParam = parseInt(searchParams.get("field") || "1");
  const activeField = Math.min(fieldParam, state.unlockedFields);

  const handleBuy = async (typeId: string) => {
    const adOk = await showFeedAd("🛒 Sotib olish", "sotib olish");
    if (!adOk) return;
    const result = await buyAnimal(typeId, activeField);
    if (result) {
      toast.success(`Hayvon ${FIELD_NAMES[activeField]}ga qo'shildi! 🎉`);
    } else {
      const type = ANIMAL_TYPES.find(a => a.id === typeId);
      if (type && countAnimalsByTypeInField(state.animals, typeId, activeField) >= getFieldMaxOwned(type, activeField)) {
        toast.error(`Bu maydonda maksimal ${getFieldMaxOwned(type, activeField)} ta ${type.name} sotib olish mumkin!`);
      } else {
        toast.error("Mablag' yetarli emas");
      }
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
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <span>{FIELD_EMOJIS[activeField]}</span>
            <span>{FIELD_NAMES[activeField]} uchun xarid</span>
            <span className="text-[10px] opacity-60">({activeField}x sig'im)</span>
          </div>
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
              currentCount={countAnimalsByTypeInField(state.animals, animal.id, activeField)}
              maxCount={getFieldMaxOwned(animal, activeField)}
              onBuy={() => handleBuy(animal.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
