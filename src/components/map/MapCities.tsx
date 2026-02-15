import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { City, Officer, Faction } from '../../types';
import type { Season } from './mapData';
import { SEASON_LABEL_COLOR } from './mapData';
import { localizedName } from '../../i18n/dataNames';
import { getCityTier } from '../../data/cities';
import type { CityTier } from '../../data/cities';

interface MapCitiesProps {
  cities: City[];
  factions: Faction[];
  officers: Officer[];
  selectedCityId: number | null;
  season: Season;
  onSelectCity: (cityId: number) => void;
  /** Fog of war: returns true if a city's internals are visible */
  isCityRevealed: (cityId: number) => boolean;
}

/**
 * MapCities: Renders all city markers on the strategic map.
 *
 * Faction-owned cities show a flag with the ruler's surname.
 * Neutral (unowned) cities show a small gray marker.
 * Castle size scales with population tier:
 *   mega (>=500k): large fortress with 5 crenels
 *   large (350-499k): substantial castle with 4 crenels
 *   medium (200-349k): standard castle with 3 crenels
 *   small (<200k): small outpost with 2 crenels
 */

/** Castle dimensions per population tier */
const CASTLE_SIZE: Record<CityTier, { w: number; h: number; crenels: number }> = {
  mega:   { w: 2.2, h: 1.8, crenels: 5 },
  large:  { w: 1.8, h: 1.5, crenels: 4 },
  medium: { w: 1.4, h: 1.2, crenels: 3 },
  small:  { w: 1.0, h: 0.9, crenels: 2 },
};

/** Minimum invisible hit area so small cities are easy to click */
const MIN_HIT_SIZE = 3.0;
export function MapCities({
  cities,
  factions,
  officers,
  selectedCityId,
  season,
  onSelectCity,
  isCityRevealed,
}: MapCitiesProps) {
  const labelColor = SEASON_LABEL_COLOR[season];
  const [hoveredCityId, setHoveredCityId] = useState<number | null>(null);

  // Sort cities so the hovered city renders last (SVG paints later elements on top).
  // This ensures the hover tooltip is never occluded by neighboring city markers.
  const sortedCities = useMemo(() => {
    if (hoveredCityId === null) return cities;
    return [...cities].sort((a, b) => {
      if (a.id === hoveredCityId) return 1;
      if (b.id === hoveredCityId) return -1;
      return 0;
    });
  }, [cities, hoveredCityId]);

  return (
    <g className="map-cities">
      {sortedCities.map(city => {
        const isSelected = city.id === selectedCityId;
        const revealed = isCityRevealed(city.id);
        const isHovered = city.id === hoveredCityId;
        if (city.factionId === null) {
          return (
            <NeutralMarker
              key={city.id}
              city={city}
              isSelected={isSelected}
              labelColor={labelColor}
              revealed={revealed}
              onClick={() => onSelectCity(city.id)}
            />
          );
        }
        const faction = factions.find(f => f.id === city.factionId) ?? null;
        const ruler = faction
          ? officers.find(o => o.id === faction.rulerId) ?? null
          : null;
        return (
          <CityFlag
            key={city.id}
            city={city}
            faction={faction}
            ruler={ruler}
            isSelected={isSelected}
            isHovered={isHovered}
            labelColor={labelColor}
            revealed={revealed}
            onClick={() => onSelectCity(city.id)}
            onHover={setHoveredCityId}
          />
        );
      })}
    </g>
  );
}

/* ── CityFlag: faction-owned city ── */

interface CityFlagProps {
  city: City;
  faction: Faction | null;
  ruler: Officer | null;
  isSelected: boolean;
  isHovered: boolean;
  labelColor: string;
  revealed: boolean;
  onClick: () => void;
  onHover: (cityId: number | null) => void;
}

function CityFlag({ city, faction, ruler, isSelected, isHovered, labelColor, revealed, onClick, onHover }: CityFlagProps) {
  const { t } = useTranslation();
  const color = faction?.color ?? '#6b7280';
  const displayName = localizedName(ruler?.name ?? '');
  const surname = displayName.charAt(0) ?? '';
  const flagW = 2.2;
  const flagH = 2.4;
  /** Dim unrevealed flag/info but keep castle structure fully opaque */
  const fogOpacity = revealed ? 1 : 0.5;

  const tier = getCityTier(city.population);
  const { w: cW, h: cH, crenels } = CASTLE_SIZE[tier];
  const crenelW = cW / (crenels * 2 + 0.5);
  const crenelH = cH * 0.22;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => onHover(city.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible hit area — ensures small cities are easy to click */}
      <rect
        x={city.x - MIN_HIT_SIZE / 2}
        y={city.y - MIN_HIT_SIZE / 2}
        width={MIN_HIT_SIZE}
        height={MIN_HIT_SIZE}
        fill="transparent"
      />
      {/* Castle building base — size scales with population tier */}
      <rect
        x={city.x - cW / 2}
        y={city.y - cH / 2}
        width={cW}
        height={cH}
        fill="#6b5a42"
        stroke={isSelected ? '#fbbf24' : '#3a2a1a'}
        strokeWidth={isSelected ? 0.25 : 0.12}
        rx="0.1"
      />
      {/* Castle battlements — count scales with tier */}
      {Array.from({ length: crenels }).map((_, i) => {
        const spacing = cW / crenels;
        return (
          <rect
            key={`cren-${i}`}
            x={city.x - cW / 2 + i * spacing + (spacing - crenelW) / 2}
            y={city.y - cH / 2 - crenelH}
            width={crenelW}
            height={crenelH}
            fill="#6b5a42"
          />
        );
      })}

      {/* Flag group — dimmed for unrevealed cities */}
      <g opacity={fogOpacity}>
        {/* Flag pole — goes up from castle top */}
        <line
          x1={city.x + cW / 2 - 0.2}
          y1={city.y - cH / 2 - crenelH}
          x2={city.x + cW / 2 - 0.2}
          y2={city.y - flagH - cH / 2 - crenelH - 0.2}
          stroke="#5a4a3a"
          strokeWidth="0.15"
        />
        {/* Flag banner — attached to pole, extends to the right */}
        <rect
          x={city.x + cW / 2 - 0.2}
          y={city.y - flagH - cH / 2 - crenelH - 0.2}
          width={flagW}
          height={flagH}
          fill={color}
          stroke={isSelected ? '#fbbf24' : '#2a2a2a'}
          strokeWidth={isSelected ? 0.25 : 0.1}
          rx="0.1"
        />
        {/* Ruler surname on flag */}
        <text
          x={city.x + cW / 2 - 0.2 + flagW / 2}
          y={city.y - flagH / 2 - cH / 2 - crenelH - 0.2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontSize="1.6"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {surname}
        </text>
      </g>

      {/* City name label — below the castle */}
      <text
        x={city.x}
        y={city.y + cH / 2 + 1.2}
        textAnchor="middle"
        fill={isSelected ? '#fbbf24' : labelColor}
        fontSize="1.1"
        fontWeight={isSelected ? 'bold' : 'normal'}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="0.25"
        paintOrder="stroke"
        style={{ pointerEvents: 'none' }}
      >
        {localizedName(city.name)}
      </text>

      {/* Hover tooltip — shows actual stats only if revealed */}
      {isHovered && (
        <g className="city-tooltip">
          <rect
            x={city.x + 3}
            y={city.y - 5}
            width={14}
            height={6}
            fill="rgba(15, 20, 30, 0.92)"
            stroke="#8b7355"
            strokeWidth="0.15"
            rx="0.4"
          />
          <text
            x={city.x + 3.8}
            y={city.y - 3.3}
            fill="#fbbf24"
            fontSize="1.3"
            fontWeight="bold"
          >
            {localizedName(city.name)}
          </text>
          {revealed ? (
            <>
              <text x={city.x + 3.8} y={city.y - 1.6} fill="#e5e7eb" fontSize="1">
                {localizedName(faction?.name ?? '')} | {t('city.troops')}: {city.troops.toLocaleString()}
              </text>
              <text x={city.x + 3.8} y={city.y - 0.2} fill="#9ca3af" fontSize="0.95">
                {t('city.defense')}: {city.defense} | {t('city.gold')}: {city.gold.toLocaleString()}
              </text>
            </>
          ) : (
            <text x={city.x + 3.8} y={city.y - 1.6} fill="#6b7280" fontSize="1">
              {localizedName(faction?.name ?? '')} | ????
            </text>
          )}
        </g>
      )}
    </g>
  );
}

/* ── NeutralMarker: unowned city ── */

interface NeutralMarkerProps {
  city: City;
  isSelected: boolean;
  labelColor: string;
  revealed: boolean;
  onClick: () => void;
}

function NeutralMarker({ city, isSelected, labelColor, revealed, onClick }: NeutralMarkerProps) {
  const fogOpacity = revealed ? 1 : 0.45;
  /** Neutral castles use a weathered gray-brown (abandoned/unoccupied look) */
  const castleColor = revealed ? '#7a7060' : '#5a5548';

  const tier = getCityTier(city.population);
  const { w: cW, h: cH, crenels } = CASTLE_SIZE[tier];
  const crenelW = cW / (crenels * 2 + 0.5);
  const crenelH = cH * 0.22;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Invisible hit area — ensures small cities are easy to click */}
      <rect
        x={city.x - MIN_HIT_SIZE / 2}
        y={city.y - MIN_HIT_SIZE / 2}
        width={MIN_HIT_SIZE}
        height={MIN_HIT_SIZE}
        fill="transparent"
      />
      {/* Castle building base — size scales with population tier */}
      <rect
        x={city.x - cW / 2}
        y={city.y - cH / 2}
        width={cW}
        height={cH}
        fill={castleColor}
        stroke={isSelected ? '#fbbf24' : '#4a4238'}
        strokeWidth={isSelected ? 0.25 : 0.12}
        rx="0.1"
      />
      {/* Castle battlements — count scales with tier */}
      {Array.from({ length: crenels }).map((_, i) => {
        const spacing = cW / crenels;
        return (
          <rect
            key={`cren-${i}`}
            x={city.x - cW / 2 + i * spacing + (spacing - crenelW) / 2}
            y={city.y - cH / 2 - crenelH}
            width={crenelW}
            height={crenelH}
            fill={castleColor}
          />
        );
      })}
      {/* City name label — dimmed for unrevealed */}
      <text
        x={city.x}
        y={city.y + cH / 2 + 1.2}
        textAnchor="middle"
        fill={isSelected ? '#fbbf24' : labelColor}
        fontSize="1.1"
        fontWeight={isSelected ? 'bold' : 'normal'}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="0.25"
        paintOrder="stroke"
        opacity={fogOpacity}
        style={{ pointerEvents: 'none' }}
      >
        {localizedName(city.name)}
      </text>
    </g>
  );
}
