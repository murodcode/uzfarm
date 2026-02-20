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
  feedsToGrow: number; // how many feeds to reach 100%
}

export interface OwnedAnimal {
  id: string;
  typeId: string;
  growthPercent: number;
  hunger: number; // 0-100, 100 = full
  lastFedAt: number;
  lastCollectedAt: number;
  boughtAt: number;
}

export interface GameState {
  coins: number;      // O'yin tangasi – hayvon sotib olish uchun
  cash: number;       // Haqiqiy pul tangasi – chiqarib olish mumkin
  animals: OwnedAnimal[];
  eggs: number;
  meat: number;
  milk: number;
  level: number;
  exp: number;
  registeredAt: number;
}

// Sotuvdan tushadigan daromadning qancha foizi coin va cash bo'lishi
export const SELL_SPLIT = { coinPercent: 70, cashPercent: 30 };

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
    feedsToGrow: 10,
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
    feedsToGrow: 8,
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
    feedsToGrow: 6,
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
    feedsToGrow: 4,
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
    feedsToGrow: 5,
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
  };
}
