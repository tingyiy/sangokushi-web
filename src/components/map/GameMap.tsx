import { useGameStore } from '../../store/gameStore';

export function GameMap() {
  const { cities, factions, selectedCityId, selectCity } = useGameStore();

  const getFactionColor = (factionId: number | null): string => {
    if (factionId === null) return '#6b7280';
    const faction = factions.find(f => f.id === factionId);
    return faction?.color ?? '#6b7280';
  };

  return (
    <div className="game-map">
      <svg viewBox="0 0 100 85" className="map-svg">
        {/* Draw adjacency lines */}
        {cities.map(city =>
          city.adjacentCityIds.map(adjId => {
            const adj = cities.find(c => c.id === adjId);
            if (!adj || adj.id < city.id) return null; // draw each edge once
            return (
              <line
                key={`${city.id}-${adjId}`}
                x1={city.x} y1={city.y}
                x2={adj.x} y2={adj.y}
                stroke="#4b5563"
                strokeWidth="0.3"
                opacity={0.5}
              />
            );
          })
        )}

        {/* Draw cities */}
        {cities.map(city => {
          const color = getFactionColor(city.factionId);
          const isSelected = city.id === selectedCityId;
          return (
            <g key={city.id} onClick={() => selectCity(city.id)} style={{ cursor: 'pointer' }}>
              <circle
                cx={city.x} cy={city.y} r={isSelected ? 2 : 1.5}
                fill={color}
                stroke={isSelected ? '#fbbf24' : '#1f2937'}
                strokeWidth={isSelected ? 0.5 : 0.25}
              />
              <text
                x={city.x} y={city.y - 2.2}
                textAnchor="middle"
                fill="#e5e7eb"
                fontSize="1.8"
                fontWeight={isSelected ? 'bold' : 'normal'}
              >
                {city.name}
              </text>
              {city.factionId !== null && (
                <text
                  x={city.x} y={city.y + 3.2}
                  textAnchor="middle"
                  fill={color}
                  fontSize="1.3"
                  opacity={0.8}
                >
                  {city.troops > 0 ? `兵${Math.floor(city.troops / 1000)}k` : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
