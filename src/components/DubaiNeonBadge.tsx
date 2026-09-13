const SIZE_MAP = {
  sm: 'w-7 h-7 text-[9px]',
  md: 'w-9 h-9 text-[11px]',
  lg: 'w-11 h-11 text-xs',
  xl: 'w-14 h-14 text-sm',
} as const;

/** Decorative brand mark — purely a static logo, no data dependency. Ported from the approved design reference. */
export function DubaiNeonBadge({
  size = 'md',
  className = '',
  onClick,
}: {
  size?: keyof typeof SIZE_MAP;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative inline-flex items-center justify-center rounded-xl p-[1.5px] bg-gradient-to-br from-[#00F0FF] via-[#EC4899] to-[#8B5CF6] shadow-[0_0_15px_rgba(236,72,153,0.35)] transition-transform hover:scale-105 active:scale-95 select-none disabled:cursor-default ${className}`}
    >
      <div className={`${SIZE_MAP[size]} bg-[#130E24] rounded-[10px] flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#EC4899]/20 via-transparent to-[#00F0FF]/15 pointer-events-none" />
        <svg viewBox="0 0 48 48" className="w-4/5 h-4/5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dubaiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="45%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#EC4899" floodOpacity="0.8" />
            </filter>
          </defs>
          <path
            d="M8 24C8 16.5 13.5 12 21 12C28.5 12 34 16.5 34 22C34 26 31 29 27 30C23 31 22 28 25 26.5C28 25 29 23 29 21C29 18 25 15.5 20.5 15.5C16 15.5 12.5 18.5 12.5 23.5C12.5 28.5 16.5 32 23 32C28 32 33 30 37 27"
            stroke="url(#dubaiGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />
          <circle cx="21" cy="7" r="2.2" fill="#00F0FF" />
          <circle cx="27" cy="7" r="2.2" fill="#EC4899" />
          <path d="M14 39H34" stroke="url(#dubaiGrad)" strokeWidth="2.2" strokeLinecap="round" />
          <text x="24" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="800" letterSpacing="1.2">
            DUBAI
          </text>
        </svg>
      </div>
    </button>
  );
}
