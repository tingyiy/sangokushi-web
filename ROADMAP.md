# ROADMAP.md — Future Enhancements

---

## RTK IV Gap Analysis

We cover 5 of RTK IV's 7 command categories. Two entire systems are missing: **商人 (Merchant)** — a trading economy with seasonal price fluctuation, and **助言 (Advisor)** — interactive counsel where the player asks their advisor for strategic recommendations before acting. Additionally, RTK IV features **旅人 (Travelers)** — 8 wandering NPCs who teach skills and give treasures, **埋伏 (Plant Spy)** — a mole infiltration system where officers defect to spy and betray in battle, and **異民族 (Barbarian Invasions)** — four border tribes that raid cities. None of these exist in our codebase.

See [plans/rtk4-gap-analysis.md](plans/rtk4-gap-analysis.md) for the full comparison table, implementation plans, effort estimates, and phased rollout order.

---

## Internationalization (i18n) — ✅ Complete (Phases 1-5)

Full i18n support is implemented. The UI supports **Traditional Chinese (繁體中文)** and **English** with automatic browser language detection.

**What was done:**
- **Phase 1:** Installed `i18next` + `react-i18next`, created 5 locale namespaces (`ui`, `data`, `battle`, `logs`, `cli`)
- **Phase 2:** Decoupled 554 Chinese type literal strings across 24 files to English keys
- **Phase 3:** Replaced ~220 hardcoded Chinese strings across 22 components with `t()` calls
- **Phase 4:** Replaced 189 `addLog()`/`addBattleLog()` calls in stores with `i18next.t('logs:...')` calls
- **Phase 5:** Added browser language detection, `localizedName()` helper for officer/city/faction names, full English translations for all game data
- **Bug fixes:** Fixed Chinese leaks in battle map, events, AI logs, advisor suggestions, and SVG terrain labels
- **Regression tests:** 13 tests scanning source files for Chinese character leaks

**Remaining:** Phase 6 — CLI text (`src/cli/play.ts`, ~150 strings). CLI will default to English with `--lang zh-TW` override. Skeleton exists in `src/i18n/cli.ts` and empty `cli.json` locale files.

---

## Map Overhaul — ✅ Complete (Phases 1-4)

The strategic map has been fully rewritten from a single static SVG (`ChinaMap.tsx`, 730 lines) into an inline SVG component system under `src/components/map/` with seasonal terrain, pixel-art style, castle city markers, and dark-bordered dirt-track roads.

**What was done:**
- **Phase 1:** Terrain data — defined terrain polygons (mountains, rivers, plains, deserts, lakes), separated into sub-components (`GameMap.tsx`, `MapTerrain.tsx`, `MapCities.tsx`, `MapRoads.tsx`, `MapPatterns.tsx`, `mapData.ts`)
- **Phase 2:** Seasonal rendering — 4 seasonal palettes (spring/summer/autumn/winter), CSS transitions, winter snow overlays
- **Phase 3:** City & road redesign — castle icons with battlements, faction-colored flag banners with ruler surname, tooltip on hover, dark-bordered dirt-track roads
- **Phase 4:** Pixel-art style — SVG fill patterns, warm RTK IV palette, `image-rendering: pixelated`, pan/zoom with clamping, mouse sensitivity wired to settings, minimap integration

**Remaining:** Phase 5 — battle map hex grid should reflect strategic map's seasonal terrain colors. See [plans/map-overhaul.md](plans/map-overhaul.md) for the original plan.

---

## Battle System

### Multi-City Attack
RTK IV allows attacking from multiple cities simultaneously. Attackers from different cities spawn on different edges of the battle map based on their approach direction.

### Allied Reinforcements
Both attacker and defender can have allied factions join the battle. Allied units spawn separately and are AI-controlled even during the player phase.

### Spawn Point Selection
RTK IV lets both sides pick spawn positions from ~10 predefined locations before battle starts. Fewer options than total officers — adds a tactical layer to deployment.

### Per-City Battle Maps
Each of the 43 cities should have a unique battle map reflecting its geography and historical significance:
- 赤壁 — river-heavy, naval elements
- 街亭 — mountain passes
- 漢中 — valleys and ridges
- 虎牢關 — narrow pass with fortifications
- 長安 — large walled city
- etc.

### Tactic Target Selection
Allow player to choose which enemy unit to target with tactics via map click, instead of auto-targeting the nearest enemy.

### Enemy Phase Animation
Improve enemy turn visual feedback — camera follows active enemy unit, brief pause on attacks, damage numbers.

### Undo Move
Allow canceling a move before committing to an attack/tactic (RTK IV supports this).

---

## Strategic Layer

### Officer Relationships
Deepen the officer relationship system — sworn brothers, rivalries, mentor/student bonds affecting loyalty, recruitment, and duel outcomes.

### Historical Events
More scripted historical events tied to specific scenarios and years (e.g., 赤壁之戰 fire attack event, 三顧茅廬 recruitment event).

### City Specialization
Cities with unique bonuses based on geography (e.g., 洛陽 gives political bonuses, 荊州 gives agriculture bonuses).

---

## CLI Improvements

### New Player Onboarding
- `tutorial` command that walks through a first turn (develop, draft, attack, end)
- Suggested first moves printed after game start for new players
- Brief stat legend in the status output header (L=Leadership, W=War, etc.)

### Quality of Life
- `undo` command to reverse the last action within a turn
- `save` / `load` commands for interactive mode (currently exec-mode only)
- Tab completion for city/officer names (readline completer)
- Colored output with chalk (faction colors, damage in red, etc.)
- `map` command showing ASCII territory overview

---

## Technical

### Per-City Battle Maps (Data)
Define 43 battle map JSON files in `data/battlemaps/` — each with hand-crafted terrain grids, gate positions, and spawn point options. Maps should be reviewed for historical accuracy.

### AI Improvements
- Smarter battle AI (flanking, focus fire, retreat when losing)
- Strategic AI long-term planning (alliance timing, when to attack vs develop)
- Difficulty levels affecting AI decision quality

### StorageAdapter Interface
Unify browser `localStorage` and CLI filesystem-based saves behind a common `StorageAdapter` interface. Would allow tests to use an in-memory adapter. See AGENTS.md for details.
