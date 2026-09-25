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

  const hpPercent = (boss.currentHp / (boss.maxHp || 1)) * 100;
  const isPhase2 = boss.phase === 2 || boss.isEnraged || hpPercent <= 50;
  const isLowHp = hpPercent > 0 && hpPercent <= 15;

  const bossName = boss?.name || "VOD'KOR DER INFERNO-FÜRST";

  // Control playback speed for Enrage phase
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = isPhase2 ? 1.25 : 1.0;
    }
  }, [isPhase2]);

  // Real-time Canvas Black-Removal Chroma Keyer
  // This turns near-black video pixels into 100% transparent alpha on transparent OBS canvas
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animId: number;
    let isMounted = true;

    // Start video playback
    video.muted = true;
    video.play().catch(() => {});

    const render = () => {
      if (!isMounted) return;

      if (video.readyState >= 2 && !video.paused) {
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(video, 0, 0, w, h);

        const frame = ctx.getImageData(0, 0, w, h);
        const data = frame.data;
        const len = data.length;

        // Chroma / Luma Keying: Black to transparent
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Compute max channel brightness
          const max = Math.max(r, g, b);

          // Threshold: < 20 is completely transparent, 20-50 is feathered
          if (max <= 20) {
            data[i + 3] = 0;
          } else if (max < 50) {
            data[i + 3] = Math.floor(((max - 20) / 30) * 255);
          }
        }

        ctx.putImageData(frame, 0, 0);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isMounted = false;
      if (animId) cancelAnimationFrame(animId);
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
      {/* Off-screen active video decoder (kept active in DOM so browser decodes frames for Canvas) */}
      <video
        ref={videoRef}
        src="/boss.mp4"
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: -9999
        }}
      />

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

      {/* Free-Standing Boss Character Motion Wrapper */}
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
        {/* Glowing Fiery Ground Shadow beneath Boss */}
        <div
          className={`absolute bottom-6 w-60 h-14 rounded-full blur-2xl pointer-events-none transition-all duration-300 ${
            isLowHp
              ? 'bg-red-600/70 shadow-[0_0_40px_rgba(239,68,68,0.9)] animate-pulse'
              : isPhase2
              ? 'bg-orange-500/60 shadow-[0_0_35px_rgba(249,115,22,0.8)]'
              : 'bg-amber-600/40 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
          }`}
        />

        {/* 100% Transparent Chroma-Keyed Canvas Output (Zero Black Box) */}
        <div className="relative w-80 h-48 md:w-[420px] md:h-[240px] flex items-center justify-center overflow-visible">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className={`w-full h-full object-contain pointer-events-none transition-all duration-300 ${
              isLowHp
                ? 'drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]'
                : isPhase2
                ? 'drop-shadow-[0_0_20px_rgba(249,115,22,0.8)]'
                : 'drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]'
            }`}
          />

          {/* Hit Flash Red Shockwave */}
          {isHitShaking && (
            <div className="absolute inset-0 bg-red-500/25 pointer-events-none animate-ping rounded-full blur-xl" />
          )}
        </div>

        {/* RPG Floating Nameplate & Level Tag */}
        <div className="flex flex-col items-center gap-1 mt-1 z-20">
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
