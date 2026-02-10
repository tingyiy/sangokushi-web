# REFACTOR.md — Architecture Refactoring Plan

## Current State

The codebase has ~3600 lines of game logic embedded in two Zustand store files (`gameStore.ts`, `battleStore.ts`). While the logic itself is pure computation, it is structurally coupled to Zustand's React hooks and `localStorage`. This makes the game engine impossible to run outside a browser.

### Current Architecture (flat)

```
┌─────────────────────────────────────┐
│  React Components (UI)              │
│  ├── BattleScreen, GameScreen, ...  │
│  └── SVG maps, forms, dialogs       │
├─────────────────────────────────────┤
│  Zustand Stores (logic + state)     │  ← 3600 lines of game logic
│  ├── gameStore.ts (~2830 lines)     │     embedded here
│  └── battleStore.ts (~750 lines)    │
├─────────────────────────────────────┤
│  Utils / AI / Data (pure)           │  ← Already clean
│  ├── ai/, utils/, data/, game/      │
│  └── types/, systems/               │
└─────────────────────────────────────┘
```

**Problems:**
1. Movement validation duplicated in `moveUnit`, `getMoveRange`, `BattleMap.tsx`, `rtk-api.ts`
2. Game logic cannot run without Zustand (React dependency)
3. `localStorage` hardcoded in store — no alternative persistence
4. No way to run the game headless (CLI, tests, AI training, server-side)
5. Battle rules (terrain costs, combat formulas) scattered across store + utils

---

## Target Architecture

```
┌──────────────────────────────────────────────┐
│  UI Layer (React + browser)                  │
│  ├── components/*.tsx                        │
│  ├── Zustand hooks (thin wrappers)           │
│  └── debug/rtk-api.ts                        │
├──────────────────────────────────────────────┤
│  API Layer (framework-agnostic)              │
│  ├── GameController — orchestrates commands  │
│  └── BattleController — orchestrates battle  │
├──────────────────────────────────────────────┤
│  Rule Engine (pure functions, no state)      │
│  ├── MovementRules — canMove, getMoveRange   │
│  ├── CombatRules — damage, counter, capture  │
│  ├── TacticRules — success chance, effects   │
│  ├── TerrainRules — costs, passability       │
│  ├── EconomyRules — tax, development         │
│  └── DiplomacyRules — hostility, alliances   │
├──────────────────────────────────────────────┤
│  Core Engine (state machine, no I/O)         │
│  ├── GameEngine — apply(state, action)       │
│  ├── BattleEngine — apply(state, action)     │
│  └── AIEngine — decide(state) → actions      │
├──────────────────────────────────────────────┤
│  Data Layer (pure)                           │
│  ├── types/, data/, scenarios                │
│  └── StorageAdapter interface                │
└──────────────────────────────────────────────┘
```

**Key principle:** Each layer only imports from the layer below. The UI layer is the only layer that touches React or the browser.

---

## Phase 1: Extract Rule Engine

**Goal:** Single source of truth for game rules. No more duplicated validation.

### 1a. `src/engine/rules/terrain.ts`
Extract terrain rules from pathfinding.ts + battleStore.ts + BattleMap.tsx:
```typescript
export const TERRAIN_COSTS: Record<TerrainType, number> = { ... };
export function isPassable(terrain: TerrainType): boolean;
export function getMoveCost(terrain: TerrainType): number;
export function isBlockedByGate(hex: Hex, gates: GateState[]): boolean;
```

### 1b. `src/engine/rules/movement.ts`
Extract from `moveUnit` + `getMoveRange` + `BattleMap.tsx` + `rtk-api.ts`:
```typescript
export function getValidMoveTargets(unit, battleState): Map<string, number>;
export function canMoveTo(unit, target, battleState): boolean;
export function applyMove(unit, target): BattleUnit;
```

### 1c. `src/engine/rules/combat.ts`
Extract from `attackUnit` in battleStore.ts:
```typescript
export function calculateDamage(attacker, defender, terrain): { damage: number; counterDamage: number };
export function calculateMoraleDamage(damage): number;
export function checkCapture(attacker, defender): boolean;
export function checkRout(unit): boolean;
```

### 1d. `src/engine/rules/tactics.ts`
Already partially in `utils/unitTypes.ts`. Consolidate:
```typescript
export function calculateTacticSuccess(tactic, casterInt, targetInt?): number;
export function applyTacticEffect(tactic, caster, target?, state?): TacticResult;
```

### 1e. `src/engine/rules/economy.ts`
Extract from gameStore.ts domestic commands:
```typescript
export function calculateDevelopment(officer, city, type): number;
export function calculateDraftLimits(city): { maxDraft: number; goldCost: number; foodCost: number };
export function calculateTaxIncome(city): { gold: number; food: number };
```

**Migration strategy:** Create the rule functions, then update stores/UI/API to call them instead of inline logic. One rule file at a time. Each step must pass all 301 tests.

---

## Phase 2: Extract Core Engine

**Goal:** Pure state machine. `apply(state, action) → newState`. No Zustand, no React, no I/O.

### 2a. `src/engine/GameEngine.ts`
```typescript
export interface GameAction =
  | { type: 'developCommerce'; cityId: number; officerId?: number }
  | { type: 'draftTroops'; cityId: number; amount: number }
  | { type: 'startBattle'; targetCityId: number }
  | { type: 'endTurn' }
  | ...;

export function applyAction(state: GameState, action: GameAction): GameState;
```

### 2b. `src/engine/BattleEngine.ts`
```typescript
export interface BattleAction =
  | { type: 'move'; unitId: string; q: number; r: number }
  | { type: 'attack'; attackerId: string; targetId: string }
  | { type: 'endPlayerPhase' }
  | ...;

export function applyBattleAction(state: BattleState, action: BattleAction): BattleState;
```

### 2c. Refactor Zustand stores to thin wrappers
```typescript
// gameStore.ts becomes:
export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,
  developCommerce: (cityId, officerId) =>
    set(state => applyAction(state, { type: 'developCommerce', cityId, officerId })),
  // ...
}));
```

**Migration strategy:** Extract one command at a time from the store into the engine. Stores become thin `set(applyAction(...))` wrappers. Tests continue passing throughout.

---

## Phase 3: Abstract I/O

### 3a. `src/engine/persistence.ts`
```typescript
export interface StorageAdapter {
  save(slot: number, state: GameState): void;
  load(slot: number): GameState | null;
  list(): SaveSlot[];
  delete(slot: number): void;
}

export class LocalStorageAdapter implements StorageAdapter { ... }
export class FileSystemAdapter implements StorageAdapter { ... }  // Node.js
export class InMemoryAdapter implements StorageAdapter { ... }    // Tests
```

### 3b. Extract `localStorage` from `gameStore.ts`
Move save/load/delete from gameStore.ts lines 2657-2778 into `LocalStorageAdapter`.

---

## Phase 4: Headless Runtime (Node.js CLI)

**Goal:** Play the game entirely from the terminal, no browser needed.

### 4a. Package structure
```
packages/
  engine/           # Pure game engine (Phase 1-3 output)
    src/
      rules/        # Rule functions
      engine/       # State machines
      ai/           # AI engine (already pure)
      data/         # Scenarios, cities, officers
      types/        # Type definitions
    package.json    # Zero dependencies
  
  web/              # Browser UI (current React app)
    src/
      components/
      store/        # Thin Zustand wrappers over engine
    package.json    # depends on engine, react, zustand
  
  cli/              # Terminal UI
    src/
      index.ts      # Entry point
      renderer.ts   # Terminal rendering (blessed/ink)
    package.json    # depends on engine, ink (or blessed)
```

### 4b. CLI interface options

| Library | Approach | Pros | Cons |
|---------|----------|------|------|
| **Ink** | React for terminals | Reuse React mental model, component-based | Still React (lighter, but a dependency) |
| **blessed/neo-blessed** | Direct terminal UI | Mature, no React, rich widgets | Imperative API, larger learning curve |
| **prompts + chalk** | Simple Q&A | Minimal deps, easy to build | Not interactive enough for map |
| **Custom ANSI** | Raw terminal codes | Zero deps, full control | Lots of manual work |

**Recommended: Ink** — leverages the team's React knowledge, supports interactive hex display via custom components, and the engine layer is fully decoupled anyway.

### 4c. CLI features
- Text-based hex map rendering (colored ANSI grid)
- Menu-driven commands (arrow keys + enter)
- Battle mode with unit selection
- Save/load to filesystem
- AI auto-play mode (watch AI factions battle)

---

## Phase 5: Testing & Validation

### 5a. Engine-level tests
- Move all 301 existing tests to use engine functions directly (not Zustand stores)
- Add property-based tests for combat formulas
- Add fuzzing for AI decision-making

### 5b. Integration tests
- Full game simulation: start scenario → play 50 turns → verify no crashes
- Battle simulation: random moves → verify state consistency
- Save/load round-trip tests

### 5c. Performance benchmarks
- AI turn processing time (target: <100ms per faction)
- Battle resolution time
- Memory usage for 6-scenario state

---

## Migration Order & Risk

| Phase | Effort | Risk | Benefit |
|-------|--------|------|---------|
| **1a-1e** Rule extraction | 2-3 days | Low (additive, tests catch regressions) | Eliminates duplication, single source of truth |
| **2a-2c** Engine extraction | 3-5 days | Medium (large refactor of stores) | Decouples logic from React/Zustand |
| **3a-3b** I/O abstraction | 1 day | Low (isolated change) | Enables Node.js persistence |
| **4a-4c** CLI runtime | 3-5 days | Low (new code, no changes to existing) | Playable without browser |
| **5a-5c** Testing | 2-3 days | Low | Confidence in engine correctness |
| **6a-6d** Documentation | 1 day | None | All docs reflect new architecture; agents work effectively |

**Total estimated effort: 2-3 weeks**

Start with Phase 1 (rule extraction) since it has immediate benefits (fixing the duplicated movement validation) and is low risk. Phase 6 (docs) should be done incrementally — update docs as each phase completes, not all at the end.

---

## Phase 6: Documentation Update

**Goal:** After the refactor, all agent/developer docs must reflect the new layered architecture. Architecture knowledge currently lives only in people's heads and scattered across code. It should be canonical in docs.

### Current doc inventory

| File | Purpose | Status |
|------|---------|--------|
| `README.md` | Project overview, getting started | Describes "browser-based" only; no architecture diagram |
| `AGENTS.md` | OpenCode / generic agent guidelines | Most detailed, but describes old flat store architecture |
| `CLAUDE.md` | Claude Code agent guidelines | Stale — describes "single store ~577 lines", no battle store, no tests |
| `GEMINI.md` | Gemini agent guidelines | Copy of CLAUDE.md (same stale content) |
| `AutomationAPI.md` | Browser console API docs | Up to date, but browser-only |
| `REFACTOR.md` | This file | Migration plan |

### 6a. Update README.md

Add an architecture section with the layered diagram:
```
Rule Engine → Core Engine → API Layer → UI Layer
```
- Explain the engine is framework-agnostic and can run headless
- Document both runtimes (web + CLI)
- Update "Tech Stack" to include the engine package
- Update "Project Structure" to reflect `packages/` or `src/engine/`

### 6b. Consolidate agent docs

The three agent files (AGENTS.md, CLAUDE.md, GEMINI.md) have diverged and contain duplicated/stale info. After the refactor:

1. **AGENTS.md** remains the single source of truth for all agent guidelines
   - Update architecture section with the new layered design
   - Update file references (new engine paths, removed store-embedded logic)
   - Update state management section (stores are thin wrappers now)
   - Add engine layer patterns (pure functions, `apply(state, action)`)
   - Update key files list
   - Update test counts and coverage targets

2. **CLAUDE.md** should reference AGENTS.md rather than duplicating:
   ```markdown
   # CLAUDE.md
   See [AGENTS.md](./AGENTS.md) for full guidelines.
   Additional Claude-specific notes: (if any)
   ```

3. **GEMINI.md** same approach:
   ```markdown
   # GEMINI.md
   See [AGENTS.md](./AGENTS.md) for full guidelines.
   Additional Gemini-specific notes: (if any)
   ```

### 6c. Key architecture facts to document

These must be in AGENTS.md and README.md after the refactor:

- **Engine is pure TypeScript with zero dependencies** — no React, no Zustand, no browser APIs
- **`src/engine/rules/`** — Single source of truth for all game rules (terrain, movement, combat, economy, diplomacy)
- **`src/engine/GameEngine.ts`** — Pure state machine: `applyAction(state, action) → newState`
- **`src/engine/BattleEngine.ts`** — Pure battle state machine
- **Stores are thin wrappers** — `set(applyAction(get(), action))`, no business logic
- **StorageAdapter interface** — Pluggable persistence (localStorage, filesystem, in-memory)
- **Two runtimes** — `packages/web/` (React browser app), `packages/cli/` (Node.js terminal app)
- **Import rule:** Engine code must NEVER import from `store/`, `components/`, or browser APIs

### 6d. Update AutomationAPI.md

- Note that the API now delegates to engine functions, not store actions directly
- Add CLI usage examples (the API works in both browser and Node.js)

---

## Non-Goals (for now)
- Multiplayer / networking
- Mobile native (React Native)
- Mod support / custom scenarios
- Performance optimization (current perf is fine for the game's scope)
- i18n (game is Traditional Chinese by design, matching RTK IV)

## Future Enhancements (noted for later)
- **Multi-city attack:** RTK IV allows attacking from multiple cities simultaneously. Attackers from different cities spawn on different edges of the battle map based on their approach direction.
- **Allied reinforcements:** Both attacker and defender can have allied factions join the battle. Allied units spawn separately and are AI-controlled even during the player phase.
- **Spawn point selection:** RTK IV lets both sides pick spawn positions from ~10 predefined locations before battle starts. Fewer options than total officers — adds a tactical layer.
- **Per-city battle maps:** Each of the 46 cities should have a unique battle map reflecting its geography and historical significance (e.g., 赤壁 has rivers, 街亭 has mountains, 漢中 has valleys).
