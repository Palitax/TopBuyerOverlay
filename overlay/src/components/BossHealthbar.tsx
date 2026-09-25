import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Flame, AlertTriangle } from 'lucide-react';

interface BossHealthbarProps {
  currentHp: number;
  maxHp: number;
  shieldHp: number;
  maxShieldHp?: number;
  isEnraged?: boolean;
  phase?: 1 | 2;
}

export const BossHealthbar: React.FC<BossHealthbarProps> = ({
  currentHp,
  maxHp,
  shieldHp,
  maxShieldHp = 1000,
  isEnraged = false,
  phase = 1
}) => {
  const hpPercent = Math.max(0, Math.min(100, (currentHp / (maxHp || 1)) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (shieldHp / (maxShieldHp || 1000)) * 100));
  const isLowHp = hpPercent > 0 && hpPercent <= 15;

  // Ghost Damage Trail (White/Red delayed bar shrinkage)
  const [trailPercent, setTrailPercent] = useState(hpPercent);
  const trailTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (trailTimeoutRef.current) {
      clearTimeout(trailTimeoutRef.current);
    }

    if (hpPercent < trailPercent) {
      // Delay before the ghost bar shrinks
      trailTimeoutRef.current = window.setTimeout(() => {
        setTrailPercent(hpPercent);
      }, 550);
    } else {
      setTrailPercent(hpPercent);
    }

    return () => {
      if (trailTimeoutRef.current) clearTimeout(trailTimeoutRef.current);
    };
  }, [hpPercent, trailPercent]);

  // Segment markers (10 segments)
  const segments = Array.from({ length: 9 }, (_, i) => (i + 1) * 10);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-1.5 select-none">
      {/* Top Header: HP Numbers & Shield Info */}
      <div className="flex items-center justify-between text-xs font-bold px-1">
        <div className="flex items-center gap-2">
          <span
            className={`font-cinzel tracking-wider px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
              isEnraged || phase === 2
                ? 'bg-red-600/30 text-red-300 border border-red-500/50 animate-pulse'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
            }`}
          >
            {isEnraged || phase === 2 ? (
              <>
                <Flame className="w-3 h-3 text-red-400 fill-red-400" />
                <span>PHASE 2 • ENRAGED</span>
              </>
            ) : (
              <span>PHASE 1</span>
            )}
          </span>

          {shieldHp > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-cyan-950/80 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              <Shield className="w-3 h-3 fill-cyan-400" />
              <span>+{shieldHp.toLocaleString()} SCHILD</span>
            </motion.div>
          )}
        </div>

        {/* Numeric HP & Percentage */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {isLowHp && (
            <span className="text-red-400 animate-bounce flex items-center gap-0.5 font-sans text-[11px] font-extrabold mr-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              KRITISCH!
            </span>
          )}
          <span className="text-white font-extrabold text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {currentHp.toLocaleString()}
          </span>
          <span className="text-slate-400 text-[11px]">/ {maxHp.toLocaleString()} HP</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              isLowHp
                ? 'bg-red-500/30 text-red-300 border border-red-500/60'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {Math.round(hpPercent)}%
          </span>
        </div>
      </div>

      {/* Main Bar Frame Container */}
      <div
        className={`relative h-7 md:h-8 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
          isLowHp
            ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8),inset_0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
            : isEnraged
            ? 'border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.6)]'
            : 'border-amber-500/40 shadow-[0_0_15px_rgba(0,0,0,0.8)]'
        } bg-slate-950`}
      >
        {/* Dark Beveled Background Grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />

        {/* 1. Ghost Damage Trail Bar (White / Light Red delayed shrinkage) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-200 via-white to-red-100 transition-all duration-500 ease-out opacity-90 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
          style={{ width: `${trailPercent}%` }}
        />

        {/* 2. Main Health Liquid Fluid Bar */}
        <div
          className={`absolute top-0 bottom-0 left-0 transition-all duration-200 ease-out ${
            isLowHp
              ? 'bg-gradient-to-r from-red-900 via-red-600 to-red-500'
              : isEnraged || phase === 2
              ? 'bg-gradient-to-r from-red-900 via-orange-600 to-amber-500'
              : 'bg-gradient-to-r from-red-800 via-red-600 to-orange-500'
          }`}
          style={{ width: `${hpPercent}%` }}
        >
          {/* Animated Lava / Fire Specular Glow */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
          <div className="absolute top-0 bottom-0 right-0 w-3 bg-white/40 blur-[2px]" />
        </div>

        {/* 3. Shield Overlay Bar (Glowing Cyan Shimmer above regular HP) */}
        {shieldHp > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-600/70 via-sky-400/85 to-teal-300/90 border-r-2 border-white shadow-[0_0_14px_rgba(34,211,238,0.9)]"
            style={{ width: `${shieldPercent}%` }}
          >
            {/* Shimmer line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
          </motion.div>
        )}

        {/* 4. Segment Tick Marks (Notches at every 10%) */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-[1%]">
          {segments.map((seg) => (
            <div
              key={seg}
              className="w-[1.5px] h-full bg-slate-950/70 border-r border-slate-700/40"
              style={{ left: `${seg}%` }}
            />
          ))}
        </div>

        {/* 5. 3D Glass Surface Reflection Glare */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};
