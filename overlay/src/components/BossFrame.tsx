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

  // Real-time Canvas Chroma Keyer using Boundary-Seeded Flood Fill
  // Removes pure studio black background while preserving dark obsidian steel armor and shadows 100% solid
  const keyerBuffersRef = useRef<{ visited: Uint8Array; queue: Int32Array } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const totalPixels = w * h;

    if (!keyerBuffersRef.current || keyerBuffersRef.current.visited.length !== totalPixels) {
      keyerBuffersRef.current = {
        visited: new Uint8Array(totalPixels),
        queue: new Int32Array(totalPixels),
      };
    }

    const { visited, queue } = keyerBuffersRef.current;
    let animId: number;
    let isMounted = true;

    // Start video playback
    video.muted = true;
    video.play().catch(() => {});

    const BG_THRESH = 8;
    const FEATHER_THRESH = 22;

    const render = () => {
      if (!isMounted) return;

      if (video.readyState >= 2 && !video.paused) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(video, 0, 0, w, h);

        const frame = ctx.getImageData(0, 0, w, h);
        const data = frame.data;

        // Reset visited buffer
        visited.fill(0);
        let qHead = 0;
        let qTail = 0;

        // Seed 4 outer borders (exterior background only)
        for (let x = 0; x < w; x++) {
          // Top row
          let p = x * 4;
          if (data[p] <= BG_THRESH && data[p + 1] <= BG_THRESH && data[p + 2] <= BG_THRESH) {
            visited[x] = 1;
            queue[qTail++] = x;
          }
          // Bottom row
          let bIdx = (h - 1) * w + x;
          p = bIdx * 4;
          if (data[p] <= BG_THRESH && data[p + 1] <= BG_THRESH && data[p + 2] <= BG_THRESH) {
            visited[bIdx] = 1;
            queue[qTail++] = bIdx;
          }
        }
        for (let y = 0; y < h; y++) {
          // Left col
          let lIdx = y * w;
          let p = lIdx * 4;
          if (!visited[lIdx] && data[p] <= BG_THRESH && data[p + 1] <= BG_THRESH && data[p + 2] <= BG_THRESH) {
            visited[lIdx] = 1;
            queue[qTail++] = lIdx;
          }
          // Right col
          let rIdx = y * w + (w - 1);
          p = rIdx * 4;
          if (!visited[rIdx] && data[p] <= BG_THRESH && data[p + 1] <= BG_THRESH && data[p + 2] <= BG_THRESH) {
            visited[rIdx] = 1;
            queue[qTail++] = rIdx;
          }
        }

        // Fast 4-way BFS expansion for exterior black background
        while (qHead < qTail) {
          const curr = queue[qHead++];
          const cx = curr % w;
          const cy = (curr / w) | 0;

          if (cy > 0) {
            const nIdx = curr - w;
            if (!visited[nIdx]) {
              const p = nIdx * 4;
              if (data[p] <= BG_THRESH && data[p + 1] <= BG_THRESH && data[p + 2] <= BG_THRESH) {
                visited[nIdx] = 1;
                queue[qTail++] = nIdx;
              }
            }
          }
          if (cy < h - 1) {
            const nIdx = curr + w;
            if (!visited[nIdx]) {
              const p = nIdx * 4;
              if (data[p] <= BG_THRESH && data[p + 1] <= BG_THRESH && data[p + 2] <= BG_THRESH) {
                visited[nIdx] = 1;
                queue[qTail++] = nIdx;
              }
            }
          }
          if (cx > 0) {
            const nIdx = curr - 1;
            if (!visited[nIdx]) {
              const p = nIdx * 4;
              if (data[p] <= BG_THRESH && data[p + 1] <= BG_THRESH && data[p + 2] <= BG_THRESH) {
                visited[nIdx] = 1;
                queue[qTail++] = nIdx;
              }
            }
          }
          if (cx < w - 1) {
            const nIdx = curr + 1;
            if (!visited[nIdx]) {
              const p = nIdx * 4;
              if (data[p] <= BG_THRESH && data[p + 1] <= BG_THRESH && data[p + 2] <= BG_THRESH) {
                visited[nIdx] = 1;
                queue[qTail++] = nIdx;
              }
            }
          }
        }

        // Apply alpha mask + boundary antialiasing
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const p = idx * 4;
            if (visited[idx] === 1) {
              data[p + 3] = 0;
            } else {
              // Edge smoothing for character silhouette border
              const touchesBg =
                (x > 0 && visited[idx - 1] === 1) ||
                (x < w - 1 && visited[idx + 1] === 1) ||
                (y > 0 && visited[idx - w] === 1) ||
                (y < h - 1 && visited[idx + w] === 1);

              if (touchesBg) {
                const maxVal = Math.max(data[p], data[p + 1], data[p + 2]);
                if (maxVal < FEATHER_THRESH) {
                  const factor = (maxVal - BG_THRESH) / (FEATHER_THRESH - BG_THRESH);
                  data[p + 3] = Math.max(0, Math.min(255, (factor * 255) | 0));
                } else {
                  data[p + 3] = 255;
                }
              } else {
                data[p + 3] = 255;
              }
            }
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
        {/* Subtle Volcanic Ground Base Glow */}
        <div
          className={`absolute bottom-2 w-56 h-10 rounded-full blur-xl pointer-events-none transition-all duration-300 ${
            isLowHp
              ? 'bg-red-600/60 shadow-[0_0_35px_rgba(239,68,68,0.8)] animate-pulse'
              : isPhase2
              ? 'bg-orange-600/50 shadow-[0_0_30px_rgba(234,88,12,0.7)]'
              : 'bg-amber-700/30 shadow-[0_0_20px_rgba(217,119,6,0.4)]'
          }`}
        />

        {/* 100% Transparent Chroma-Keyed Canvas Output (Zero Black Box, Solid Armor) */}
        <div className="relative w-80 h-48 md:w-[420px] md:h-[240px] flex items-center justify-center overflow-visible">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className={`w-full h-full object-contain pointer-events-none transition-all duration-300 ${
              isLowHp
                ? 'drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]'
                : isPhase2
                ? 'drop-shadow-[0_0_20px_rgba(234,88,12,0.85)]'
                : 'drop-shadow-[0_0_15px_rgba(217,119,6,0.6)]'
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
