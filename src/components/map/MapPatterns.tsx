import type { TerrainPalette } from './mapData';

interface MapPatternsProps {
  palette: TerrainPalette;
}

/**
 * MapPatterns: SVG <defs> block containing repeating terrain texture patterns.
 *
 * These patterns give the flat-fill terrain a visible pixel-art texture
 * reminiscent of RTK IV's hand-drawn map. Pattern tiles are sized 4-8 SVG
 * units (in a 100x85 viewBox) so the texture is clearly visible at normal
 * zoom. Higher contrast and larger elements ensure they don't disappear.
 */
export function MapPatterns({ palette: p }: MapPatternsProps) {
  return (
    <defs>
      {/* ── Grass pattern: scattered darker tufts on plains ── */}
      <pattern id="pat-grass" patternUnits="userSpaceOnUse" width="5" height="5">
        <rect width="5" height="5" fill={p.plains} />
        {/* Tuft clusters */}
        <circle cx="1" cy="1" r="0.5" fill={p.land} opacity="0.35" />
        <circle cx="3.5" cy="2" r="0.4" fill={p.land} opacity="0.3" />
        <circle cx="2" cy="3.8" r="0.45" fill={p.land} opacity="0.3" />
        <circle cx="4.5" cy="4.2" r="0.35" fill={p.land} opacity="0.25" />
        <circle cx="0.8" cy="3" r="0.3" fill={p.plains2} opacity="0.3" />
        {/* Small grass blade strokes */}
        <line x1="2.5" y1="0.8" x2="2.7" y2="0.3" stroke={p.land} strokeWidth="0.12" opacity="0.3" />
        <line x1="4" y1="3.5" x2="4.2" y2="3" stroke={p.land} strokeWidth="0.12" opacity="0.25" />
      </pattern>

      {/* ── Alternate grass (slightly different distribution) ── */}
      <pattern id="pat-grass2" patternUnits="userSpaceOnUse" width="4.5" height="4.5">
        <rect width="4.5" height="4.5" fill={p.plains2} />
        <circle cx="1.2" cy="1.2" r="0.45" fill={p.plains} opacity="0.4" />
        <circle cx="3.3" cy="1" r="0.35" fill={p.land} opacity="0.3" />
        <circle cx="0.8" cy="3.5" r="0.4" fill={p.land} opacity="0.3" />
        <circle cx="3.5" cy="3.5" r="0.45" fill={p.plains} opacity="0.35" />
        <circle cx="2.2" cy="2.2" r="0.3" fill={p.land} opacity="0.25" />
        <line x1="1.5" y1="2.8" x2="1.7" y2="2.3" stroke={p.land} strokeWidth="0.1" opacity="0.25" />
      </pattern>

      {/* ── Forest pattern: darker canopy dots ── */}
      <pattern id="pat-forest" patternUnits="userSpaceOnUse" width="5" height="5">
        <rect width="5" height="5" fill={p.southLand} />
        <circle cx="1.2" cy="1.2" r="0.7" fill={p.lingnan} opacity="0.45" />
        <circle cx="3.8" cy="1" r="0.55" fill={p.lingnan} opacity="0.4" />
        <circle cx="1" cy="3.8" r="0.55" fill={p.land} opacity="0.35" />
        <circle cx="3.5" cy="3.5" r="0.7" fill={p.lingnan} opacity="0.4" />
        <circle cx="2.5" cy="2.5" r="0.5" fill={p.lingnan} opacity="0.35" />
        {/* Canopy highlights */}
        <circle cx="1.5" cy="0.5" r="0.3" fill={p.southLand} opacity="0.5" />
        <circle cx="4.2" cy="2.5" r="0.35" fill={p.southLand} opacity="0.45" />
      </pattern>

      {/* ── Sand / desert pattern: wavy dune ridges ── */}
      <pattern id="pat-sand" patternUnits="userSpaceOnUse" width="8" height="4">
        <rect width="8" height="4" fill={p.desert} />
        <path
          d="M 0,1.2 Q 2,0.5 4,1.2 Q 6,1.9 8,1.2"
          stroke={p.desertDetail}
          strokeWidth="0.2"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M 0,3 Q 2,2.3 4,3 Q 6,3.7 8,3"
          stroke={p.desertDetail}
          strokeWidth="0.15"
          fill="none"
          opacity="0.3"
        />
        {/* Sand grain dots */}
        <circle cx="2" cy="0.5" r="0.15" fill={p.desertDetail} opacity="0.2" />
        <circle cx="6" cy="2" r="0.12" fill={p.desertDetail} opacity="0.2" />
      </pattern>

      {/* ── Mountain texture: crosshatch with rocky dots ── */}
      <pattern id="pat-mountain" patternUnits="userSpaceOnUse" width="5" height="5">
        <rect width="5" height="5" fill={p.mountain} />
        {/* Crosshatch lines */}
        <line x1="0" y1="0" x2="5" y2="5" stroke={p.mountainStroke} strokeWidth="0.2" opacity="0.35" />
        <line x1="2.5" y1="0" x2="5" y2="2.5" stroke={p.mountainStroke} strokeWidth="0.15" opacity="0.25" />
        <line x1="0" y1="2.5" x2="2.5" y2="5" stroke={p.mountainStroke} strokeWidth="0.15" opacity="0.25" />
        {/* Reverse crosshatch (lighter) */}
        <line x1="5" y1="0" x2="0" y2="5" stroke={p.mountainStroke} strokeWidth="0.1" opacity="0.15" />
        {/* Rocky highlights */}
        <circle cx="1.5" cy="3.5" r="0.3" fill={p.mountainPeak} opacity="0.3" />
        <circle cx="4" cy="1.5" r="0.25" fill={p.mountainPeak} opacity="0.25" />
      </pattern>

      {/* ── Water / ocean ripple pattern ── */}
      <pattern id="pat-water" patternUnits="userSpaceOnUse" width="8" height="4">
        <rect width="8" height="4" fill={p.ocean1} />
        <path
          d="M 0,1.3 Q 2,0.7 4,1.3 Q 6,1.9 8,1.3"
          stroke={p.waveColor}
          strokeWidth="0.15"
          fill="none"
          opacity="0.3"
        />
        <path
          d="M 0,3 Q 2,2.4 4,3 Q 6,3.6 8,3"
          stroke={p.waveColor}
          strokeWidth="0.12"
          fill="none"
          opacity="0.25"
        />
      </pattern>

      {/* ── Snow pattern (winter overlay) ── */}
      <pattern id="pat-snow" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="none" />
        <circle cx="1.5" cy="1.5" r="0.4" fill="white" opacity="0.35" />
        <circle cx="4.5" cy="4.5" r="0.35" fill="white" opacity="0.3" />
        <circle cx="4.5" cy="1" r="0.3" fill="white" opacity="0.25" />
        <circle cx="1" cy="4.5" r="0.3" fill="white" opacity="0.25" />
        <circle cx="3" cy="3" r="0.25" fill="white" opacity="0.2" />
      </pattern>

      {/* ── Lake shimmer pattern ── */}
      <pattern id="pat-lake" patternUnits="userSpaceOnUse" width="4" height="2">
        <rect width="4" height="2" fill={p.lake} />
        <path
          d="M 0,1 Q 1,0.6 2,1 Q 3,1.4 4,1"
          stroke={p.lakeHighlight}
          strokeWidth="0.15"
          fill="none"
          opacity="0.4"
        />
      </pattern>

      {/* ── Plateau texture: sparse dashes and dots ── */}
      <pattern id="pat-plateau" patternUnits="userSpaceOnUse" width="6" height="5">
        <rect width="6" height="5" fill={p.plateau} />
        <line x1="0.5" y1="1.5" x2="2" y2="1.5" stroke={p.plateauPeak} strokeWidth="0.15" opacity="0.3" />
        <line x1="3.5" y1="3.5" x2="5.5" y2="3.5" stroke={p.plateauPeak} strokeWidth="0.15" opacity="0.25" />
        <circle cx="3" cy="1" r="0.2" fill={p.plateauPeak} opacity="0.25" />
        <circle cx="1" cy="4" r="0.15" fill={p.plateauPeak} opacity="0.2" />
      </pattern>

      {/* ── Southeast hills texture ── */}
      <pattern id="pat-hills" patternUnits="userSpaceOnUse" width="5" height="5">
        <rect width="5" height="5" fill={p.seHills} />
        <circle cx="1.2" cy="1.5" r="0.5" fill={p.seHillPeak} opacity="0.3" />
        <circle cx="3.8" cy="3.5" r="0.4" fill={p.seHillPeak} opacity="0.25" />
        {/* Small hill peaks */}
        <path d="M 2.5,0.8 L 3,0 L 3.5,0.8" stroke={p.seHillPeak} strokeWidth="0.12" fill="none" opacity="0.3" />
        <path d="M 0.5,3.5 L 1,2.8 L 1.5,3.5" stroke={p.seHillPeak} strokeWidth="0.1" fill="none" opacity="0.25" />
      </pattern>

      {/* ── Arid zone transition ── */}
      <pattern id="pat-arid" patternUnits="userSpaceOnUse" width="5" height="5">
        <rect width="5" height="5" fill={p.aridZone} />
        <circle cx="1.2" cy="1.2" r="0.35" fill={p.desert} opacity="0.3" />
        <circle cx="3.8" cy="3.8" r="0.3" fill={p.desert} opacity="0.25" />
        <circle cx="3" cy="1" r="0.2" fill={p.land} opacity="0.2" />
        <circle cx="1" cy="3.5" r="0.25" fill={p.land} opacity="0.2" />
      </pattern>

      {/* ── Lingnan (tropical south) pattern ── */}
      <pattern id="pat-lingnan" patternUnits="userSpaceOnUse" width="4.5" height="4.5">
        <rect width="4.5" height="4.5" fill={p.lingnan} />
        <circle cx="1.2" cy="1.2" r="0.5" fill={p.southLand} opacity="0.35" />
        <circle cx="3.5" cy="3.5" r="0.45" fill={p.southLand} opacity="0.3" />
        <circle cx="2.2" cy="2.2" r="0.35" fill={p.southLand} opacity="0.25" />
        <circle cx="3.5" cy="0.8" r="0.3" fill={p.southLand} opacity="0.2" />
      </pattern>
    </defs>
  );
}
