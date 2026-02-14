import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBattleStore } from '../../store/battleStore';
import { hexToPixel, getDistance } from '../../utils/hex';
import { getMoveRange } from '../../utils/pathfinding';
import { getMovementRange, getAttackRange, getUnitTypeLabel } from '../../utils/unitTypes';
import type { TerrainType } from '../../types/battle';
import { localizedName } from '../../i18n/dataNames';
import { useGameStore } from '../../store/gameStore';
import { getWheelFactor, getSeason, BATTLE_TERRAIN_PALETTES } from './mapData';
import type { Season } from './mapData';
import { BattleMapPatterns } from './BattleMapPatterns';

const HEX_SIZE = 32;

const TERRAIN_KEYS: Record<TerrainType, string> = {
  plain: 'battle:terrain.plain', forest: 'battle:terrain.forest', mountain: 'battle:terrain.mountain',
  river: 'battle:terrain.river', city: 'battle:terrain.city', gate: 'battle:terrain.gate', bridge: 'battle:terrain.bridge',
};

/** Terrain types that use SVG pattern fills for textured rendering */
const PATTERNED_TERRAINS: readonly TerrainType[] = ['plain', 'forest', 'mountain', 'river', 'city', 'gate', 'bridge'];

/** Terrain types that receive a snow overlay in winter */
const SNOW_TERRAINS: readonly TerrainType[] = ['plain', 'forest', 'mountain'];

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.05;

interface BattleMapProps {
  playerFactionId: number;
}

const BattleMap: React.FC<BattleMapProps> = ({ playerFactionId }) => {
  const { t } = useTranslation();
  const battle = useBattleStore();
  const sensitivity = useGameStore(s => s.gameSettings.intelligenceSensitivity);
  const month = useGameStore(s => s.month);
  const season: Season = useMemo(() => getSeason(month), [month]);
  const terrainPalette = useMemo(() => BATTLE_TERRAIN_PALETTES[season], [season]);
  const activeUnit = battle.units.find(u => u.id === battle.activeUnitId);
  const isPlayerUnit = activeUnit && activeUnit.factionId === playerFactionId;

  // Zoom / pan state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Move range (BFS with terrain costs)
  const moveRange = useMemo(() => {
    if (activeUnit && activeUnit.status === 'active' && !activeUnit.hasMoved && isPlayerUnit) {
      // Enemy units and intact gates are impassable (block BFS)
      const blocked = new Set(
        battle.units.filter(u => u.troops > 0 && u.id !== activeUnit.id && u.factionId !== activeUnit.factionId)
          .map(u => `${u.x},${u.y}`)
      );
      battle.gates.filter(g => g.hp > 0).forEach(g => blocked.add(`${g.q},${g.r}`));
      // Friendly units are passable but not valid destinations
      const occupied = new Set(
        battle.units.filter(u => u.troops > 0 && u.id !== activeUnit.id && u.factionId === activeUnit.factionId)
          .map(u => `${u.x},${u.y}`)
      );
      return getMoveRange(
        { q: activeUnit.x, r: activeUnit.y },
        getMovementRange(activeUnit.type),
        battle.battleMap.width,
        battle.battleMap.height,
        battle.battleMap.terrain,
        blocked,
        occupied
      );
    }
    return new Map<string, number>();
  }, [activeUnit, battle.units, battle.battleMap, isPlayerUnit, battle.gates]);

  // Attack range (enemies within range)
  const attackableEnemies = useMemo(() => {
    if (!activeUnit || activeUnit.status !== 'active' || !isPlayerUnit) return new Set<string>();
    const range = getAttackRange(activeUnit.type);
    const enemies = new Set<string>();
    battle.units.forEach(u => {
      if (u.factionId !== activeUnit.factionId && u.troops > 0 && u.status !== 'routed') {
        const dist = getDistance({ q: activeUnit.x, r: activeUnit.y }, { q: u.x, r: u.y });
        if (dist <= range) enemies.add(u.id);
      }
    });
    return enemies;
  }, [activeUnit, battle.units, isPlayerUnit]);

  // Compute full map bounds in SVG coords
  const mapBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let q = 0; q < battle.battleMap.width; q++) {
      for (let r = 0; r < battle.battleMap.height; r++) {
        const { x, y } = hexToPixel({ q, r }, HEX_SIZE);
        minX = Math.min(minX, x - HEX_SIZE);
        minY = Math.min(minY, y - HEX_SIZE);
        maxX = Math.max(maxX, x + HEX_SIZE);
        maxY = Math.max(maxY, y + HEX_SIZE);
      }
    }
    const pad = 20;
    return {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  }, [battle.battleMap.width, battle.battleMap.height]);

  // Compute viewBox based on zoom and pan
  const viewBox = useMemo(() => {
    const vw = mapBounds.w / zoom;
    const vh = mapBounds.h / zoom;
    const vx = mapBounds.cx - vw / 2 + pan.x;
    const vy = mapBounds.cy - vh / 2 + pan.y;
    return `${vx} ${vy} ${vw} ${vh}`;
  }, [mapBounds, zoom, pan]);

  // Center on a specific hex position
  const centerOnHex = useCallback((q: number, r: number) => {
    const { x, y } = hexToPixel({ q, r }, HEX_SIZE);
    setPan({ x: x - mapBounds.cx, y: y - mapBounds.cy });
  }, [mapBounds]);

  // Auto-center on active unit when it changes
  const prevActiveUnitId = useRef<string | null>(null);
  useEffect(() => {
    if (activeUnit && activeUnit.id !== prevActiveUnitId.current) {
      prevActiveUnitId.current = activeUnit.id;
      // Only auto-center if zoomed in enough that the unit might be off-screen
      if (zoom > 1.2) {
        centerOnHex(activeUnit.x, activeUnit.y); // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [activeUnit, zoom, centerOnHex]);

  // Zoom handlers — use native event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = getWheelFactor(sensitivity);
      const delta = e.deltaY > 0 ? -factor : factor;
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [sensitivity]);

  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP * 2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP * 2));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const centerOnActive = useCallback(() => {
    if (activeUnit) {
      centerOnHex(activeUnit.x, activeUnit.y);
      if (zoom < 1.5) setZoom(1.8);
    }
  }, [activeUnit, zoom, centerOnHex]);

  // Pan handlers (mouse drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag with left button; ignore clicks on hex elements
    if (e.button !== 0) return;
    setIsDragging(false);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    // Only start dragging after a small threshold to avoid eating clicks
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsDragging(true);
    }
    // Convert screen pixels to SVG units: divide by zoom, scale by mapBounds ratio
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = (mapBounds.w / zoom) / rect.width;
    const scaleY = (mapBounds.h / zoom) / rect.height;
    setPan({
      x: dragStart.current.panX - dx * scaleX,
      y: dragStart.current.panY - dy * scaleY,
    });
  }, [zoom, mapBounds]);

  const handleMouseUp = useCallback(() => {
    dragStart.current = null;
    // Keep isDragging true briefly so the click handler can check it
    setTimeout(() => setIsDragging(false), 0);
  }, []);

  const handleHexClick = (q: number, r: number) => {
    if (isDragging) return; // Ignore clicks after a drag

    const unitAtHex = battle.units.find(u => u.x === q && u.y === r && u.troops > 0);

    // If in move/attack mode, handle those first
    if (activeUnit && isPlayerUnit && battle.mode === 'move') {
      if (moveRange.has(`${q},${r}`)) {
        battle.moveUnit(activeUnit.id, q, r);
      }
      return;
    }

    if (activeUnit && isPlayerUnit && battle.mode === 'attack') {
      if (unitAtHex && unitAtHex.factionId !== activeUnit.factionId && attackableEnemies.has(unitAtHex.id)) {
        battle.attackUnit(activeUnit.id, unitAtHex.id);
      }
      return;
    }

    // Idle mode: clicking a friendly active unit selects it; clicking enemy inspects
    if (unitAtHex) {
      if (unitAtHex.factionId === playerFactionId && unitAtHex.status === 'active') {
        battle.selectUnit(unitAtHex.id);
      } else {
        battle.inspectUnit(unitAtHex.id);
      }
    } else {
      // Clicked empty hex: deselect
      battle.selectUnit(null);
    }
  };

  const renderHex = (q: number, r: number) => {
    const terrain = battle.battleMap.terrain[q][r];
    const { x, y } = hexToPixel({ q, r }, HEX_SIZE);
    const isInMoveRange = battle.mode === 'move' && moveRange.has(`${q},${r}`);
    const unit = battle.units.find(u => u.x === q && u.y === r && u.troops > 0);
    const fire = battle.fireHexes.find(f => f.q === q && f.r === r);
    const gate = battle.gates.find(g => g.q === q && g.r === r);
    const isActive = unit && unit.id === battle.activeUnitId;
    const isAttackable = battle.mode === 'attack' && unit && attackableEnemies.has(unit.id);
    const isInspected = unit && unit.id === battle.inspectedUnitId;

    const tc = terrainPalette[terrain];
    const usePattern = (PATTERNED_TERRAINS as readonly string[]).includes(terrain);
    const hexFill = usePattern ? `url(#bhex-${terrain})` : tc.fill;
    const showSnow = season === 'winter' && (SNOW_TERRAINS as readonly string[]).includes(terrain);

    return (
      <g key={`${q},${r}`} transform={`translate(${x}, ${y})`}
         onClick={() => handleHexClick(q, r)}
         style={{ cursor: 'pointer' }}>
        {/* Terrain hex */}
        <polygon
          points={getHexPoints(HEX_SIZE)}
          fill={hexFill}
          stroke={isInspected ? '#0ff' : tc.stroke}
          strokeWidth={isInspected ? 2 : 1}
          style={{ transition: 'fill 1.5s, stroke 1.5s' }}
        />

        {/* Winter snow overlay */}
        {showSnow && (
          <polygon
            points={getHexPoints(HEX_SIZE)}
            fill="url(#bhex-snow)"
            stroke="none"
            pointerEvents="none"
          />
        )}

        {/* Move range highlight */}
        {isInMoveRange && !unit && (
          <polygon
            points={getHexPoints(HEX_SIZE - 3)}
            fill="rgba(100, 200, 255, 0.35)"
            stroke="#4af"
            strokeWidth={1}
            pointerEvents="none"
          />
        )}

        {/* Attack target highlight */}
        {isAttackable && (
          <polygon
            points={getHexPoints(HEX_SIZE - 3)}
            fill="rgba(255, 80, 80, 0.35)"
            stroke="#f44"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}

        {/* Terrain label (when no unit) */}
        {!unit && !fire && !gate && (
          <text textAnchor="middle" dy=".35em" fill="rgba(255,255,255,0.25)" fontSize="10" pointerEvents="none">
            {t(TERRAIN_KEYS[terrain])}
          </text>
        )}

        {/* Fire */}
        {fire && <text textAnchor="middle" dy=".3em" fontSize="16" pointerEvents="none">🔥</text>}

        {/* Gate */}
        {gate && (
          <g>
            <text textAnchor="middle" dy=".3em" fill="white" fontSize="10" pointerEvents="none">{t('battle:terrain.gate')}</text>
            <rect x={-12} y={12} width={24} height={3} fill="#000" />
            <rect x={-12} y={12} width={24 * (gate.hp / gate.maxHp)} height={3} fill="#f00" />
          </g>
        )}

        {/* Unit */}
        {unit && (
          <g>
            {/* Active unit pulsing ring */}
            {isActive && (
              <circle r={HEX_SIZE * 0.55} fill="none" stroke="#ff0" strokeWidth={2.5} opacity={0.9}>
                <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              r={HEX_SIZE * 0.45}
              fill={unit.factionId === playerFactionId ? '#2e7d32' : '#c62828'}
              opacity={unit.status === 'done' ? 0.5 : unit.status === 'routed' ? 0.3 : 1}
              stroke={unit.status === 'confused' ? '#ff0' : 'none'}
              strokeWidth={unit.status === 'confused' ? 2 : 0}
            />
            <text textAnchor="middle" dy="-.2em" fill="white" fontSize="10" fontWeight="bold" pointerEvents="none">
              {localizedName(unit.officer.name).substring(0, 3)}
            </text>
            <text textAnchor="middle" dy="1em" fill="white" fontSize="8" pointerEvents="none">
              {getUnitTypeLabel(unit.type)}
            </text>
            {/* Troop bar */}
            <rect x={-14} y={16} width={28} height={3} fill="#000" />
            <rect x={-14} y={16} width={28 * (unit.troops / unit.maxTroops)} height={3} fill="#0f0" />
          </g>
        )}
      </g>
    );
  };

  const hexes = [];
  for (let q = 0; q < battle.battleMap.width; q++) {
    for (let r = 0; r < battle.battleMap.height; r++) {
      hexes.push(renderHex(q, r));
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <BattleMapPatterns season={season} />
        {hexes}
      </svg>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <button onClick={zoomIn} style={zoomBtnStyle} title={t('battle:map.zoomIn')}>+</button>
        <button onClick={zoomOut} style={zoomBtnStyle} title={t('battle:map.zoomOut')}>-</button>
        <button onClick={resetView} style={zoomBtnStyle} title={t('battle:map.resetView')}>⊡</button>
        <button onClick={centerOnActive} style={zoomBtnStyle} title={t('battle:map.centerOnActive')}>◎</button>
      </div>

      {/* Zoom level indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        fontSize: '0.7rem', color: '#999', background: 'rgba(0,0,0,0.5)',
        padding: '2px 6px', borderRadius: 3,
      }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};

const zoomBtnStyle: React.CSSProperties = {
  width: 28, height: 28,
  background: 'rgba(50,50,50,0.85)',
  color: '#ddd',
  border: '1px solid #666',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

function getHexPoints(size: number) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle_rad = Math.PI / 180 * (60 * i);
    points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
  }
  return points.join(' ');
}

export default BattleMap;
