import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function GameMap() {
  const { cities, factions, selectedCityId, selectCity } = useGameStore();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const getFactionColor = (factionId: number | null): string => {
    if (factionId === null) return '#6b7280';
    const faction = factions.find(f => f.id === factionId);
    return faction?.color ?? '#6b7280';
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
        <image href="/terrain-map.svg" x="0" y="0" width="100" height="85" opacity="0.4" />

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
