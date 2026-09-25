import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { UnlockedKGA, AttackerStats } from '../types';
import { Sparkles, Trophy, Crown } from 'lucide-react';

interface ChestRewardModalProps {
  isDefeated: boolean;
  kga: UnlockedKGA;
  topAttackers: AttackerStats[];
}

export const ChestRewardModal: React.FC<ChestRewardModalProps> = ({
  isDefeated,
  kga,
  topAttackers
}) => {
  const [chestOpened, setChestOpened] = useState(false);

  useEffect(() => {
    if (isDefeated) {
      // Delay opening chest slightly for dramatic drop
      const openTimer = setTimeout(() => {
        setChestOpened(true);
        // Trigger massive confetti cannon
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 400);
      }, 1000);

      return () => clearTimeout(openTimer);
    } else {
      setChestOpened(false);
    }
  }, [isDefeated]);

  if (!isDefeated) return null;

  const mvp = topAttackers.length > 0 ? topAttackers[0] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none"
      >
        {/* Background Radiant Sunburst Beam */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-red-600/10 to-transparent blur-3xl"
          />
        </div>

        {/* Main Victory Dialog */}
        <div className="relative max-w-xl w-full flex flex-col items-center text-center space-y-6">
          {/* 1. Fullscreen RAID CLEARED Grand Banner */}
          <motion.div
            initial={{ scale: 0.3, y: -50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 100 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold tracking-widest text-xs uppercase bg-amber-950/80 px-4 py-1 rounded-full border border-amber-500/40">
              <Crown className="w-4 h-4 fill-amber-400" />
              <span>VICTORY ACHIEVED • STREAM RAID CLEARED</span>
              <Crown className="w-4 h-4 fill-amber-400" />
            </div>

            <h1 className="text-4xl md:text-6xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-600 drop-shadow-[0_0_35px_rgba(245,158,11,0.8)] tracking-wider mt-2">
              RAID CLEARED!
            </h1>
            <p className="text-sm text-slate-300 font-medium">
              Der Höllenschmied wurde besiegt! Die Belohnungstruhe öffnet sich...
            </p>
          </motion.div>

          {/* 2. Dropped Mythic Chest Animation */}
          <motion.div
            initial={{ y: -200, scale: 0.2, rotate: -15, opacity: 0 }}
            animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120, delay: 0.2 }}
            className="relative cursor-pointer group"
            onClick={() => {
              confetti({ particleCount: 50, spread: 60 });
            }}
          >
            {/* Shimmer Light Behind Chest */}
            <div className="absolute -inset-6 rounded-full bg-amber-400/30 blur-2xl animate-pulse" />

            {/* Chest Graphic Box */}
            <div className="relative w-44 h-36 md:w-52 md:h-44 bg-gradient-to-b from-amber-800 via-amber-950 to-slate-950 rounded-2xl border-2 border-amber-400 p-4 shadow-[0_0_30px_rgba(251,191,36,0.6)] flex flex-col items-center justify-center">
              {/* Chest Lock / Emissive Core */}
              <motion.div
                animate={chestOpened ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                className="text-5xl md:text-6xl mb-1 filter drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]"
              >
                {chestOpened ? '🎁' : '🔒'}
              </motion.div>

              <div className="text-xs font-cinzel font-bold text-amber-300 tracking-wider">
                {chestOpened ? 'MYTHISCHE TRUHE GEÖFFNET' : 'TRUHE WIRD GEÖFFNET...'}
              </div>
            </div>
          </motion.div>

          {/* 3. Unlocked KGA Reveal Card */}
          <AnimatePresence>
            {chestOpened && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-full bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-amber-950/90 border-2 border-amber-400/80 rounded-2xl p-5 shadow-[0_0_35px_rgba(245,158,11,0.5)] flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-2 text-amber-300 text-xs font-extrabold uppercase tracking-widest">
                  <Sparkles className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>NEUES KGA FREIGESCHALTET</span>
                  <Sparkles className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>

                <div className="text-2xl md:text-3xl font-black font-cinzel text-white text-center">
                  {kga.title || 'KGA #01: MYSTERY SLAB UNLOCKED!'}
                </div>

                <p className="text-xs md:text-sm text-slate-300 max-w-md text-center">
                  {kga.subtitle || 'Vielen Dank an alle Käufer und Helden des Streams! Das KGA ist jetzt live!'}
                </p>

                {kga.code && (
                  <div className="mt-1 px-4 py-1.5 rounded-xl bg-black/60 border border-amber-500/50 text-amber-300 font-mono text-xs font-black tracking-widest">
                    CODE: {kga.code}
                  </div>
                )}

                {/* MVP Highlight */}
                {mvp && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Raid MVP: <strong>@{mvp.username}</strong> ({mvp.totalDamage.toLocaleString()} DMG)</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
