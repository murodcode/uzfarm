import { useState, useCallback, useEffect, useRef } from "react";
import {
  GameState,
  OwnedAnimal,
  createDefaultGameState,
  getAnimalType,
  SELL_SPLIT,
} from "@/lib/gameData";
import { supabase } from "@/integrations/supabase/client";
import { incrementDailyTask } from "@/lib/dailyTasks";
import { EXP_SOURCES, LEVEL_UP_COIN_REWARD, processLevelUp } from "@/lib/levelSystem";

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

export function useGameState() {
  const [state, setState] = useState<GameState>(loadState);
  const [userId, setUserId] = useState<string | null>(null);
  const [levelUpEvent, setLevelUpEvent] = useState<number | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedFromDb = useRef(false);

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
            .select("coins, cash, eggs, meat, level, exp")
            .eq("id", session.user.id)
            .single(),
          supabase
            .from("animals")
            .select("*")
            .eq("user_id", session.user.id),
        ]);

        if (profileRes.data) {
          const dbAnimals: OwnedAnimal[] = (animalsRes.data || []).map((a: any) => ({
            id: a.id,
            typeId: a.type_id,
            growthPercent: a.growth_percent,
            hunger: a.hunger,
            lastFedAt: new Date(a.last_fed_at).getTime(),
            lastCollectedAt: new Date(a.last_collected_at).getTime(),
            boughtAt: new Date(a.bought_at).getTime(),
          }));

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
            animals: dbAnimals,
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
  }, []);

  // Refresh from DB when user returns to the app
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId && initializedFromDb.current) {
        initializedFromDb.current = false;
        const reload = async () => {
          const [profileRes, animalsRes] = await Promise.all([
            supabase.from("profiles").select("coins, cash, eggs, meat, level, exp").eq("id", userId).single(),
            supabase.from("animals").select("*").eq("user_id", userId),
          ]);
          if (profileRes.data) {
            const dbAnimals: OwnedAnimal[] = (animalsRes.data || []).map((a: any) => ({
              id: a.id,
              typeId: a.type_id,
              growthPercent: a.growth_percent,
              hunger: a.hunger,
              lastFedAt: new Date(a.last_fed_at).getTime(),
              lastCollectedAt: new Date(a.last_collected_at).getTime(),
              boughtAt: new Date(a.bought_at).getTime(),
            }));
            initializedFromDb.current = true;
            setState(prev => ({
              ...prev,
              coins: profileRes.data.coins,
              cash: profileRes.data.cash,
              eggs: profileRes.data.eggs,
              meat: profileRes.data.meat,
              level: profileRes.data.level,
              exp: profileRes.data.exp,
              animals: dbAnimals,
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
    
    setState((prev) => {
      if (prev.coins < type.price) return prev;
      bought = true;
      const animal: OwnedAnimal = {
        id: animalId,
        typeId,
        growthPercent: 0,
        hunger: 50,
        lastFedAt: 0,
        lastCollectedAt: now,
        boughtAt: now,
      };
      return {
        ...prev,
        coins: prev.coins - type.price,
        animals: [...prev.animals, animal],
      };
    });

    if (bought && userId) {
      const { error: insertError } = await supabase.from("animals").insert({
        id: animalId,
        user_id: userId,
        type_id: typeId,
        growth_percent: 0,
        hunger: 50,
        last_fed_at: new Date(0).toISOString(),
        last_collected_at: new Date(now).toISOString(),
        bought_at: new Date(now).toISOString(),
      });
      
      if (insertError) {
        console.error("Animal insert error:", insertError);
        // Rollback local state if DB insert failed
        setState((prev) => ({
          ...prev,
          coins: prev.coins + type.price,
          animals: prev.animals.filter((a) => a.id !== animalId),
        }));
        return false;
      }
      // Track daily task
      incrementDailyTask(userId, "buy_animal");
    }

    return bought;
  }, [userId]);

  const feedAnimal = useCallback(async (animalId: string): Promise<boolean> => {
    const now = Date.now();

    // Read current state directly to avoid closure issues
    let feedResult: { success: boolean; newGrowth: number; feedCost: number } | null = null;

    setState((prev) => {
      const idx = prev.animals.findIndex((a) => a.id === animalId);
      if (idx === -1) return prev;
      const animal = prev.animals[idx];
      const type = getAnimalType(animal.typeId);
      if (!type || prev.coins < type.feedCost) return prev;

      // Check cooldown
      const FEED_COOLDOWN_MS = 15 * 60 * 1000;
      if (animal.lastFedAt > 0 && now - animal.lastFedAt < FEED_COOLDOWN_MS) return prev;

      const growthIncrease = 100 / type.feedsToGrow;
      const newGrowth = Math.min(100, animal.growthPercent + growthIncrease);
      feedResult = { success: true, newGrowth, feedCost: type.feedCost };

      const updated = [...prev.animals];
      updated[idx] = {
        ...animal,
        growthPercent: newGrowth,
        hunger: 100,
        lastFedAt: now,
      };
      return {
        ...prev,
        coins: prev.coins - type.feedCost,
        animals: updated,
      };
    });

    // Wait for state to be set, then sync to DB
    if (feedResult && userId) {
      await supabase.from("animals").update({
        growth_percent: feedResult.newGrowth,
        hunger: 100,
        last_fed_at: new Date(now).toISOString(),
      }).eq("id", animalId).eq("user_id", userId);
      return true;
    }
    return false;
  }, [userId]);

  const collectEggs = useCallback(async (animalId: string): Promise<number> => {
    const now = Date.now();
    let success = false;
    let eggsCollected = 0;

    setState((prev) => {
      const idx = prev.animals.findIndex((a) => a.id === animalId);
      if (idx === -1) return prev;
      const animal = prev.animals[idx];
      const type = getAnimalType(animal.typeId);
      if (!type || type.productType !== "egg") return prev;
      if (animal.growthPercent < 100) return prev;

      // Time-based egg calculation
      const hoursElapsed = (now - animal.lastCollectedAt) / 3600000;
      const cappedHours = Math.min(24, Math.max(0, hoursElapsed));
      eggsCollected = Math.floor(cappedHours / type.productionIntervalHours) * type.eggYield;

      if (eggsCollected <= 0) return prev;

      success = true;
      const updated = [...prev.animals];
      updated[idx] = { ...animal, lastCollectedAt: now };
      return {
        ...prev,
        animals: updated,
        eggs: prev.eggs + eggsCollected,
      };
    });

    if (success && userId) {
      await supabase.from("animals").update({
        last_collected_at: new Date(now).toISOString(),
      }).eq("id", animalId).eq("user_id", userId);
      // Track daily task
      incrementDailyTask(userId, "collect_eggs", eggsCollected);
    }

    return eggsCollected;
  }, [userId]);

  const collectMilk = useCallback(async (animalId: string): Promise<number> => {
    const now = Date.now();
    let milkCollected = 0;
    let didCollect = false;

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
      return {
        ...prev,
        animals: updated,
        milk: prev.milk + milkCollected,
      };
    });

    if (didCollect && userId) {
      await supabase.from("animals").update({
        last_collected_at: new Date(now).toISOString(),
      }).eq("id", animalId).eq("user_id", userId);
    }

    return milkCollected;
  }, [userId]);

  const slaughterAnimal = useCallback(async (animalId: string) => {
    let success = false;

    setState((prev) => {
      const idx = prev.animals.findIndex((a) => a.id === animalId);
      if (idx === -1) return prev;
      const animal = prev.animals[idx];
      const type = getAnimalType(animal.typeId);
      if (!type || animal.growthPercent < 100) return prev;

      success = true;
      return {
        ...prev,
        animals: prev.animals.filter((a) => a.id !== animalId),
        meat: prev.meat + type.meatYield,
      };
    });

    if (success && userId) {
      await supabase.from("animals").delete().eq("id", animalId).eq("user_id", userId);
    }
  }, [userId]);

  const sellProduct = useCallback((type: "egg" | "meat" | "milk", quantity: number, pricePerUnit: number) => {
    let sold = false;
    setState((prev) => {
      const available = type === "egg" ? prev.eggs : type === "meat" ? prev.meat : prev.milk;
      if (quantity > available || quantity <= 0) return prev;
      sold = true;
      const total = quantity * pricePerUnit;
      const coinShare = Math.floor(total * SELL_SPLIT.coinPercent / 100);
      const cashShare = total - coinShare;
      const fieldKey = type === "egg" ? "eggs" : type === "meat" ? "meat" : "milk";
      return {
        ...prev,
        [fieldKey]: available - quantity,
        coins: prev.coins + coinShare,
        cash: prev.cash + cashShare,
      };
    });
    // Track daily task
    if (sold && userId) {
      incrementDailyTask(userId, "sell_product");
    }
  }, [userId]);

  const exchangeCurrency = useCallback((from: "coins" | "cash", amount: number) => {
    setState((prev) => {
      if (from === "cash") {
        if (amount <= 0 || amount > prev.cash) return prev;
        return { ...prev, cash: prev.cash - amount, coins: prev.coins + amount * 10 };
      } else {
        const cashAmount = Math.floor(amount / 10);
        const coinsNeeded = cashAmount * 10;
        if (cashAmount <= 0 || coinsNeeded > prev.coins) return prev;
        return { ...prev, coins: prev.coins - coinsNeeded, cash: prev.cash + cashAmount };
      }
    });
  }, []);

  const withdrawCash = useCallback((amount: number) => {
    setState((prev) => {
      if (amount <= 0 || amount > prev.cash) return prev;
      return { ...prev, cash: prev.cash - amount };
    });
    return true;
  }, []);

  const refreshFromDb = useCallback(async () => {
    if (!userId) return;
    const [profileRes, animalsRes] = await Promise.all([
      supabase.from("profiles").select("coins, cash, eggs, meat, level, exp").eq("id", userId).single(),
      supabase.from("animals").select("*").eq("user_id", userId),
    ]);
    
    if (profileRes.data) {
      const dbAnimals: OwnedAnimal[] = (animalsRes.data || []).map((a: any) => ({
        id: a.id,
        typeId: a.type_id,
        growthPercent: a.growth_percent,
        hunger: a.hunger,
        lastFedAt: new Date(a.last_fed_at).getTime(),
        lastCollectedAt: new Date(a.last_collected_at).getTime(),
        boughtAt: new Date(a.bought_at).getTime(),
      }));

      setState(prev => ({
        ...prev,
        coins: profileRes.data.coins,
        cash: profileRes.data.cash,
        eggs: profileRes.data.eggs,
        meat: profileRes.data.meat,
        level: profileRes.data.level,
        exp: profileRes.data.exp,
        animals: dbAnimals,
      }));
    }
  }, [userId]);

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
