import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { LeaderboardState, PurchaseEvent } from '../types';
import { RankBadge } from './RankBadge';
import { ManaBar } from './ManaBar';
import { Particles } from './Particles';
import { FlyingManaParticles, FlyingParticleGroup } from './FlyingManaParticles';
import { AnimatedCounter } from './AnimatedCounter';

interface ManaOverlayProps {
  state: LeaderboardState | null;
  status: string;
}

export const ManaOverlay: React.FC<ManaOverlayProps> = ({ state }) => {
  const leaderboard = state?.leaderboard || [];
  const maxDisplay = Number(state?.config?.maxDisplayCount) || 3;
  const topBuyers = leaderboard.slice(0, maxDisplay);

  const [particleGroups, setParticleGroups] = useState<FlyingParticleGroup[]>([]);
  const [impactedUser, setImpactedUser] = useState<string | null>(null);

  const normalizeName = (name: string) => name.replace(/^@/, '').trim().toLowerCase();

  // Triggered when Purchase Alert dissolves into particles
  const triggerManaParticles = useCallback(
    (purchase: PurchaseEvent) => {
      const cleanUser = normalizeName(purchase.username);

      const buyerIndex = topBuyers.findIndex(
        (b) => normalizeName(b.username) === cleanUser
      );
      const isUserPresent = buyerIndex !== -1;

      const alertBox = document.getElementById('mana-alert-box');
      let startX = window.innerWidth / 2;
      let startY = 50;

      if (alertBox) {
        const rect = alertBox.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }

      let targetX: number | null = null;
      let targetY: number | null = null;
      let targetWidth = 220;

      if (isUserPresent) {
        const barEl = document.getElementById(`buyer-manabar-inner-${cleanUser}`);
        if (barEl) {
          const rect = barEl.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
          targetWidth = rect.width;
        } else {
          targetX = startX;
          targetY = 100 + buyerIndex * 50;
        }
      }

      const newGroup: FlyingParticleGroup = {
        id: `${Date.now()}-${Math.random()}`,
        startX,
        startY,
        targetX,
        targetY,
        targetWidth,
        count: isUserPresent ? 18 : 8,
        isUserPresent,
        username: cleanUser
      };

      setParticleGroups((prev) => [...prev, newGroup]);
    },
    [topBuyers]
  );

  React.useEffect(() => {
    const handleTrigger = (e: CustomEvent<PurchaseEvent>) => {
      if (e.detail) {
        triggerManaParticles(e.detail);
      }
    };
    window.addEventListener('mana-alert-dissolve' as any, handleTrigger as any);
    return () => window.removeEventListener('mana-alert-dissolve' as any, handleTrigger as any);
  }, [triggerManaParticles]);

  const handleParticleComplete = (_id: string, isUserPresent: boolean, username?: string) => {
    setParticleGroups((prev) => prev.filter((g) => g.id !== _id));
    if (isUserPresent && username) {
      setImpactedUser(username);
      setTimeout(() => {
        setImpactedUser((current) => (current === username ? null : current));
      }, 750);
    }
  };

  const getPositionBadge = (pos: number) => {
    switch (pos) {
      case 1:
        return (
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-[11px] shadow-[0_0_8px_rgba(251,191,36,0.7)] border border-yellow-200 flex-shrink-0">
            🥇
          </div>
        );
      case 2:
        return (
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 flex items-center justify-center text-slate-950 font-black text-[11px] shadow-[0_0_7px_rgba(226,232,240,0.6)] border border-white flex-shrink-0">
            🥈
          </div>
        );
      case 3:
        return (
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 via-amber-700 to-amber-900 flex items-center justify-center text-white font-black text-[11px] shadow-[0_0_7px_rgba(217,119,6,0.6)] border border-amber-300/60 flex-shrink-0">
            🥉
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center text-slate-400 font-bold text-[9.5px] border border-slate-700 flex-shrink-0">
            #{pos}
          </div>
        );
    }
  };

  const getPodiumCardStyle = (pos: number) => {
    switch (pos) {
      case 1:
        return 'fantasy-panel-gold';
      case 2:
        return 'fantasy-panel-silver';
      case 3:
        return 'fantasy-panel-bronze';
      default:
        return 'fantasy-panel';
    }
  };

  return (
    <div className="relative w-full max-w-[340px] select-none">
      {/* Background Floating Mana Particles */}
      <Particles count={10} />

      {/* Dynamic Flying Mana Particles */}
      <FlyingManaParticles groups={particleGroups} onComplete={handleParticleComplete} />

      {/* Solid Floating Leaderboard Cards */}
      {topBuyers.length === 0 ? (
        <div className="py-3 px-4 rounded-xl bg-[#0b0f19] border border-slate-700 text-center flex items-center justify-center gap-2 shadow-2xl">
          <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
          <span className="text-slate-300 font-cinzel text-xs font-semibold">
            Warte auf Käufe...
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {topBuyers.map((buyer) => {
              const cleanName = normalizeName(buyer.username);
              const hasStreak = !!(buyer.streakMultiplier && buyer.streakMultiplier > 1.0);
              const isImpacted = impactedUser === cleanName;

              return (
                <motion.div
                  key={buyer.username}
                  layout
                  initial={false}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0
                  }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{
                    type: 'spring',
                    damping: 22,
                    stiffness: 200,
                    mass: 0.7
                  }}
                  className={`relative rounded-xl p-2 transition-all duration-300 border-[1.5px] shadow-2xl ${getPodiumCardStyle(
                    buyer.position
                  )}`}
                >
                  <div className="flex flex-col gap-1.5">
                    {/* Row 1: Medal + Username + Mana MP on Left; Rank Badge on Right */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getPositionBadge(buyer.position)}
                        <span className="text-white font-bold text-[12.5px] truncate max-w-[140px] drop-shadow-md tracking-tight">
                          @{buyer.username.replace(/^@/, '')}
                        </span>
                        <span className="text-cyan-300 font-mono font-extrabold text-[10px] bg-black/80 border border-sky-400/40 px-1.5 py-0.5 rounded shadow-[0_0_6px_rgba(56,189,248,0.25)] flex-shrink-0">
                          <AnimatedCounter value={buyer.mana} suffix=" MP" />
                        </span>
                      </div>

                      <RankBadge
                        tier={buyer.tier}
                        title={buyer.rankTitle}
                        badgeEmoji={buyer.rankBadge}
                        size="sm"
                      />
                    </div>

                    {/* Row 2: Stylized Mana Bar (18px height, full width) */}
                    <div id={`buyer-manabar-inner-${cleanName}`} className="w-full">
                      <ManaBar
                        progressPercent={buyer.progressToNextTier}
                        isImpacted={isImpacted}
                        hasStreak={hasStreak}
                        streakMultiplier={buyer.streakMultiplier}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
