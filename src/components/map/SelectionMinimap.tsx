import type { City, Faction } from '../../types';

interface SelectionMinimapProps {
  /** Array of cities to display on the minimap */
  cities: City[];
  /** Array of factions for color mapping */
  factions: Faction[];
  /** Currently highlighted faction ID (for hover effect) */
  highlightFactionId: number | null;
}

/**
 * SelectionMinimap Component - Phase 0.5
 * A simplified map for faction selection screen
 * Shows city markers colored by faction ownership
 * Uses terrain-map.svg as background
 */
export function SelectionMinimap({ cities, factions, highlightFactionId }: SelectionMinimapProps) {
  /**
   * Get faction color for a city
   * Returns faction color if city has a faction, gray for neutral cities
   */
  const getFactionColor = (factionId: number | null): string => {
    if (factionId === null) return '#6b7280'; // Gray for neutral cities
    const faction = factions.find(f => f.id === factionId);
    return faction?.color ?? '#6b7280';
  };

  return (
    <div className="selection-minimap">
      <svg viewBox="0 0 1000 850" className="minimap-svg">
        {/* Background terrain map */}
        <image
          href="/terrain-map.svg"
          width="1000"
          height="850"
          className="minimap-background"
        />
        {/* City markers */}
        {cities.map(city => {
          const isHighlighted = city.factionId === highlightFactionId;
          const baseColor = getFactionColor(city.factionId);

          return (
            <g key={city.id}>
              {/* City circle */}
              <circle
                cx={city.x * 10}
                cy={city.y * 10}
                r={isHighlighted ? 10 : 6}
                fill={baseColor}
                opacity={isHighlighted ? 1 : 0.7}
                stroke={isHighlighted ? '#fbbf24' : 'none'}
                strokeWidth={isHighlighted ? 2 : 0}
                className="city-marker"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
