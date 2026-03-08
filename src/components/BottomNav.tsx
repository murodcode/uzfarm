import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", emoji: "🏠", label: "Ferma" },
  { path: "/shop", emoji: "🛒", label: "Do'kon" },
  { path: "/market", emoji: "⚖️", label: "Bozor" },
  { path: "/tasks", emoji: "📋", label: "Vazifalar" },
  { path: "/chat", emoji: "💬", label: "Chat" },
  { path: "/profile", emoji: "👤", label: "Profil" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/login", "/withdraw", "/exchange", "/leaderboard", "/referral"];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-farm">
      <div className="relative z-10 mx-auto flex max-w-lg items-center justify-around px-1 py-1.5">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1.5 h-1 w-10 rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(42 92% 50%), hsl(38 85% 55%))' }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.span
                className="text-xl select-none"
                animate={active ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {tab.emoji}
              </motion.span>
              <span
                className={`text-[10px] font-bold transition-colors ${
                  active ? "text-farm-gold" : "text-white/60"
                }`}
                style={active ? { textShadow: '0 0 8px hsl(42 92% 50% / 0.5)' } : {}}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
