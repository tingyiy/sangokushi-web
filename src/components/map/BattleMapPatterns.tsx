import type { Season } from './mapData';
import { BATTLE_TERRAIN_PALETTES } from './mapData';

interface BattleMapPatternsProps {
  season: Season;
}

/**
 * BattleMapPatterns: SVG <defs> with hex-sized terrain texture patterns
 * that adapt to the current game season, matching the strategic map's
 * seasonal look.
 *
 * Pattern IDs are prefixed `bhex-` to avoid collisions with strategic map patterns.
 * Tile sizes are in SVG pixel units (the hex grid uses HEX_SIZE = 32).
 */
export function BattleMapPatterns({ season }: BattleMapPatternsProps) {
  const p = BATTLE_TERRAIN_PALETTES[season];

  return (
    <defs>
      {/* ── Plain: grass tufts and blade strokes ── */}
      <pattern id="bhex-plain" patternUnits="userSpaceOnUse" width="16" height="16">
        <rect width="16" height="16" fill={p.plain.fill} />
        <circle cx="3" cy="3" r="1.5" fill={p.plain.pattern.detail1} opacity="0.35" />
        <circle cx="11" cy="5" r="1.2" fill={p.plain.pattern.detail1} opacity="0.3" />
        <circle cx="6" cy="12" r="1.4" fill={p.plain.pattern.detail2} opacity="0.3" />
        <circle cx="14" cy="13" r="1.1" fill={p.plain.pattern.detail1} opacity="0.25" />
        <circle cx="2" cy="9" r="1.0" fill={p.plain.pattern.detail2} opacity="0.3" />
        {/* Grass blades */}
        <line x1="8" y1="2.5" x2="8.6" y2="0.8" stroke={p.plain.pattern.detail1} strokeWidth="0.4" opacity="0.3" />
        <line x1="13" y1="8" x2="13.5" y2="6.5" stroke={p.plain.pattern.detail1} strokeWidth="0.4" opacity="0.25" />
      </pattern>

      {/* ── Forest: dense canopy circles ── */}
      <pattern id="bhex-forest" patternUnits="userSpaceOnUse" width="16" height="16">
        <rect width="16" height="16" fill={p.forest.fill} />
        <circle cx="4" cy="4" r="2.2" fill={p.forest.pattern.detail1} opacity="0.45" />
        <circle cx="12" cy="3" r="1.8" fill={p.forest.pattern.detail1} opacity="0.4" />
        <circle cx="3" cy="12" r="1.8" fill={p.forest.pattern.detail2} opacity="0.35" />
        <circle cx="11" cy="11" r="2.2" fill={p.forest.pattern.detail1} opacity="0.4" />
        <circle cx="8" cy="8" r="1.6" fill={p.forest.pattern.detail1} opacity="0.35" />
        {/* Canopy highlights */}
        <circle cx="5" cy="1.5" r="1.0" fill={p.forest.pattern.detail2} opacity="0.3" />
        <circle cx="14" cy="8" r="1.1" fill={p.forest.pattern.detail2} opacity="0.28" />
      </pattern>

      {/* ── Mountain: crosshatch with rocky highlights ── */}
      <pattern id="bhex-mountain" patternUnits="userSpaceOnUse" width="16" height="16">
        <rect width="16" height="16" fill={p.mountain.fill} />
        {/* Crosshatch */}
        <line x1="0" y1="0" x2="16" y2="16" stroke={p.mountain.pattern.detail2} strokeWidth="0.6" opacity="0.35" />
        <line x1="8" y1="0" x2="16" y2="8" stroke={p.mountain.pattern.detail2} strokeWidth="0.5" opacity="0.25" />
        <line x1="0" y1="8" x2="8" y2="16" stroke={p.mountain.pattern.detail2} strokeWidth="0.5" opacity="0.25" />
        <line x1="16" y1="0" x2="0" y2="16" stroke={p.mountain.pattern.detail2} strokeWidth="0.4" opacity="0.15" />
        {/* Rocky peak highlights */}
        <circle cx="5" cy="11" r="1.0" fill={p.mountain.pattern.detail1} opacity="0.3" />
        <circle cx="13" cy="5" r="0.8" fill={p.mountain.pattern.detail1} opacity="0.25" />
        {/* Peak triangles */}
        <path d="M 8,2 L 10,6 L 6,6 Z" fill={p.mountain.pattern.detail1} opacity="0.2" />
      </pattern>

      {/* ── River: water ripples ── */}
      <pattern id="bhex-river" patternUnits="userSpaceOnUse" width="24" height="12">
        <rect width="24" height="12" fill={p.river.fill} />
        <path
          d="M 0,4 Q 6,2 12,4 Q 18,6 24,4"
          stroke={p.river.pattern.detail1}
          strokeWidth="0.5"
          fill="none"
          opacity="0.35"
        />
        <path
          d="M 0,9 Q 6,7 12,9 Q 18,11 24,9"
          stroke={p.river.pattern.detail1}
          strokeWidth="0.4"
          fill="none"
          opacity="0.28"
        />
      </pattern>

      {/* ── City: stone/masonry texture ── */}
      <pattern id="bhex-city" patternUnits="userSpaceOnUse" width="12" height="12">
        <rect width="12" height="12" fill={p.city.fill} />
        {/* Brick lines */}
        <line x1="0" y1="4" x2="12" y2="4" stroke={p.city.pattern.detail2} strokeWidth="0.4" opacity="0.3" />
        <line x1="0" y1="8" x2="12" y2="8" stroke={p.city.pattern.detail2} strokeWidth="0.4" opacity="0.3" />
        <line x1="6" y1="0" x2="6" y2="4" stroke={p.city.pattern.detail2} strokeWidth="0.4" opacity="0.25" />
        <line x1="3" y1="4" x2="3" y2="8" stroke={p.city.pattern.detail2} strokeWidth="0.4" opacity="0.25" />
        <line x1="9" y1="4" x2="9" y2="8" stroke={p.city.pattern.detail2} strokeWidth="0.4" opacity="0.25" />
        <line x1="6" y1="8" x2="6" y2="12" stroke={p.city.pattern.detail2} strokeWidth="0.4" opacity="0.25" />
        {/* Highlight */}
        <circle cx="3" cy="2" r="0.6" fill={p.city.pattern.detail1} opacity="0.2" />
        <circle cx="9" cy="10" r="0.5" fill={p.city.pattern.detail1} opacity="0.18" />
      </pattern>

      {/* ── Gate: reinforced stone/wood ── */}
      <pattern id="bhex-gate" patternUnits="userSpaceOnUse" width="12" height="12">
        <rect width="12" height="12" fill={p.gate.fill} />
        {/* Wood plank lines */}
        <line x1="0" y1="3" x2="12" y2="3" stroke={p.gate.pattern.detail2} strokeWidth="0.5" opacity="0.35" />
        <line x1="0" y1="6" x2="12" y2="6" stroke={p.gate.pattern.detail2} strokeWidth="0.5" opacity="0.35" />
        <line x1="0" y1="9" x2="12" y2="9" stroke={p.gate.pattern.detail2} strokeWidth="0.5" opacity="0.35" />
        {/* Metal studs */}
        <circle cx="3" cy="1.5" r="0.7" fill={p.gate.pattern.detail1} opacity="0.3" />
        <circle cx="9" cy="4.5" r="0.7" fill={p.gate.pattern.detail1} opacity="0.3" />
        <circle cx="3" cy="7.5" r="0.7" fill={p.gate.pattern.detail1} opacity="0.3" />
        <circle cx="9" cy="10.5" r="0.7" fill={p.gate.pattern.detail1} opacity="0.3" />
      </pattern>

      {/* ── Bridge: planked stone ── */}
      <pattern id="bhex-bridge" patternUnits="userSpaceOnUse" width="12" height="8">
        <rect width="12" height="8" fill={p.bridge.fill} />
        {/* Plank lines (horizontal) */}
        <line x1="0" y1="2.5" x2="12" y2="2.5" stroke={p.bridge.pattern.detail2} strokeWidth="0.4" opacity="0.3" />
        <line x1="0" y1="5.5" x2="12" y2="5.5" stroke={p.bridge.pattern.detail2} strokeWidth="0.4" opacity="0.3" />
        {/* Highlight dots */}
        <circle cx="6" cy="4" r="0.5" fill={p.bridge.pattern.detail1} opacity="0.2" />
      </pattern>

      {/* ── Winter snow overlay (applied additively on top in winter) ── */}
      <pattern id="bhex-snow" patternUnits="userSpaceOnUse" width="20" height="20">
        <rect width="20" height="20" fill="none" />
        <circle cx="5" cy="5" r="1.2" fill="white" opacity="0.3" />
        <circle cx="15" cy="15" r="1.0" fill="white" opacity="0.25" />
        <circle cx="15" cy="3" r="0.9" fill="white" opacity="0.2" />
        <circle cx="3" cy="14" r="0.9" fill="white" opacity="0.2" />
        <circle cx="10" cy="10" r="0.8" fill="white" opacity="0.18" />
        <circle cx="7" cy="17" r="0.7" fill="white" opacity="0.15" />
        <circle cx="18" cy="9" r="0.7" fill="white" opacity="0.15" />
      </pattern>
    </defs>
  );
}
