import React from 'react';
import { AttackerStats } from '../types';
import { Swords, Crown } from 'lucide-react';

interface TopAttackersProps {
  attackers: AttackerStats[];
  totalDamage: number;
}

export const TopAttackers: React.FC<TopAttackersProps> = ({ attackers, totalDamage }) => {
  if (!attackers || attackers.length === 0) return null;

  const top3 = attackers.slice(0, 3);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-1.5 select-none">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
        <span className="flex items-center gap-1.5 text-amber-300 font-cinzel">
          <Swords className="w-3.5 h-3.5" />
          <span>TOP RAID-ANGREIFER</span>
        </span>
        <span>
          Gesamt: <strong className="text-amber-400">{totalDamage.toLocaleString()} DMG</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {top3.map((att, idx) => {
          const isMvp = idx === 0;
          const isSilver = idx === 1;

          return (
            <div
              key={att.username}
              className={`relative flex flex-col p-2 rounded-xl border transition-all duration-300 ${
                isMvp
                  ? 'bg-gradient-to-r from-amber-950/80 to-slate-900/90 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : isSilver
                  ? 'bg-gradient-to-r from-slate-900/90 to-slate-950/90 border-slate-400/60'
                  : 'bg-gradient-to-r from-orange-950/70 to-slate-950/90 border-orange-500/50'
              }`}
            >
              {/* Header with Rank & Username */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isMvp
                        ? 'bg-amber-400 text-black shadow-md'
                        : isSilver
                        ? 'bg-slate-300 text-black'
                        : 'bg-orange-400 text-black'
                    }`}
                  >
                    {isMvp ? <Crown className="w-3 h-3 fill-black" /> : `#${att.rank}`}
                  </span>
                  <span className="font-bold text-xs text-white truncate">
                    @{att.username}
                  </span>
                </div>

                <span className="font-mono text-xs font-black text-amber-300 shrink-0">
                  {att.totalDamage.toLocaleString()} DMG
                </span>
              </div>

              {/* Progress Bar of total raid damage */}
              <div className="relative w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isMvp
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : isSilver
                      ? 'bg-gradient-to-r from-slate-400 to-slate-200'
                      : 'bg-gradient-to-r from-orange-500 to-amber-400'
                  }`}
                  style={{ width: `${Math.max(5, att.percentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{att.hitCount}x Treffer</span>
                <span className="font-bold text-slate-300">{att.percentage}% Anteil</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
