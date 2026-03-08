import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import FieldView from "@/components/FieldView";
import FarmBackground from "@/components/FarmBackground";
import { useGameContext } from "@/contexts/GameStateContext";
import { toast } from "sonner";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { EXP_SOURCES } from "@/lib/levelSystem";
import { getAnimalType, FIELD_NAMES, FIELD_EMOJIS, FIELD_PRICES } from "@/lib/gameData";
import { logUserAction } from "@/lib/userLogger";
import { ArrowLeft } from "lucide-react";

export default function FarmDetail() {
  const { id } = useParams();
  const farmNumber = parseInt(id || "1");
  const navigate = useNavigate();
  const { state, feedAnimal, collectEggs, collectMilk, slaughterAnimal, gainExp, unlockField } = useGameContext();
  const { showFeedAd } = useRewardedAd();

  const isUnlocked = farmNumber <= state.unlockedFields;
  const farmAnimals = state.animals.filter(a => a.field === farmNumber);

  const handleFeed = async (id: string) => {
    const adOk = await showFeedAd();
    if (!adOk) return;
    const success = await feedAnimal(id);
    if (success) {
      gainExp(EXP_SOURCES.feed_animal);
      const animal = state.animals.find(a => a.id === id);
      const type = animal ? getAnimalType(animal.typeId) : null;
      logUserAction("feed_animal", `${type?.name || animal?.typeId} boqildi`);
      toast.success("Hayvon boqildi! 🌾");
    } else {
      toast.error("Kutish vaqti tugamagan yoki mablag' yetarli emas");
    }
  };

  const handleCollect = async (id: string) => {
    const adOk = await showFeedAd();
    if (!adOk) return;
    const eggs = await collectEggs(id);
    if (eggs > 0) {
      gainExp(EXP_SOURCES.collect_eggs);
      logUserAction("collect_eggs", `${eggs} ta tuxum yig'ildi`);
      toast.success(`${eggs} ta tuxum yig'ildi! 🥚`);
    } else {
      toast.info("Hali tuxum yig'ilmagan");
    }
  };

  const handleCollectMilk = async (id: string) => {
    const adOk = await showFeedAd();
    if (!adOk) return;
    const milk = await collectMilk(id);
    if (milk > 0) {
      logUserAction("collect_milk", `${milk} litr sut yig'ildi`);
      toast.success(`${milk} litr sut yig'ildi! 🥛`);
    } else {
      toast.info("Hali sut yig'ilmagan");
    }
  };

  const handleSlaughter = async (id: string) => {
    const adOk = await showFeedAd();
    if (!adOk) return;
    const animal = state.animals.find(a => a.id === id);
    const type = animal ? getAnimalType(animal.typeId) : null;
    slaughterAnimal(id);
    logUserAction("slaughter", `${type?.name || "hayvon"} so'yildi`);
    toast.success("Go'sht inventarga qo'shildi! 🥩");
  };

  const handleUnlock = async () => {
    const success = await unlockField(farmNumber);
    if (success) {
      toast.success(`${FIELD_NAMES[farmNumber]} ochildi! 🎉`);
    } else {
      toast.error("Mablag' yetarli emas");
    }
  };

  return (
    <>
      <FarmBackground />
      <div className="relative z-10 min-h-screen safe-bottom">
        {/* Top bar */}
        <div className="px-4 pt-6 pb-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => navigate("/")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{FIELD_EMOJIS[farmNumber]}</span>
              <div>
                <h1 className="text-lg font-black text-foreground">{FIELD_NAMES[farmNumber]}</h1>
                <p className="text-[10px] font-bold text-muted-foreground">
                  🪙 {state.coins.toLocaleString()} • 💵 {state.cash.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Farm content */}
        <div className="px-4 space-y-4 pb-4">
          <FieldView
            fieldNumber={farmNumber}
            animals={farmAnimals}
            allAnimals={state.animals}
            isUnlocked={isUnlocked}
            cash={state.cash}
            onUnlock={handleUnlock}
            onFeed={handleFeed}
            onCollect={handleCollect}
            onCollectMilk={handleCollectMilk}
            onSlaughter={handleSlaughter}
          />
        </div>
      </div>
    </>
  );
}
