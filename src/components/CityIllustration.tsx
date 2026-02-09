import type { City } from '../types';

interface CityIllustrationProps {
  /** City data to visualize */
  city: City;
}

/**
 * CityIllustration Component - Phase 0.5
 * Procedural SVG illustration that renders a city scene based on city attributes
 * - Defense affects wall height
 * - Commerce affects market stalls
 * - Agriculture affects farmland
 * - Population affects building count
 */
export function CityIllustration({ city }: CityIllustrationProps) {
  // Calculate visual elements based on city stats
  const wallHeight = Math.min(city.defense / 100 * 70, 70);
  const numMarketBuildings = Math.min(Math.floor(city.commerce / 180), 6);
  const farmRows = Math.min(Math.floor(city.agriculture / 160), 6);
  const numBuildings = Math.min(Math.floor(city.population / 25000), 7);
  const hasRiver = city.floodControl > 60;
  const hasTowers = city.defense > 50;
  const prosperity = city.commerce + city.agriculture;

  return (
    <svg viewBox="0 0 400 200" className="city-illustration">
      <defs>
        {/* Sky gradient */}
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6aa0d6" />
          <stop offset="60%" stopColor="#bcd7f0" />
          <stop offset="100%" stopColor="#e6f0fa" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6c9b58" />
          <stop offset="100%" stopColor="#4a7c44" />
        </linearGradient>
        {/* Wall pattern */}
        <pattern id="wallPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#8B7355" />
          <path d="M0 10 L10 0" stroke="#6b5540" strokeWidth="1" />
        </pattern>
        <pattern id="roofPattern" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#b07a45" />
          <path d="M0 6 L6 0" stroke="#8a5a30" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Sky background */}
      <rect width="400" height="95" fill="url(#sky)" />

      {/* Clouds */}
      <g fill="#eef6ff" opacity="0.8">
        <ellipse cx="70" cy="30" rx="28" ry="12" />
        <ellipse cx="95" cy="30" rx="20" ry="9" />
        <ellipse cx="260" cy="22" rx="24" ry="10" />
        <ellipse cx="280" cy="24" rx="18" ry="8" />
      </g>

      {/* Ground */}
      <rect y="95" width="400" height="105" fill="url(#ground)" />

      {/* City walls (height based on defense) */}
      <rect
        x="110"
        y={95 - wallHeight}
        width="180"
        height={wallHeight}
        fill="url(#wallPattern)"
        stroke="#6b5540"
        strokeWidth="2"
      />

      {/* Wall crenellations */}
      {Array.from({ length: 10 }).map((_, i) => (
        <rect
          key={`cren-${i}`}
          x={118 + i * 16}
          y={95 - wallHeight - 6}
          width="10"
          height="6"
          fill="#8B7355"
          stroke="#6b5540"
          strokeWidth="1"
        />
      ))}

      {/* Gate */}
      <rect x="190" y={95 - 24} width="30" height="24" fill="#4a3520" />
      <rect x="198" y={95 - 18} width="14" height="18" fill="#2a1d10" />
      <rect x="182" y={95 - 28} width="46" height="6" fill="#6b5540" />

      {/* Buildings inside walls (based on population) */}
      {Array.from({ length: numBuildings }).map((_, i) => (
        <rect
          key={`bld-${i}`}
          x={125 + i * 22}
          y={95 - wallHeight + 8}
          width={16}
          height={wallHeight - 16}
          fill="#c8a882"
          stroke="#a08060"
          strokeWidth="1"
          rx="1"
        />
      ))}

      {/* Towers on wall */}
      {hasTowers && (
        <>
          <rect x="100" y={95 - wallHeight - 20} width="24" height="20" fill="#8B7355" stroke="#6b5540" />
          <rect x="286" y={95 - wallHeight - 20} width="24" height="20" fill="#8B7355" stroke="#6b5540" />
        </>
      )}

      {/* Pagoda (prosperity indicator) */}
      {prosperity > 250 && (
        <>
          <rect x="240" y={95 - wallHeight + 6} width="20" height="24" fill="#d2b089" stroke="#a08060" />
          <rect x="236" y={95 - wallHeight} width="28" height="6" fill="url(#roofPattern)" />
          <rect x="238" y={95 - wallHeight - 10} width="24" height="6" fill="url(#roofPattern)" />
        </>
      )}

      {/* Farmland (based on agriculture) */}
      {Array.from({ length: farmRows }).map((_, i) => (
        <g key={`farm-${i}`}>
          <rect
            x="15"
            y={110 + i * 12}
            width="80"
            height="8"
            fill="#6b9a55"
            stroke="#4d7d42"
            rx="1"
          />
          {/* Crop rows */}
          <line x1="20" y1={112 + i * 12} x2="90" y2={112 + i * 12} stroke="#7ab565" strokeWidth="1" />
          <line x1="20" y1={115 + i * 12} x2="90" y2={115 + i * 12} stroke="#7ab565" strokeWidth="1" />
        </g>
      ))}

      {/* Market stalls (based on commerce) */}
      {Array.from({ length: numMarketBuildings }).map((_, i) => (
        <g key={`mkt-${i}`}>
          <rect
            x={300 + (i % 2) * 25}
            y={110 + Math.floor(i / 2) * 14}
            width="22"
            height="10"
            fill="#c8a96e"
            stroke="#a08050"
            strokeWidth="1"
          />
          {/* Awning */}
          <path
            d={`M${300 + (i % 2) * 25} ${110 + Math.floor(i / 2) * 14} L${322 + (i % 2) * 25} ${110 + Math.floor(i / 2) * 14} L${317 + (i % 2) * 25} ${105 + Math.floor(i / 2) * 14} L${305 + (i % 2) * 25} ${105 + Math.floor(i / 2) * 14} Z`}
            fill="#d4b87a"
          />
        </g>
      ))}

      {/* Road to gate */}
      <path
        d="M205 95 L210 150 L200 200 L225 200 L215 150 L220 95 Z"
        fill="#b08b5a"
        opacity="0.8"
      />

      {/* River */}
      {hasRiver && (
        <path
          d="M0 150 C60 140 120 160 180 150 C240 140 300 160 400 150 L400 200 L0 200 Z"
          fill="#2b6ca3"
          opacity="0.6"
        />
      )}

      {/* Decorative elements */}
      {/* Trees */}
      <circle cx="40" cy="90" r="10" fill="#4a7c36" />
      <circle cx="48" cy="84" r="7" fill="#5a8c46" />
      <circle cx="360" cy="92" r="10" fill="#4a7c36" />
      <circle cx="368" cy="86" r="7" fill="#5a8c46" />
      <circle cx="320" cy="98" r="6" fill="#5f8f4b" />
    </svg>
  );
}
