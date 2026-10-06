export default function AvatrLogo({ className = "w-8 h-8", light = false }: { className?: string; light?: boolean }) {
  const primaryColor = light ? "#09090b" : "#ffffff";
  const secondaryColor = light ? "#52525b" : "#a1a1aa";
  const accentGlow = light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transform transition-all duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id={light ? "avatrGradLightL" : "avatrGradDarkL"} x1="20" y1="10" x2="60" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={light ? "#18181b" : "#ffffff"} />
            <stop offset="100%" stopColor={light ? "#3f3f46" : "#71717a"} />
          </linearGradient>
          <linearGradient id={light ? "avatrGradLightR" : "avatrGradDarkR"} x1="100" y1="10" x2="60" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={light ? "#27272a" : "#e4e4e7"} />
            <stop offset="100%" stopColor={light ? "#09090b" : "#52525b"} />
          </linearGradient>
          <radialGradient id="centerGlow" cx="60" cy="60" r="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={accentGlow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ambient Subtle Glow */}
        <circle cx="60" cy="60" r="48" fill="url(#centerGlow)" />

        {/* Outer Polygonal Framing Ring */}
        <polygon
          points="60,6 106,32 106,88 60,114 14,88 14,32"
          stroke={secondaryColor}
          strokeWidth="1.8"
          strokeOpacity="0.4"
          fill="none"
        />

        {/* Left Faceted Wing / Crystal Pillar */}
        <path
          d="M57 14 L24 35 L24 85 L57 106 L57 74 L38 60 L57 46 Z"
          fill={`url(#${light ? "avatrGradLightL" : "avatrGradDarkL"})`}
          stroke={primaryColor}
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Right Faceted Wing / Crystal Pillar */}
        <path
          d="M63 14 L96 35 L96 85 L63 106 L63 74 L82 60 L63 46 Z"
          fill={`url(#${light ? "avatrGradLightR" : "avatrGradDarkR"})`}
          stroke={primaryColor}
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Center Diamond Core */}
        <polygon
          points="60,38 70,60 60,82 50,60"
          fill={primaryColor}
          fillOpacity={light ? "0.95" : "0.9"}
        />

        {/* Vertical Separation Line */}
        <line
          x1="60"
          y1="10"
          x2="60"
          y2="110"
          stroke={secondaryColor}
          strokeWidth="1.5"
          strokeOpacity="0.25"
        />
      </svg>
    </div>
  );
}
