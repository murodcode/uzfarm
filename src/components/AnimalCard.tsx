import { motion } from "framer-motion";
import { getAnimalType, OwnedAnimal, DEATH_HOURS, isAnimalDead } from "@/lib/gameData";
import { Utensils, Egg, Scissors, Clock, Droplets, Loader2, Skull, Heart } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import AnimalActionAnimation from "./AnimalActionAnimation";

const FEED_COOLDOWN_MS = 15 * 60 * 1000;

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
  const [activeAnimation, setActiveAnimation] = useState<"feed" | "collect" | "milk" | "slaughter" | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = useCallback(async (actionName: string, fn: () => void | Promise<void>) => {
    if (busyAction) return;
    const animName = actionName as "feed" | "collect" | "milk" | "slaughter";
    setActiveAnimation(animName);
    setBusyAction(actionName);
    try {
      await fn();
    } finally {
      setBusyAction(null);
      // Keep animation visible for 3 more seconds after action completes
      setTimeout(() => setActiveAnimation(null), 3000);
    }
  }, [busyAction]);

  if (!type) return null;
  if (isAnimalDead(animal)) return null;

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

  // Starvation timer
  const lastFoodTime = animal.lastFedAt > 0 ? animal.lastFedAt : animal.boughtAt;
  const hoursSinceFood = (now - lastFoodTime) / 3600000;
  const starvationHoursLeft = Math.max(0, DEATH_HOURS - hoursSinceFood);
  const starvationH = Math.floor(starvationHoursLeft);
  const starvationM = Math.floor((starvationHoursLeft - starvationH) * 60);
  const isStarving = starvationHoursLeft < 12;

  // Lifetime timer (after grown)
  const lifetimeHoursLeft = isGrown && animal.grownAt > 0
    ? Math.max(0, type.lifetimeHours - (now - animal.grownAt) / 3600000)
    : -1;
  const lifetimeH = lifetimeHoursLeft >= 0 ? Math.floor(lifetimeHoursLeft) : 0;
  const lifetimeM = lifetimeHoursLeft >= 0 ? Math.floor((lifetimeHoursLeft - lifetimeH) * 60) : 0;
  const isLifetimeLow = lifetimeHoursLeft >= 0 && lifetimeHoursLeft < 12;

  // Feed progress
  const feedProgress = `${animal.feedCount} / ${type.feedsToGrow}`;

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
      className="farm-card overflow-hidden relative"
    >
      {/* Action animation overlay */}
      <AnimalActionAnimation action={activeAnimation} animalTypeId={animal.typeId} onComplete={() => setActiveAnimation(null)} />
      {/* Big Animal Illustration */}
      <div
        className="relative flex items-center justify-center pt-5 pb-3 -mx-4 -mt-4 rounded-t-2xl"
        style={{ background: animalAnim.color }}
      >
        {/* Status badge */}
        <div className="absolute top-2.5 right-3">
          {isGrown ? (
            <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-2.5 py-1 shadow-md"
              style={{ boxShadow: '0 2px 8px hsl(142 50% 36% / 0.3)' }}>
              ✓ Tayyor
            </span>
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground bg-card rounded-full px-2.5 py-1 shadow-sm border border-border">
              🌱 O'smoqda
            </span>
          )}
        </div>
        {/* Hunger dot */}
        <div className="absolute top-2.5 left-3 flex items-center gap-1 bg-card/80 rounded-full px-2 py-0.5 border border-border">
          <span className={`inline-block h-2 w-2 rounded-full ${isHungry ? 'bg-destructive' : 'bg-primary'}`} />
          <span className="text-[10px] font-bold text-foreground">{isHungry ? "Och" : "To'q"}</span>
        </div>

        {/* Animated animal emoji */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="text-7xl select-none drop-shadow-lg"
        >
          {animalAnim.emoji}
        </motion.div>

        {/* Feed cost */}
        {!isGrown && (
          <div className="absolute bottom-2 right-3">
            <span className="text-[10px] font-bold text-foreground bg-card/90 rounded-lg px-2 py-0.5 border border-border">
              🪙 {type.feedCost}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4 space-y-2.5">
        {/* Name & feed count */}
        <div className="flex items-center justify-between">
          <h3 className="font-black text-foreground text-base leading-tight">{type.name}</h3>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            📺 {feedProgress}
          </span>
        </div>

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

        {/* Starvation timer */}
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${isStarving ? 'bg-destructive/10' : 'bg-muted/60'}`}>
          <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
            {isStarving ? <Skull className="h-3.5 w-3.5 text-destructive" /> : <Heart className="h-3.5 w-3.5 text-primary" />}
            Ovqatsiz qolish
          </span>
          <span className={`text-xs font-bold ${isStarving ? 'text-destructive' : 'text-muted-foreground'}`}>
            {starvationH}s {starvationM}d
          </span>
        </div>

        {/* Lifetime timer (only when grown) */}
        {lifetimeHoursLeft >= 0 && (
          <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${isLifetimeLow ? 'bg-destructive/10' : 'bg-muted/60'}`}>
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Hayot muddati
            </span>
            <span className={`text-xs font-bold ${isLifetimeLow ? 'text-destructive' : 'text-muted-foreground'}`}>
              {lifetimeH}s {lifetimeM}d
            </span>
          </div>
        )}

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

        {/* Action buttons */}
        <div className="flex gap-2">
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
