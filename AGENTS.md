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
- Single store in `src/store/gameStore.ts` (~577 lines)
- All game logic lives as store actions
- Components consume via `useGameStore()` hook
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
- `src/store/gameStore.ts` - Core game state and logic
- `src/types/index.ts` - All type definitions
- `src/components/GameScreen.tsx` - Main gameplay UI
- `src/data/scenarios.ts` - Scenario definitions

---

## Game Mechanics

**Design Philosophy:** Faithfully replicate RTK IV (三國志IV) mechanics. When implementing new features, reference the original game's systems.

**Core Systems:**
- **Officers:** Have stamina (depletes on action, recovers on turn end) and loyalty
- **Cities:** Track population, gold, food, commerce, agriculture, defense, troops
- **Factions:** Relations use hostility scale (0-100); alliances tracked separately
- **Turn-Based:** Player commands execute immediately; AI factions act on turn end

---

## Testing Guidelines

- Co-locate tests with source files (`pathfinding.ts` → `pathfinding.test.ts`)
- Use descriptive test names: `test('findPath respects blocked hexes', () => {})`
- Use `@testing-library/react` for component tests
- Mock store state when needed
- Aim for coverage on utility functions and store logic

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

**When in doubt, follow existing patterns in the codebase. Consistency is key.**
