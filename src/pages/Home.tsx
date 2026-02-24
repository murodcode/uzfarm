import { motion } from "framer-motion";
import AnimalCard from "@/components/AnimalCard";
import FarmBackground from "@/components/FarmBackground";
import LevelUpEffect from "@/components/LevelUpEffect";
import { useGameContext } from "@/contexts/GameStateContext";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRewardedAd, useEntryAd } from "@/hooks/useRewardedAd";
import { expRequired } from "@/lib/levelSystem";
import { EXP_SOURCES } from "@/lib/levelSystem";
import { ANIMAL_TYPES } from "@/lib/gameData";

export default function Home() {
  const { state, feedAnimal, collectEggs, collectMilk, slaughterAnimal, gainExp, levelUpEvent, dismissLevelUp } = useGameContext();
  const navigate = useNavigate();
  const { showAd } = useRewardedAd();
  useEntryAd();

  const handleAdError = (err: unknown) => {
    if (err instanceof Error && err.message === "AD_NOT_WATCHED") {
      toast.warning("Reklamani kamida 10 soniya ko'ring! ⚠️", {
        description: "Iltimos reklamani to'liq tomosha qilib, keyin qayta urinib ko'ring.",
        duration: 4000,
      });
      return true; // was ad-not-watched error
    }
    return false; // other error, fail silently
  };

  const handleFeed = async (id: string) => {
    try {
      await showAd();
    } catch (err) {
      handleAdError(err);
      return;
    }
    const success = await feedAnimal(id);
    if (success) {
      gainExp(EXP_SOURCES.feed_animal);
      toast.success("Hayvon boqildi! 🌾");
    } else {
      toast.error("Kutish vaqti tugamagan yoki mablag' yetarli emas");
    }
  };

  const handleCollect = async (id: string) => {
    try {
      await showAd();
    } catch (err) {
      handleAdError(err);
      return;
    }
    const eggs = await collectEggs(id);
    if (eggs > 0) {
      gainExp(EXP_SOURCES.collect_eggs);
      toast.success(`${eggs} ta tuxum yig'ildi! 🥚`);
    } else {
      toast.info("Hali tuxum yig'ilmagan");
    }
  };

  const handleCollectMilk = async (id: string) => {
    try {
      await showAd();
    } catch (err) {
      handleAdError(err);
      return;
    }
    const milk = await collectMilk(id);
    if (milk > 0) {
      toast.success(`${milk} litr sut yig'ildi! 🥛`);
    } else {
      toast.info("Hali sut yig'ilmagan");
    }
  };

  const handleSlaughter = async (id: string) => {
    try {
      await showAd();
    } catch (err) {
      handleAdError(err);
      return;
    }
    slaughterAnimal(id);
    toast.success("Go'sht inventarga qo'shildi! 🥩");
  };

  const required = expRequired(state.level);
  const levelProgress = Math.min(100, Math.round((state.exp / required) * 100));

  // Group animals by type
  const groupedAnimals = ANIMAL_TYPES
    .map(type => ({
      type,
      animals: state.animals.filter(a => a.typeId === type.id),
    }))
    .filter(group => group.animals.length > 0);

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

        {/* Animals section */}
        <div className="px-4 space-y-4 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🏠</span>
              <h2 className="text-sm font-black text-foreground">Hayvonlaringiz</h2>
              <span className="text-xs font-bold text-muted-foreground">({state.animals.length})</span>
            </div>
            <button
              onClick={() => navigate("/shop")}
              className="flex items-center gap-1.5 rounded-xl bg-secondary/15 border border-secondary/30 px-3 py-1.5 text-xs font-bold text-secondary transition-transform active:scale-95"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Do'kon
            </button>
          </motion.div>

          {state.animals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="farm-card flex flex-col items-center py-10 text-center"
            >
              <span className="text-5xl mb-3">🌾</span>
              <h3 className="text-lg font-black text-foreground mb-1">Ferma bo'sh</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Do'kondan hayvon sotib oling va fermangizni boshlang!
              </p>
              <button onClick={() => navigate("/shop")} className="btn-farm">
                🛒 Do'konga o'tish
              </button>
            </motion.div>
          ) : (
            groupedAnimals.map((group, gi) => (
              <motion.div
                key={group.type.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + gi * 0.07 }}
              >
                {/* Group header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{group.type.emoji}</span>
                  <h3 className="text-sm font-black text-foreground">{group.type.name}</h3>
                  <span className="text-xs font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                    {group.animals.length} ta
                  </span>
                </div>

                {/* Horizontal scroll if multiple */}
                {group.animals.length === 1 ? (
                  <AnimalCard
                    animal={group.animals[0]}
                    onFeed={() => handleFeed(group.animals[0].id)}
                    onCollect={() => handleCollect(group.animals[0].id)}
                    onCollectMilk={() => handleCollectMilk(group.animals[0].id)}
                    onSlaughter={() => handleSlaughter(group.animals[0].id)}
                  />
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
                    {group.animals.map((animal) => (
                      <div
                        key={animal.id}
                        className="flex-shrink-0 w-[85vw] max-w-[320px]"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        <AnimalCard
                          animal={animal}
                          onFeed={() => handleFeed(animal.id)}
                          onCollect={() => handleCollect(animal.id)}
                          onCollectMilk={() => handleCollectMilk(animal.id)}
                          onSlaughter={() => handleSlaughter(animal.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
