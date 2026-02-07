import React, { useState, useMemo } from 'react';
import { useBattleStore } from '../../store/battleStore';
import { hexToPixel, getDistance } from '../../utils/hex';
import { getMoveRange } from '../../utils/pathfinding';

const HEX_SIZE = 40;

const BattleMap: React.FC = () => {
  const battle = useBattleStore();
  const [selectedHex, setSelectedHex] = useState<{ q: number; r: number } | null>(null);

  const activeUnit = battle.units.find(u => u.id === battle.activeUnitId);

  const moveRange = useMemo(() => {
    if (activeUnit && activeUnit.status === 'active') {
      const blocked = new Set(battle.units.filter(u => u.troops > 0 && u.id !== activeUnit.id).map(u => `${u.x},${u.y}`));
      return getMoveRange(
        { q: activeUnit.x, r: activeUnit.y },
        5, // Range
        battle.battleMap.width,
        battle.battleMap.height,
        battle.battleMap.terrain,
        blocked
      );
    }
    return new Map<string, number>();
  }, [activeUnit, battle.units, battle.battleMap]);

  const renderHex = (q: number, r: number) => {
    const terrain = battle.battleMap.terrain[q][r];
    const { x, y } = hexToPixel({ q, r }, HEX_SIZE);
    
    // Offset for center
    const offsetX = 100;
    const offsetY = 100;
    
    const isMoveRange = moveRange.has(`${q},${r}`);
    const unit = battle.units.find(u => u.x === q && u.y === r && u.troops > 0);

    let fillColor = '#555';
    if (terrain === 'plain') fillColor = '#7a9e7a';
    else if (terrain === 'forest') fillColor = '#2d5a27';
    else if (terrain === 'mountain') fillColor = '#5d4037';
    else if (terrain === 'river') fillColor = '#0277bd';
    else if (terrain === 'city') fillColor = '#fbc02d';

    return (
      <g key={`${q},${r}`} transform={`translate(${x + offsetX}, ${y + offsetY})`} 
         onClick={() => handleHexClick(q, r)}
         style={{ cursor: 'pointer' }}>
        <polygon
          points={getHexPoints(HEX_SIZE)}
          fill={fillColor}
          stroke={selectedHex?.q === q && selectedHex?.r === r ? 'yellow' : '#333'}
          strokeWidth={2}
        />
        {isMoveRange && (
          <polygon
            points={getHexPoints(HEX_SIZE - 5)}
            fill="rgba(255, 255, 255, 0.2)"
            pointerEvents="none"
          />
        )}
        {unit && (
          <g>
            <circle r={HEX_SIZE * 0.7} fill={unit.id.startsWith('attacker') ? 'red' : 'blue'} opacity={unit.status === 'done' ? 0.5 : 1} />
            <text textAnchor="middle" dy=".3em" fill="white" fontSize="12" pointerEvents="none">
              {unit.officer.name.substring(0, 2)}
            </text>
            <rect x={-20} y={20} width={40} height={4} fill="#000" />
            <rect x={-20} y={20} width={40 * (unit.troops / unit.maxTroops)} height={4} fill="#0f0" />
          </g>
        )}
      </g>
    );
  };

  const handleHexClick = (q: number, r: number) => {
    if (!activeUnit) return;

    const unitAtHex = battle.units.find(u => u.x === q && u.y === r && u.troops > 0);

    if (unitAtHex && unitAtHex.id !== activeUnit.id) {
      // Potentially attack
      const dist = getDistance({ q: activeUnit.x, r: activeUnit.y }, { q, r });
      if (dist === 1 && activeUnit.status === 'active') {
        battle.attackUnit(activeUnit.id, unitAtHex.id);
        battle.endUnitTurn(activeUnit.id);
      }
    } else if (moveRange.has(`${q},${r}`)) {
      battle.moveUnit(activeUnit.id, q, r);
      // After move, we could still attack if we didn't use attack before
      // For now, let's just end turn or allow further actions
    }
    
    setSelectedHex({ q, r });
  };

  const hexes = [];
  for (let q = 0; q < battle.battleMap.width; q++) {
    for (let r = 0; r < battle.battleMap.height; r++) {
      hexes.push(renderHex(q, r));
    }
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 800">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodOpacity="0.5" />
        </filter>
      </defs>
      {hexes}
    </svg>
  );
};

function getHexPoints(size: number) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i;
    const angle_rad = Math.PI / 180 * angle_deg;
    points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
  }
  return points.join(' ');
}

export default BattleMap;
