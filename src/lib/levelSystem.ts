// Level system constants and helpers

export const EXP_SOURCES = {
  feed_animal: 5,
  collect_eggs: 8,
  sell_product: 10,
  complete_task: 20,
  referral_join: 30,
} as const;

export const LEVEL_UP_COIN_REWARD = 500;

/** EXP required for a given level */
export function expRequired(level: number): number {
  return level * 100;
}

/** Calculate level-ups from current level/exp, returns new level, new exp, and number of level-ups */
export function processLevelUp(level: number, exp: number): { level: number; exp: number; levelsGained: number } {
  let levelsGained = 0;
  let currentLevel = level;
  let currentExp = exp;
  
  while (currentExp >= expRequired(currentLevel)) {
    currentExp -= expRequired(currentLevel);
    currentLevel++;
    levelsGained++;
  }
  
  return { level: currentLevel, exp: currentExp, levelsGained };
}
