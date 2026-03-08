import { useState } from "react";
import { motion } from "framer-motion";
import FarmBackground from "@/components/FarmBackground";
import LevelUpEffect from "@/components/LevelUpEffect";
import FieldView from "@/components/FieldView";
import { useGameContext } from "@/contexts/GameStateContext";
import { toast } from "sonner";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { expRequired, EXP_SOURCES } from "@/lib/levelSystem";
import { getAnimalType, FIELD_NAMES, FIELD_EMOJIS } from "@/lib/gameData";
import { logUserAction } from "@/lib/userLogger";

export default function Home() {
  const { state, feedAnimal, collectEggs, collectMilk, slaughterAnimal, gainExp, levelUpEvent, dismissLevelUp, unlockField } = useGameContext();
  const { showAd, showFeedAd } = useRewardedAd();
  const [activeField, setActiveField] = useState(1);

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
    const adOk = await showAd();
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
    const adOk = await showAd();
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
    const adOk = await showAd();
    if (!adOk) return;
    const animal = state.animals.find(a => a.id === id);
    const type = animal ? getAnimalType(animal.typeId) : null;
    slaughterAnimal(id);
    logUserAction("slaughter", `${type?.name || "hayvon"} so'yildi`);
    toast.success("Go'sht inventarga qo'shildi! 🥩");
  };

  const handleUnlockField = async (fieldNumber: number) => {
    const success = await unlockField(fieldNumber);
    if (success) {
      toast.success(`${FIELD_NAMES[fieldNumber]} ochildi! 🎉`);
      setActiveField(fieldNumber);
    } else {
      toast.error("Mablag' yetarli emas");
    }
  };

  const required = expRequired(state.level);
  const levelProgress = Math.min(100, Math.round((state.exp / required) * 100));

  const fieldAnimals = state.animals.filter(a => a.field === activeField);

  return (
    <>
      <FarmBackground />
      <LevelUpEffect show={!!levelUpEvent} level={levelUpEvent ?? state.level} onDone={dismissLevelUp} />

      <div className="relative z-10 min-h-screen safe-bottom">
        {/* Header area */}
        <div className="relative px-4 pt-6 pb-2">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`wood-sign px-5 py-4 mt-2 mb-2 text-center relative ${levelUpEvent ? 'level-glow' : ''}`}
          >
            <span className="absolute -top-5 right-6 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>
              🐤
            </span>
            <h1 className="text-xl font-black text-primary-foreground drop-shadow-md">
              🌾 Mening Fermam
            </h1>
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-primary-foreground/80 mb-1">
                <span>⭐ Daraja {state.level}</span>
                <span>{levelProgress}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-primary-foreground/20 shadow-inner">
                <motion.div
                  className="h-full rounded-full progress-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
              <p className="text-[9px] text-primary-foreground/60 mt-1 font-semibold">
                {state.exp} / {required} EXP
              </p>
            </div>
          </motion.div>
        </div>

        {/* Fence decoration */}
        <div className="px-4 mb-2">
          <div className="flex items-center justify-center gap-1 text-xs opacity-40 select-none">
            {'🪵'.repeat(12).split('').map((e, i) => <span key={i}>{i % 3 === 0 ? '🪵' : '|'}</span>)}
          </div>
        </div>

        {/* Resource cards */}
        <div className="px-4 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex gap-2"
          >
            <div className="resource-card flex-1 flex items-center gap-2">
              <span className="text-xl">🥚</span>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Tuxumlar</p>
                <p className="text-sm font-black text-foreground">{state.eggs}</p>
              </div>
            </div>
            <div className="resource-card flex-1 flex items-center gap-2">
              <span className="text-xl">🥩</span>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Go'sht</p>
                <p className="text-sm font-black text-foreground">{state.meat} kg</p>
              </div>
            </div>
            <div className="resource-card flex-1 flex items-center gap-2">
              <span className="text-xl">🥛</span>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Sut</p>
                <p className="text-sm font-black text-foreground">{state.milk ?? 0} l</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Coins & Cash */}
        <div className="px-4 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2"
          >
            <div className="resource-card flex-1 flex items-center gap-2">
              <span className="text-xl">🪙</span>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Tangalar</p>
                <p className="text-sm font-black text-foreground">{state.coins.toLocaleString()}</p>
              </div>
            </div>
            <div className="resource-card flex-1 flex items-center gap-2">
              <span className="text-xl">💵</span>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Balans</p>
                <p className="text-sm font-black text-foreground">{state.cash.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Wooden divider */}
        <div className="px-4">
          <div className="wooden-divider" />
        </div>

        {/* Field tabs */}
        <div className="px-4 mt-3 mb-3">
          <div className="flex gap-2">
            {[1, 2, 3].map(f => {
              const isActive = activeField === f;
              const isLocked = f > state.unlockedFields;
              const animalCount = state.animals.filter(a => a.field === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setActiveField(f)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isLocked
                        ? "bg-muted/60 text-muted-foreground border border-border"
                        : "bg-card text-foreground border border-border"
                  }`}
                >
                  <span>{isLocked ? "🔒" : FIELD_EMOJIS[f]}</span>
                  <span>{FIELD_NAMES[f]}</span>
                  {!isLocked && <span className="text-[10px] opacity-70">({animalCount})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active field content */}
        <div className="px-4 space-y-4 pb-4">
          <FieldView
            fieldNumber={activeField}
            animals={fieldAnimals}
            allAnimals={state.animals}
            isUnlocked={activeField <= state.unlockedFields}
            cash={state.cash}
            onUnlock={() => handleUnlockField(activeField)}
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
