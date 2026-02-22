import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Telegram WebApp: to'liq ekran rejimi
const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  if (tg.isVerticalSwipesEnabled === true && tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
  }
  // requestFullscreen for newer TG versions
  if (tg.requestFullscreen) {
    try { tg.requestFullscreen(); } catch {}
  }
}

createRoot(document.getElementById("root")!).render(<App />);
