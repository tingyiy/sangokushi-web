# Map Overhaul — Detailed Implementation Plan

Replace the current single static SVG map with an authentic RTK IV-style map featuring seasonal variations, pixel-art terrain, and historical geography.

---

## Current State

- **File:** `src/components/ChinaMap.tsx` (730 lines)
- **Format:** Single static SVG with gradient fills, basic terrain patterns (mountains, rivers)
- **Cities:** Circular markers with text labels
- **Roads:** Simple SVG paths connecting cities
- **Seasons:** No seasonal variation
- **Style:** Flat/modern — does not match RTK IV's pixel-art aesthetic

---

## RTK IV Reference

The original RTK IV (1994) features one of the most beautiful maps in strategy gaming history. Reference screenshots are available at:
- [PTT: 三國志四大地圖一覽 (春夏秋冬)](https://www.ptt.cc/bbs/Koei/M.1577608357.A.75F.html)
- Direct links: [spring](https://reganlu007.github.io/san4/spring.jpg), [summer](https://reganlu007.github.io/san4/summer.jpg), [autumn](https://reganlu007.github.io/san4/autumn.jpg), [winter](https://reganlu007.github.io/san4/winter.jpg)

Key characteristics:
- **4 seasonal variants** — terrain colors change with seasons
- **Spring:** Green fields, cherry blossoms (pink) in certain areas
- **Summer:** Deep green vegetation, bright blue rivers
- **Autumn:** Orange/yellow foliage, harvest gold fields
- **Winter:** Snow-covered mountains, frozen rivers, grey-white palette
- **Pixel-art style** — hand-drawn look with visible pixels, warm palette
- **Detailed terrain** — distinct mountain ranges, rivers with width variation, forests, plains
- **City markers** — small castle icons, not circles
- **Road network** — visible paths between cities, following natural terrain

---

## Implementation Approach

### Option A: SVG Layer System (Recommended)

Keep SVG but redesign with seasonal layer switching:

```
src/components/map/
  ChinaMap.tsx          # Main component, season logic
  MapTerrain.tsx        # Base terrain (mountains, rivers, plains)
  MapSeasons.tsx        # Seasonal overlay (snow, foliage, blossoms)
  MapCities.tsx         # City markers and labels
  MapRoads.tsx          # Road network between cities
  mapData.ts            # Terrain polygon data, seasonal palettes
```

**Seasonal palettes:**
```typescript
const SEASON_PALETTES = {
  spring: { land: '#5a8c3c', mountain: '#4a7a2f', river: '#3a7abf', snow: null },
  summer: { land: '#3d7a1f', mountain: '#2d6a12', river: '#2a6aaf', snow: null },
  autumn: { land: '#8a7a2c', mountain: '#6a5a1f', river: '#3a7abf', snow: null },
  winter: { land: '#7a8a8c', mountain: '#9aaa9c', river: '#5a8aaf', snow: '#ddeeff' },
};
```

**Season determination:** Month 1-3 = spring, 4-6 = summer, 7-9 = autumn, 10-12 = winter. Map re-renders on month change.

### Option B: Canvas/WebGL Rendering

Replace SVG entirely with canvas-based pixel rendering for authentic pixel-art feel. Higher fidelity but much larger effort and different rendering pipeline.

### Option C: Pre-rendered Image Maps

Use 4 pre-rendered background images (one per season) with SVG overlays for interactive elements (city markers, unit positions). Simplest approach but least flexible.

**Recommendation:** Option A for the base implementation, with Option C as a quick-win intermediate step if we can source or create good seasonal background images.

---

## Implementation Phases

### Phase 1: Terrain Data (2-3 days)
- Define terrain polygons for mountain ranges, rivers, forests, plains
- Create terrain type grid matching China's geography (approximate)
- Define seasonal color palettes
- Separate `ChinaMap.tsx` into sub-components

### Phase 2: Seasonal Rendering (2-3 days)
- Implement season detection from game month
- Apply seasonal palette to terrain fills
- Winter: add snow overlays on mountains and northern regions
- Spring: add blossom effects near certain cities
- Autumn: shift vegetation to warm tones
- Transition animation between seasons (CSS transition on fill colors)

### Phase 3: City & Road Redesign (1-2 days)
- Replace circle markers with castle/fort icons (SVG sprites)
- Redesign road paths to follow terrain (curves around mountains, bridges over rivers)
- Add faction-colored flags on controlled cities
- Tooltip on hover showing city name and basic stats

### Phase 4: Pixel-Art Style (2-3 days)
- Apply pixel-art rendering style (CSS `image-rendering: pixelated` on canvas elements)
- Create pixel-art terrain patterns (repeating SVG patterns for grass, forest, water)
- Match RTK IV's warm color palette
- Optional: add subtle animation (flowing rivers, waving flags)

### Phase 5: Battle Map Integration (1-2 days)
- Ensure battle maps (`BattleMap.tsx`) also reflect seasonal terrain colors
- Battle terrain tiles should match the strategic map's current season

---

## Effort Estimate

| Phase | Days |
|-------|------|
| Terrain data | 2-3 |
| Seasonal rendering | 2-3 |
| City & road redesign | 1-2 |
| Pixel-art style | 2-3 |
| Battle map integration | 1-2 |
| **Total** | **8-13 days** |

---

## Key Files

| File | Change |
|------|--------|
| `src/components/ChinaMap.tsx` | Major refactor — split into sub-components, add season logic |
| `src/components/map/MapTerrain.tsx` | **New** — terrain rendering with seasonal palettes |
| `src/components/map/MapSeasons.tsx` | **New** — seasonal overlay effects |
| `src/components/map/MapCities.tsx` | **New** — city marker rendering (castle icons) |
| `src/components/map/MapRoads.tsx` | **New** — road network rendering |
| `src/components/map/mapData.ts` | **New** — terrain polygons, palettes, seasonal data |
| `src/components/map/BattleMap.tsx` | Update terrain tile colors to match season |

---

## Notes

- The map is a **browser-only** feature — CLI agents do not see it. This is purely for the browser experience.
- Art assets (pixel-art terrain tiles, castle icons) may need to be created or sourced. Consider using SVG patterns for a scalable pixel-art look.
- Performance: seasonal transitions should be CSS-driven (opacity/fill changes), not full re-renders.
