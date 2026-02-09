import { useGameStore } from '../../store/gameStore';

export function GameMinimap() {
  const { cities, factions, selectedCityId, selectCity } = useGameStore();

  const getFactionColor = (factionId: number | null): string => {
    if (factionId === null) return '#6b7280';
    const faction = factions.find(f => f.id === factionId);
    return faction?.color ?? '#6b7280';
  };

  return (
    <div className="game-minimap">
      <svg viewBox="0 0 100 85" aria-label="地圖縮圖">
        <image href="/terrain-map.svg" width="100" height="85" opacity="0.6" />
        {cities.map(city => {
          const color = getFactionColor(city.factionId);
          const isSelected = city.id === selectedCityId;
          return (
            <circle
              key={city.id}
              cx={city.x}
              cy={city.y}
              r={isSelected ? 2.2 : 1.2}
              fill={color}
              stroke={isSelected ? '#fbbf24' : 'none'}
              strokeWidth={isSelected ? 0.5 : 0}
              onClick={() => selectCity(city.id)}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
      </svg>
    </div>
  );
}
