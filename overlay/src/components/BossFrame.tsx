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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const hpPercent = (boss.currentHp / (boss.maxHp || 1)) * 100;
  const isPhase2 = boss.phase === 2 || boss.isEnraged || hpPercent <= 50;
  const isLowHp = hpPercent > 0 && hpPercent <= 15;

  // Faster breathing and pulsing when Enraged in Phase 2
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = isPhase2 ? 1.25 : 1.0;
    }
  }, [isPhase2]);

  // Real-time Black-to-Transparent Luma/Chroma Keyer on Canvas
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isRunning = true;

    const renderLoop = () => {
      if (!isRunning) return;

      if (video.readyState >= 2 && !video.paused && !video.ended) {
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(video, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const len = data.length;

        // Chroma / Luma Key: Remove black background smoothly with feathering
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Compute max brightness of current pixel
          const maxVal = Math.max(r, g, b);

          // Black threshold
          if (maxVal <= 14) {
            data[i + 3] = 0; // Pure Transparent
          } else if (maxVal < 42) {
            // Smooth edge feathering
            const alpha = Math.round(((maxVal - 14) / (42 - 14)) * 255);
            data[i + 3] = alpha;
          }
        }

        ctx.putImageData(imgData, 0, 0);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
      {/* Hidden Source Video for Canvas Processing */}
      <video
        ref={videoRef}
        src="/boss.mp4"
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />

      {/* Phase 2 / Enrage Pop-up Banner Alert */}
      <AnimatePresence>
        {showEnrageBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute -top-10 z-40 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white font-black text-sm font-cinzel shadow-[0_0_30px_rgba(239,68,68,0.9)] border border-amber-300 tracking-widest"
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
          className={`absolute bottom-6 w-56 h-12 rounded-full blur-xl pointer-events-none transition-all duration-300 ${
            isLowHp
              ? 'bg-red-600/70 shadow-[0_0_40px_rgba(239,68,68,0.9)] animate-pulse'
              : isPhase2
              ? 'bg-orange-500/60 shadow-[0_0_35px_rgba(249,115,22,0.8)]'
              : 'bg-amber-600/40 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
          }`}
        />

        {/* Free-Standing Boss Canvas (100% Transparent Background) */}
        <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center overflow-visible">
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            className={`w-full h-full object-contain pointer-events-none transition-all duration-300 ${
              isLowHp
                ? 'drop-shadow-[0_0_25px_rgba(239,68,68,0.9)] drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]'
                : isPhase2
                ? 'drop-shadow-[0_0_20px_rgba(249,115,22,0.8)] drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] contrast-125'
                : 'drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)]'
            }`}
          />

          {/* Hit Flash Red Shockwave */}
          {isHitShaking && (
            <div className="absolute inset-0 bg-red-500/20 mix-blend-color-dodge pointer-events-none animate-ping rounded-full blur-md" />
          )}
        </div>

        {/* RPG Floating Nameplate & Level Tag directly below Boss Character */}
        <div className="flex flex-col items-center gap-1 -mt-4 z-20">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-amber-500/50 shadow-[0_4px_15px_rgba(0,0,0,0.9)]">
            <Skull className="w-3.5 h-3.5 text-red-400" />
            <span className="font-cinzel text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 tracking-wider">
              {boss.name}
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
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
