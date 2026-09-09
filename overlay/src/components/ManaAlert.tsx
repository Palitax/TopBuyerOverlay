import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, Crown, Zap, Gem } from 'lucide-react';
import { PurchaseEvent } from '../types';
import { RankUpEventPayload } from '../hooks/useWebSocket';

interface ManaAlertProps {
  purchase: PurchaseEvent | null;
  rankUp: RankUpEventPayload | null;
  onDismiss: () => void;
  onDissolve?: (purchase: PurchaseEvent) => void;
}

export const ManaAlert: React.FC<ManaAlertProps> = ({
  purchase,
  rankUp,
  onDismiss,
  onDissolve
}) => {
  const [isDissolving, setIsDissolving] = useState(false);

  // Fire confetti on Rank Up or Legendary Purchase
  useEffect(() => {
    if (rankUp) {
      const isTopTier = rankUp.newTier >= 4;
      const colors = isTopTier
        ? ['#fbbf24', '#c084fc', '#e879f9', '#ffffff']
        : ['#38bdf8', '#818cf8', '#34d399', '#ffffff'];

      confetti({
        particleCount: isTopTier ? 70 : 40,
        spread: 70,
        origin: { y: 0.25, x: 0.5 },
        colors,
        disableForReducedMotion: true
      });
    } else if (purchase && purchase.rarity === 'legendary') {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.25, x: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#ffffff'],
        disableForReducedMotion: true
      });
    }
  }, [rankUp, purchase]);

  // Lifecycle: 1.8s read -> dissolve into particles -> 2.8s dismiss
  useEffect(() => {
    if (!purchase && !rankUp) {
      setIsDissolving(false);
      return;
    }

    setIsDissolving(false);

    // After 1.8s, initiate particle dissolve
    const dissolveTimer = setTimeout(() => {
      setIsDissolving(true);
      if (purchase && onDissolve) {
        onDissolve(purchase);
      }
    }, 1800);

    // After 2.8s, completely dismiss
    const dismissTimer = setTimeout(() => {
      onDismiss();
      setIsDissolving(false);
    }, 2800);

    return () => {
      clearTimeout(dissolveTimer);
      clearTimeout(dismissTimer);
    };
  }, [purchase, rankUp, onDismiss, onDissolve]);

  if (!purchase && !rankUp) return null;

  const getRarityBadge = (rarity?: string) => {
    switch (rarity) {
      case 'legendary':
        return {
          label: 'LEGENDARY',
          border: 'border-amber-400/80',
          bg: 'bg-gradient-to-r from-amber-500/30 to-yellow-600/30 text-amber-300',
          icon: <Gem className="w-3 h-3 text-amber-300 animate-pulse" />
        };
      case 'epic':
        return {
          label: 'EPIC',
          border: 'border-purple-400/80',
          bg: 'bg-gradient-to-r from-purple-500/30 to-indigo-600/30 text-purple-300',
          icon: <Sparkles className="w-3 h-3 text-purple-300" />
        };
      default:
        return {
          label: 'RARE',
          border: 'border-sky-400/70',
          bg: 'bg-gradient-to-r from-sky-500/30 to-blue-600/30 text-sky-300',
          icon: <Zap className="w-3 h-3 text-sky-300" />
        };
    }
  };

  const rarityInfo = purchase ? getRarityBadge(purchase.rarity) : null;
  const isStreakActive = purchase && purchase.streakMultiplier && purchase.streakMultiplier > 1.0;

  return (
    <AnimatePresence>
      <div
        id="mana-alert-box"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[95%] max-w-[340px]"
      >
        {/* RANK UP PROMOTION ALERT */}
        {rankUp ? (
          <motion.div
            key={`rankup-${rankUp.username}-${rankUp.newTier}`}
            initial={{ opacity: 0, scale: 0.7, y: -20 }}
            animate={{
              opacity: isDissolving ? 0 : 1,
              scale: isDissolving ? 0.92 : 1,
              y: isDissolving ? -10 : 0,
              filter: isDissolving ? 'blur(4px) brightness(1.8)' : 'blur(0px) brightness(1)'
            }}
            exit={{ opacity: 0, scale: 0.8, y: -15 }}
            transition={{ duration: isDissolving ? 0.45 : 0.3 }}
            className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-amber-400 via-purple-500 to-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.6)]"
          >
            <div className="relative bg-slate-950/95 backdrop-blur-xl rounded-xl p-2.5 flex items-center gap-2.5 border border-amber-300/40">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400/20 to-purple-600/30 border border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.5)] flex-shrink-0">
                <Crown className="w-5 h-5 text-amber-300 animate-bounce" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-amber-400 text-[9px] font-cinzel font-bold tracking-widest uppercase">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-spin" />
                  <span>RANG-AUFSTIEG!</span>
                </div>
                <h3 className="text-white font-extrabold text-xs truncate font-cinzel">
                  @{rankUp.username}
                </h3>
                <p className="text-slate-300 text-[10px] font-medium leading-tight">
                  Aufgestiegen zum{' '}
                  <span className="text-amber-300 font-bold font-cinzel text-glow-gold">
                    {rankUp.newRankTitle}
                  </span>
                  !
                </p>
              </div>

              <div className="bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 rounded text-amber-300 font-mono text-[10px] font-bold whitespace-nowrap">
                +{rankUp.purchaseEvent.manaGained} MP
              </div>
            </div>
          </motion.div>
        ) : purchase ? (
          /* REGULAR / RARITY PURCHASE ALERT - WITH BLUE PARTICLE DISSOLVE EFFECT */
          <motion.div
            key={`purchase-${purchase.id}`}
            initial={{ opacity: 0, scale: 0.8, y: -15 }}
            animate={{
              opacity: isDissolving ? 0 : 1,
              scale: isDissolving ? 0.94 : 1,
              y: isDissolving ? -8 : 0,
              filter: isDissolving ? 'blur(3px) brightness(2)' : 'blur(0px) brightness(1)'
            }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: isDissolving ? 0.45 : 0.3 }}
            className={`relative p-[1.5px] rounded-xl bg-gradient-to-r ${
              purchase.rarity === 'legendary'
                ? 'from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_25px_rgba(251,191,36,0.7)]'
                : purchase.rarity === 'epic'
                ? 'from-purple-400 via-fuchsia-400 to-indigo-500 shadow-[0_0_20px_rgba(192,132,252,0.6)]'
                : 'from-sky-400 via-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(56,189,248,0.5)]'
            }`}
          >
            <div className="relative bg-slate-950/95 backdrop-blur-xl rounded-xl p-2.5 flex flex-col gap-1.5 border border-slate-700/60">
              {/* Header: User + Rarity Badge + Streak */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-white font-bold text-xs truncate">
                    @{purchase.username}
                  </span>
                  {purchase.quantity && purchase.quantity > 1 && (
                    <span className="text-purple-300 text-[10px] font-normal">({purchase.quantity}x)</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Streak Flame Badge */}
                  {isStreakActive && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      🔥 x{purchase.streakMultiplier}
                    </span>
                  )}

                  {/* Rarity Pill */}
                  {rarityInfo && (
                    <span
                      className={`flex items-center gap-1 text-[9px] font-cinzel font-bold px-1.5 py-0.2 rounded border ${rarityInfo.border} ${rarityInfo.bg}`}
                    >
                      {rarityInfo.icon}
                      {rarityInfo.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-info: Item title, price & Points breakdown */}
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span className="truncate max-w-[190px] text-slate-400">
                  {purchase.itemTitle || 'Whatnot Stream Item'} {purchase.price ? `(${purchase.price})` : ''}
                </span>

                <div className="bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded text-cyan-300 font-mono text-[11px] font-extrabold whitespace-nowrap">
                  +{purchase.manaGained} MP
                </div>
              </div>

              {/* Detailed Points Formula Breakdown */}
              {(purchase.priceBonus !== undefined && purchase.priceBonus > 0) || isStreakActive ? (
                <div className="text-[8.5px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>
                    100 Basis + {purchase.priceBonus || 0} Wert-Bonus
                    {isStreakActive ? ` (x${purchase.streakMultiplier} Streak)` : ''}
                  </span>
                  <span className="text-amber-300 font-bold">+{purchase.manaGained} MP</span>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </div>
    </AnimatePresence>
  );
};
