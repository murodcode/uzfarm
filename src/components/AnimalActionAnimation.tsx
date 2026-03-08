import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

// Action images per animal type
import feedCow from "@/assets/anim-feed-cow.png";
import feedSheep from "@/assets/anim-feed-sheep.png";
import feedGoat from "@/assets/anim-feed-goat.png";
import feedChicken from "@/assets/anim-feed-chicken.png";
import feedTurkey from "@/assets/anim-feed-turkey.png";
import milkCow from "@/assets/anim-milk-cow.png";
import collectEgg from "@/assets/anim-collect-egg.png";
import slaughterImg from "@/assets/anim-slaughter.png";

const FEED_IMAGES: Record<string, string> = {
  cow: feedCow,
  sheep: feedSheep,
  goat: feedGoat,
  chicken: feedChicken,
  turkey: feedTurkey,
};

interface AnimalActionAnimationProps {
  action: "feed" | "collect" | "milk" | "slaughter" | null;
  animalTypeId: string;
  onComplete: () => void;
}

function getActionImage(action: string, typeId: string): string {
  if (action === "feed") return FEED_IMAGES[typeId] || feedCow;
  if (action === "milk") return milkCow;
  if (action === "collect") return collectEgg;
  if (action === "slaughter") return slaughterImg;
  return feedCow;
}

function getActionLabel(action: string): string {
  if (action === "feed") return "Ovqatlanmoqda...";
  if (action === "milk") return "Sut sog'ilmoqda...";
  if (action === "collect") return "Tuxum yig'ilmoqda...";
  if (action === "slaughter") return "So'yilmoqda...";
  return "";
}

export default function AnimalActionAnimation({ action, animalTypeId, onComplete }: AnimalActionAnimationProps) {
  // Animation lifetime is controlled by parent component

  return (
    <AnimatePresence>
      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.5 } }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden"
        >
          {/* Animated image */}
          <motion.img
            src={getActionImage(action, animalTypeId)}
            alt={action}
            className="w-32 h-32 object-contain drop-shadow-lg"
            initial={{ scale: 0.3, opacity: 0, y: 20 }}
            animate={{
              scale: [0.3, 1.15, 1],
              opacity: 1,
              y: [20, -5, 0],
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />

          {/* Sparkle particles */}
          <div className="absolute inset-0 pointer-events-none">
            {["✨", "⭐", "💫", "✨"].map((spark, i) => (
              <motion.span
                key={i}
                className="absolute text-xl select-none"
                style={{
                  left: `${20 + i * 20}%`,
                  top: "30%",
                }}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  y: [0, -30, -50],
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.4 + i * 0.2,
                  ease: "easeOut",
                }}
              >
                {spark}
              </motion.span>
            ))}
          </div>

          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-black text-foreground mt-3"
          >
            {getActionLabel(action)}
          </motion.p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.7, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
