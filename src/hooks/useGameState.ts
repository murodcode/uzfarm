import { useState, useCallback, useEffect, useRef } from "react";
import {
  GameState,
  OwnedAnimal,
  createDefaultGameState,
  getAnimalType,
  SELL_SPLIT,
  isAnimalDead,
  countAnimalsByType,
} from "@/lib/gameData";
import { supabase } from "@/integrations/supabase/client";
import { incrementDailyTask } from "@/lib/dailyTasks";
import { EXP_SOURCES, LEVEL_UP_COIN_REWARD, processLevelUp } from "@/lib/levelSystem";
import { toast } from "sonner";
import { logUserAction } from "@/lib/userLogger";
import { adFlowActive } from "@/hooks/useRewardedAd";

const STORAGE_KEY = "farm_empire_state";

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if ("balance" in parsed && !("coins" in parsed)) {
        return {
          coins: parsed.balance,
          cash: 0,
          animals: parsed.animals ?? [],
          eggs: parsed.eggs ?? 0,
          meat: parsed.meat ?? 0,
          milk: parsed.milk ?? 0,
          level: parsed.level ?? 1,
          exp: parsed.exp ?? 0,
          registeredAt: parsed.registeredAt ?? Date.now(),
        };
      }
      return parsed;
    }
  } catch {}
  return createDefaultGameState();
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mapDbAnimal(a: any): OwnedAnimal {
  return {
    id: a.id,
    typeId: a.type_id,
    growthPercent: a.growth_percent,
    hunger: a.hunger,
    lastFedAt: new Date(a.last_fed_at).getTime(),
    lastCollectedAt: new Date(a.last_collected_at).getTime(),
    boughtAt: new Date(a.bought_at).getTime(),
    grownAt: a.grown_at ? new Date(a.grown_at).getTime() : 0,
    feedCount: a.feed_count || 0,
  };
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadState);
  const [userId, setUserId] = useState<string | null>(null);
  const [levelUpEvent, setLevelUpEvent] = useState<number | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedFromDb = useRef(false);

  // Remove dead animals from DB
  const removeDeadAnimalsFromDb = useCallback(async (deadIds: string[], uid: string) => {
    for (const id of deadIds) {
      await supabase.from("animals").delete().eq("id", id).eq("user_id", uid);
    }
  }, []);

  // Filter dead animals and clean up
  const filterDeadAnimals = useCallback((animals: OwnedAnimal[], uid: string | null): OwnedAnimal[] => {
    const alive: OwnedAnimal[] = [];
    const deadIds: string[] = [];
    for (const a of animals) {
      if (isAnimalDead(a)) {
        deadIds.push(a.id);
      } else {
        alive.push(a);
      }
    }
    if (deadIds.length > 0 && uid) {
      removeDeadAnimalsFromDb(deadIds, uid);
      if (deadIds.length > 0) {
        toast.error(`💀 ${deadIds.length} ta hayvon o'lib qoldi!`, { duration: 4000 });
      }
    }
    return alive;
  }, [removeDeadAnimalsFromDb]);

  // Get current auth user and load profile data + animals from DB
  useEffect(() => {
    const loadFromProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUserId(null);
        return;
      }
      setUserId(session.user.id);

      if (!initializedFromDb.current) {
        const [profileRes, animalsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("coins, cash, eggs, meat, milk, level, exp")
            .eq("id", session.user.id)
            .single(),
          supabase
            .from("animals")
            .select("*")
            .eq("user_id", session.user.id),
        ]);

        if (profileRes.data) {
          const dbAnimals: OwnedAnimal[] = (animalsRes.data || []).map(mapDbAnimal);
          const aliveAnimals = filterDeadAnimals(dbAnimals, session.user.id);

          initializedFromDb.current = true;
          setState(prev => ({
            ...prev,
            coins: profileRes.data.coins,
            cash: profileRes.data.cash,
            eggs: profileRes.data.eggs,
            meat: profileRes.data.meat,
            milk: (profileRes.data as any).milk ?? 0,
            level: profileRes.data.level,
            exp: profileRes.data.exp,
            animals: aliveAnimals,
          }));
        }
      }
    };

    loadFromProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        initializedFromDb.current = false;
        loadFromProfile();
      } else {
        setUserId(null);
        initializedFromDb.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [filterDeadAnimals]);

  // Refresh from DB when user returns to the app (skip during ad flow)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId && initializedFromDb.current) {
        // Skip reload if ad flow is active to prevent overwriting local state
        if (adFlowActive) return;

        initializedFromDb.current = false;
        const reload = async () => {
          const [profileRes, animalsRes] = await Promise.all([
            supabase.from("profiles").select("coins, cash, eggs, meat, milk, level, exp").eq("id", userId).single(),
            supabase.from("animals").select("*").eq("user_id", userId),
          ]);
          if (profileRes.data) {
            const dbAnimals: OwnedAnimal[] = (animalsRes.data || []).map(mapDbAnimal);
            const aliveAnimals = filterDeadAnimals(dbAnimals, userId);
            initializedFromDb.current = true;
            setState(prev => ({
              ...prev,
              coins: profileRes.data.coins,
              cash: profileRes.data.cash,
              eggs: profileRes.data.eggs,
              meat: profileRes.data.meat,
              milk: (profileRes.data as any).milk ?? 0,
              level: profileRes.data.level,
              exp: profileRes.data.exp,
              animals: aliveAnimals,
            }));
          } else {
            initializedFromDb.current = true;
          }
        };
        reload();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [userId, filterDeadAnimals]);

  // Periodic death check every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const deadIds: string[] = [];
        const alive = prev.animals.filter(a => {
          if (isAnimalDead(a)) {
            deadIds.push(a.id);
            return false;
          }
          return true;
        });
        if (deadIds.length > 0) {
          if (userId) {
            for (const id of deadIds) {
              supabase.from("animals").delete().eq("id", id).eq("user_id", userId);
            }
          }
          toast.error(`💀 ${deadIds.length} ta hayvon o'lib qoldi!`, { duration: 4000 });
          return { ...prev, animals: alive };
        }
        return prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  // Immediately sync profile to DB (for critical actions - no guard on initializedFromDb)
  const syncProfileNow = useCallback(async (newState: GameState) => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        coins: newState.coins,
        cash: newState.cash,
        eggs: newState.eggs,
        meat: newState.meat,
        milk: newState.milk,
        level: newState.level,
        exp: newState.exp,
      })
      .eq("id", userId);
    if (error) console.error("Immediate sync error:", error);
  }, [userId]);

  // Save to localStorage and debounce-sync profile to Supabase
  useEffect(() => {
    saveState(state);

    if (userId && initializedFromDb.current) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        supabase
          .from("profiles")
          .update({
            coins: state.coins,
            cash: state.cash,
            eggs: state.eggs,
            meat: state.meat,
            milk: state.milk,
            level: state.level,
            exp: state.exp,
          })
          .eq("id", userId)
          .then(({ error }) => {
            if (error) console.error("Sync error:", error);
          });
      }, 500);
    }
  }, [state, userId]);

  const buyAnimal = useCallback(async (typeId: string) => {
    const type = getAnimalType(typeId);
    if (!type) return false;

    let bought = false;
    const animalId = crypto.randomUUID();
    const now = Date.now();
    let newState: GameState | null = null;

    setState((prev) => {
      if (prev.coins < type.price) return prev;

      // Check max owned limit
      const currentCount = countAnimalsByType(prev.animals, typeId);
      if (currentCount >= type.maxOwned) return prev;

      bought = true;
      const animal: OwnedAnimal = {
        id: animalId,
        typeId,
        growthPercent: 0,
        hunger: 50,
        lastFedAt: 0,
        lastCollectedAt: now,
        boughtAt: now,
        grownAt: 0,
        feedCount: 0,
      };
      const updated = {
        ...prev,
        coins: prev.coins - type.price,
        animals: [...prev.animals, animal],
      };
      newState = updated;
      return updated;
    });

    if (bought && userId) {
      // Immediately sync coins to DB
      if (newState) syncProfileNow(newState);

      const { error: insertError } = await supabase.from("animals").insert({
        id: animalId,
        user_id: userId,
        type_id: typeId,
        growth_percent: 0,
        hunger: 50,
        last_fed_at: new Date(0).toISOString(),
        last_collected_at: new Date(now).toISOString(),
        bought_at: new Date(now).toISOString(),
        grown_at: null,
        feed_count: 0,
      });

      if (insertError) {
        console.error("Animal insert error:", insertError);
        setState((prev) => ({
          ...prev,
          coins: prev.coins + type.price,
          animals: prev.animals.filter((a) => a.id !== animalId),
        }));
        return false;
      }
      incrementDailyTask(userId, "buy_animal");
      logUserAction("buy_animal", `${type.name} sotib olindi, narxi: ${type.price} tanga`);
    }

    return bought;
  }, [userId, syncProfileNow]);

  const feedAnimal = useCallback(async (animalId: string): Promise<boolean> => {
    const now = Date.now();
    let feedResult: { success: boolean; newGrowth: number; feedCost: number; newFeedCount: number; justGrown: boolean } | null = null;
    let newState: GameState | null = null;

    setState((prev) => {
      const idx = prev.animals.findIndex((a) => a.id === animalId);
      if (idx === -1) return prev;
      const animal = prev.animals[idx];
      const type = getAnimalType(animal.typeId);
      if (!type || prev.coins < type.feedCost) return prev;

      // Check cooldown
      const FEED_COOLDOWN_MS = 15 * 60 * 1000;
      if (animal.lastFedAt > 0 && now - animal.lastFedAt < FEED_COOLDOWN_MS) return prev;

      const newFeedCount = animal.feedCount + 1;
      const growthIncrease = 100 / type.feedsToGrow;
      const newGrowth = Math.min(100, animal.growthPercent + growthIncrease);
      const justGrown = animal.growthPercent < 100 && newGrowth >= 100;

      feedResult = { success: true, newGrowth, feedCost: type.feedCost, newFeedCount, justGrown };

      const updated = [...prev.animals];
      updated[idx] = {
        ...animal,
        growthPercent: newGrowth,
        hunger: 100,
        lastFedAt: now,
        feedCount: newFeedCount,
        grownAt: justGrown ? now : animal.grownAt,
      };
      const result = {
        ...prev,
        coins: prev.coins - type.feedCost,
        animals: updated,
      };
      newState = result;
      return result;
    });

    if (feedResult && userId) {
      // Immediately sync coins to DB and wait for it
      if (newState) await syncProfileNow(newState);

      const fr = feedResult as { success: boolean; newGrowth: number; feedCost: number; newFeedCount: number; justGrown: boolean };
      const updateData: any = {
        growth_percent: fr.newGrowth,
        hunger: 100,
        last_fed_at: new Date(now).toISOString(),
        feed_count: fr.newFeedCount,
      };
      if (fr.justGrown) {
        updateData.grown_at = new Date(now).toISOString();
      }
      await supabase.from("animals").update(updateData).eq("id", animalId).eq("user_id", userId);
      return true;
    }
    return false;
  }, [userId, syncProfileNow]);

  const collectEggs = useCallback(async (animalId: string): Promise<number> => {
    const now = Date.now();
    let success = false;
    let eggsCollected = 0;
    let newState: GameState | null = null;

    setState((prev) => {
      const idx = prev.animals.findIndex((a) => a.id === animalId);
      if (idx === -1) return prev;
      const animal = prev.animals[idx];
      const type = getAnimalType(animal.typeId);
      if (!type || type.productType !== "egg") return prev;
      if (animal.growthPercent < 100) return prev;

      const hoursElapsed = (now - animal.lastCollectedAt) / 3600000;
      const cappedHours = Math.min(24, Math.max(0, hoursElapsed));
      eggsCollected = Math.floor(cappedHours / type.productionIntervalHours) * type.eggYield;

      if (eggsCollected <= 0) return prev;

      success = true;
      const updated = [...prev.animals];
      updated[idx] = { ...animal, lastCollectedAt: now };
      const result = {
        ...prev,
        animals: updated,
        eggs: prev.eggs + eggsCollected,
      };
      newState = result;
      return result;
    });

    if (success && userId) {
      if (newState) syncProfileNow(newState);
      await supabase.from("animals").update({
        last_collected_at: new Date(now).toISOString(),
      }).eq("id", animalId).eq("user_id", userId);
      incrementDailyTask(userId, "collect_eggs", eggsCollected);
    }

    return eggsCollected;
  }, [userId, syncProfileNow]);

  const collectMilk = useCallback(async (animalId: string): Promise<number> => {
    const now = Date.now();
    let milkCollected = 0;
    let didCollect = false;
    let newState: GameState | null = null;

    setState((prev) => {
      const idx = prev.animals.findIndex((a) => a.id === animalId);
      if (idx === -1) return prev;
      const animal = prev.animals[idx];
      const type = getAnimalType(animal.typeId);
      if (!type || type.productType !== "milk") return prev;
      if (animal.growthPercent < 100) return prev;

      const hoursElapsed = (now - animal.lastCollectedAt) / 3600000;
      const cappedHours = Math.min(24, Math.max(0, hoursElapsed));
      milkCollected = Math.floor(cappedHours / type.productionIntervalHours) * type.milkYield;

      if (milkCollected <= 0) return prev;

      didCollect = true;
      const updated = [...prev.animals];
      updated[idx] = { ...animal, lastCollectedAt: now };
      const result = {
        ...prev,
        animals: updated,
        milk: prev.milk + milkCollected,
      };
      newState = result;
      return result;
    });

    if (didCollect && userId) {
      if (newState) syncProfileNow(newState);
      await supabase.from("animals").update({
        last_collected_at: new Date(now).toISOString(),
      }).eq("id", animalId).eq("user_id", userId);
    }

    return milkCollected;
  }, [userId, syncProfileNow]);

  const slaughterAnimal = useCallback(async (animalId: string) => {
    let success = false;
    let newState: GameState | null = null;

    setState((prev) => {
      const idx = prev.animals.findIndex((a) => a.id === animalId);
      if (idx === -1) return prev;
      const animal = prev.animals[idx];
      const type = getAnimalType(animal.typeId);
      if (!type || animal.growthPercent < 100) return prev;

      success = true;
      const result = {
        ...prev,
        animals: prev.animals.filter((a) => a.id !== animalId),
        meat: prev.meat + type.meatYield,
      };
      newState = result;
      return result;
    });

    if (success && userId) {
      if (newState) syncProfileNow(newState);
      await supabase.from("animals").delete().eq("id", animalId).eq("user_id", userId);
    }
  }, [userId, syncProfileNow]);

  const sellProduct = useCallback((type: "egg" | "meat" | "milk", quantity: number, pricePerUnit: number) => {
    let sold = false;
    let newState: GameState | null = null;
    setState((prev) => {
      const available = type === "egg" ? prev.eggs : type === "meat" ? prev.meat : prev.milk;
      if (quantity > available || quantity <= 0) return prev;
      sold = true;
      const total = quantity * pricePerUnit;
      const coinShare = Math.floor(total * SELL_SPLIT.coinPercent / 100);
      const cashShare = total - coinShare;
      const fieldKey = type === "egg" ? "eggs" : type === "meat" ? "meat" : "milk";
      const result = {
        ...prev,
        [fieldKey]: available - quantity,
        coins: prev.coins + coinShare,
        cash: prev.cash + cashShare,
      };
      newState = result;
      return result;
    });
    if (sold && userId) {
      if (newState) syncProfileNow(newState);
      incrementDailyTask(userId, "sell_product");
    }
  }, [userId, syncProfileNow]);

  const exchangeCurrency = useCallback((from: "coins" | "cash", amount: number) => {
    setState((prev) => {
      if (from === "cash") {
        if (amount <= 0 || amount > prev.cash) return prev;
        logUserAction("exchange", `💵 ${amount} cash → 🪙 ${amount * 10} tanga`);
        return { ...prev, cash: prev.cash - amount, coins: prev.coins + amount * 10 };
      } else {
        const cashAmount = Math.floor(amount / 10);
        const coinsNeeded = cashAmount * 10;
        if (cashAmount <= 0 || coinsNeeded > prev.coins) return prev;
        logUserAction("exchange", `🪙 ${coinsNeeded} tanga → 💵 ${cashAmount} cash`);
        return { ...prev, coins: prev.coins - coinsNeeded, cash: prev.cash + cashAmount };
      }
    });
  }, []);

  const withdrawCash = useCallback((amount: number) => {
    setState((prev) => {
      if (amount <= 0 || amount > prev.cash) return prev;
      logUserAction("withdraw", `💵 ${amount} cash chiqarish so'rovi`);
      return { ...prev, cash: prev.cash - amount };
    });
    return true;
  }, []);

  const refreshFromDb = useCallback(async () => {
    if (!userId) return;
    const [profileRes, animalsRes] = await Promise.all([
      supabase.from("profiles").select("coins, cash, eggs, meat, milk, level, exp").eq("id", userId).single(),
      supabase.from("animals").select("*").eq("user_id", userId),
    ]);

    if (profileRes.data) {
      const dbAnimals: OwnedAnimal[] = (animalsRes.data || []).map(mapDbAnimal);
      const aliveAnimals = filterDeadAnimals(dbAnimals, userId);

      setState(prev => ({
        ...prev,
        coins: profileRes.data.coins,
        cash: profileRes.data.cash,
        eggs: profileRes.data.eggs,
        meat: profileRes.data.meat,
        milk: (profileRes.data as any).milk ?? 0,
        level: profileRes.data.level,
        exp: profileRes.data.exp,
        animals: aliveAnimals,
      }));
    }
  }, [userId, filterDeadAnimals]);

  const gainExp = useCallback((amount: number) => {
    setState(prev => {
      const newExp = prev.exp + amount;
      const result = processLevelUp(prev.level, newExp);
      if (result.levelsGained > 0) {
        setLevelUpEvent(result.level);
        return {
          ...prev,
          level: result.level,
          exp: result.exp,
          coins: prev.coins + LEVEL_UP_COIN_REWARD * result.levelsGained,
        };
      }
      return { ...prev, exp: result.exp, level: result.level };
    });
  }, []);

  const dismissLevelUp = useCallback(() => setLevelUpEvent(null), []);

  return {
    state,
    levelUpEvent,
    buyAnimal,
    feedAnimal,
    collectEggs,
    collectMilk,
    slaughterAnimal,
    sellProduct,
    exchangeCurrency,
    withdrawCash,
    refreshFromDb,
    gainExp,
    dismissLevelUp,
  };
}
