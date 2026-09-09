import React from 'react';
import { motion } from 'framer-motion';
import { BurningFireBorder } from './BurningFireBorder';

interface ManaBarProps {
  progressPercent: number;
  isImpacted?: boolean;
  hasStreak?: boolean;
  streakMultiplier?: number;
}

export const ManaBar: React.FC<ManaBarProps> = ({
  progressPercent,
  isImpacted = false,
  hasStreak = false,
  streakMultiplier
}) => {
  const clampedProgress = Math.min(100, Math.max(3, progressPercent));

  return (
    <div className="relative w-full h-[18px]">
      {/* Tight, Thin Blazing Fire Rim: Flush with the 18px bar chassis */}
      {hasStreak && <BurningFireBorder borderRadius={4.5} />}

      {/* Stylized Mana Bar Chassis */}
      <div
        className={`relative w-full h-full rounded-[4.5px] overflow-hidden transition-all duration-300 ${
          hasStreak
            ? 'bg-[#050711] border border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
            : 'compact-manabar-frame'
        }`}
      >
        {/* Stylized Anime Water / Mana Liquid (From Reference Image) */}
        <motion.div
          className="h-full anime-mana-fluid relative overflow-hidden"
          initial={false}
          animate={{
            width: `${clampedProgress}%`,
            filter: isImpacted
              ? 'brightness(1.55) drop-shadow(0 0 10px #38bdf8)'
              : 'brightness(1) drop-shadow(0 0 3px rgba(56, 189, 248, 0.3))'
          }}
          transition={{
            width: {
              duration: 1.1,
              ease: [0.16, 1, 0.3, 1] // Smooth liquid expansion
            },
            filter: {
              duration: 0.5
            }
          }}
        >
          {/* Diagonal Stylized Anime Water Highlights (Flowing left to right) */}
          <div className="absolute inset-0 anime-water-sheen pointer-events-none" />

          {/* Continuous Soft Mana Energy Flow (Left to right surge) */}
          <div className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-cyan-100/35 to-transparent pointer-events-none animate-mana-beam-flow" />

          {/* Floating Water Droplets / Foam Bubbles (From Reference Image) */}
          <div className="absolute inset-0 pointer-events-none">
            {[
              { left: '12%', top: '25%', size: 2.2, delay: 0 },
              { left: '28%', top: '65%', size: 1.6, delay: 0.6 },
              { left: '46%', top: '20%', size: 2.0, delay: 1.2 },
              { left: '64%', top: '60%', size: 1.5, delay: 0.4 },
              { left: '80%', top: '30%', size: 2.2, delay: 1.0 },
              { left: '92%', top: '55%', size: 1.6, delay: 1.6 }
            ].map((bubble, idx) => (
              <div
                key={idx}
                className="absolute rounded-full bg-cyan-100/90 shadow-[0_0_3px_#38d9fe] animate-bubble-drift"
                style={{
                  left: bubble.left,
                  top: bubble.top,
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  animationDelay: `${bubble.delay}s`
                }}
              />
            ))}
          </div>

          {/* Subtle electric top line */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-200/70 to-white/90" />

          {/* Curved Water Meniscus Bead (Smooth liquid edge, NOT a white block) */}
          <div className="absolute right-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-cyan-200 via-white to-cyan-200 shadow-[0_0_5px_#38d9fe] z-20 pointer-events-none">
            <div className="absolute top-1/2 -translate-y-1/2 -right-[1px] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_#38d6fe]" />
          </div>
        </motion.div>

        {/* 3D Cylindrical Glass Reflection Over Entire Bar */}
        <div className="absolute inset-0 wow-glass-glare pointer-events-none z-10" />

        {/* Subtle Heat Blend on the far left when Streak is active */}
        {hasStreak && (
          <div className="absolute left-0 inset-y-0 w-12 bg-gradient-to-r from-amber-500/25 via-orange-600/10 to-transparent pointer-events-none z-15" />
        )}

        {/* Stylized Burning Streak Badge: Inside the Bar on the far left */}
        {hasStreak && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-25 pointer-events-none">
            {/* Stylized Fiery Flame Icon */}
            <div className="relative w-2.5 h-2.5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-full h-full filter drop-shadow-[0_0_3px_#f59e0b]" fill="none">
                <path
                  d="M12 2C12 2 7 9 7 14C7 17.5 9.5 20.5 12 21C14.5 20.5 17 17.5 17 14C17 9 12 2 12 2Z"
                  fill="url(#streakFlameGradCompact)"
                />
                <path
                  d="M12 7C12 7 9 11.5 9 14.5C9 16.5 10.3 18.5 12 19C13.7 18.5 15 16.5 15 14.5C15 11.5 12 7 12 7Z"
                  fill="#fef08a"
                  opacity="0.9"
                />
                <defs>
                  <linearGradient id="streakFlameGradCompact" x1="12" y1="21" x2="12" y2="2" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="40%" stopColor="#ea580c" />
                    <stop offset="80%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fef08a" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Glowing Fantasy Multiplier Pill */}
            {streakMultiplier && streakMultiplier > 1.0 && (
              <span className="font-mono font-black text-[8px] leading-none text-amber-200 bg-gradient-to-r from-amber-950/90 to-orange-950/90 border border-amber-400/80 px-1 py-0.2 rounded shadow-[0_0_5px_rgba(245,158,11,0.6)] tracking-tight">
                x{streakMultiplier}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
