import { motion } from "framer-motion";
import { getAnimalType, OwnedAnimal } from "@/lib/gameData";
import { Utensils, Egg, Scissors, Clock, Droplets, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

const FEED_COOLDOWN_MS = 15 * 60 * 1000;

// Big animated emoji per animal type
const ANIMAL_ANIMATIONS: Record<string, { emoji: string; color: string }> = {
  cow:     { emoji: "🐄", color: "hsl(38 60% 88%)" },
  sheep:   { emoji: "🐑", color: "hsl(200 30% 90%)" },
  goat:    { emoji: "🐐", color: "hsl(80 30% 88%)" },
  chicken: { emoji: "🐔", color: "hsl(42 80% 90%)" },
  turkey:  { emoji: "🦃", color: "hsl(20 50% 88%)" },
};

interface AnimalCardProps {
  animal: OwnedAnimal;
  onFeed: () => void;
  onCollect: () => void;
  onCollectMilk: () => void;
  onSlaughter: () => void;
}

export default function AnimalCard({ animal, onFeed, onCollect, onCollectMilk, onSlaughter }: AnimalCardProps) {
  const type = getAnimalType(animal.typeId);
  const [now, setNow] = useState(Date.now());
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = useCallback(async (actionName: string, fn: () => void | Promise<void>) => {
    if (busyAction) return;
    setBusyAction(actionName);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  }, [busyAction]);

  if (!type) return null;

  const animalAnim = ANIMAL_ANIMATIONS[animal.typeId] || { emoji: type.emoji, color: "hsl(var(--muted))" };

  const isGrown = animal.growthPercent >= 100;
  const isEggType = type.productType === "egg";
  const isMilkType = type.productType === "milk";
  const canSlaughter = isGrown;

  // Feed cooldown
  const hasFedBefore = animal.lastFedAt > 0;
  const timeSinceLastFed = hasFedBefore ? now - animal.lastFedAt : Infinity;
  const feedCooldownRemaining = hasFedBefore ? Math.max(0, FEED_COOLDOWN_MS - timeSinceLastFed) : 0;
  const canFeed = feedCooldownRemaining <= 0;
  const cooldownMinutes = Math.floor(feedCooldownRemaining / 60000);
  const cooldownSeconds = Math.floor((feedCooldownRemaining % 60000) / 1000);

  // Hunger display
  const hungerDecay = hasFedBefore
    ? Math.max(0, animal.hunger - ((now - animal.lastFedAt) / (1000 * 60 * 60)) * 10)
    : Math.max(0, animal.hunger - ((now - animal.boughtAt) / (1000 * 60 * 60)) * 10);
  const hungerDisplay = Math.round(Math.max(0, Math.min(100, hungerDecay)));
  const isHungry = hungerDisplay < 30;

  // Egg calculations
  const isEggReady = isGrown && isEggType;
  const hoursElapsedEgg = isEggReady ? (now - animal.lastCollectedAt) / 3600000 : 0;
  const cappedHoursEgg = Math.min(24, Math.max(0, hoursElapsedEgg));
  const accumulatedEggs = isEggReady
    ? Math.floor(cappedHoursEgg / type.productionIntervalHours) * type.eggYield
    : 0;
  const msPerEgg = type.productionIntervalHours * 3600000;
  const timeSinceLastEggCycle = isEggReady ? ((now - animal.lastCollectedAt) % msPerEgg) : 0;
  const timeUntilNextEgg = isEggReady ? msPerEgg - timeSinceLastEggCycle : 0;
  const nextEggH = Math.floor(timeUntilNextEgg / 3600000);
  const nextEggM = Math.floor((timeUntilNextEgg % 3600000) / 60000);
  const nextEggS = Math.floor((timeUntilNextEgg % 60000) / 1000);

  // Milk calculations
  const isMilkReady = isGrown && isMilkType;
  const hoursElapsedMilk = isMilkReady ? (now - animal.lastCollectedAt) / 3600000 : 0;
  const cappedHoursMilk = Math.min(24, Math.max(0, hoursElapsedMilk));
  const accumulatedMilk = isMilkReady
    ? Math.floor(cappedHoursMilk / type.productionIntervalHours) * type.milkYield
    : 0;
  const msPerMilk = type.productionIntervalHours * 3600000;
  const timeSinceLastMilkCycle = isMilkReady ? ((now - animal.lastCollectedAt) % msPerMilk) : 0;
  const timeUntilNextMilk = isMilkReady ? msPerMilk - timeSinceLastMilkCycle : 0;
  const nextMilkH = Math.floor(timeUntilNextMilk / 3600000);
  const nextMilkM = Math.floor((timeUntilNextMilk % 3600000) / 60000);
  const nextMilkS = Math.floor((timeUntilNextMilk % 60000) / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      {/* Big Animal Illustration */}
      <div
        className="relative flex items-center justify-center pt-5 pb-3"
        style={{ background: animalAnim.color }}
      >
        {/* Status badge */}
        <div className="absolute top-2 right-3">
          {isGrown ? (
            <span className="text-[10px] font-bold text-primary bg-card rounded-full px-2 py-0.5 shadow-sm">
              ✓ Tayyor
            </span>
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground bg-card rounded-full px-2 py-0.5 shadow-sm">
              🌱 O'smoqda
            </span>
          )}
        </div>
        {/* Hunger dot */}
        <div className="absolute top-2 left-3 flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-full ${isHungry ? 'bg-destructive' : 'bg-primary'}`} />
          <span className="text-[10px] font-semibold text-muted-foreground">{isHungry ? "Och" : "To'q"}</span>
        </div>

        {/* Animated animal emoji */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="text-7xl select-none drop-shadow-lg"
        >
          {animalAnim.emoji}
        </motion.div>

        {/* Feed cost */}
        {!isGrown && (
          <div className="absolute bottom-2 right-3">
            <span className="text-[10px] font-bold text-muted-foreground bg-card/80 rounded-lg px-2 py-0.5">
              🪙 {type.feedCost}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4 space-y-3">
        {/* Name */}
        <h3 className="font-black text-foreground text-base leading-tight">{type.name}</h3>

        {/* Growth bar */}
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
            <span>🌱 O'sish</span>
            <span className="font-bold text-foreground">{Math.round(animal.growthPercent)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${animal.growthPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Hunger bar */}
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
            <span>🍽️ To'qlik</span>
            <span className="font-bold text-foreground">{hungerDisplay}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${hungerDisplay}%`,
                background: isHungry ? 'hsl(var(--destructive))' : 'hsl(42 90% 55%)',
              }}
            />
          </div>
        </div>

        {/* Egg info */}
        {isEggReady && (
          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
            <span className="text-sm font-bold text-foreground">
              🥚 <span className="text-primary">{accumulatedEggs} ta</span>
            </span>
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {nextEggH > 0 ? `${nextEggH}:` : ""}{nextEggM.toString().padStart(2, "0")}:{nextEggS.toString().padStart(2, "0")}
            </span>
          </div>
        )}

        {/* Milk info */}
        {isMilkReady && (
          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
            <span className="text-sm font-bold text-foreground">
              🥛 <span className="text-primary">{accumulatedMilk} l</span>
            </span>
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {nextMilkH > 0 ? `${nextMilkH}:` : ""}{nextMilkM.toString().padStart(2, "0")}:{nextMilkS.toString().padStart(2, "0")}
            </span>
          </div>
        )}

        {/* Action buttons — single row */}
        <div className="flex gap-2">
          {/* Feed button */}
          {canFeed ? (
            <button
              onClick={() => handleAction("feed", onFeed)}
              disabled={!!busyAction}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground active:scale-95 transition-transform disabled:opacity-60"
            >
              {busyAction === "feed" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Utensils className="h-3.5 w-3.5" />}
              Boqish
            </button>
          ) : feedCooldownRemaining > 0 ? (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-border bg-muted/50 py-3 text-xs font-bold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {cooldownMinutes}:{cooldownSeconds.toString().padStart(2, "0")}
            </div>
          ) : null}

          {/* Collect button for egg producers */}
          {isEggReady && (
            <button
              onClick={() => handleAction("collect", onCollect)}
              disabled={accumulatedEggs === 0 || !!busyAction}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold text-primary-foreground active:scale-95 transition-transform bg-secondary disabled:opacity-50"
            >
              {busyAction === "collect" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Egg className="h-3.5 w-3.5" />}
              Yig'ish ({accumulatedEggs})
            </button>
          )}

          {/* Collect button for milk producers */}
          {isMilkReady && (
            <button
              onClick={() => handleAction("milk", onCollectMilk)}
              disabled={accumulatedMilk === 0 || !!busyAction}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold text-primary-foreground active:scale-95 transition-transform disabled:opacity-50"
              style={{ background: 'hsl(210 70% 55%)' }}
            >
              {busyAction === "milk" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Droplets className="h-3.5 w-3.5" />}
              Sut ({accumulatedMilk})
            </button>
          )}

          {/* Slaughter button */}
          {canSlaughter && (
            <button
              onClick={() => handleAction("slaughter", onSlaughter)}
              disabled={!!busyAction}
              className={`flex items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-bold active:scale-95 transition-transform disabled:opacity-60 ${
                !isEggType && !isMilkType
                  ? "flex-1 rounded-2xl text-destructive-foreground bg-destructive"
                  : "text-destructive border border-destructive/30 bg-destructive/5"
              }`}
            >
              {busyAction === "slaughter" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
              {!isEggType && !isMilkType && "So'yish"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
