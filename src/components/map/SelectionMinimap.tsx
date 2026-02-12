import type { City, Faction } from '../../types';
import { MapTerrain } from './MapTerrain';

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
 * A simplified map for faction selection screen.
 * Shows city markers colored by faction ownership.
 * Uses the shared MapTerrain inline SVG (same as GameMap).
 */
export function SelectionMinimap({ cities, factions, highlightFactionId }: SelectionMinimapProps) {
  const getFactionColor = (factionId: number | null): string => {
    if (factionId === null) return '#6b7280';
    const faction = factions.find(f => f.id === factionId);
    return faction?.color ?? '#6b7280';
  };

  return (
    <div className="selection-minimap">
      <svg viewBox="0 0 100 85" className="minimap-svg">
        {/* Inline terrain (same as main map, spring palette as default) */}
        <g opacity="0.7">
          <MapTerrain season="spring" />
        </g>
        {/* City markers */}
        {cities.map(city => {
          const isHighlighted = city.factionId === highlightFactionId;
          const baseColor = getFactionColor(city.factionId);

          return (
            <circle
              key={city.id}
              cx={city.x}
              cy={city.y}
              r={isHighlighted ? 1.2 : 0.7}
              fill={baseColor}
              opacity={isHighlighted ? 1 : 0.7}
              stroke={isHighlighted ? '#fbbf24' : 'none'}
              strokeWidth={isHighlighted ? 0.25 : 0}
              className="city-marker"
            />
          );
        })}
      </svg>
    </div>
  );
}
