import { Crown, Sparkles, Shield, Zap, Flame } from 'lucide-react';

interface RankBadgeProps {
  tier: number;
  title: string;
  badgeEmoji?: string;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  tier,
  title,
  badgeEmoji,
  size = 'sm',
  showTitle = true
}) => {
  const getTierStyles = () => {
    switch (tier) {
      case 5: // Erzmagus
        return {
          border: 'border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
          bg: 'bg-gradient-to-br from-amber-500/30 to-purple-600/30',
          textColor: 'text-amber-300',
          glow: 'text-glow-gold',
          icon: <Crown className="w-3 h-3 text-amber-300 animate-pulse" />
        };
      case 4: // Magister
        return {
          border: 'border-purple-400/70 shadow-[0_0_8px_rgba(192,132,252,0.5)]',
          bg: 'bg-gradient-to-br from-purple-600/30 to-indigo-700/30',
          textColor: 'text-purple-300',
          glow: 'text-glow-purple',
          icon: <Flame className="w-3 h-3 text-purple-300" />
        };
      case 3: // Akolyth
        return {
          border: 'border-sky-400/70 shadow-[0_0_6px_rgba(56,189,248,0.5)]',
          bg: 'bg-gradient-to-br from-sky-500/30 to-cyan-700/30',
          textColor: 'text-sky-300',
          glow: 'text-glow-cyan',
          icon: <Zap className="w-2.5 h-2.5 text-sky-300" />
        };
      case 2: // Adept
        return {
          border: 'border-emerald-400/60 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
          bg: 'bg-gradient-to-br from-emerald-600/25 to-teal-800/20',
          textColor: 'text-emerald-300',
          glow: '',
          icon: <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
        };
      default: // Novize
        return {
          border: 'border-slate-400/40 shadow-[0_0_4px_rgba(148,163,184,0.3)]',
          bg: 'bg-slate-800/60',
          textColor: 'text-slate-300',
          glow: '',
          icon: <Shield className="w-2.5 h-2.5 text-slate-400" />
        };
    }
  };

  const style = getTierStyles();

  return (
    <div className="inline-flex items-center gap-1">
      <div
        className={`flex items-center justify-center rounded-md border ${style.border} ${style.bg} ${
          size === 'sm' ? 'w-4.5 h-4.5 text-[10px]' : size === 'lg' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'
        } backdrop-blur-md transition-all duration-300`}
      >
        {badgeEmoji ? (
          <span className="leading-none select-none text-[11px]">{badgeEmoji}</span>
        ) : (
          style.icon
        )}
      </div>

      {showTitle && (
        <span
          className={`font-cinzel font-bold tracking-wide ${style.textColor} ${style.glow} ${
            size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'
          }`}
        >
          {title}
        </span>
      )}
    </div>
  );
};
