import { motion } from "framer-motion";

interface LiquidOrbProps {
  isThinking?: boolean;
  size?: number; // px
  className?: string;
}

/**
 * LiquidOrb — a morphing blob AI avatar.
 * Idle: slow, relaxed border-radius morphing with a gentle gold glow.
 * Thinking: faster morph + tighter glow + subtle scale breathe.
 */
export default function LiquidOrb({ isThinking = false, size = 80, className = "" }: LiquidOrbProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: size + 24,
          height: size + 24,
          top: -12,
          left: -12,
          background: "radial-gradient(circle, rgba(201,162,39,0.18) 0%, transparent 70%)",
          animation: isThinking
            ? "orbGlow 1.5s ease-in-out infinite"
            : "orbGlow 4s ease-in-out infinite",
        }}
      />

      {/* Morphing blob body */}
      <motion.div
        animate={
          isThinking
            ? { scale: [1, 1.06, 1, 0.96, 1] }
            : { scale: [1, 1.02, 1, 0.98, 1] }
        }
        transition={{
          duration: isThinking ? 1.2 : 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={isThinking ? "orb-morph-fast" : "orb-morph"}
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #1B2A4A 0%, #3F5C86 45%, #caa321ff 100%)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Inner image / logo */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ borderRadius: "inherit" }}
        >
          <img
            src="/image_9a4dc1.png"
            alt="Prahari AI"
            style={{
              width: size * 0.5,
              height: size * 0.5,
              objectFit: "contain",
              filter: "brightness(0) invert(1) opacity(0.85)",
            }}
          />
        </div>
      </motion.div>

      {/* Thinking indicator ring */}
      {isThinking && (
        <motion.div
          className="absolute rounded-full border-2"
          style={{
            width: size + 16,
            height: size + 16,
            top: -8,
            left: -8,
            borderColor: "rgba(201,162,39,0.6)",
            borderTopColor: "transparent",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}
