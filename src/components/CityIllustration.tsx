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
  const wallHeight = Math.min(city.defense / 100 * 60, 60);
  const numMarketBuildings = Math.floor(city.commerce / 200);
  const farmRows = Math.floor(city.agriculture / 200);
  const numBuildings = Math.min(Math.floor(city.population / 30000), 5);

  return (
    <svg viewBox="0 0 300 150" className="city-illustration">
      <defs>
        {/* Sky gradient */}
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#87ceeb" />
          <stop offset="100%" stopColor="#e0f0ff" />
        </linearGradient>
        {/* Wall pattern */}
        <pattern id="wallPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#8B7355" />
          <path d="M0 10 L10 0" stroke="#6b5540" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Sky background */}
      <rect width="300" height="80" fill="url(#sky)" />

      {/* Ground */}
      <rect y="80" width="300" height="70" fill="#5a8a4a" />

      {/* City walls (height based on defense) */}
      <rect
        x="80"
        y={80 - wallHeight}
        width="140"
        height={wallHeight}
        fill="url(#wallPattern)"
        stroke="#6b5540"
        strokeWidth="2"
      />

      {/* Gate */}
      <rect x="140" y={80 - 20} width="20" height="20" fill="#4a3520" />
      <rect x="145" y={80 - 15} width="10" height="15" fill="#2a1d10" />

      {/* Buildings inside walls (based on population) */}
      {Array.from({ length: numBuildings }).map((_, i) => (
        <rect
          key={`bld-${i}`}
          x={90 + i * 25}
          y={80 - wallHeight + 5}
          width={18}
          height={wallHeight - 10}
          fill="#c8a882"
          stroke="#a08060"
          strokeWidth="1"
          rx="1"
        />
      ))}

      {/* Tower on wall */}
      <rect x="75" y={80 - wallHeight - 15} width="20" height="15" fill="#8B7355" stroke="#6b5540" />
      <rect x="205" y={80 - wallHeight - 15} width="20" height="15" fill="#8B7355" stroke="#6b5540" />

      {/* Farmland (based on agriculture) */}
      {Array.from({ length: farmRows }).map((_, i) => (
        <g key={`farm-${i}`}>
          <rect
            x="10"
            y={90 + i * 12}
            width="60"
            height="8"
            fill="#6b9a55"
            stroke="#4d7d42"
            rx="1"
          />
          {/* Crop rows */}
          <line x1="15" y1={92 + i * 12} x2="65" y2={92 + i * 12} stroke="#7ab565" strokeWidth="1" />
          <line x1="15" y1={95 + i * 12} x2="65" y2={95 + i * 12} stroke="#7ab565" strokeWidth="1" />
        </g>
      ))}

      {/* Market stalls (based on commerce) */}
      {Array.from({ length: numMarketBuildings }).map((_, i) => (
        <g key={`mkt-${i}`}>
          <rect
            x={230 + (i % 2) * 25}
            y={85 + Math.floor(i / 2) * 15}
            width="20"
            height="10"
            fill="#c8a96e"
            stroke="#a08050"
            strokeWidth="1"
          />
          {/* Awning */}
          <path
            d={`M${230 + (i % 2) * 25} ${85 + Math.floor(i / 2) * 15} L${250 + (i % 2) * 25} ${85 + Math.floor(i / 2) * 15} L${245 + (i % 2) * 25} ${80 + Math.floor(i / 2) * 15} L${235 + (i % 2) * 25} ${80 + Math.floor(i / 2) * 15} Z`}
            fill="#d4b87a"
          />
        </g>
      ))}

      {/* Decorative elements */}
      {/* Trees */}
      <circle cx="20" cy="75" r="8" fill="#4a7c36" />
      <circle cx="25" cy="70" r="6" fill="#5a8c46" />
      <circle cx="275" cy="75" r="8" fill="#4a7c36" />
      <circle cx="280" cy="70" r="6" fill="#5a8c46" />
    </svg>
  );
}
