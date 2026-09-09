import React from 'react';

interface CandleFlameProps {
  size?: number;
  multiplier?: number;
}

export const CandleFlame: React.FC<CandleFlameProps> = ({ size = 18, multiplier }) => {
  return (
    <div className="inline-flex items-center gap-1 relative select-none">
      {/* Candle Flame Container anchored at bottom */}
      <div
        className="relative flex items-center justify-center origin-bottom"
        style={{ width: size, height: size * 1.3 }}
      >
        <svg
          viewBox="0 0 32 42"
          className="w-full h-full overflow-visible candle-flame-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer flame gradient: Crimson to fiery orange to amber */}
            <linearGradient id="outerFlameGrad" x1="16" y1="42" x2="16" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="35%" stopColor="#ea580c" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>

            {/* Inner flame core: Golden yellow to brilliant white hot */}
            <linearGradient id="innerFlameGrad" x1="16" y1="38" x2="16" y2="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            {/* Candle glow filter */}
            <filter id="candleGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Atmospheric Soft Light Aura behind the flame */}
          <ellipse
            cx="16"
            cy="24"
            rx="12"
            ry="16"
            fill="#f59e0b"
            opacity="0.25"
            className="flame-aura"
          />

          {/* Outer Burning Flame Body - Wavering and Flickering like a candle */}
          <path
            d="M16 2 C16 2, 25 14, 25 25 C25 33 21 38 16 38 C11 38 7 33 7 25 C7 14, 16 2, 16 2 Z"
            fill="url(#outerFlameGrad)"
            filter="url(#candleGlow)"
            className="outer-flame-tongue"
          />

          {/* Secondary Mid-Flame Tongue for organic flicker */}
          <path
            d="M16 9 C16 9, 22 18, 22 26 C22 32 19 36 16 36 C13 36 10 32 10 26 C10 18, 16 9, 16 9 Z"
            fill="#fbbf24"
            opacity="0.85"
            className="mid-flame-tongue"
          />

          {/* Inner White-Hot Candle Core */}
          <path
            d="M16 16 C16 16, 20 23, 20 28 C20 33 18 35 16 35 C14 35 12 33 12 28 C12 23, 16 16, 16 16 Z"
            fill="url(#innerFlameGrad)"
            className="inner-flame-core"
          />

          {/* Tiny rising ember spark */}
          <circle cx="16" cy="6" r="1" fill="#fff" className="rising-ember" />
        </svg>
      </div>

      {multiplier && multiplier > 1.0 && (
        <span className="font-mono font-black text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/50 px-1 py-0.2 rounded shadow-[0_0_8px_rgba(245,158,11,0.5)] tracking-tight">
          x{multiplier}
        </span>
      )}
    </div>
  );
};
