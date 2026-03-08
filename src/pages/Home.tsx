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
        {/* ===== Wooden Header ===== */}
        <div className="px-4 pt-5 pb-2">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`wood-sign px-5 py-4 text-center relative ${levelUpEvent ? 'level-glow' : ''}`}
          >
            {/* Decorative */}
            <span className="absolute -top-4 left-4 text-xl grass-sway">🌾</span>
            <span className="absolute -top-5 right-5 text-2xl animate-bounce" style={{ animationDuration: '2.5s' }}>🐤</span>

            <h1 className="text-xl font-black drop-shadow-md" style={{ color: 'hsl(45 90% 85%)' }}>
              🌾 Mening Fermam
            </h1>

            {/* Level & EXP */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold mb-1" style={{ color: 'hsl(45 70% 80%)' }}>
                <span>⭐ Daraja {state.level}</span>
                <span>{levelProgress}%</span>
              </div>
              <div className="h-3.5 w-full overflow-hidden rounded-full shadow-inner" style={{ background: 'hsl(28 45% 22% / 0.6)' }}>
                <motion.div
                  className="h-full rounded-full progress-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
              <p className="text-[9px] mt-1 font-semibold" style={{ color: 'hsl(45 50% 65%)' }}>
                {state.exp} / {required} EXP
              </p>
            </div>
          </motion.div>
        </div>

        {/* ===== Resources ===== */}
        <div className="px-4 mt-2 mb-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { emoji: "🥚", label: "Tuxum", value: state.eggs },
              { emoji: "🥩", label: "Go'sht", value: `${state.meat} kg` },
              { emoji: "🥛", label: "Sut", value: `${state.milk ?? 0} l` },
            ].map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="resource-card flex flex-col items-center gap-1 py-3"
              >
                <span className="text-2xl">{r.emoji}</span>
                <p className="text-[10px] font-bold text-muted-foreground">{r.label}</p>
                <p className="text-sm font-black text-foreground">{r.value}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ===== Currency ===== */}
        <div className="px-4 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="resource-card flex items-center gap-3 py-3 px-4">
              <span className="text-2xl">🪙</span>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground">Tangalar</p>
                <p className="text-base font-black text-foreground">{state.coins.toLocaleString()}</p>
              </div>
            </div>
            <div className="resource-card flex items-center gap-3 py-3 px-4">
              <span className="text-2xl">💵</span>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground">Balans</p>
                <p className="text-base font-black text-foreground">{state.cash.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ===== Wooden Divider ===== */}
        <div className="px-4">
          <div className="wooden-divider" />
        </div>

        {/* ===== Farm Cards ===== */}
        <div className="px-4 mt-2 space-y-3 pb-4">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-black text-foreground flex items-center gap-2"
          >
            🏠 Fermalarim
          </motion.h2>

          {[1, 2, 3].map((f, i) => {
            const isUnlocked = f <= state.unlockedFields;
            const animalCount = state.animals.filter(a => a.field === f).length;
            const price = FIELD_PRICES[f];
            const totalCapacity = ANIMAL_TYPES.reduce((sum, type) => sum + getFieldMaxOwned(type, f), 0);

            return (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
              >
                {isUnlocked ? (
                  <button
                    onClick={() => navigate(`/farm/${f}`)}
                    className="w-full farm-card flex items-center gap-4 p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    {/* Farm icon with colored bg */}
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shrink-0 shadow-md"
                      style={{
                        background: f === 1
                          ? 'linear-gradient(135deg, hsl(120 35% 82%), hsl(130 30% 72%))'
                          : f === 2
                          ? 'linear-gradient(135deg, hsl(42 70% 82%), hsl(38 60% 72%))'
                          : 'linear-gradient(135deg, hsl(270 40% 82%), hsl(260 35% 72%))',
                        border: '2px solid hsl(var(--border))',
                      }}
                    >
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
                          <span className="text-[10px] text-muted-foreground italic">Bo'sh — hayvon qo'shing</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                ) : (
                  /* ===== Locked Farm ===== */
                  <div className="farm-card p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shrink-0"
                        style={{
                          background: 'hsl(var(--muted))',
                          border: '2px solid hsl(var(--border))',
                        }}
                      >
                        🔒
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-foreground">{FIELD_NAMES[f]}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f}x hayvon sig'imi • Jami {totalCapacity} ta
                        </p>
                        <p className="text-xs font-bold text-accent mt-1">
                          💵 {price?.toLocaleString()} pul
                        </p>
                      </div>
                    </div>

                    {/* Capacity breakdown */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ANIMAL_TYPES.map(type => (
                        <span key={type.id} className="text-[10px] font-semibold bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                          {type.emoji} {type.name}: {getFieldMaxOwned(type, f)} ta
                        </span>
                      ))}
                    </div>

                    {/* Buy button */}
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
                      className={`mt-3 w-full flex items-center justify-center gap-2 py-3 text-sm font-bold transition-transform active:scale-95 ${
                        state.cash >= (price ?? Infinity) && f === state.unlockedFields + 1
                          ? "btn-farm-gold"
                          : "rounded-2xl bg-muted text-muted-foreground cursor-not-allowed border-2 border-border"
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
