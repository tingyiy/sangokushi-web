/**
 * Map data: seasonal palettes, season derivation, terrain colors.
 *
 * Season mapping follows RTK IV:
 *   Spring (春): months 1-3  — fresh green, cherry blossoms
 *   Summer (夏): months 4-6  — deep saturated green, bright rivers
 *   Autumn (秋): months 7-9  — orange/gold foliage, harvest tones
 *   Winter (冬): months 10-12 — snow, grey-white, frozen rivers
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Derive the current season from the game month (1-12).
 */
export function getSeason(month: number): Season {
  if (month >= 1 && month <= 3) return 'spring';
  if (month >= 4 && month <= 6) return 'summer';
  if (month >= 7 && month <= 9) return 'autumn';
  return 'winter';
}

/**
 * Comprehensive terrain palette per season.
 * Each key maps to a specific terrain element type in the SVG.
 *
 * Based on RTK IV seasonal screenshots:
 * - Spring: bright green fields, pink blossom accents, blue rivers
 * - Summer: deep green, bright blue rivers, lush vegetation
 * - Autumn: orange/gold foliage, brown fields, warm tones
 * - Winter: white/grey snow, frozen blue rivers, bare brown mountains
 */
export interface TerrainPalette {
  /** Ocean gradient start */
  ocean1: string;
  /** Ocean gradient end (deeper) */
  ocean2: string;
  /** Wave texture color */
  waveColor: string;
  /** Main landmass fill */
  land: string;
  /** Fertile plains fill */
  plains: string;
  /** Secondary plains (slightly different shade) */
  plains2: string;
  /** Southern vegetation */
  southLand: string;
  /** Lingnan (far south) */
  lingnan: string;
  /** Mountain body fill */
  mountain: string;
  /** Mountain stroke outline */
  mountainStroke: string;
  /** Mountain peak triangle fill */
  mountainPeak: string;
  /** Desert fill */
  desert: string;
  /** Desert detail/dune strokes */
  desertDetail: string;
  /** Arid transition zone */
  aridZone: string;
  /** Northern plateau */
  plateau: string;
  /** Plateau peak details */
  plateauPeak: string;
  /** Southeast hills */
  seHills: string;
  /** Southeast hill peaks */
  seHillPeak: string;
  /** Major rivers (Yellow River, Yangtze) */
  riverMajor: string;
  /** Minor rivers (Han, Huai, etc.) */
  riverMinor: string;
  /** Lake fill */
  lake: string;
  /** Lake highlight */
  lakeHighlight: string;
  /** Coast foam line */
  coastFoam: string;
  /** Road color */
  road: string;
  /** Road opacity */
  roadOpacity: number;
}

export const TERRAIN_PALETTES: Record<Season, TerrainPalette> = {
  spring: {
    ocean1: '#1e5a88',
    ocean2: '#14406a',
    waveColor: '#4090b8',
    land: '#5e9438',
    plains: '#72a84e',
    plains2: '#68a048',
    southLand: '#5a9040',
    lingnan: '#4e8438',
    mountain: '#8a7048',
    mountainStroke: '#6e5838',
    mountainPeak: '#a89060',
    desert: '#d0b470',
    desertDetail: '#c0a460',
    aridZone: '#b09858',
    plateau: '#a49058',
    plateauPeak: '#887048',
    seHills: '#7a9858',
    seHillPeak: '#887048',
    riverMajor: '#4898cc',
    riverMinor: '#4898cc',
    lake: '#3a82b4',
    lakeHighlight: '#60b0d8',
    coastFoam: '#70bcd8',
    road: '#586838',
    roadOpacity: 0.35,
  },
  summer: {
    ocean1: '#165880',
    ocean2: '#0e3858',
    waveColor: '#3080a0',
    land: '#3a7818',
    plains: '#488a28',
    plains2: '#448824',
    southLand: '#3a7818',
    lingnan: '#2c6810',
    mountain: '#7a5830',
    mountainStroke: '#604428',
    mountainPeak: '#8e6e40',
    desert: '#d8b868',
    desertDetail: '#c8a858',
    aridZone: '#b89848',
    plateau: '#907840',
    plateauPeak: '#7a5830',
    seHills: '#588840',
    seHillPeak: '#7a5830',
    riverMajor: '#3a90c0',
    riverMinor: '#3a90c0',
    lake: '#30789c',
    lakeHighlight: '#50a4cc',
    coastFoam: '#58b0cc',
    road: '#486028',
    roadOpacity: 0.3,
  },
  autumn: {
    ocean1: '#1e5070',
    ocean2: '#143858',
    waveColor: '#3a6888',
    land: '#9a8828',
    plains: '#aa9830',
    plains2: '#988828',
    southLand: '#887828',
    lingnan: '#786820',
    mountain: '#785818',
    mountainStroke: '#604810',
    mountainPeak: '#a08830',
    desert: '#d0a040',
    desertDetail: '#c09030',
    aridZone: '#a88028',
    plateau: '#988830',
    plateauPeak: '#785818',
    seHills: '#888838',
    seHillPeak: '#785818',
    riverMajor: '#4898c8',
    riverMinor: '#4898c8',
    lake: '#3884b0',
    lakeHighlight: '#60b0d8',
    coastFoam: '#58a0b8',
    road: '#786028',
    roadOpacity: 0.4,
  },
  winter: {
    ocean1: '#163858',
    ocean2: '#0e2840',
    waveColor: '#306080',
    land: '#788888',
    plains: '#889890',
    plains2: '#889890',
    southLand: '#688070',
    lingnan: '#587060',
    mountain: '#98a898',
    mountainStroke: '#889888',
    mountainPeak: '#c8d8c8',
    desert: '#b0a878',
    desertDetail: '#a09870',
    aridZone: '#888868',
    plateau: '#989880',
    plateauPeak: '#b0b098',
    seHills: '#788878',
    seHillPeak: '#989888',
    riverMajor: '#5088a8',
    riverMinor: '#5088a8',
    lake: '#407890',
    lakeHighlight: '#6098b0',
    coastFoam: '#6090a8',
    road: '#686868',
    roadOpacity: 0.45,
  },
};

/**
 * Road line styling per season.
 */
export const SEASON_ROAD_STYLE: Record<Season, { stroke: string; opacity: number }> = {
  spring: { stroke: '#8b7a56', opacity: 0.3 },
  summer: { stroke: '#7a7040', opacity: 0.28 },
  autumn: { stroke: '#9a8050', opacity: 0.35 },
  winter: { stroke: '#8a8a80', opacity: 0.35 },
};

/**
 * City label color per season (for readability against terrain changes).
 */
export const SEASON_LABEL_COLOR: Record<Season, string> = {
  spring: '#f0e8d0',
  summer: '#e0d8c0',
  autumn: '#f8e8c0',
  winter: '#d0d8e0',
};

/**
 * Strategic map viewBox dimensions.
 * City coordinates in cities.ts are expressed as percentages of this space.
 */
export const MAP_VIEWBOX = {
  x: 0,
  y: 0,
  width: 100,
  height: 85,
};

/**
 * Lightweight CSS filter strings for the minimap.
 * The main map uses full TERRAIN_PALETTES for inline SVG elements;
 * the minimap still renders the static SVG image and uses CSS filters
 * for a quick seasonal tint.
 */
export const SEASON_FILTERS: Record<Season, string> = {
  spring: 'saturate(1.1) brightness(1.05)',
  summer: 'saturate(1.3) brightness(0.95)',
  autumn: 'saturate(0.9) sepia(0.25) brightness(1.0)',
  winter: 'saturate(0.4) brightness(1.15)',
};

/**
 * Zoom constraints for the strategic map.
 */
export const MAP_ZOOM = {
  min: 0.8,
  max: 4.0,
  step: 0.15,
  default: 1.0,
  wheelFactor: 0.06,
};

/**
 * Scale multiplier for each mouse-sensitivity level (1-5).
 * Applied to both strategic and battle map wheel zoom.
 */
const SENSITIVITY_SCALE: Record<number, number> = {
  1: 0.4,
  2: 0.7,
  3: 1.0,
  4: 1.5,
  5: 2.0,
};

/** Return the wheel factor scaled by the player's sensitivity setting (1-5). */
export function getWheelFactor(sensitivity: number): number {
  const scale = SENSITIVITY_SCALE[sensitivity] ?? 1.0;
  return MAP_ZOOM.wheelFactor * scale;
}

/* ─── Battle Map Seasonal Terrain Palette ─── */

import type { TerrainType } from '../../types/battle';

/**
 * Per-terrain color set used by the battle hex map.
 * `fill` is the base hex fill, `stroke` is the hex border,
 * `pattern` provides detail colors for SVG texture patterns.
 */
export interface BattleTerrainColors {
  fill: string;
  stroke: string;
  pattern: {
    detail1: string;
    detail2: string;
  };
}

/**
 * Battle hex terrain colors per season, derived from the strategic map palettes
 * so the battle map visually matches the strategic map's current season.
 *
 * Mapping rationale:
 * - plain  → strategic `plains` / `plains2`
 * - forest → strategic `southLand` / `lingnan` (deep vegetation)
 * - mountain → strategic `mountain` / `mountainStroke` / `mountainPeak`
 * - river  → strategic `riverMajor` / `lake`
 * - city   → warm gold/stone (built structures, constant across seasons)
 * - gate   → darker structural brown/grey
 * - bridge → neutral stone grey, slight seasonal tint
 */
export const BATTLE_TERRAIN_PALETTES: Record<Season, Record<TerrainType, BattleTerrainColors>> = {
  spring: {
    plain:    { fill: '#72a84e', stroke: '#5a8838', pattern: { detail1: '#5e9438', detail2: '#68a048' } },
    forest:   { fill: '#4a8838', stroke: '#3a7028', pattern: { detail1: '#3a7020', detail2: '#5a9040' } },
    mountain: { fill: '#8a7048', stroke: '#6e5838', pattern: { detail1: '#a89060', detail2: '#6e5838' } },
    river:    { fill: '#4898cc', stroke: '#3a82b4', pattern: { detail1: '#60b0d8', detail2: '#3a82b4' } },
    city:     { fill: '#d4a848', stroke: '#b08830', pattern: { detail1: '#e8c060', detail2: '#c09838' } },
    gate:     { fill: '#8d6e53', stroke: '#6e5540', pattern: { detail1: '#a08060', detail2: '#6e5540' } },
    bridge:   { fill: '#90a098', stroke: '#708078', pattern: { detail1: '#a8b0a8', detail2: '#708078' } },
  },
  summer: {
    plain:    { fill: '#488a28', stroke: '#3a7018', pattern: { detail1: '#3a7818', detail2: '#448824' } },
    forest:   { fill: '#2d6a18', stroke: '#1e5810', pattern: { detail1: '#2c6810', detail2: '#3a7818' } },
    mountain: { fill: '#7a5830', stroke: '#604428', pattern: { detail1: '#8e6e40', detail2: '#604428' } },
    river:    { fill: '#3a90c0', stroke: '#30789c', pattern: { detail1: '#50a4cc', detail2: '#30789c' } },
    city:     { fill: '#d4a848', stroke: '#b08830', pattern: { detail1: '#e8c060', detail2: '#c09838' } },
    gate:     { fill: '#8d6e53', stroke: '#6e5540', pattern: { detail1: '#a08060', detail2: '#6e5540' } },
    bridge:   { fill: '#88988e', stroke: '#687868', pattern: { detail1: '#98a898', detail2: '#687868' } },
  },
  autumn: {
    plain:    { fill: '#aa9830', stroke: '#8a7820', pattern: { detail1: '#9a8828', detail2: '#988828' } },
    forest:   { fill: '#887828', stroke: '#6a5c18', pattern: { detail1: '#786820', detail2: '#9a8828' } },
    mountain: { fill: '#785818', stroke: '#604810', pattern: { detail1: '#a08830', detail2: '#604810' } },
    river:    { fill: '#4898c8', stroke: '#3884b0', pattern: { detail1: '#60b0d8', detail2: '#3884b0' } },
    city:     { fill: '#d4a040', stroke: '#b08830', pattern: { detail1: '#e0b850', detail2: '#c09030' } },
    gate:     { fill: '#8d6e53', stroke: '#6e5540', pattern: { detail1: '#a08060', detail2: '#6e5540' } },
    bridge:   { fill: '#988878', stroke: '#786858', pattern: { detail1: '#a89888', detail2: '#786858' } },
  },
  winter: {
    plain:    { fill: '#889890', stroke: '#708078', pattern: { detail1: '#788888', detail2: '#889890' } },
    forest:   { fill: '#688070', stroke: '#587060', pattern: { detail1: '#587060', detail2: '#788878' } },
    mountain: { fill: '#98a898', stroke: '#889888', pattern: { detail1: '#c8d8c8', detail2: '#889888' } },
    river:    { fill: '#5088a8', stroke: '#407890', pattern: { detail1: '#6098b0', detail2: '#407890' } },
    city:     { fill: '#c8b878', stroke: '#a89868', pattern: { detail1: '#d8c888', detail2: '#b0a070' } },
    gate:     { fill: '#908880', stroke: '#787068', pattern: { detail1: '#a09890', detail2: '#787068' } },
    bridge:   { fill: '#a0a8a0', stroke: '#889088', pattern: { detail1: '#b0b8b0', detail2: '#889088' } },
  },
};
