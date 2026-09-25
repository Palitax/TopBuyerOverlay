import React, { useState, useEffect, useRef } from 'react';
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
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hpPercent = (boss.currentHp / (boss.maxHp || 1)) * 100;
  const isPhase2 = boss.phase === 2 || boss.isEnraged || hpPercent <= 50;
  const isLowHp = hpPercent > 0 && hpPercent <= 15;

  const bossName = boss?.name || "VOD'KOR DER INFERNO-FÜRST";

  // Ensure video autoplays and adjusts speed when enraged
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = isPhase2 ? 1.25 : 1.0;
      video.play().catch(() => {
        // Autoplay policy fallback
      });
    }
  }, [isPhase2]);

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
    <div className="relative flex flex-col items-center select-none overflow-visible">
      {/* Phase 2 / Enrage Pop-up Banner Alert */}
      <AnimatePresence>
        {showEnrageBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute -top-12 z-40 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white font-black text-sm font-cinzel shadow-[0_0_30px_rgba(239,68,68,0.9)] border border-amber-300 tracking-widest"
          >
            <Flame className="w-5 h-5 animate-bounce fill-amber-200 text-amber-200" />
            <span>⚔️ BOSS ENRAGED • PHASE 2 ACTIVATED! ⚔️</span>
            <Flame className="w-5 h-5 animate-bounce fill-amber-200 text-amber-200" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free-Standing Animated Boss Character (Zero Card Borders, Zero Background Box) */}
      <motion.div
        animate={
          boss.isDefeated
            ? {
                scale: [1, 1.2, 0.8, 0.3, 0],
                opacity: [1, 0.9, 0.6, 0.2, 0],
                filter: [
                  'brightness(1) contrast(1)',
                  'brightness(3) contrast(2) hue-rotate(90deg)',
                  'brightness(5) blur(12px)',
                  'brightness(10) blur(24px)',
                  'brightness(0) blur(40px)'
                ],
                rotate: [0, -4, 4, -10, 15]
              }
            : isHitShaking
            ? {
                x: [0, -10, 10, -6, 6, 0],
                y: [0, 5, -5, 3, 0],
                scale: [1, 0.95, 1.03, 1]
              }
            : {
                y: [0, -5, 0]
              }
        }
        transition={
          boss.isDefeated
            ? { duration: 1.8, ease: 'easeInOut' }
            : isHitShaking
            ? { duration: 0.3 }
            : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
        }
        className="relative flex flex-col items-center overflow-visible"
      >
        {/* Dynamic Fiery Ground Shadow / Aura beneath Boss feet */}
        <div
          className={`absolute bottom-4 w-64 h-14 rounded-full blur-2xl pointer-events-none transition-all duration-300 ${
            isLowHp
              ? 'bg-red-600/70 shadow-[0_0_40px_rgba(239,68,68,0.9)] animate-pulse'
              : isPhase2
              ? 'bg-orange-500/60 shadow-[0_0_35px_rgba(249,115,22,0.8)]'
              : 'bg-amber-600/40 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
          }`}
        />

        {/* Boss Visual Container: Screen blend mode makes black background 100% transparent */}
        <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center overflow-visible">
          {!videoError ? (
            <video
              ref={videoRef}
              src="/boss.mp4"
              autoPlay
              loop
              muted
              playsInline
              onError={() => setVideoError(true)}
              className={`w-full h-full object-contain pointer-events-none transition-all duration-300 ${
                isLowHp
                  ? 'contrast-125 saturate-150 drop-shadow-[0_0_30px_rgba(239,68,68,0.9)]'
                  : isPhase2
                  ? 'contrast-125 saturate-125 drop-shadow-[0_0_25px_rgba(249,115,22,0.8)]'
                  : 'drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]'
              }`}
              style={{
                mixBlendMode: 'screen',
                filter: isLowHp
                  ? 'drop-shadow(0 0 25px #ef4444)'
                  : isPhase2
                  ? 'drop-shadow(0 0 20px #f97316)'
                  : 'drop-shadow(0 0 15px rgba(245, 158, 11, 0.7))'
              }}
            />
          ) : (
            <img
              src={boss.avatarUrl || '/boss.png'}
              alt={bossName}
              className={`w-full h-full object-contain pointer-events-none transition-all duration-300 ${
                isPhase2 ? 'contrast-125 saturate-125' : ''
              }`}
              style={{
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.6))'
              }}
            />
          )}

          {/* Hit Flash Red Shockwave */}
          {isHitShaking && (
            <div className="absolute inset-0 bg-red-500/25 mix-blend-screen pointer-events-none animate-ping rounded-full blur-xl" />
          )}
        </div>

        {/* RPG Floating Nameplate & Level Tag */}
        <div className="flex flex-col items-center gap-1 -mt-4 z-20">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-amber-500/60 shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
            <Skull className="w-3.5 h-3.5 text-red-400" />
            <span className="font-cinzel text-xs font-black text-amber-300 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {bossName}
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/90 px-1.5 py-0.2 rounded border border-amber-500/50">
              LVL 99
            </span>
            {isPhase2 && (
              <span className="text-[10px] font-black text-red-400 flex items-center gap-0.5 animate-pulse">
                <Flame className="w-3 h-3 fill-red-400" />
                PHASE 2
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
