import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BossState, RaidHitEvent } from '../types';
import { Flame, Skull } from 'lucide-react';

interface BossFrameProps {
  boss: BossState;
  latestHit: RaidHitEvent | null;
}

export const BossFrame: React.FC<BossFrameProps> = ({ boss, latestHit }) => {
  const [isHitShaking, setIsHitShaking] = useState(false);
  const [showEnrageBanner, setShowEnrageBanner] = useState(false);

  const hpPercent = (boss.currentHp / (boss.maxHp || 1)) * 100;
  const isPhase2 = boss.phase === 2 || boss.isEnraged || hpPercent <= 50;
  const isLowHp = hpPercent > 0 && hpPercent <= 15;

  // Trigger hit shake on incoming damage
  useEffect(() => {
    if (!latestHit) return;
    setIsHitShaking(true);
    const timer = setTimeout(() => setIsHitShaking(false), 320);
    return () => clearTimeout(timer);
  }, [latestHit]);

  // Trigger Phase 2 banner alert on transition
  useEffect(() => {
    if (isPhase2 && !boss.isDefeated) {
      setShowEnrageBanner(true);
      const timer = setTimeout(() => setShowEnrageBanner(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isPhase2, boss.isDefeated]);

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Phase 2 / Enrage Pop-up Banner Alert */}
      <AnimatePresence>
        {showEnrageBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute -top-12 z-40 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white font-black text-sm font-cinzel shadow-[0_0_25px_rgba(239,68,68,0.9)] border border-amber-300 tracking-widest"
          >
            <Flame className="w-5 h-5 animate-bounce fill-amber-200 text-amber-200" />
            <span>⚔️ BOSS ENRAGED • PHASE 2 ACTIVATED! ⚔️</span>
            <Flame className="w-5 h-5 animate-bounce fill-amber-200 text-amber-200" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Boss Frame Chassis */}
      <motion.div
        animate={
          boss.isDefeated
            ? {
                scale: [1, 1.15, 0.9, 0.4, 0],
                opacity: [1, 0.9, 0.6, 0.2, 0],
                filter: [
                  'brightness(1) contrast(1)',
                  'brightness(3) contrast(2) hue-rotate(90deg)',
                  'brightness(4) blur(10px)',
                  'brightness(10) blur(20px)',
                  'brightness(0) blur(30px)'
                ],
                rotate: [0, -3, 3, -8, 12]
              }
            : isHitShaking
            ? {
                x: [0, -8, 8, -5, 5, 0],
                y: [0, 4, -4, 2, 0],
                scale: [1, 0.96, 1.02, 1]
              }
            : {
                y: [0, -6, 0]
              }
        }
        transition={
          boss.isDefeated
            ? { duration: 1.8, ease: 'easeInOut' }
            : isHitShaking
            ? { duration: 0.3 }
            : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }
        className="relative group flex flex-col items-center"
      >
        {/* Enrage Flaming Aura Backlight */}
        {isPhase2 && !boss.isDefeated && (
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -inset-6 rounded-full bg-gradient-to-r from-red-600/50 via-orange-600/60 to-amber-500/50 blur-2xl -z-10 pointer-events-none"
          />
        )}

        {/* Boss Creature Image Container */}
        <div
          className={`relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
            isLowHp
              ? 'border-red-500/90 shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse'
              : isPhase2
              ? 'border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.8)]'
              : 'border-amber-500/50 shadow-[0_0_20px_rgba(0,0,0,0.9)]'
          } bg-gradient-to-b from-slate-900/90 via-black to-slate-950`}
        >
          {/* Boss Image */}
          <img
            src={boss.avatarUrl || '/boss.png'}
            alt={boss.name}
            className={`w-full h-full object-cover object-top transition-all duration-300 ${
              isPhase2 ? 'contrast-125 saturate-125' : ''
            }`}
          />

          {/* Hit Flash Overlay */}
          {isHitShaking && (
            <div className="absolute inset-0 bg-red-500/30 mix-blend-color-dodge pointer-events-none animate-ping" />
          )}

          {/* Bottom Gradient for Name Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

          {/* Boss Badge / Status Ribbon */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-amber-500/40 text-[11px] font-bold text-amber-300 shadow-lg">
            <Skull className="w-3.5 h-3.5 text-red-400" />
            <span className="font-cinzel">LVL 99 WORLD BOSS</span>
          </div>

          {/* Enrage Flare Flame Icon Top Right */}
          {isPhase2 && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-950/80 border border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            >
              <Flame className="w-4 h-4 fill-red-500" />
            </motion.div>
          )}

          {/* Boss Name & Title Banner at bottom of frame */}
          <div className="absolute inset-x-0 bottom-2 px-3 text-center">
            <h2 className="text-sm md:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 font-cinzel tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {boss.name}
            </h2>
            <p className="text-[10px] text-slate-300 font-medium tracking-wide">
              {boss.title}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
