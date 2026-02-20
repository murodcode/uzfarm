import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface LevelUpEffectProps {
  show: boolean;
  level: number;
  onDone: () => void;
}

// Simple confetti particles
function Confetti() {
  const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
  const particles = Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: (Math.random() - 0.5) * 200,
    y: -(Math.random() * 150 + 50),
    rotate: Math.random() * 360,
    delay: Math.random() * 0.3,
    size: 6 + Math.random() * 6,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-sm"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.5 }}
          transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export default function LevelUpEffect({ show, level, onDone }: LevelUpEffectProps) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onDone, 2500);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Confetti */}
          <Confetti />

          {/* Glow backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle, hsl(42 90% 52% / 0.15), transparent 70%)" }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: [0, 1, 0] }}
            transition={{ duration: 2 }}
          />

          {/* Level up text */}
          <motion.div
            className="text-center"
            initial={{ scale: 0.3, opacity: 0, y: 20 }}
            animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 1, 0], y: [20, -10, -30] }}
            transition={{ duration: 2.2, times: [0, 0.3, 0.6, 1] }}
          >
            <div className="text-4xl font-black drop-shadow-lg" style={{
              background: "linear-gradient(135deg, hsl(42 90% 52%), hsl(32 55% 50%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              LEVEL UP 🎉
            </div>
            <motion.div
              className="text-2xl font-black text-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Daraja {level}!
            </motion.div>
            <motion.div
              className="text-sm font-bold text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              +500 🪙 bonus!
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
