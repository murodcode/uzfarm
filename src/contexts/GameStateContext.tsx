import { createContext, useContext, ReactNode } from "react";
import { useGameState as useGameStateHook } from "@/hooks/useGameState";

type GameStateContextType = ReturnType<typeof useGameStateHook>;

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const gameState = useGameStateHook();
  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameContext() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error("useGameContext must be used within GameStateProvider");
  return ctx;
}
