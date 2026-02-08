# AutomationAPI — Client-Side Game Automation API

## Goal

Expose a structured, ergonomic API on `window.rtk` that lets a coding assistant (or any JS consumer in the browser console) **play the game exactly as a human would** — querying state, issuing commands, and advancing turns — without touching the React UI.

---

## Design Principles

1. **Thin wrapper, not a second store.** The API delegates to `useGameStore` and `useBattleStore` directly. No duplicated state.
2. **Human-like flow.** The API enforces the same sequence a human follows: start game → select scenario → pick faction → configure settings → play (select city, issue commands, end turn). No teleporting past phases.
3. **Read-friendly query layer.** Raw Zustand state is flat arrays. The API provides query helpers like `rtk.query.myOfficers()`, `rtk.query.adjacentEnemyCities(cityId)`, etc., so the caller doesn't need to manually join/filter.
4. **Structured returns.** Every action returns a result object `{ ok: boolean, error?: string, data?: ... }` so the caller can programmatically check success/failure.
5. **No React dependency.** The API talks to Zustand stores directly (they're vanilla JS — `getState()` / `setState()` work outside React).
6. **Dev-only.** Only mounted when `import.meta.env.DEV` is true.

---

## API Surface

```typescript
// Mounted at window.rtk

interface RTKApi {
  // ─── Lifecycle ───────────────────────────────────────
  /** Get current game phase */
  phase(): GamePhase;

  /** Start a new game: select scenario by id, pick faction, configure settings, enter playing phase */
  newGame(scenarioId: number, factionId: number, settings?: Partial<GameSettings>): Result;

  // ─── Queries (read-only, no side effects) ───────────
  query: {
    /** Current phase */
    phase(): GamePhase;
    /** Current year and month */
    date(): { year: number; month: number };
    /** Player faction info */
    playerFaction(): Faction | null;
    /** All factions still in the game */
    factions(): Faction[];
    /** All cities */
    cities(): City[];
    /** Single city by id */
    city(cityId: number): City | null;
    /** Cities owned by player */
    myCities(): City[];
    /** Cities owned by a specific faction */
    factionCities(factionId: number): City[];
    /** All officers */
    officers(): Officer[];
    /** Single officer by id */
    officer(officerId: number): Officer | null;
    /** Officers in a specific city */
    cityOfficers(cityId: number): Officer[];
    /** Officers belonging to player faction */
    myOfficers(): Officer[];
    /** Unaffiliated officers in a city (recruitable) */
    unaffiliatedOfficers(cityId: number): Officer[];
    /** Adjacent cities to a given city */
    adjacentCities(cityId: number): City[];
    /** Adjacent enemy cities (for attack/rumor targets) */
    adjacentEnemyCities(cityId: number): City[];
    /** Diplomacy: get hostility toward another faction */
    hostility(targetFactionId: number): number;
    /** Diplomacy: get allied factions */
    allies(): number[];
    /** Currently selected city */
    selectedCity(): City | null;
    /** Game log messages */
    log(n?: number): string[];
    /** Check which officers in a city have stamina remaining */
    availableOfficers(cityId: number): Officer[];
    /** Duel state (if in duel phase) */
    duelState(): DuelState | null;
    /** Battle state (if in battle phase) */
    battleState(): BattleState & BattleActions | null;
    /** All save slots */
    saveSlots(): { slot: number; date: string; version?: string }[];
    /** Check victory/defeat condition */
    checkEndCondition(): { type: 'victory' | 'defeat'; message: string } | null;
  };

  // ─── Commands (mutating, return Result) ─────────────
  /** Select a city on the map (required before most commands) */
  selectCity(cityId: number): Result;

  // Domestic (內政)
  developCommerce(cityId: number): Result;
  developAgriculture(cityId: number): Result;
  reinforceDefense(cityId: number): Result;

  // Personnel (人事)
  recruitOfficer(officerId: number): Result;

  // Military (軍事)
  draftTroops(cityId: number, amount: number): Result;
  startDuel(): Result;
  duelAction(action: 'attack' | 'heavy' | 'defend' | 'flee'): Result;
  endDuel(): Result;
  startBattle(targetCityId: number): Result;

  // Diplomacy (外交)
  improveRelations(targetFactionId: number): Result;
  formAlliance(targetFactionId: number): Result;

  // Strategy (謀略)
  rumor(targetCityId: number): Result;

  // Turn
  endTurn(): Result;

  // Battle (sub-commands when phase === 'battle')
  battle: {
    /** Get all units */
    units(): BattleUnit[];
    /** Get units for a faction */
    factionUnits(factionId: number): BattleUnit[];
    /** Get the active unit (whose turn it is) */
    activeUnit(): BattleUnit | null;
    /** Get move range for a unit */
    moveRange(unitId: string): { q: number; r: number }[];
    /** Get attackable targets for a unit */
    attackTargets(unitId: string): BattleUnit[];
    /** Move active unit */
    move(unitId: string, q: number, r: number): Result;
    /** Attack a target */
    attack(attackerUnitId: string, targetUnitId: string): Result;
    /** End a unit's turn (wait) */
    wait(unitId: string): Result;
    /** Get map terrain */
    terrain(): BattleMap;
    /** Is the battle finished? */
    isFinished(): boolean;
    /** Who won? */
    winner(): number | null;
  };

  // Save/Load
  save(slot: number): Result;
  load(slot: number): Result;

  // ─── Utilities ──────────────────────────────────────
  /** Pretty-print current game state summary to console */
  status(): void;
  /** Dump full raw state (for debugging) */
  rawState(): { game: GameState; battle: BattleState };
  /** Wait for React to re-render (returns a Promise) */
  tick(): Promise<void>;
  /** Subscribe to state changes, returns unsubscribe fn */
  onChange(callback: (state: GameState) => void): () => void;
}

interface Result {
  ok: boolean;
  error?: string;
  data?: unknown;
}
```

---

## File Structure

```
src/
  debug/
    rtk-api.ts          # The API implementation (~300-400 lines)
    rtk-api.test.ts     # Tests for the API
    index.ts            # Conditional mount: if (import.meta.env.DEV) mount()
```

Mount point — add one line to `src/main.tsx`:

```typescript
import './debug';   // registers window.rtk in dev mode
```

---

## Implementation Approach

### Command Wrapper Pattern

Each command wrapper follows this pattern:

```typescript
developCommerce(cityId: number): Result {
  const state = useGameStore.getState();
  // 1. Validate phase
  if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
  // 2. Validate preconditions (city ownership, gold, stamina, etc.)
  const city = state.cities.find(c => c.id === cityId);
  if (!city) return { ok: false, error: `City ${cityId} not found` };
  if (city.factionId !== state.playerFaction?.id) return { ok: false, error: 'Not your city' };
  // 3. Capture state before
  const goldBefore = city.gold;
  // 4. Delegate to store action
  state.developCommerce(cityId);
  // 5. Check result and return
  const after = useGameStore.getState();
  const cityAfter = after.cities.find(c => c.id === cityId)!;
  return {
    ok: true,
    data: {
      commerceBefore: city.commerce,
      commerceAfter: cityAfter.commerce,
      goldSpent: goldBefore - cityAfter.gold,
    },
  };
}
```

### `newGame` Convenience Method

Chains the full setup flow:

```typescript
newGame(scenarioId: number, factionId: number, settings?: Partial<GameSettings>): Result {
  const { selectScenario, selectFaction, setGameSettings, confirmSettings } = useGameStore.getState();
  // 1. Load scenario
  const scenario = scenarios.find(s => s.id === scenarioId);
  if (!scenario) return { ok: false, error: `Scenario ${scenarioId} not found` };
  selectScenario(scenario);
  // 2. Select faction
  selectFaction(factionId);
  // 3. Apply settings
  if (settings) setGameSettings(settings);
  // 4. Confirm and enter playing phase
  confirmSettings();
  return { ok: true };
}
```

### `status()` Pretty-Printer

Outputs a human-readable summary:

```
═══ RTK Status ═══
Phase: playing | 189年 3月
Faction: 曹操 (id=1)
Cities (2): 陳留, 許昌
Gold: 12,000 | Food: 24,000 | Troops: 15,000
Officers: 5 (3 with stamina)
═══════════════════
```

---

## Usage Example (from browser console or coding assistant)

```javascript
// Start a new game as 曹操
rtk.newGame(1, 1, { battleMode: 'watch' });

// See what we have
rtk.status();

// Check our cities
rtk.query.myCities();
// → [{ id: 4, name: '陳留', gold: 8000, ... }]

// Develop commerce in 陳留
rtk.selectCity(4);
rtk.developCommerce(4);
// → { ok: true, data: { commerceBefore: 600, commerceAfter: 618, goldSpent: 500 } }

// See who we can recruit
rtk.query.unaffiliatedOfficers(4);
// → [{ id: 42, name: '典韋', ... }]

// Recruit
rtk.recruitOfficer(42);
// → { ok: true }

// Draft troops
rtk.draftTroops(4, 5000);

// Check adjacent enemies for attack
rtk.query.adjacentEnemyCities(4);

// Attack!
rtk.startBattle(7);

// In battle phase, control units
rtk.battle.activeUnit();
rtk.battle.moveRange('att-0');
rtk.battle.move('att-0', 5, 3);
rtk.battle.attack('att-0', 'def-1');

// End turn when done
rtk.endTurn();

// Read the game log
rtk.query.log(10);

// Save progress
rtk.save(1);
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **`window.rtk` global** | Browser console accessible; coding assistant can use `page.evaluate(() => rtk.foo())` via Puppeteer or just paste into console |
| **Synchronous returns** | Zustand mutations are synchronous; no need for async except `tick()` |
| **`Result` objects** | Structured error handling — the caller never has to try/catch or guess what went wrong |
| **Pre-validation in wrappers** | The underlying store actions sometimes silently fail (e.g., insufficient gold). The API checks preconditions and returns meaningful errors |
| **Query namespace** | Separates read-only operations from mutating commands. Queries are cheap, commands change state |
| **Battle sub-namespace** | Battle is a distinct phase with its own store; grouping under `rtk.battle.*` keeps it clean |
| **Dev-only** | Gated behind `import.meta.env.DEV` so it's tree-shaken out of production builds |
