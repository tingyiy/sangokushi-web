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
    ocean1: '#2a6496',
    ocean2: '#1a4a6e',
    waveColor: '#4a90b8',
    land: '#5a8c3c',
    plains: '#6ba055',
    plains2: '#6ba055',
    southLand: '#5a8a4a',
    lingnan: '#4d7d42',
    mountain: '#7a6a4a',
    mountainStroke: '#6a5a3a',
    mountainPeak: '#8e7e5e',
    desert: '#c8a96e',
    desertDetail: '#b89960',
    aridZone: '#a89060',
    plateau: '#9a8a60',
    plateauPeak: '#7a6a4a',
    seHills: '#7d9465',
    seHillPeak: '#7a6a4a',
    riverMajor: '#5cacde',
    riverMinor: '#5cacde',
    lake: '#4a8ec2',
    lakeHighlight: '#6cb8e6',
    coastFoam: '#7ec8e3',
    road: '#5a6a3a',
    roadOpacity: 0.35,
  },
  summer: {
    ocean1: '#1e5a8c',
    ocean2: '#0f3a60',
    waveColor: '#3a80a8',
    land: '#3d7a1f',
    plains: '#4a8a2a',
    plains2: '#4a8a2a',
    southLand: '#3d7a1f',
    lingnan: '#2d6a12',
    mountain: '#6b5a3a',
    mountainStroke: '#5a4a2a',
    mountainPeak: '#7e6e4e',
    desert: '#d0b070',
    desertDetail: '#c0a060',
    aridZone: '#b09858',
    plateau: '#8a7a50',
    plateauPeak: '#6b5a3a',
    seHills: '#5a8448',
    seHillPeak: '#6b5a3a',
    riverMajor: '#4a9ad0',
    riverMinor: '#4a9ad0',
    lake: '#3a7eaa',
    lakeHighlight: '#5aacda',
    coastFoam: '#6abada',
    road: '#4a5a2a',
    roadOpacity: 0.3,
  },
  autumn: {
    ocean1: '#2a5a80',
    ocean2: '#1a4060',
    waveColor: '#4a7898',
    land: '#8a7a2c',
    plains: '#9a8a35',
    plains2: '#8a7a2c',
    southLand: '#7a7030',
    lingnan: '#6a6028',
    mountain: '#6a5a1f',
    mountainStroke: '#5a4a18',
    mountainPeak: '#8a7a3a',
    desert: '#c8a050',
    desertDetail: '#b89040',
    aridZone: '#a08038',
    plateau: '#8a7a3a',
    plateauPeak: '#6a5a1f',
    seHills: '#7a7a40',
    seHillPeak: '#6a5a1f',
    riverMajor: '#5cacde',
    riverMinor: '#5cacde',
    lake: '#4a8ec2',
    lakeHighlight: '#6cb8e6',
    coastFoam: '#6aacca',
    road: '#6a5a2a',
    roadOpacity: 0.4,
  },
  winter: {
    ocean1: '#1a3a5a',
    ocean2: '#0f2a40',
    waveColor: '#3a6888',
    land: '#7a8a8c',
    plains: '#8a9a92',
    plains2: '#8a9a92',
    southLand: '#6a8070',
    lingnan: '#5a7060',
    mountain: '#9aaa9c',
    mountainStroke: '#8a9a8c',
    mountainPeak: '#c8d8cc',
    desert: '#b0a880',
    desertDetail: '#a09878',
    aridZone: '#8a8a70',
    plateau: '#9a9a88',
    plateauPeak: '#b0b0a0',
    seHills: '#7a8a7a',
    seHillPeak: '#9a9a8c',
    riverMajor: '#5a8aaf',
    riverMinor: '#5a8aaf',
    lake: '#4a7a9a',
    lakeHighlight: '#6a9aba',
    coastFoam: '#6a98b0',
    road: '#6a6a6a',
    roadOpacity: 0.45,
  },
};

/**
 * Road line styling per season.
 */
export const SEASON_ROAD_STYLE: Record<Season, { stroke: string; opacity: number }> = {
  spring: { stroke: '#5a6a3a', opacity: 0.35 },
  summer: { stroke: '#4a5a2a', opacity: 0.3 },
  autumn: { stroke: '#6a5a2a', opacity: 0.4 },
  winter: { stroke: '#6a6a6a', opacity: 0.45 },
};

/**
 * City label color per season (for readability against terrain changes).
 */
export const SEASON_LABEL_COLOR: Record<Season, string> = {
  spring: '#e5e7eb',
  summer: '#d4d7db',
  autumn: '#f0e6d0',
  winter: '#c8d0d8',
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
  wheelFactor: 0.1,
};
