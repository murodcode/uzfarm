import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface AnimalActionAnimationProps {
  action: "feed" | "collect" | "milk" | "slaughter" | null;
  onComplete: () => void;
}

const ACTION_CONFIG: Record<string, { emojis: string[]; label: string; bg: string }> = {
  feed: {
    emojis: ["🌾", "🥕", "🌽", "🍎", "😋"],
    label: "Ovqatlanmoqda...",
    bg: "from-yellow-500/20 to-green-500/20",
  },
  collect: {
    emojis: ["🥚", "🥚", "🥚", "🧺", "✨"],
    label: "Tuxum yig'ilmoqda...",
    bg: "from-amber-500/20 to-orange-500/20",
  },
  milk: {
    emojis: ["🥛", "🫗", "💧", "🪣", "✨"],
    label: "Sut sog'ilmoqda...",
    bg: "from-blue-500/20 to-cyan-500/20",
  },
  slaughter: {
    emojis: ["🔪", "🥩", "🍖", "💨"],
    label: "So'yilmoqda...",
    bg: "from-red-500/20 to-orange-500/20",
  },
};

export default function AnimalActionAnimation({ action, onComplete }: AnimalActionAnimationProps) {
  useEffect(() => {
    if (action) {
      const timer = setTimeout(onComplete, 1800);
      return () => clearTimeout(timer);
    }
  }, [action, onComplete]);

  const config = action ? ACTION_CONFIG[action] : null;

  return (
    <AnimatePresence>
      {action && config && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b ${config.bg} backdrop-blur-sm rounded-2xl overflow-hidden`}
        >
          {/* Floating emojis */}
          <div className="relative w-full h-24 flex items-center justify-center">
            {config.emojis.map((emoji, i) => (
              <motion.span
                key={i}
                className="absolute text-3xl select-none"
                initial={{
                  opacity: 0,
                  scale: 0,
                  x: (i - 2) * 25,
                  y: 20,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.3, 1.2, 1, 0.5],
                  y: [20, -10, -30, -50],
                  rotate: [0, (i % 2 === 0 ? 15 : -15), 0],
                }}
                transition={{
                  duration: 1.4,
                  delay: i * 0.15,
                  ease: "easeOut",
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </div>

          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-black text-foreground mt-2"
          >
            {config.label}
          </motion.p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-3">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-foreground/40"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
