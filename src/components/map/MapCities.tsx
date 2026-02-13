import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { City, Officer, Faction } from '../../types';
import type { Season } from './mapData';
import { SEASON_LABEL_COLOR } from './mapData';
import { localizedName } from '../../i18n/dataNames';

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
 * Hovering shows a tooltip with basic city info.
 */
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

  return (
    <g className="map-cities">
      {cities.map(city => {
        const isSelected = city.id === selectedCityId;
        const revealed = isCityRevealed(city.id);
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
            labelColor={labelColor}
            revealed={revealed}
            onClick={() => onSelectCity(city.id)}
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
  labelColor: string;
  revealed: boolean;
  onClick: () => void;
}

function CityFlag({ city, faction, ruler, isSelected, labelColor, revealed, onClick }: CityFlagProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const color = faction?.color ?? '#6b7280';
  const displayName = localizedName(ruler?.name ?? '');
  const surname = displayName.charAt(0) ?? '';
  const flagW = 2.2;
  const flagH = 2.4;
  /** Dim unrevealed flag/info but keep castle structure fully opaque */
  const fogOpacity = revealed ? 1 : 0.5;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Castle building base — always fully opaque (physical structure) */}
      <rect
        x={city.x - 0.7}
        y={city.y - 0.7}
        width={1.4}
        height={1.2}
        fill="#6b5a42"
        stroke={isSelected ? '#fbbf24' : '#3a2a1a'}
        strokeWidth={isSelected ? 0.25 : 0.12}
        rx="0.1"
      />
      {/* Castle battlements (3 small crenels) */}
      <rect x={city.x - 0.7} y={city.y - 0.95} width={0.35} height={0.3} fill="#6b5a42" />
      <rect x={city.x - 0.1} y={city.y - 0.95} width={0.35} height={0.3} fill="#6b5a42" />
      <rect x={city.x + 0.45} y={city.y - 0.95} width={0.35} height={0.3} fill="#6b5a42" />

      {/* Flag group — dimmed for unrevealed cities */}
      <g opacity={fogOpacity}>
        {/* Flag pole — goes up from castle top */}
        <line
          x1={city.x + 0.5}
          y1={city.y - 0.95}
          x2={city.x + 0.5}
          y2={city.y - flagH - 1.1}
          stroke="#5a4a3a"
          strokeWidth="0.15"
        />
        {/* Flag banner — attached to pole, extends to the right */}
        <rect
          x={city.x + 0.5}
          y={city.y - flagH - 1.1}
          width={flagW}
          height={flagH}
          fill={color}
          stroke={isSelected ? '#fbbf24' : '#2a2a2a'}
          strokeWidth={isSelected ? 0.25 : 0.1}
          rx="0.1"
        />
        {/* Ruler surname on flag */}
        <text
          x={city.x + 0.5 + flagW / 2}
          y={city.y - flagH / 2 - 1.1}
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
        y={city.y + 1.5}
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
      {hovered && (
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

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Small neutral marker — always fully opaque (physical structure) */}
      <rect
        x={city.x - 0.9}
        y={city.y - 0.9}
        width={1.8}
        height={1.8}
        fill={revealed ? '#5a5a5a' : '#3a3a3a'}
        stroke={isSelected ? '#fbbf24' : '#3a3a3a'}
        strokeWidth={isSelected ? 0.4 : 0.15}
        rx="0.2"
      />
      {/* City name label — dimmed for unrevealed */}
      <text
        x={city.x}
        y={city.y + 2.2}
        textAnchor="middle"
        fill={isSelected ? '#fbbf24' : labelColor}
        fontSize="1.4"
        fontWeight={isSelected ? 'bold' : 'normal'}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="0.3"
        paintOrder="stroke"
        opacity={fogOpacity}
        style={{ pointerEvents: 'none' }}
      >
        {localizedName(city.name)}
      </text>
    </g>
  );
}
