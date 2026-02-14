import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { getSeason, MAP_VIEWBOX, MAP_ZOOM, getWheelFactor } from './mapData';
import type { Season } from './mapData';
import { MapTerrain } from './MapTerrain';
import { MapRoads } from './MapRoads';
import { MapCities } from './MapCities';

/**
 * GameMap: Main strategic map component.
 *
 * Features:
 * - ViewBox-based pan/zoom (SVG-native, smooth at all zoom levels)
 * - Seasonal terrain effects derived from game month
 * - Sub-components for terrain, roads, and cities
 * - Zoom controls (+, -, reset)
 */
export function GameMap() {
  const { t } = useTranslation();
  const { cities, factions, officers, selectedCityId, selectCity, month, isCityRevealed, gameSettings } = useGameStore();
  const sensitivity = gameSettings.intelligenceSensitivity;

  const season: Season = useMemo(() => getSeason(month), [month]);

  // ── ViewBox-based pan/zoom state ──
  const [zoom, setZoom] = useState(MAP_ZOOM.default);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute the viewBox based on zoom and pan
  const viewBox = useMemo(() => {
    const vw = MAP_VIEWBOX.width / zoom;
    const vh = MAP_VIEWBOX.height / zoom;
    // Center the view, then apply pan offset
    const vx = (MAP_VIEWBOX.width - vw) / 2 + pan.x;
    const vy = (MAP_VIEWBOX.height - vh) / 2 + pan.y;
    return `${vx} ${vy} ${vw} ${vh}`;
  }, [zoom, pan]);

  // ── Clamp pan so the map edge never leaves the viewport ──
  const clampPan = useCallback((px: number, py: number, z: number) => {
    const vw = MAP_VIEWBOX.width / z;
    const vh = MAP_VIEWBOX.height / z;
    // Maximum pan: half of (full map - visible area) in each direction
    const maxPanX = Math.max(0, (MAP_VIEWBOX.width - vw) / 2);
    const maxPanY = Math.max(0, (MAP_VIEWBOX.height - vh) / 2);
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, px)),
      y: Math.min(maxPanY, Math.max(-maxPanY, py)),
    };
  }, []);

  // ── Mouse wheel zoom ──
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = getWheelFactor(sensitivity);
      const delta = e.deltaY > 0 ? -factor : factor;
      setZoom(prev => {
        const next = Math.min(MAP_ZOOM.max, Math.max(MAP_ZOOM.min, prev * (1 + delta)));
        // Re-clamp pan for the new zoom level
        setPan(p => clampPan(p.x, p.y, next));
        return next;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [sensitivity, clampPan]);

  // ── Drag-to-pan ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left button
    if (e.button !== 0) return;
    setIsDragging(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const svg = svgRef.current;
    if (!svg) return;

    // Convert pixel delta to SVG coordinate delta
    const rect = svg.getBoundingClientRect();
    const svgWidth = MAP_VIEWBOX.width / zoom;
    const svgHeight = MAP_VIEWBOX.height / zoom;
    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;

    const dx = (e.clientX - lastMouseRef.current.x) * scaleX;
    const dy = (e.clientY - lastMouseRef.current.y) * scaleY;

    setPan(prev => clampPan(prev.x - dx, prev.y - dy, zoom));
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ── Zoom controls ──
  const handleZoomIn = useCallback(() => {
    setZoom(prev => {
      const next = Math.min(MAP_ZOOM.max, prev + MAP_ZOOM.step);
      setPan(p => clampPan(p.x, p.y, next));
      return next;
    });
  }, [clampPan]);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(MAP_ZOOM.min, prev - MAP_ZOOM.step);
      setPan(p => clampPan(p.x, p.y, next));
      return next;
    });
  }, [clampPan]);

  const handleZoomReset = useCallback(() => {
    setZoom(MAP_ZOOM.default);
    setPan({ x: 0, y: 0 });
  }, []);

  // ── Center on selected city ──
  const handleCenterOnCity = useCallback(() => {
    if (selectedCityId === null) return;
    const city = cities.find(c => c.id === selectedCityId);
    if (!city) return;
    // Pan so the city is centered in view, clamped to bounds
    setPan(clampPan(
      city.x - MAP_VIEWBOX.width / 2,
      city.y - MAP_VIEWBOX.height / 2,
      zoom,
    ));
  }, [selectedCityId, cities, zoom, clampPan]);

  return (
    <div
      ref={containerRef}
      className="game-map"
      style={{ overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="map-svg"
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="crispEdges"
      >
        <MapTerrain season={season} />
        <MapRoads cities={cities} season={season} />
        <MapCities
          cities={cities}
          factions={factions}
          officers={officers}
          selectedCityId={selectedCityId}
          season={season}
          onSelectCity={selectCity}
          isCityRevealed={isCityRevealed}
        />
      </svg>

      {/* Zoom controls */}
      <div className="map-zoom-controls">
        <button
          className="zoom-btn"
          onClick={handleZoomIn}
          title={t('map.zoomIn')}
          aria-label={t('map.zoomIn')}
        >
          +
        </button>
        <button
          className="zoom-btn"
          onClick={handleZoomOut}
          title={t('map.zoomOut')}
          aria-label={t('map.zoomOut')}
        >
          -
        </button>
        <button
          className="zoom-btn"
          onClick={handleZoomReset}
          title={t('map.zoomReset')}
          aria-label={t('map.zoomReset')}
        >
          {/* Reset icon - concentric square */}
          <span style={{ fontSize: '0.75rem' }}>&#x2302;</span>
        </button>
        {selectedCityId !== null && (
          <button
            className="zoom-btn"
            onClick={handleCenterOnCity}
            title={t('map.centerCity')}
            aria-label={t('map.centerCity')}
          >
            <span style={{ fontSize: '0.75rem' }}>&#x25CE;</span>
          </button>
        )}
      </div>

      {/* Season indicator */}
      <div className={`season-indicator season-${season}`}>
        {t(`header.season.${season}`)}
      </div>

      <style>{`
        .map-zoom-controls {
          position: absolute;
          bottom: 16px;
          left: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 15;
        }
        .zoom-btn {
          width: 32px;
          height: 32px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid #475569;
          color: #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 1.1rem;
          font-weight: bold;
          backdrop-filter: blur(4px);
          transition: background 0.15s;
        }
        .zoom-btn:hover {
          background: rgba(51, 65, 85, 0.9);
        }
        .season-indicator {
          position: absolute;
          bottom: 16px;
          right: 16px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: bold;
          backdrop-filter: blur(4px);
          z-index: 15;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .season-spring {
          background: rgba(74, 122, 47, 0.75);
          color: #d4edbc;
        }
        .season-summer {
          background: rgba(30, 100, 20, 0.75);
          color: #b8e0a0;
        }
        .season-autumn {
          background: rgba(138, 100, 30, 0.75);
          color: #f0dca0;
        }
        .season-winter {
          background: rgba(80, 100, 120, 0.75);
          color: #c8d8e8;
        }
      `}</style>
    </div>
  );
}
