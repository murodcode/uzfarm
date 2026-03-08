export interface AnimalType {
  id: string;
  name: string;
  emoji: string;
  price: number;
  growthDurationHours: number;
  feedCost: number;
  productType: "meat" | "egg" | "milk";
  productionIntervalHours: number;
  meatYield: number;
  eggYield: number;
  milkYield: number;
  feedsToGrow: number;
  maxOwned: number;
  lifetimeHours: number; // hours after fully grown before animal dies
}

export interface OwnedAnimal {
  id: string;
  typeId: string;
  growthPercent: number;
  hunger: number;
  lastFedAt: number;
  lastCollectedAt: number;
  boughtAt: number;
  grownAt: number; // timestamp when growth reached 100%, 0 if not grown
  feedCount: number; // number of times fed (ads watched)
  field: number; // 1, 2, or 3 — which field this animal belongs to
}

export interface GameState {
  coins: number;
  cash: number;
  animals: OwnedAnimal[];
  eggs: number;
  meat: number;
  milk: number;
  level: number;
  exp: number;
  registeredAt: number;
  unlockedFields: number; // 1, 2, or 3
}

export const SELL_SPLIT = { coinPercent: 70, cashPercent: 30 };

export const DEATH_HOURS = 48; // hours without food before animal dies

export const ANIMAL_TYPES: AnimalType[] = [
  {
    id: "cow",
    name: "Sigir",
    emoji: "🐄",
    price: 5000,
    growthDurationHours: 48,
    feedCost: 200,
    productType: "milk",
    productionIntervalHours: 8,
    meatYield: 15,
    eggYield: 0,
    milkYield: 3,
    feedsToGrow: 15,
    maxOwned: 5,
    lifetimeHours: 48,
  },
  {
    id: "sheep",
    name: "Qo'y",
    emoji: "🐑",
    price: 3000,
    growthDurationHours: 36,
    feedCost: 120,
    productType: "meat",
    productionIntervalHours: 0,
    meatYield: 8,
    eggYield: 0,
    milkYield: 0,
    feedsToGrow: 13,
    maxOwned: 7,
    lifetimeHours: 48,
  },
  {
    id: "goat",
    name: "Echki",
    emoji: "🐐",
    price: 2000,
    growthDurationHours: 24,
    feedCost: 80,
    productType: "meat",
    productionIntervalHours: 0,
    meatYield: 6,
    eggYield: 0,
    milkYield: 0,
    feedsToGrow: 13,
    maxOwned: 7,
    lifetimeHours: 48,
  },
  {
    id: "chicken",
    name: "Tovuq",
    emoji: "🐔",
    price: 500,
    growthDurationHours: 12,
    feedCost: 30,
    productType: "egg",
    productionIntervalHours: 1,
    meatYield: 2,
    eggYield: 1,
    milkYield: 0,
    feedsToGrow: 10,
    maxOwned: 10,
    lifetimeHours: 48,
  },
  {
    id: "turkey",
    name: "Kurka",
    emoji: "🦃",
    price: 1200,
    growthDurationHours: 20,
    feedCost: 60,
    productType: "egg",
    productionIntervalHours: 1,
    meatYield: 4,
    eggYield: 2,
    milkYield: 0,
    feedsToGrow: 10,
    maxOwned: 10,
    lifetimeHours: 48,
  },
];

export const MARKET_PRICES = {
  egg: { base: 50, variance: 15 },
  meat: { base: 300, variance: 80 },
  milk: { base: 150, variance: 30 },
};

export const STARTING_BALANCE = 10000;

export function getAnimalType(id: string): AnimalType | undefined {
  return ANIMAL_TYPES.find((a) => a.id === id);
}

export function getMarketPrice(type: "egg" | "meat" | "milk"): number {
  const { base, variance } = MARKET_PRICES[type];
  return base + Math.floor(Math.random() * variance * 2 - variance);
}

// Field system — prices in CASH (💵), not coins
export const FIELD_PRICES: Record<number, number> = {
  2: 150000,
  3: 500000,
};

export const FIELD_NAMES: Record<number, string> = {
  1: "1-maydon",
  2: "2-maydon",
  3: "3-maydon",
};

export const FIELD_EMOJIS: Record<number, string> = {
  1: "🌿",
  2: "🌻",
  3: "🌾",
};

/**
 * Get max animals of a type allowed in a specific field.
 * Field 1 = base maxOwned, Field 2 = 2x, Field 3 = 3x
 */
export function getFieldMaxOwned(type: AnimalType, field: number): number {
  return type.maxOwned * field;
}

/**
 * Count animals of a type in a specific field (alive only).
 */
export function countAnimalsByTypeInField(animals: OwnedAnimal[], typeId: string, field: number): number {
  return animals.filter(a => a.typeId === typeId && a.field === field && !isAnimalDead(a)).length;
}

export function createDefaultGameState(): GameState {
  return {
    coins: STARTING_BALANCE,
    cash: 0,
    animals: [],
    eggs: 0,
    meat: 0,
    milk: 0,
    level: 1,
    exp: 0,
    registeredAt: Date.now(),
    unlockedFields: 1,
  };
}

/**
 * Check if an animal is dead based on feeding and lifetime rules.
 * Returns true if the animal should be removed.
 */
export function isAnimalDead(animal: OwnedAnimal): boolean {
  const now = Date.now();
  const type = getAnimalType(animal.typeId);
  if (!type) return false;

  // Death from starvation: 48h without food
  const lastFoodTime = animal.lastFedAt > 0 ? animal.lastFedAt : animal.boughtAt;
  const hoursSinceFood = (now - lastFoodTime) / 3600000;
  if (hoursSinceFood >= DEATH_HOURS) return true;

  // Death from lifetime expiry: 48h after fully grown
  if (animal.grownAt > 0) {
    const hoursSinceGrown = (now - animal.grownAt) / 3600000;
    if (hoursSinceGrown >= type.lifetimeHours) return true;
  }

  return false;
}

/**
 * Count how many animals of a given type are alive.
 */
export function countAnimalsByType(animals: OwnedAnimal[], typeId: string): number {
  return animals.filter(a => a.typeId === typeId && !isAnimalDead(a)).length;
}
