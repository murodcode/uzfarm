import { motion } from "framer-motion";
import { getAnimalType, OwnedAnimal } from "@/lib/gameData";
import { Utensils, Egg, Scissors, Clock, Droplets } from "lucide-react";
import { useState, useEffect } from "react";

const FEED_COOLDOWN_MS = 15 * 60 * 1000;

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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!type) return null;

  const isGrown = animal.growthPercent >= 100;
  const isEggType = type.productType === "egg";
  const isMilkType = type.productType === "milk";
  const canSlaughter = isGrown;

  // Feed cooldown
  const hasFedBefore = animal.lastFedAt > 0;
  const timeSinceLastFed = hasFedBefore ? now - animal.lastFedAt : Infinity;
  const feedCooldownRemaining = hasFedBefore ? Math.max(0, FEED_COOLDOWN_MS - timeSinceLastFed) : 0;
  const canFeed = feedCooldownRemaining <= 0 && !isGrown;
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
      className="farm-card relative overflow-hidden"
    >
      {/* Subtle wood grain top */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{
        background: 'linear-gradient(90deg, hsl(28 40% 65%), hsl(28 45% 55%), hsl(28 40% 65%))'
      }} />

      {/* Header row */}
      <div className="flex items-center justify-between mb-3 mt-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-2xl">
            {type.emoji}
          </div>
          <div>
            <h3 className="font-black text-foreground text-sm">{type.name}</h3>
            <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${isHungry ? 'bg-destructive' : 'bg-primary'}`} />
              {isHungry ? "Och" : "To'q"}
              {isGrown && <span className="ml-1 text-primary">✓ Tayyor</span>}
            </p>
          </div>
        </div>

        {/* Feed cost hint */}
        {!isGrown && (
          <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 rounded-lg px-2 py-1">
            🪙 {type.feedCost}/boqish
          </span>
        )}
      </div>

      {/* Growth bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1">
          <span>🌱 O'sish</span>
          <span>{Math.round(animal.growthPercent)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60 border border-border/50">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, hsl(142 45% 45%), hsl(142 50% 38%))' }}
            initial={{ width: 0 }}
            animate={{ width: `${animal.growthPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Hunger bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1">
          <span>🍽️ Toʻqlik</span>
          <span>{hungerDisplay}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60 border border-border/50">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${hungerDisplay}%`,
              background: isHungry
                ? 'linear-gradient(90deg, hsl(0 72% 55%), hsl(0 72% 45%))'
                : 'linear-gradient(90deg, hsl(42 90% 55%), hsl(38 80% 50%))'
            }}
          />
        </div>
      </div>

      {/* Egg info */}
      {isEggReady && (
        <div className="mb-3 rounded-xl p-2.5 border border-accent/30" style={{ background: 'hsl(45 70% 88% / 0.5)' }}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">
              🥚 Yig'ilgan: <span className="text-primary font-black">{accumulatedEggs} ta</span>
            </span>
            <span className="text-muted-foreground font-semibold">
              ⏱ {nextEggH > 0 ? `${nextEggH}:` : ""}{nextEggM.toString().padStart(2, "0")}:{nextEggS.toString().padStart(2, "0")}
            </span>
          </div>
          {accumulatedEggs >= 24 * type.eggYield && (
            <p className="text-[10px] text-destructive font-bold mt-1">⚠️ Limit to'ldi! Tuxumlarni yig'ing</p>
          )}
        </div>
      )}

      {/* Milk info */}
      {isMilkReady && (
        <div className="mb-3 rounded-xl p-2.5 border border-blue-300/30" style={{ background: 'hsl(210 80% 92% / 0.5)' }}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">
              🥛 Sut: <span className="text-blue-600 font-black">{accumulatedMilk} l</span>
            </span>
            <span className="text-muted-foreground font-semibold">
              ⏱ {nextMilkH > 0 ? `${nextMilkH}:` : ""}{nextMilkM.toString().padStart(2, "0")}:{nextMilkS.toString().padStart(2, "0")}
            </span>
          </div>
          {accumulatedMilk >= 24 / type.productionIntervalHours * type.milkYield && (
            <p className="text-[10px] text-destructive font-bold mt-1">⚠️ Sut to'lib ketdi! Yig'ing</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isGrown && (
          canFeed ? (
            <button
              onClick={onFeed}
              className="btn-farm flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs"
            >
              <Utensils className="h-3.5 w-3.5" />
              Boqish
            </button>
          ) : feedCooldownRemaining > 0 ? (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-border bg-muted/50 py-2.5 text-xs font-bold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {cooldownMinutes}:{cooldownSeconds.toString().padStart(2, "0")}
            </div>
          ) : null
        )}
        {isEggReady && accumulatedEggs > 0 && (
          <button
            onClick={onCollect}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-extrabold transition-all active:scale-95 border-2"
            style={{
              background: 'linear-gradient(180deg, hsl(42 90% 55%), hsl(38 80% 45%))',
              borderColor: 'hsl(38 70% 35%)',
              color: 'hsl(30 20% 15%)',
              boxShadow: '0 3px 10px hsl(42 90% 40% / 0.3), inset 0 1px 0 hsl(45 90% 70% / 0.4)'
            }}
          >
            <Egg className="h-3.5 w-3.5" />
            Yig'ish ({accumulatedEggs} 🥚)
          </button>
        )}
        {isMilkReady && accumulatedMilk > 0 && (
          <button
            onClick={onCollectMilk}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-extrabold transition-all active:scale-95 border-2"
            style={{
              background: 'linear-gradient(180deg, hsl(210 80% 60%), hsl(210 70% 50%))',
              borderColor: 'hsl(210 60% 40%)',
              color: 'white',
              boxShadow: '0 3px 10px hsl(210 80% 40% / 0.3)'
            }}
          >
            <Droplets className="h-3.5 w-3.5" />
            Sut ({accumulatedMilk}l 🥛)
          </button>
        )}
        {canSlaughter && (
          <button
            onClick={onSlaughter}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-extrabold text-destructive-foreground transition-all active:scale-95 border-2"
            style={{
              background: 'linear-gradient(180deg, hsl(0 65% 55%), hsl(0 72% 42%))',
              borderColor: 'hsl(0 60% 35%)',
              boxShadow: '0 3px 10px hsl(0 72% 35% / 0.3), inset 0 1px 0 hsl(0 60% 70% / 0.3)'
            }}
          >
            <Scissors className="h-3.5 w-3.5" />
            So'yish
          </button>
        )}
      </div>
    </motion.div>
  );
}
