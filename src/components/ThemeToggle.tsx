import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type ThemeMode = "light" | "dark" | "auto";

function getStoredTheme(): ThemeMode {
  return (localStorage.getItem("farm-theme") as ThemeMode) || "auto";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "light") {
    root.classList.remove("dark");
  } else {
    // auto
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem("farm-theme", mode);
  }, [mode]);

  // Listen to system changes when in auto mode
  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return { mode, setMode };
}

const options: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Kunduzgi" },
  { value: "dark", icon: Moon, label: "Tungi" },
  { value: "auto", icon: Monitor, label: "Avtomatik" },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="farm-card">
      <h3 className="text-xs font-bold text-foreground mb-2">🎨 Mavzu rejimi</h3>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-bold transition-all active:scale-95 ${
              mode === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <opt.icon className="h-4 w-4" />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
