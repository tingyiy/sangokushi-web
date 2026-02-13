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
 * Roads are rendered as brown dirt-track paths with a thin dark border
 * for visibility over mountains and dark terrain (matching RTK IV style).
 */
export function MapRoads({ cities, season }: MapRoadsProps) {
  const style = SEASON_ROAD_STYLE[season];

  // Collect edges once
  const edges: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  cities.forEach(city => {
    city.adjacentCityIds.forEach(adjId => {
      const adj = cities.find(c => c.id === adjId);
      if (!adj || adj.id < city.id) return;
      edges.push({
        key: `road-${city.id}-${adjId}`,
        x1: city.x, y1: city.y,
        x2: adj.x, y2: adj.y,
      });
    });
  });

  return (
    <g className="map-roads">
      {/* Dark border layer (slightly wider, drawn underneath) */}
      {edges.map(e => (
        <line
          key={`${e.key}-border`}
          x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke="#2a2010"
          strokeWidth="0.55"
          opacity={style.opacity * 0.6}
          strokeLinecap="round"
        />
      ))}
      {/* Main road layer (brown fill on top) */}
      {edges.map(e => (
        <line
          key={e.key}
          x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={style.stroke}
          strokeWidth="0.35"
          opacity={style.opacity}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}
