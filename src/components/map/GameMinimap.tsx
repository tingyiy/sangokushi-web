import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { getSeason } from './mapData';
import { MapTerrain } from './MapTerrain';

export function GameMinimap() {
  const { t } = useTranslation();
  const { cities, factions, selectedCityId, selectCity, month } = useGameStore();

  const season = useMemo(() => getSeason(month), [month]);

  const getFactionColor = (factionId: number | null): string => {
    if (factionId === null) return '#6b7280';
    const faction = factions.find(f => f.id === factionId);
    return faction?.color ?? '#6b7280';
  };

  return (
    <div className="game-minimap">
      <svg viewBox="0 0 100 85" aria-label={t('minimap.ariaLabel')}>
        {/* Inline terrain (same as main map, seasonal) */}
        <g opacity="0.6">
          <MapTerrain season={season} />
        </g>
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
