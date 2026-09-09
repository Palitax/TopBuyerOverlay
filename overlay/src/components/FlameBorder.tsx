import React from 'react';

export const FlameBorder: React.FC = () => {
  const topSparks = [
    { left: '4%', h: 7, delay: 0.05, dur: 0.65 },
    { left: '14%', h: 9, delay: 0.22, dur: 0.75 },
    { left: '25%', h: 6, delay: 0.12, dur: 0.7 },
    { left: '38%', h: 10, delay: 0.35, dur: 0.6 },
    { left: '50%', h: 7, delay: 0.18, dur: 0.8 },
    { left: '62%', h: 9, delay: 0.28, dur: 0.65 },
    { left: '74%', h: 6, delay: 0.08, dur: 0.72 },
    { left: '85%', h: 8, delay: 0.31, dur: 0.68 },
    { left: '96%', h: 6, delay: 0.15, dur: 0.76 }
  ];

  const botSparks = [
    { left: '8%', h: 7, delay: 0.15, dur: 0.72 },
    { left: '20%', h: 8, delay: 0.28, dur: 0.68 },
    { left: '32%', h: 6, delay: 0.05, dur: 0.75 },
    { left: '44%', h: 9, delay: 0.32, dur: 0.62 },
    { left: '56%', h: 7, delay: 0.12, dur: 0.78 },
    { left: '68%', h: 9, delay: 0.24, dur: 0.66 },
    { left: '80%', h: 6, delay: 0.18, dur: 0.7 },
    { left: '92%', h: 8, delay: 0.36, dur: 0.64 }
  ];

  return (
    <div className="absolute -inset-[2px] pointer-events-none z-25 overflow-visible select-none">
      {/* Top Flame Tongues Licking Upward */}
      <div className="absolute -top-[5px] inset-x-0 h-2 overflow-visible">
        {topSparks.map((spark, i) => (
          <div
            key={`top-${i}`}
            className="absolute -translate-x-1/2 w-[7px] origin-bottom animate-flame-lick"
            style={{
              left: spark.left,
              height: `${spark.h}px`,
              animationDelay: `${spark.delay}s`,
              animationDuration: `${spark.dur}s`
            }}
          >
            <svg viewBox="0 0 8 12" className="w-full h-full overflow-visible" fill="none">
              <path
                d="M4 0C4 0 7 5 7 8C7 10.2 5.6 12 4 12C2.4 12 1 10.2 1 8C1 5 4 0 4 0Z"
                fill="url(#flameTongueGrad)"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* Bottom Flame Tongues Licking Downward */}
      <div className="absolute -bottom-[5px] inset-x-0 h-2 overflow-visible">
        {botSparks.map((spark, i) => (
          <div
            key={`bot-${i}`}
            className="absolute -translate-x-1/2 w-[7px] origin-top animate-flame-lick-reverse"
            style={{
              left: spark.left,
              height: `${spark.h}px`,
              animationDelay: `${spark.delay}s`,
              animationDuration: `${spark.dur}s`
            }}
          >
            <svg viewBox="0 0 8 12" className="w-full h-full overflow-visible" fill="none">
              <path
                d="M4 12C4 12 7 7 7 4C7 1.8 5.6 0 4 0C2.4 0 1 1.8 1 4C1 7 4 12 4 12Z"
                fill="url(#flameTongueGrad)"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* Gradient Definition for Flame Tongues */}
      <svg className="w-0 h-0 absolute">
        <defs>
          <linearGradient id="flameTongueGrad" x1="4" y1="12" x2="4" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="35%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
        </defs>
      </svg>

      {/* Fiery Licking Border Outline with Heat Flicker */}
      <div className="w-full h-full rounded-[5px] border-[1.5px] border-amber-400/90 flame-outline-glow" />
    </div>
  );
};
