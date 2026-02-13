# Map Overhaul — Detailed Implementation Plan

Replace the current single static SVG map with an authentic RTK IV-style map featuring seasonal variations, pixel-art terrain, and historical geography.

> **Status:** Phases 1-4 are **complete**. Phase 5 (battle map seasonal terrain) remains.

---

## Current State (Post-Overhaul)

The map has been refactored from a monolithic `ChinaMap.tsx` (730 lines) into modular sub-components under `src/components/map/`:

| File | Lines | Description |
|------|-------|-------------|
| `GameMap.tsx` | ~280 | Main container — pan/zoom/clamping, SVG viewBox, renders sub-components |
| `MapTerrain.tsx` | ~690 | Terrain polygons — mountains, rivers, plains, deserts, lakes, seasonal overlays |
| `MapCities.tsx` | ~260 | City markers — castle icons with battlements, faction flags, fog-of-war opacity |
| `MapRoads.tsx` | ~60 | Road network — dark-bordered dirt-track lines between adjacent cities |
| `MapPatterns.tsx` | ~170 | SVG fill patterns — grass, forest, tropical textures |
| `mapData.ts` | ~270 | Season system, 4 color palettes, road styles, label colors, `getWheelFactor()` |
| `BattleMap.tsx` | ~400 | Hex battle map — unit rendering, range visualization, gate display |
| `GameMinimap.tsx` | ~46 | Strategic minimap overlay |
| `SelectionMinimap.tsx` | ~55 | City selection minimap |

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

### Phase 1: Terrain Data — ✅ Complete
- Defined terrain polygons for mountain ranges, rivers, forests, plains, deserts, lakes
- Created seasonal color palettes in `mapData.ts`
- Split `ChinaMap.tsx` into sub-components (`GameMap`, `MapTerrain`, `MapCities`, `MapRoads`, `MapPatterns`)

### Phase 2: Seasonal Rendering — ✅ Complete
- Season detection from game month (spring/summer/autumn/winter)
- 4 seasonal palettes applied to all terrain fills
- Winter snow overlays on mountains and northern regions
- CSS transitions between seasons

### Phase 3: City & Road Redesign — ✅ Complete
- Castle icons with 3 battlements replacing circle markers
- Faction-colored flag banners with ruler surname
- Tooltip on hover showing city name and stats (fog-of-war aware)
- Dark-bordered dirt-track roads (two-layer SVG lines)

### Phase 4: Pixel-Art Style — ✅ Complete
- `image-rendering: pixelated` on SVG
- SVG fill patterns for grass, forest, tropical terrain
- Warm RTK IV color palette
- Pan/zoom with mouse wheel, drag, and zoom buttons
- Pan clamping to prevent edges from leaving viewport
- Mouse sensitivity wired to game settings
- Minimap integration

### Phase 5: Battle Map Integration — 🔲 Remaining
- Ensure battle maps (`BattleMap.tsx`) also reflect seasonal terrain colors
- Battle terrain tiles should match the strategic map's current season

---

## Effort Estimate

| Phase | Days | Status |
|-------|------|--------|
| Terrain data | 2-3 | ✅ Done |
| Seasonal rendering | 2-3 | ✅ Done |
| City & road redesign | 1-2 | ✅ Done |
| Pixel-art style | 2-3 | ✅ Done |
| Battle map integration | 1-2 | 🔲 Remaining |
| **Total** | **8-13 days** | **~85% complete** |

---

## Key Files (Final)

| File | Status |
|------|--------|
| `src/components/ChinaMap.tsx` | **Removed** — replaced by `map/` sub-components |
| `src/components/map/GameMap.tsx` | Main map container with pan/zoom/clamping |
| `src/components/map/MapTerrain.tsx` | Terrain rendering with seasonal palettes |
| `src/components/map/MapPatterns.tsx` | SVG terrain fill patterns |
| `src/components/map/MapCities.tsx` | City marker rendering (castle icons, flags) |
| `src/components/map/MapRoads.tsx` | Road network rendering (dark-bordered dirt tracks) |
| `src/components/map/mapData.ts` | Season palettes, road styles, label colors, wheel factor |
| `src/components/map/BattleMap.tsx` | Needs seasonal terrain color update (Phase 5) |

---

## Notes

- The map is a **browser-only** feature — CLI agents do not see it. This is purely for the browser experience.
- Art assets (pixel-art terrain tiles, castle icons) may need to be created or sourced. Consider using SVG patterns for a scalable pixel-art look.
- Performance: seasonal transitions should be CSS-driven (opacity/fill changes), not full re-renders.
