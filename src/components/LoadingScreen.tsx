import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, hsl(160 45% 45%) 0%, hsl(130 40% 35%) 50%, hsl(100 35% 30%) 100%)',
      }}
    >
      {/* Sky clouds */}
      <div className="absolute top-0 left-0 right-0 h-40 overflow-hidden opacity-30">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${60 + i * 20}px`,
              height: `${20 + i * 8}px`,
              top: `${10 + i * 15}px`,
              left: `${-10 + i * 22}%`,
            }}
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Farm emoji bounce */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl"
        >
          🌾
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-3xl font-black text-white drop-shadow-lg">
            Farm Empire
          </h1>
          <p className="text-white/70 text-sm font-semibold mt-1">
            Yuklanmoqda...
          </p>
        </motion.div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-white/80"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom grass */}
      <div className="absolute bottom-0 left-0 right-0">
        <div
          className="h-20"
          style={{
            background: 'linear-gradient(180deg, hsl(120 50% 28%), hsl(120 45% 22%))',
            borderRadius: '40% 40% 0 0 / 20px 20px 0 0',
          }}
        />
      </div>
    </div>
  );
}
