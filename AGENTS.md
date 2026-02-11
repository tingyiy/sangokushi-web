# AGENTS.md

**Guidelines for agentic coding assistants working in this repository.**

This is a browser-based Romance of the Three Kingdoms (三國志) strategy game inspired by RTK IV, built with React + TypeScript + Vite. All in-game text uses Traditional Chinese (繁體中文).

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
- Main store in `src/store/gameStore.ts` (~2900 lines) for strategic layer
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
All use Traditional Chinese: `'內政' | '軍事' | '人事' | '外交' | '謀略' | '結束'`

### Key Files
- `src/store/gameStore.ts` - Core game state and logic (~2900 lines, 67 actions)
- `src/store/battleStore.ts` - Tactical battle state, mode system, enemy AI (~850 lines, 16 actions)
- `src/types/index.ts` - All type definitions
- `src/types/battle.ts` - Battle-specific types (`BattleUnit`, `BattleMode`, `BattleState`)
- `src/components/GameScreen.tsx` - Main gameplay UI
- `src/components/BattleScreen.tsx` - Tactical battle UI with battle log and mode indicators
- `src/components/map/BattleMap.tsx` - Hex battle map with range visualization
- `src/data/scenarios.ts` - Scenario definitions
- `src/cli/play.ts` - CLI runner (drives game from terminal, no browser needed)

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

The CLI (`src/cli/play.ts`, ~1470 lines):
- **Interactive mode:** Full readline-based campaign with all command categories
- **Exec mode (`--exec`):** Non-interactive, loads/saves state via `--savefile` JSON, runs semicolon-delimited commands
- **Single-battle mode (`--attack`):** Auto-plays one battle and exits
- **All commands implemented:** domestic, military, personnel, diplomacy, strategy, query, turn end
- Battle AI for auto-play (same logic as `runEnemyTurn`)
- Handles siege maps (gate attacks, breach, then combat)
- Calls `resolveBattle` after battle ends (capture, flee, city transfer, ruler succession)

**Browser-only dependency:** `localStorage` in 4 save/load functions in `gameStore.ts`. The CLI uses its own filesystem-based `saveState`/`loadState` instead. These are not yet unified behind a common interface (low priority).

---

## Game Mechanics

**Design Philosophy:** Faithfully replicate RTK IV (三國志IV) mechanics. When implementing new features, reference the original game's systems.

**Core Systems:**
- **Officers:** Have stamina (depletes on action, recovers on turn end) and loyalty
- **Cities:** Track population, gold, food, commerce, agriculture, defense, troops
- **Factions:** Relations use hostility scale (0-100); alliances tracked separately
- **Turn-Based:** Player commands execute immediately; AI factions act on turn end

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
- Current test suite: 316 tests across 27 test files
- Battle store tests: `src/store/battleStore.test.ts`, `src/store/battleStore.fixes.test.ts`
- Game store command tests: `src/store/gameStore.commands.test.ts`

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

## Future Refactoring (Optional, Low Priority)

These are potential improvements that are not blocking any features:

- **StorageAdapter interface:** Unify browser `localStorage` (4 functions in `gameStore.ts`) and CLI filesystem-based `saveState`/`loadState` behind a common `StorageAdapter` interface. Would allow tests to use an in-memory adapter.
- **Rule engine extraction:** Extract duplicated game rules (combat formulas, economy rules, capture chance) into `src/engine/rules/` for a single source of truth.
- **Core engine extraction:** Convert stores to thin wrappers over pure `apply(state, action) → newState` functions for deterministic replay and time-travel debugging. Large effort (3-5 days).

---

**When in doubt, follow existing patterns in the codebase. Consistency is key.**
