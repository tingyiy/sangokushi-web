import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { localizedName } from '../../i18n/dataNames';

interface CityFlagProps {
  city: { id: number; x: number; y: number; name: string; factionId: number | null };
  faction: { id: number; color: string } | null;
  ruler: { name: string } | null;
  isSelected: boolean;
  onClick: () => void;
}

function CityFlag({ city, faction, ruler, isSelected, onClick }: CityFlagProps) {
  const color = faction?.color ?? '#6b7280';
  const displayName = localizedName(ruler?.name ?? '');
  const surname = displayName.charAt(0) ?? '';
  const flagWidth = 4;
  const flagHeight = 5;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <line
        x1={city.x}
        y1={city.y - 0.5}
        x2={city.x}
        y2={city.y - flagHeight - 1}
        stroke="#5a4a3a"
        strokeWidth="0.3"
      />
      <rect
        x={city.x}
        y={city.y - flagHeight - 1}
        width={flagWidth}
        height={flagHeight}
        fill={color}
        stroke={isSelected ? '#fbbf24' : '#2a2a2a'}
        strokeWidth={isSelected ? 0.4 : 0.2}
        rx="0.2"
      />
      <text
        x={city.x + flagWidth / 2}
        y={city.y - flagHeight / 2 - 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize="2.5"
        fontWeight="bold"
      >
        {surname}
      </text>
      <text
        x={city.x + flagWidth / 2}
        y={city.y + 1.7}
        textAnchor="middle"
        fill="#e5e7eb"
        fontSize="1.5"
        fontWeight={isSelected ? 'bold' : 'normal'}
      >
        {localizedName(city.name)}
      </text>
      <rect
        x={city.x - 1}
        y={city.y - 1}
        width={2}
        height={1.5}
        fill="#8b7355"
        stroke="#5a4a3a"
        strokeWidth="0.15"
      />
    </g>
  );
}

interface NeutralMarkerProps {
  city: { x: number; y: number; name: string };
  isSelected: boolean;
  onClick: () => void;
}

function NeutralMarker({ city, isSelected, onClick }: NeutralMarkerProps) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        x={city.x - 0.8}
        y={city.y - 0.8}
        width={1.6}
        height={1.6}
        fill="#6b7280"
        stroke={isSelected ? '#fbbf24' : '#2a2a2a'}
        strokeWidth={isSelected ? 0.4 : 0.2}
      />
      <text
        x={city.x}
        y={city.y - 2.2}
        textAnchor="middle"
        fill="#e5e7eb"
        fontSize="1.5"
        fontWeight={isSelected ? 'bold' : 'normal'}
      >
        {localizedName(city.name)}
      </text>
    </g>
  );
}

export function GameMap() {
  const { cities, factions, officers, selectedCityId, selectCity } = useGameStore();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const getFaction = (factionId: number | null) => {
    if (factionId === null) return null;
    return factions.find(f => f.id === factionId) ?? null;
  };

  const getRuler = (factionId: number | null) => {
    const faction = getFaction(factionId);
    if (!faction) return null;
    return officers.find(o => o.id === faction.rulerId) ?? null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(5, Math.max(1, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - lastMousePos.x) / zoom;
    const dy = (e.clientY - lastMousePos.y) / zoom;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="game-map" 
      style={{ overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg 
        viewBox="0 0 100 85" 
        className="map-svg"
        style={{
          transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 0.1s'
        }}
      >
        {/* Terrain Background - Phase 7.6 */}
        <rect x="0" y="0" width="100" height="85" fill="#1a3a5a" />
        <image href="/terrain-map.svg" x="0" y="0" width="100" height="85" opacity="0.75" />

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
                stroke="#3a4a3a"
                strokeWidth="0.15"
                opacity={0.3}
              />
            );
          })
        )}

        {/* Draw cities */}
        {cities.map(city => {
          const isSelected = city.id === selectedCityId;
          if (city.factionId === null) {
            return (
              <NeutralMarker
                key={city.id}
                city={city}
                isSelected={isSelected}
                onClick={() => selectCity(city.id)}
              />
            );
          }
          const faction = getFaction(city.factionId);
          const ruler = getRuler(city.factionId);
          return (
            <CityFlag
              key={city.id}
              city={city}
              faction={faction}
              ruler={ruler}
              isSelected={isSelected}
              onClick={() => selectCity(city.id)}
            />
          );
        })}
      </svg>
    </div>
  );
}
