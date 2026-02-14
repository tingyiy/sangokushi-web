# AGENTS.md

**Guidelines for agentic coding assistants working in this repository.**

This is a browser-based Romance of the Three Kingdoms (三國志) strategy game inspired by RTK IV, built with React + TypeScript + Vite. UI supports Traditional Chinese (繁體中文) and English via i18next.

---

## Build, Lint, and Test Commands

### Development & Build
```bash
npm run dev       # Start Vite dev server with HMR at http://localhost:5173
npm run build     # TypeScript check + production build (tsc -b && vite build)
npm run preview   # Preview production build locally
npm run lint      # Run ESLint across the entire project
```

### Testing
```bash
npm test          # Run all tests once with Vitest
npm run coverage  # Generate test coverage report

# Run a single test file
npx vitest run src/utils/pathfinding.test.ts

# Run tests in watch mode
npx vitest

# Run tests matching a pattern
npx vitest run --reporter=verbose src/utils/

# Run a specific test by name
npx vitest run -t "findPath finds simple path"
```

**Test Setup:**
- Test framework: Vitest with jsdom environment
- Test files: `*.test.ts` or `*.test.tsx` (co-located with source)
- Setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom`)
- Coverage: Configured for `src/utils/**` and `src/store/battleStore.ts`

---

## Code Style Guidelines

### Imports

**CRITICAL:** Use `import type` for type-only imports due to `verbatimModuleSyntax: true` in `tsconfig.app.json`:

```typescript
// ✅ CORRECT
import type { Officer, City, Faction } from '../types';
import { useGameStore } from '../store/gameStore';

// ❌ WRONG - will cause compilation errors
import { Officer, City, Faction } from '../types';
```

**Import Order:**
1. React imports
2. Third-party libraries (zustand, etc.)
3. Type imports (`import type`)
4. Local module imports
5. Relative imports (`./ ../`)

### TypeScript

**Strict Mode Enabled:**
- All compiler strict checks are ON
- `noUnusedLocals: true` - no unused variables
- `noUnusedParameters: true` - no unused function parameters
- `noFallthroughCasesInSwitch: true` - explicit breaks required
- `noUncheckedSideEffectImports: true` - side effects must be explicit

**Type Annotations:**
```typescript
// ✅ Explicit interface definitions
interface DuelState {
  p1: Officer;
  p2: Officer;
  p1Hp: number;
  result: 'win' | 'lose' | 'draw' | 'flee' | null;
}

// ✅ Use Omit/Pick for derived types
type BaseOfficer = Omit<Officer, 'factionId' | 'cityId' | 'stamina' | 'loyalty' | 'isGovernor'>;

// ✅ Explicit return types for complex functions
function makeCity(id: number, factionId: number | null, overrides: Partial<City>): City {
  // ...
}
```

**Avoid `any`:** Use specific types or `unknown` if type is truly unknown.

### Naming Conventions

- **Files:** PascalCase for components (`GameScreen.tsx`), camelCase for utilities (`pathfinding.ts`)
- **Components:** PascalCase, use named exports (`export function GameScreen() {}`)
- **Functions:** camelCase (`developCommerce`, `findPath`)
- **Constants:** camelCase or SCREAMING_SNAKE_CASE for true constants
- **Types/Interfaces:** PascalCase (`Officer`, `GameState`, `CommandCategory`)
- **Store Actions:** Descriptive verbs (`setPhase`, `selectCity`, `developCommerce`)

### Formatting

- **Indentation:** 2 spaces (enforced by ESLint)
- **Quotes:** Single quotes for strings
- **Semicolons:** Required (add them consistently)
- **Line Length:** Aim for 100-120 characters (not enforced)
- **Trailing Commas:** Use in multiline objects/arrays
- **Object Spacing:** `{ key: value }` with spaces inside braces

### State Management

**Zustand Store Pattern:**
```typescript
export const useGameStore = create<GameState>((set, get) => ({
  // State
  phase: 'title',
  cities: [],
  
  // Actions that mutate state
  setPhase: (phase) => set({ phase }),
  
  // Complex actions access get()
  developCommerce: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    // ... mutate copy and set()
  },
}));
```

**Key Principles:**
- Main store split into domain slices under `src/store/` (see Key Files below)
- Battle store in `src/store/battleStore.ts` (~850 lines) for tactical combat
- All game logic lives as store actions
- Components consume via `useGameStore()` / `useBattleStore()` hooks
- Scenario data is deeply copied at game start, then mutated in-place

### Component Structure

**Functional Components Only:**
```typescript
export function GameScreen() {
  const { phase, cities, selectCity } = useGameStore();
  
  return (
    <div className="game-screen">
      {/* JSX */}
    </div>
  );
}
```

**Component Organization:**
- `src/components/` - UI components
- `src/components/map/` - Map-related components
- `src/components/menu/` - Menu components
- One component per file, named export matching filename

### Error Handling

- **Validation:** Check for nulls/undefined before access
- **Console:** Avoid `console.log` in production code (commented out fire attack example exists)
- **Errors:** Throw meaningful errors for impossible states
- **Fallbacks:** Provide sensible defaults (see `makeCity`, `makeOfficer` helpers)

### Comments & Documentation

**JSDoc for Public APIs:**
```typescript
/**
 * Helper: create a full City from base + scenario overrides
 */
function makeCity(id: number, factionId: number | null): City {
```

**Inline Comments:**
- Use Traditional Chinese for historical/game-specific terms
- Use English for technical explanations
- Keep comments concise and meaningful

**Example:**
```typescript
/** 統率 (Leadership) */
leadership: number;
/** 所屬勢力 id，null = 在野 (unaffiliated) */
factionId: number | null;
```

---

## Architecture Notes

### Data Layer
- **Base Data:** `data/*.json` → imported by `src/data/*.ts`
- **Scenarios:** `src/data/scenarios.ts` uses `makeCity()` / `makeOfficer()` helpers
- **Types:** All defined in `src/types/index.ts` and `src/types/battle.ts`

### Game Phases
Phase determines which screen renders:
- `title` → `TitleScreen`
- `scenario` / `faction` → `ScenarioSelect`
- `playing` → `GameScreen`
- `duel` → `DuelScreen`
- `battle` → `BattleScreen`

### Command Categories
English keys: `'domestic' | 'military' | 'personnel' | 'diplomacy' | 'strategy' | 'end'`
Display names resolved via `t('data:category.domestic')` → "內政" (zh-TW) / "Domestic" (en)

### Key Files
- `src/store/gameStore.ts` - Core state, phase, setup, UI, visibility queries (~580 lines)
- `src/store/domesticActions.ts` - Tax, commerce, agriculture, defense, tech, train (~350 lines)
- `src/store/personnelActions.ts` - Recruit, search, POW, reward, dismiss (~370 lines)
- `src/store/militaryActions.ts` - Formation, duel, battle start, AI battle, retreat (~690 lines)
- `src/store/diplomacyActions.ts` - Relations, alliance, joint attack, ceasefire (~330 lines)
- `src/store/strategyActions.ts` - Rumor, spy, rebellion, arson, counter-espionage (~320 lines)
- `src/store/turnActions.ts` - endTurn, AI decisions, AI variants (~470 lines)
- `src/store/saveLoadActions.ts` - Save, load, slots, delete (~115 lines)
- `src/store/storeHelpers.ts` - Shared helpers (autoAssignGovernor, getAttackDirection)
- `src/store/battleStore.ts` - Tactical battle state, mode system, enemy AI (~850 lines)
- `src/types/index.ts` - All type definitions
- `src/types/battle.ts` - Battle-specific types (`BattleUnit`, `BattleMode`, `BattleState`)
- `src/components/GameScreen.tsx` - Main gameplay UI
- `src/components/BattleScreen.tsx` - Tactical battle UI with battle log and mode indicators
- `src/components/map/GameMap.tsx` - Main strategic map with pan/zoom/clamping (~280 lines)
- `src/components/map/MapTerrain.tsx` - Terrain polygons, rivers, mountains, seasonal overlays (~690 lines)
- `src/components/map/MapCities.tsx` - City markers, flags, labels, fog-of-war opacity (~260 lines)
- `src/components/map/MapRoads.tsx` - Road network with dark border styling (~60 lines)
- `src/components/map/MapPatterns.tsx` - SVG terrain fill patterns (~170 lines)
- `src/components/map/mapData.ts` - Season system, color palettes, `getWheelFactor()` (~270 lines)
- `src/components/map/BattleMap.tsx` - Hex battle map with range visualization (~400 lines)
- `src/data/cities.ts` - City coordinates, adjacency data (43 cities)
- `src/data/scenarios.ts` - Scenario definitions (6 scenarios)
- `src/cli/play.ts` - CLI runner (drives game from terminal, no browser needed)
- `src/debug/rtk-api.ts` - Browser automation API (`window.rtk`) (~1160 lines)
- `src/i18n/index.ts` - i18next config, browser language detection
- `src/i18n/dataNames.ts` - `localizedName()` helper for officer/city/faction name translation
- `src/i18n/cli.ts` - CLI-specific i18n init (Node.js, no browser detector)
- `src/i18n/locales/{zh-TW,en}/` - Translation files (ui.json, data.json, battle.json, logs.json, cli.json)
- `src/store/i18n-logs.test.ts` - Regression tests ensuring no Chinese leaks into English UI

### Internationalization (i18n)

**Stack:** `react-i18next` + `i18next` + `i18next-browser-languagedetector`. Default locale: `zh-TW`.

**Language Detection:** Browser language is auto-detected on first visit. Detection order: `localStorage` → `navigator` → fallback (`zh-TW`). Supported languages: `zh-TW`, `en`. User can override via the language switcher in `GameSettingsScreen.tsx`.

**Type literals use English keys** (decoupled from display text):
- `RTK4Skill`: `'firePlot' | 'confusion' | 'diplomacy' | ...` (25 skills)
- `OfficerRank`: `'governor' | 'general' | 'advisor' | ...` (6 ranks)
- `CommandCategory`: `'domestic' | 'military' | ...` (6 categories)

**Namespaces (5):**
- `ui` (default): General UI strings — titles, labels, commands, settings
- `data`: Display names for skills, ranks, categories, weapons, officer/city/faction names
- `battle`: Battle-specific strings — weather, terrain, status, duel, tactics
- `logs`: Store log messages, AI descriptions, event messages, advisor suggestions
- `cli`: CLI-specific strings (Phase 6 — not yet populated)

**Locale files:** `src/i18n/locales/{zh-TW,en}/{ui,data,battle,logs,cli}.json`

**Usage in components:**
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// Default namespace (ui)
t('common.cancel')           // → "取消" / "Cancel"
// Cross-namespace
t('data:skill.firePlot')     // → "火計" / "Fire Plot"
t('battle:weather.sunny')    // → "晴" / "Clear"
// Interpolation
t('header.dateLabel', { year: 189, month: 1 }) // → "189年 1月" / "1 / 189"
```

**Usage in stores/utilities (outside React):**
```typescript
import i18next from 'i18next';
i18next.t('logs:battle.attack', { attacker: name, defender: target })
i18next.t('battle:unitType.infantry') // → "步" / "Inf"
```

**Officer/City/Faction name localization:**
```typescript
import { localizedName } from '../i18n/dataNames';
localizedName('曹操')    // → "Cao Cao" (en) / "曹操" (zh-TW)
localizedName('鄴')      // → "Ye" (en) / "鄴" (zh-TW)
```
The `localizedName()` helper in `src/i18n/dataNames.ts` looks up English translations from the `data` namespace. Use it for ALL officer, city, and faction names displayed in UI or logs.

**Language switcher:** In `GameSettingsScreen.tsx` — toggle between 繁體中文 and English.

**i18n Conventions (IMPORTANT for new code):**
- All new UI strings MUST use `t()` calls, never hardcoded Chinese
- All new log messages MUST use `i18next.t('logs:...')`, never inline Chinese
- All officer/city/faction names MUST use `localizedName()` for display
- Add keys to BOTH `zh-TW` and `en` locale files when adding new strings
- Test setup (`src/test/setup.ts`) forces `zh-TW` so existing tests expecting Chinese continue to pass
- Regression tests in `src/store/i18n-logs.test.ts` scan source files for Chinese leaks — run `npm test` to catch violations

### Headless / CLI

The Zustand stores work natively in Node.js — no browser or React required. `useGameStore.getState()` and `useBattleStore.getState()` are plain JS calls.

```bash
# Interactive campaign (readline-based, all commands available)
npm run cli -- --scenario 0 --faction 袁紹

# Auto-play a single battle
npm run cli -- --scenario 0 --faction 袁紹 --attack 平原

# Exec mode (non-interactive, for scripts/agents):
# Initialize a new game and save state:
npx tsx src/cli/play.ts --scenario 0 --faction 袁紹 --savefile /tmp/g.json --exec "status"
# Load saved state and run commands (semicolon-delimited):
npx tsx src/cli/play.ts --savefile /tmp/g.json --exec "draft 鄴 2000; end; status"
```

The CLI (`src/cli/play.ts`, ~1520 lines):
- **Interactive mode:** Full readline-based campaign with all command categories
- **Exec mode (`--exec`):** Non-interactive, loads/saves state via `--savefile` JSON, runs semicolon-delimited commands
- **Single-battle mode (`--attack`):** Auto-plays one battle and exits
- **All commands implemented:** domestic, military, personnel, diplomacy, strategy, query, turn end
- Battle AI for auto-play (same logic as `runEnemyTurn`)
- Handles siege maps (gate attacks, breach, then combat)
- Calls `resolveBattle` after battle ends (capture, flee, city transfer, ruler succession)

**Browser-only dependency:** `localStorage` in save/load functions in `src/store/saveLoadActions.ts`. The CLI uses its own filesystem-based `saveState`/`loadState` instead. These are not yet unified behind a common interface (low priority).

---

## Game Mechanics

**Design Philosophy:** Faithfully replicate RTK IV (三國志IV) mechanics. When implementing new features, reference the original game's systems.

**Verified Rules:** See `docs/rtk4-rules.md` for rules verified against the original game with sources and enforcement tests. Always add new verified rules there.

**Core Systems:**
- **Officers:** Have one action per turn (`acted` flag, reset on turn end) and loyalty
- **Cities:** Track population, gold, food, commerce, agriculture, defense, troops
- **Factions:** Relations use hostility scale (0-100); alliances tracked separately
- **Turn-Based:** Player commands execute immediately; AI factions act on turn end

### Ruler-Governor Rule (R-001)

**RTK IV rule: the ruler (君主) IS the governor (太守) of their city.** When the ruler is present in a city, they hold the governor role directly. No other officer can be appointed governor in that city. When the ruler transfers, they become governor at the destination and the old city gets a new governor via auto-assignment. Enforced by `src/store/rulerGovernor.test.ts`.

### Battle Mechanics (RTK IV Rules)

**Battle End Conditions:**
1. All units of one side eliminated/routed → that side loses
2. **Commander (主將) defeated → that side loses immediately** (commander = first unit in faction's array). Remaining units get -30 morale but battle ends right away.
3. Day limit exceeded (default 30) → attacker loses (defender wins)
4. Player retreat → player's side loses

**全軍覆沒 (Unit Wiped Out):**
- When a unit's troops reach 0, the officer's army is destroyed. The officer themselves is NOT dead — they can be captured or escape.
- Capture chance is rolled: `30 + (attacker.war - target.war) + (attacker.charisma / 2)`. Success → officer added to `capturedOfficerIds`.

**Post-Battle Officer Fate (resolveBattle):**
1. Officers captured during battle (`capturedOfficerIds`) → imprisoned (`factionId: -1, cityId: -1`)
2. Non-captured officers whose unit was destroyed or routed → **flee** (see below)
3. Officers in city but didn't fight → 30% escape (flee), 70% captured

**Flee Destination Priority (all fleeing officers go to the SAME city):**
1. Adjacent friendly city (same faction, not the battle city)
2. Adjacent unoccupied city → **city is claimed by the losing faction** (`factionId` set to loser)
3. No adjacent option → **100% captured** (nowhere to flee)

**Key rule:** RTK IV only allows flee to directly connected (adjacent) cities — no teleporting across the map. When fleeing officers claim an unoccupied city, the losing faction survives and that city becomes theirs. Officers keep their faction affiliation. The faction is only destroyed when it has zero cities AND all officers are captured.

**Post-Battle Capture Processing:**
- Player can recruit captured officers via `recruitPOW` (store action) / `recruitpow <name>` (CLI)
- Officers may refuse recruitment based on loyalty and charisma comparison
- Rulers cannot be executed, only imprisoned or released
- Released officers return to their original ruler if their faction still exists, otherwise become 在野 (unaffiliated) in the city where they were released
- **Not yet implemented in browser UI:** post-battle dialog presenting 登用/幽閉/釋放 choices

---

## Testing Guidelines

- Co-locate tests with source files (`pathfinding.ts` → `pathfinding.test.ts`)
- Use descriptive test names: `test('findPath respects blocked hexes', () => {})`
- Use `@testing-library/react` for component tests
- Mock store state when needed
- Aim for coverage on utility functions and store logic
- Current test suite: 461 tests across 34 test files
- Battle store tests: `src/store/battleStore.test.ts`, `src/store/battleStore.fixes.test.ts`
- Game store command tests: `src/store/gameStore.commands.test.ts`
- Ruler-governor rule tests: `src/store/rulerGovernor.test.ts` (9 tests enforcing R-001)
- Fog-of-war tests: `src/store/fogOfWar.test.ts` (23 tests covering isCityRevealed, getCityView, getOfficerView, getNeighborSummary, getFactionSummaries)
- i18n regression tests: `src/store/i18n-logs.test.ts` (13 tests scanning for Chinese leaks)
- City data coherence tests: `src/data/cities.test.ts` (21 tests covering adjacency, connectivity, coordinate bounds)
- Officer data coherence tests: `src/data/officers.test.ts` (3 tests ensuring every skill is assigned, no invalid skills, no duplicates)

---

## Common Patterns

### Type Guards
```typescript
if (city.factionId === null) {
  // Empty city logic
}
```

### Array Helpers
```typescript
const city = cities.find(c => c.id === cityId);
const officers = officers.filter(o => o.factionId === factionId);
```

### Immutable Updates (via Zustand)
```typescript
set({
  cities: state.cities.map(c => 
    c.id === cityId ? { ...c, gold: c.gold + 1000 } : c
  ),
});
```

---

## Architecture Layers & Responsibilities

The codebase has three distinct layers. Each layer has a single responsibility. **Never duplicate access-control or game-rule logic across layers.**

```
┌──────────────────────────────────────────────────┐
│  Presentation Layer (React components, CLI)       │
│  • Renders data returned by the Store layer       │
│  • NEVER reads raw state to decide what to show   │
│  • Calls store query functions for filtered views  │
└────────────────────┬─────────────────────────────┘
                     │ calls query functions
┌────────────────────▼─────────────────────────────┐
│  Store Layer (Zustand: gameStore, battleStore)     │
│  • Single source of truth for ALL game state       │
│  • Exposes query functions (fog-of-war, victory)   │
│  • Exposes action functions (mutate state)          │
│  • ALL access-control logic lives HERE              │
└────────────────────┬─────────────────────────────┘
                     │ imports types & scenario data
┌────────────────────▼─────────────────────────────┐
│  Data Layer (types, scenarios, base JSON)          │
│  • Type definitions (Officer, City, Faction, etc.) │
│  • Scenario templates and base data                │
│  • Pure data — no game logic, no visibility rules  │
└──────────────────────────────────────────────────┘
```

### Layer Rules

| Rule | Description |
|------|-------------|
| **Access control in Store only** | Fog-of-war, visibility checks, permission checks — all live as store query functions. Components and CLI call these functions; they never re-implement the logic. |
| **Presentation is dumb** | Components and CLI format/display whatever the store returns. If the store says "hidden", the presentation layer shows `????` or omits the field. It does NOT decide what to hide. |
| **No raw state in presentation** | Components should NOT read `state.officers` and filter by faction to decide visibility. Instead, call a store query function that returns the correct view. |
| **Single fix, all consumers benefit** | When a visibility bug is found, fix it ONCE in the store. All consumers (browser UI, CLI, debug API, tests) automatically get the fix. |

### Fog of War / Visibility System (RTK IV Rules)

Information visibility follows RTK IV's intelligence system. The store layer exposes query functions that enforce these rules:

**City visibility — `isCityRevealed(cityId): boolean`**
- Own cities: always revealed
- Spied cities: revealed with TTL (stored in `revealedCities`)
- Spectator mode (no player faction): all revealed
- Everything else (adjacent, empty, enemy): **NOT revealed**

**What each visibility level shows:**

| Data | Own City | Revealed Enemy City | Unrevealed City |
|------|----------|-------------------|-----------------|
| City name & faction | Yes | Yes | Yes (map is public) |
| Population, troops, gold, food | Yes | Yes | Hidden (`????`) |
| Commerce, agriculture, defense, etc. | Yes | Yes | Hidden |
| Weapons (crossbows, horses, etc.) | Yes | No (military secret) | Hidden |
| Affiliated officers + base stats | Yes | Yes (no stamina/loyalty) | Hidden |
| Unaffiliated officers, POWs | Yes | No (internal info) | Hidden |
| Officer stamina & loyalty | Yes | No (internal info) | Hidden |

**Officer visibility — `getOfficerView(officerId)`**
- Base stats (L/W/I/P/C), skills, age, relationships: always visible (encyclopedia / public knowledge)
- Current city location, rank: visible only if officer is own OR in a revealed city
- Stamina, loyalty: visible only if officer is own

**Faction overview visibility — `world` / `factions` commands**
- Faction names, city ownership: always visible (political map is public)
- Troop totals, officer counts: only aggregated from own + revealed cities
- Hostility/alliance: always visible (diplomatic relations are known)

**Neighbor summaries (in `status` / `city` commands)**
- Neighbor city name + faction: always visible (map is public)
- Neighbor troops + officer count: only if that neighbor city is revealed

### Fog of War — Implementation Checklist for New Features

When adding ANY feature that displays city or officer data:

1. **Store layer:** Use `isCityRevealed(cityId)` before exposing city internals
2. **Officer data:** Check if the officer's city is revealed or if officer is own-faction
3. **Aggregates:** When computing faction totals (troops, officers), only sum over own + revealed cities
4. **Never bypass:** Don't add "convenience" exceptions (e.g., "adjacent cities are close so show their troops"). If the player wants intel, they must spy.
5. **Test:** Add a test case verifying the new feature respects fog-of-war

---

## Future Refactoring (Optional, Low Priority)

These are potential improvements that are not blocking any features:

- **StorageAdapter interface:** Unify browser `localStorage` (in `src/store/saveLoadActions.ts`) and CLI filesystem-based `saveState`/`loadState` behind a common `StorageAdapter` interface. Would allow tests to use an in-memory adapter.
- **Rule engine extraction:** Extract duplicated game rules (combat formulas, economy rules, capture chance) into `src/engine/rules/` for a single source of truth.
- **Core engine extraction:** Convert stores to thin wrappers over pure `apply(state, action) → newState` functions for deterministic replay and time-travel debugging. Large effort (3-5 days).

---

## References

- **RTK IV Wikipedia (JP):** https://ja.wikipedia.org/wiki/%E4%B8%89%E5%9C%8B%E5%BF%97IV — Contains detailed descriptions of all 24 特殊能力 (special abilities) in the original game, including which skills were default vs learnable, skill effects, and game mechanics. Key section: `特殊能力`. Useful for verifying skill assignments and game-faithful behavior.

---

**When in doubt, follow existing patterns in the codebase. Consistency is key.**
