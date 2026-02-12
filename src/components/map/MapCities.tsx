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
  const color = revealed ? (faction?.color ?? '#6b7280') : '#4a4a4a';
  const displayName = localizedName(ruler?.name ?? '');
  const surname = displayName.charAt(0) ?? '';
  const flagWidth = 4;
  const flagHeight = 5;
  /** Dim unrevealed cities */
  const fogOpacity = revealed ? 1 : 0.5;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
      opacity={fogOpacity}
    >
      {/* Castle building base */}
      <rect
        x={city.x - 1.2}
        y={city.y - 1.2}
        width={2.4}
        height={2}
        fill={revealed ? '#6b5a42' : '#4a4a4a'}
        stroke={isSelected ? '#fbbf24' : '#3a2a1a'}
        strokeWidth={isSelected ? 0.4 : 0.2}
        rx="0.2"
      />
      {/* Castle battlements */}
      <rect x={city.x - 1.2} y={city.y - 1.6} width={0.6} height={0.5} fill={revealed ? '#6b5a42' : '#4a4a4a'} />
      <rect x={city.x - 0.1} y={city.y - 1.6} width={0.6} height={0.5} fill={revealed ? '#6b5a42' : '#4a4a4a'} />
      <rect x={city.x + 0.9} y={city.y - 1.6} width={0.6} height={0.5} fill={revealed ? '#6b5a42' : '#4a4a4a'} />

      {/* Flag pole */}
      <line
        x1={city.x}
        y1={city.y - 1.6}
        x2={city.x}
        y2={city.y - flagHeight - 2.5}
        stroke="#5a4a3a"
        strokeWidth="0.25"
      />
      {/* Flag banner */}
      <rect
        className="city-flag-banner"
        x={city.x}
        y={city.y - flagHeight - 2.5}
        width={flagWidth}
        height={flagHeight}
        fill={color}
        stroke={isSelected ? '#fbbf24' : '#2a2a2a'}
        strokeWidth={isSelected ? 0.4 : 0.15}
        rx="0.15"
        opacity={0.9}
      />
      {/* Ruler surname on flag */}
      <text
        x={city.x + flagWidth / 2}
        y={city.y - flagHeight / 2 - 1.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize="2.5"
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {surname}
      </text>

      {/* City name label */}
      <text
        x={city.x}
        y={city.y + 2.5}
        textAnchor="middle"
        fill={isSelected ? '#fbbf24' : labelColor}
        fontSize="1.6"
        fontWeight={isSelected ? 'bold' : 'normal'}
        style={{ pointerEvents: 'none' }}
      >
        {localizedName(city.name)}
      </text>

      {/* Hover tooltip — shows actual stats only if revealed */}
      {hovered && (
        <g className="city-tooltip">
          <rect
            x={city.x + 3}
            y={city.y - 6}
            width={16}
            height={7}
            fill="rgba(15, 20, 30, 0.92)"
            stroke="#8b7355"
            strokeWidth="0.2"
            rx="0.5"
          />
          <text
            x={city.x + 4}
            y={city.y - 4.2}
            fill="#fbbf24"
            fontSize="1.5"
            fontWeight="bold"
          >
            {localizedName(city.name)}
          </text>
          {revealed ? (
            <>
              <text x={city.x + 4} y={city.y - 2.2} fill="#e5e7eb" fontSize="1.2">
                {localizedName(faction?.name ?? '')} | {t('city.troops')}: {city.troops.toLocaleString()}
              </text>
              <text x={city.x + 4} y={city.y - 0.4} fill="#9ca3af" fontSize="1.1">
                {t('city.defense')}: {city.defense} | {t('city.gold')}: {city.gold.toLocaleString()}
              </text>
            </>
          ) : (
            <text x={city.x + 4} y={city.y - 2.2} fill="#6b7280" fontSize="1.2">
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
    <g onClick={onClick} style={{ cursor: 'pointer' }} opacity={fogOpacity}>
      {/* Small neutral marker */}
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
      {/* City name label */}
      <text
        x={city.x}
        y={city.y - 2.2}
        textAnchor="middle"
        fill={isSelected ? '#fbbf24' : labelColor}
        fontSize="1.4"
        fontWeight={isSelected ? 'bold' : 'normal'}
        style={{ pointerEvents: 'none' }}
      >
        {localizedName(city.name)}
      </text>
    </g>
  );
}
