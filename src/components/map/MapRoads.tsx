import type { City } from '../../types';
import type { Season } from './mapData';
import { SEASON_ROAD_STYLE } from './mapData';

interface MapRoadsProps {
  cities: City[];
  season: Season;
}

/**
 * MapRoads: Renders adjacency connection lines between cities.
 *
 * Each edge is drawn once (deduped by comparing city IDs).
 * Road styling subtly changes per season for visual cohesion.
 */
export function MapRoads({ cities, season }: MapRoadsProps) {
  const style = SEASON_ROAD_STYLE[season];

  return (
    <g className="map-roads">
      {cities.map(city =>
        city.adjacentCityIds.map(adjId => {
          const adj = cities.find(c => c.id === adjId);
          if (!adj || adj.id < city.id) return null;
          return (
            <line
              key={`road-${city.id}-${adjId}`}
              x1={city.x}
              y1={city.y}
              x2={adj.x}
              y2={adj.y}
              stroke={style.stroke}
              strokeWidth="0.15"
              opacity={style.opacity}
              strokeDasharray="0.5,0.3"
            />
          );
        }),
      )}
    </g>
  );
}
