import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RaidHitEvent } from '../types';
import { Sparkles, Flame, ShieldAlert, Zap } from 'lucide-react';

interface FloatingCombatTextProps {
  latestHit: RaidHitEvent | null;
}

interface FCTItem extends RaidHitEvent {
  fctId: string;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export const FloatingCombatText: React.FC<FloatingCombatTextProps> = ({ latestHit }) => {
  const [items, setItems] = useState<FCTItem[]>([]);

  useEffect(() => {
    if (!latestHit) return;

    // Generate random launch arc offsets
    const randomAngle = (Math.random() - 0.5) * 80; // -40px to +40px horizontal spread
    const randomRot = (Math.random() - 0.5) * 16;   // -8deg to +8deg tilt

    const newItem: FCTItem = {
      ...latestHit,
      fctId: `${latestHit.id}-${Math.random()}`,
      offsetX: randomAngle,
      offsetY: -120 - Math.random() * 50,
      rotation: randomRot
    };

    setItems((prev) => [...prev.slice(-7), newItem]);

    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.fctId !== newItem.fctId));
    }, 2200);

    return () => clearTimeout(timer);
  }, [latestHit]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-visible flex items-center justify-center">
      <AnimatePresence>
        {items.map((item) => {
          const isLegendary = item.tier === 'LEGENDARY' || item.isCrit;
          const isEpic = item.tier === 'EPIC';
          const hasCombo = item.comboMultiplier > 1.0;
          const hadShield = item.shieldAbsorbed > 0;

          return (
            <motion.div
              key={item.fctId}
              initial={{
                opacity: 0,
                scale: 0.4,
                x: 0,
                y: 20,
                rotate: 0
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: isLegendary ? [0.6, 1.45, 1.25, 1.1] : isEpic ? [0.6, 1.25, 1.1, 1.0] : [0.7, 1.1, 1.0, 0.95],
                x: item.offsetX,
                y: item.offsetY,
                rotate: item.rotation
              }}
              transition={{
                duration: 1.8,
                times: [0, 0.15, 0.75, 1],
                ease: [0.16, 1, 0.3, 1]
              }}
              className="absolute flex flex-col items-center select-none"
            >
              {/* Buyer Handle Tag */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700/80 shadow-2xl backdrop-blur-md mb-1">
                <span className="text-[11px] font-black text-amber-300 font-cinzel tracking-wider">
                  @{item.buyer}
                </span>
                {item.price && (
                  <span className="text-[10px] text-slate-300 font-mono">
                    ({item.price})
                  </span>
                )}
              </div>

              {/* Main Damage Number */}
              <div className="relative flex items-center justify-center">
                {/* Background glow flare for Crit/Legendary/Epic */}
                {(isLegendary || isEpic) && (
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 1, 0.4]
                    }}
                    transition={{ duration: 0.6, repeat: 2 }}
                    className={`absolute -inset-4 rounded-full blur-xl ${
                      isLegendary
                        ? 'bg-gradient-to-r from-amber-500/60 via-red-600/70 to-orange-500/60'
                        : 'bg-gradient-to-r from-purple-600/50 via-pink-600/50 to-indigo-600/50'
                    }`}
                  />
                )}

                <div
                  className={`relative font-black tracking-tight flex items-center gap-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] ${
                    isLegendary
                      ? 'text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-orange-400 to-red-600 font-cinzel stroke-text-crit'
                      : isEpic
                      ? 'text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-b from-fuchsia-200 via-purple-300 to-indigo-500 font-cinzel stroke-text-epic'
                      : 'text-2xl md:text-3xl text-white font-extrabold stroke-text-normal'
                  }`}
                  style={{
                    textShadow: isLegendary
                      ? '0 0 20px rgba(239, 68, 68, 0.9), 0 0 35px rgba(245, 158, 11, 0.8), 0 3px 0 #000'
                      : isEpic
                      ? '0 0 15px rgba(168, 85, 247, 0.8), 0 0 25px rgba(217, 70, 239, 0.6), 0 2px 0 #000'
                      : '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 10px rgba(255, 255, 255, 0.4)'
                  }}
                >
                  {isLegendary && <Flame className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce" />}
                  {isEpic && <Sparkles className="w-6 h-6 text-purple-300 fill-purple-300" />}
                  {!isLegendary && !isEpic && <Zap className="w-5 h-5 text-sky-400" />}

                  <span>-{item.totalDamage}</span>

                  {isLegendary && (
                    <span className="text-xl md:text-2xl uppercase tracking-widest text-amber-300 font-black ml-1">
                      CRIT!
                    </span>
                  )}
                </div>
              </div>

              {/* Combo Multiplier Pill (Gold Shimmer) */}
              {hasCombo && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-1 flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-amber-600/90 via-yellow-500/90 to-amber-600/90 text-black font-black text-[11px] shadow-lg border border-amber-300/80 tracking-wider"
                >
                  <Flame className="w-3 h-3 fill-black" />
                  <span>COMBO x{item.comboMultiplier.toFixed(1)}!</span>
                </motion.div>
              )}

              {/* Shield Absorbed tag */}
              {hadShield && (
                <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.2 rounded border border-cyan-400/50">
                  <ShieldAlert className="w-2.5 h-2.5" />
                  <span>🛡️ -{item.shieldAbsorbed} Shield Absorbed</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
