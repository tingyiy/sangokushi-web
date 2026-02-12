import type { TerrainPalette } from './mapData';

interface MapPatternsProps {
  palette: TerrainPalette;
}

/**
 * MapPatterns: SVG <defs> block containing repeating terrain texture patterns.
 *
 * These patterns give the flat-fill terrain a pixel-art feel reminiscent of
 * RTK IV's hand-drawn map. Each pattern is a small tile (1x1 to 2x2 SVG units)
 * that repeats across the terrain polygon. The pattern colors are derived from
 * the current seasonal palette so they change with the seasons.
 *
 * Patterns:
 *   pat-grass    — stippled green dots for plains
 *   pat-grass2   — alternate plains stipple (slightly different density)
 *   pat-forest   — denser stipple with darker accents for forested areas
 *   pat-sand     — horizontal wavelet lines for desert
 *   pat-mountain — crosshatch strokes for mountain body
 *   pat-water    — horizontal ripple lines for ocean/lakes
 *   pat-snow     — sparse white dots for winter overlay
 */
export function MapPatterns({ palette: p }: MapPatternsProps) {
  return (
    <defs>
      {/* ── Grass pattern: small dots on plains color ── */}
      <pattern id="pat-grass" patternUnits="userSpaceOnUse" width="1.5" height="1.5">
        <rect width="1.5" height="1.5" fill={p.plains} />
        <circle cx="0.4" cy="0.4" r="0.12" fill={p.land} opacity="0.4" />
        <circle cx="1.1" cy="1.1" r="0.1" fill={p.land} opacity="0.35" />
        <circle cx="0.3" cy="1.2" r="0.08" fill={p.plains2} opacity="0.3" />
        <circle cx="1.2" cy="0.3" r="0.09" fill={p.plains2} opacity="0.35" />
      </pattern>

      {/* ── Alternate grass pattern (denser, for variation) ── */}
      <pattern id="pat-grass2" patternUnits="userSpaceOnUse" width="1.2" height="1.2">
        <rect width="1.2" height="1.2" fill={p.plains2} />
        <circle cx="0.3" cy="0.3" r="0.1" fill={p.plains} opacity="0.45" />
        <circle cx="0.9" cy="0.3" r="0.08" fill={p.land} opacity="0.3" />
        <circle cx="0.3" cy="0.9" r="0.08" fill={p.land} opacity="0.3" />
        <circle cx="0.9" cy="0.9" r="0.1" fill={p.plains} opacity="0.4" />
        <circle cx="0.6" cy="0.6" r="0.06" fill={p.land} opacity="0.25" />
      </pattern>

      {/* ── Forest pattern: darker, denser stipple ── */}
      <pattern id="pat-forest" patternUnits="userSpaceOnUse" width="1.4" height="1.4">
        <rect width="1.4" height="1.4" fill={p.southLand} />
        <circle cx="0.35" cy="0.35" r="0.15" fill={p.lingnan} opacity="0.5" />
        <circle cx="1.05" cy="0.35" r="0.12" fill={p.land} opacity="0.4" />
        <circle cx="0.35" cy="1.05" r="0.12" fill={p.land} opacity="0.4" />
        <circle cx="1.05" cy="1.05" r="0.15" fill={p.lingnan} opacity="0.45" />
        <circle cx="0.7" cy="0.7" r="0.1" fill={p.lingnan} opacity="0.35" />
      </pattern>

      {/* ── Sand / desert pattern: wavy horizontal lines ── */}
      <pattern id="pat-sand" patternUnits="userSpaceOnUse" width="2" height="1.2">
        <rect width="2" height="1.2" fill={p.desert} />
        <path
          d="M 0,0.35 Q 0.5,0.2 1,0.35 Q 1.5,0.5 2,0.35"
          stroke={p.desertDetail}
          strokeWidth="0.08"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M 0,0.85 Q 0.5,0.7 1,0.85 Q 1.5,1.0 2,0.85"
          stroke={p.desertDetail}
          strokeWidth="0.06"
          fill="none"
          opacity="0.3"
        />
      </pattern>

      {/* ── Mountain texture: crosshatch strokes ── */}
      <pattern id="pat-mountain" patternUnits="userSpaceOnUse" width="1.6" height="1.6">
        <rect width="1.6" height="1.6" fill={p.mountain} />
        <line x1="0" y1="0" x2="1.6" y2="1.6" stroke={p.mountainStroke} strokeWidth="0.08" opacity="0.35" />
        <line x1="0.8" y1="0" x2="1.6" y2="0.8" stroke={p.mountainStroke} strokeWidth="0.06" opacity="0.25" />
        <line x1="0" y1="0.8" x2="0.8" y2="1.6" stroke={p.mountainStroke} strokeWidth="0.06" opacity="0.25" />
        <circle cx="0.4" cy="1.2" r="0.06" fill={p.mountainPeak} opacity="0.3" />
        <circle cx="1.2" cy="0.4" r="0.06" fill={p.mountainPeak} opacity="0.3" />
      </pattern>

      {/* ── Water / ocean ripple pattern ── */}
      <pattern id="pat-water" patternUnits="userSpaceOnUse" width="3" height="1.5">
        <rect width="3" height="1.5" fill={p.ocean1} />
        <path
          d="M 0,0.5 Q 0.75,0.25 1.5,0.5 Q 2.25,0.75 3,0.5"
          stroke={p.waveColor}
          strokeWidth="0.07"
          fill="none"
          opacity="0.3"
        />
        <path
          d="M 0,1.1 Q 0.75,0.85 1.5,1.1 Q 2.25,1.35 3,1.1"
          stroke={p.waveColor}
          strokeWidth="0.06"
          fill="none"
          opacity="0.25"
        />
      </pattern>

      {/* ── Snow pattern (winter overlay) ── */}
      <pattern id="pat-snow" patternUnits="userSpaceOnUse" width="2" height="2">
        <rect width="2" height="2" fill="none" />
        <circle cx="0.5" cy="0.5" r="0.12" fill="white" opacity="0.35" />
        <circle cx="1.5" cy="1.5" r="0.1" fill="white" opacity="0.3" />
        <circle cx="1.5" cy="0.3" r="0.08" fill="white" opacity="0.25" />
        <circle cx="0.3" cy="1.5" r="0.08" fill="white" opacity="0.25" />
      </pattern>

      {/* ── Lake shimmer pattern ── */}
      <pattern id="pat-lake" patternUnits="userSpaceOnUse" width="2" height="1">
        <rect width="2" height="1" fill={p.lake} />
        <path
          d="M 0,0.5 Q 0.5,0.35 1,0.5 Q 1.5,0.65 2,0.5"
          stroke={p.lakeHighlight}
          strokeWidth="0.06"
          fill="none"
          opacity="0.4"
        />
      </pattern>

      {/* ── Plateau texture: sparse horizontal dashes ── */}
      <pattern id="pat-plateau" patternUnits="userSpaceOnUse" width="2" height="1.5">
        <rect width="2" height="1.5" fill={p.plateau} />
        <line x1="0.2" y1="0.5" x2="0.6" y2="0.5" stroke={p.plateauPeak} strokeWidth="0.06" opacity="0.3" />
        <line x1="1.2" y1="1.0" x2="1.7" y2="1.0" stroke={p.plateauPeak} strokeWidth="0.06" opacity="0.25" />
        <circle cx="0.9" cy="0.3" r="0.05" fill={p.plateauPeak} opacity="0.2" />
      </pattern>

      {/* ── Southeast hills texture ── */}
      <pattern id="pat-hills" patternUnits="userSpaceOnUse" width="1.5" height="1.5">
        <rect width="1.5" height="1.5" fill={p.seHills} />
        <circle cx="0.4" cy="0.5" r="0.12" fill={p.seHillPeak} opacity="0.3" />
        <circle cx="1.1" cy="1.0" r="0.1" fill={p.seHillPeak} opacity="0.25" />
        <path d="M 0.7,0.2 L 0.85,0 L 1.0,0.2" stroke={p.seHillPeak} strokeWidth="0.05" fill="none" opacity="0.3" />
      </pattern>

      {/* ── Arid zone transition ── */}
      <pattern id="pat-arid" patternUnits="userSpaceOnUse" width="1.5" height="1.5">
        <rect width="1.5" height="1.5" fill={p.aridZone} />
        <circle cx="0.4" cy="0.4" r="0.08" fill={p.desert} opacity="0.25" />
        <circle cx="1.1" cy="1.1" r="0.06" fill={p.desert} opacity="0.2" />
        <circle cx="0.9" cy="0.3" r="0.05" fill={p.land} opacity="0.2" />
      </pattern>

      {/* ── Lingnan (tropical south) pattern ── */}
      <pattern id="pat-lingnan" patternUnits="userSpaceOnUse" width="1.3" height="1.3">
        <rect width="1.3" height="1.3" fill={p.lingnan} />
        <circle cx="0.35" cy="0.35" r="0.12" fill={p.southLand} opacity="0.35" />
        <circle cx="1.0" cy="1.0" r="0.1" fill={p.southLand} opacity="0.3" />
        <circle cx="0.65" cy="0.65" r="0.07" fill={p.southLand} opacity="0.25" />
      </pattern>
    </defs>
  );
}
