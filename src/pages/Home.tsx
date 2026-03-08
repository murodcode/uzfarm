import { motion } from "framer-motion";
import FarmBackground from "@/components/FarmBackground";
import LevelUpEffect from "@/components/LevelUpEffect";
import { useGameContext } from "@/contexts/GameStateContext";
import { useNavigate } from "react-router-dom";
import { expRequired } from "@/lib/levelSystem";
import { ANIMAL_TYPES, FIELD_NAMES, FIELD_EMOJIS, FIELD_PRICES, getFieldMaxOwned, countAnimalsByTypeInField } from "@/lib/gameData";
import { Lock, ChevronRight } from "lucide-react";

import { toast } from "sonner";

export default function Home() {
  const { state, levelUpEvent, dismissLevelUp, unlockField } = useGameContext();
  const navigate = useNavigate();

  const required = expRequired(state.level);
  const levelProgress = Math.min(100, Math.round((state.exp / required) * 100));

  return (
    <>
      <FarmBackground />
      <LevelUpEffect show={!!levelUpEvent} level={levelUpEvent ?? state.level} onDone={dismissLevelUp} />

      <div className="relative z-10 min-h-screen safe-bottom">
        {/* Header */}
        <div className="relative px-4 pt-6 pb-2">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`wood-sign px-5 py-4 mt-2 mb-2 text-center relative ${levelUpEvent ? 'level-glow' : ''}`}
          >
            <span className="absolute -top-5 right-6 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>🐤</span>
            <h1 className="text-xl font-black text-primary-foreground drop-shadow-md">🌾 Mening Fermam</h1>
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

        {/* Fence */}
        <div className="px-4 mb-2">
          <div className="flex items-center justify-center gap-1 text-xs opacity-40 select-none">
            {'🪵'.repeat(12).split('').map((_, i) => <span key={i}>{i % 3 === 0 ? '🪵' : '|'}</span>)}
          </div>
        </div>

        {/* Resources */}
        <div className="px-4 mb-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex gap-2">
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
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-2">
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

        {/* Divider */}
        <div className="px-4">
          <div className="wooden-divider" />
        </div>

        {/* Farm cards */}
        <div className="px-4 mt-3 space-y-3 pb-4">
          <h2 className="text-sm font-black text-foreground flex items-center gap-2">
            🏠 Fermalarim
          </h2>

          {[1, 2, 3].map((f, i) => {
            const isUnlocked = f <= state.unlockedFields;
            const animalCount = state.animals.filter(a => a.field === f).length;
            const price = FIELD_PRICES[f];

            // Calculate total capacity for this farm
            const totalCapacity = ANIMAL_TYPES.reduce((sum, type) => sum + getFieldMaxOwned(type, f), 0);

            return (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
              >
                {isUnlocked ? (
                  /* Unlocked farm card */
                  <button
                    onClick={() => navigate(`/farm/${f}`)}
                    className="w-full farm-card flex items-center gap-4 p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl shrink-0">
                      {FIELD_EMOJIS[f]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-black text-foreground">{FIELD_NAMES[f]}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-primary">{animalCount} ta hayvon</span>
                        <span className="text-[10px] text-muted-foreground">/ {totalCapacity} sig'im</span>
                      </div>
                      {/* Mini animal icons */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {ANIMAL_TYPES.map(type => {
                          const count = countAnimalsByTypeInField(state.animals, type.id, f);
                          if (count === 0) return null;
                          return (
                            <span key={type.id} className="text-[10px] font-bold bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">
                              {type.emoji} {count}
                            </span>
                          );
                        })}
                        {animalCount === 0 && (
                          <span className="text-[10px] text-muted-foreground">Bo'sh — hayvon qo'shing</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                ) : (
                  /* Locked farm card */
                  <div className="farm-card p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-2xl shrink-0">
                        🔒
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-foreground">{FIELD_NAMES[f]}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f}x hayvon sig'imi • Jami {totalCapacity} ta hayvon
                        </p>
                        <p className="text-xs font-bold text-primary mt-1">
                          💵 {price?.toLocaleString()} pul
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ANIMAL_TYPES.map(type => (
                        <span key={type.id} className="text-[10px] font-semibold bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                          {type.emoji} {type.name}: {getFieldMaxOwned(type, f)} ta
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={async () => {
                        const ok = await unlockField(f);
                        if (ok) {
                          toast.success(`${FIELD_NAMES[f]} sotib olindi! 🎉`);
                        } else {
                          toast.error("Mablag' yetarli emas");
                        }
                      }}
                      disabled={state.cash < (price ?? Infinity) || f !== state.unlockedFields + 1}
                      className={`mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-transform active:scale-95 ${
                        state.cash >= (price ?? Infinity) && f === state.unlockedFields + 1
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      {f !== state.unlockedFields + 1
                        ? `Avval ${FIELD_NAMES[f - 1]} oching`
                        : state.cash >= (price ?? Infinity)
                          ? "💵 Sotib olish"
                          : "Mablag' yetarli emas"
                      }
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
