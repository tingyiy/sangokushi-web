# BrowserAPI — Client-Side Game Automation API (`window.rtk`)

## Goal

Expose a structured, ergonomic API on `window.rtk` that lets a coding assistant (or any JS consumer in the browser console) **play the game exactly as a human would** — querying state, issuing commands, and advancing turns — without touching the React UI.

---

## Design Principles
- **JSON First**: All rtk commands return a `Result` object: `{ ok: boolean, data?: any, error?: string }`.
- **Descriptive Errors**: Errors specifically state the reason for failure (e.g., "Insufficient gold", "No governor").
- **Reactive**: The API reflects the current Zustand store state immediately.
- **Discoverable**: Helper namespaces like `rtk.query` provide suggested next steps.
- **No React dependency.** The API talks to Zustand stores directly (they're vanilla JS — `getState()` / `setState()` work outside React).
- **Dev-only.** Only mounted when `import.meta.env.DEV` is true.

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
    /** POW officers in a city */
    powOfficers(cityId: number): Officer[];
    /** Adjacent cities to a given city */
    adjacentCities(cityId: number): City[];
    /** Adjacent enemy cities (for attack/rumor targets) */
    adjacentEnemyCities(cityId: number): City[];
    /** Diplomacy: get hostility toward another faction */
    hostility(targetFactionId: number): number;
    /** Diplomacy: get allied factions */
    allies(): number[];
    /** Diplomacy: get active ceasefires */
    ceasefires(): { factionId: number; expiresYear: number; expiresMonth: number }[];
    /** Currently selected city */
    selectedCity(): City | null;
    /** Game log messages */
    log(n?: number): string[];
    /** Check which officers in a city have stamina remaining */
    availableOfficers(cityId: number): Officer[];
    /** Check if a city is revealed (fog of war) */
    isCityRevealed(cityId: number): boolean;
    /** Current pending events */
    pendingEvents(): GameEvent[];
    /** Duel state (if in duel phase) */
    duelState(): DuelState | null;
    /** Battle state (if in battle phase) — includes mode, battleLog, hasMoved, inspectedUnitId */
    battleState(): BattleState & BattleActions | null;
    /** All save slots */
    saveSlots(): { slot: number; date: string; version?: string }[];
    /** Check victory/defeat condition */
    checkEndCondition(): { type: 'victory' | 'defeat' | 'ongoing'; message: string } | null;
  };

  // ─── Commands (mutating, return Result) ─────────────
  /** Select a city on the map (required before some commands) */
  selectCity(cityId: number): Result;

  // Domestic (內政)
  developCommerce(cityId: number, officerId?: number): Result;
  developAgriculture(cityId: number, officerId?: number): Result;
  reinforceDefense(cityId: number, officerId?: number): Result;
  developFloodControl(cityId: number, officerId?: number): Result;
  developTechnology(cityId: number, officerId?: number): Result;
  trainTroops(cityId: number, officerId?: number): Result;
  manufacture(cityId: number, weaponType: 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults', officerId?: number): Result;
  disasterRelief(cityId: number, officerId?: number): Result;
  setTaxRate(cityId: number, rate: 'low' | 'medium' | 'high'): Result;

  // Personnel (人事)
  recruitOfficer(officerId: number, recruiterId?: number): Result;
  searchOfficer(cityId: number, officerId?: number): Result;
  recruitPOW(officerId: number, recruiterId?: number): Result;
  rewardOfficer(officerId: number, type: 'gold' | 'treasure', amount: number, recruiterId: number): Result;
  appointGovernor(cityId: number, officerId: number): Result;
  appointAdvisor(officerId: number): Result;
  promoteOfficer(officerId: number, rank: OfficerRank): Result;

  // Military (軍事)
  draftTroops(cityId: number, amount: number, officerId?: number): Result;
  transport(fromCityId: number, toCityId: number, resource: 'gold' | 'food' | 'troops', amount: number): Result;
  transferOfficer(officerId: number, targetCityId: number): Result;
  setBattleFormation(formation: { officerIds: number[]; unitTypes: UnitType[]; troops?: number[] } | null): Result;
  startBattle(targetCityId: number): Result;
  retreat(): Result;

  // Duel (軍事 -- sub-phase)
  startDuel(): Result;
  duelAction(action: 'attack' | 'heavy' | 'defend' | 'flee'): Result;
  endDuel(): Result;

  // Diplomacy (外交)
  improveRelations(targetFactionId: number): Result;
  formAlliance(targetFactionId: number): Result;
  requestJointAttack(allyFactionId: number, targetCityId: number): Result;
  proposeCeasefire(targetFactionId: number): Result;
  demandSurrender(targetFactionId: number): Result;
  breakAlliance(targetFactionId: number): Result;
  exchangeHostage(officerId: number, targetFactionId: number): Result;

  // Strategy (謀略)
  rumor(targetCityId: number): Result;
  counterEspionage(targetCityId: number, targetOfficerId: number): Result;
  inciteRebellion(targetCityId: number): Result;
  arson(targetCityId: number): Result;
  spy(targetCityId: number): Result;
  gatherIntelligence(targetCityId: number): Result;

  // Events
  /** Dismiss the current pending event (or accept officer visit) */
  popEvent(): Result;
  /** Robustly dismiss event if present (checks phase and pending events) */
  confirmEvent(): Result;

  // Battle (sub-commands when phase === 'battle')
  battle: {
    /** Get all units */
    units(): BattleUnit[];
    /** Get units for a faction */
    factionUnits(factionId: number): BattleUnit[];
    /** Get the active (selected) unit */
    activeUnit(): BattleUnit | null;
    /** Get current turn phase: 'player' (free unit selection) or 'enemy' (AI acting) */
    turnPhase(): TurnPhase;
    /** Select a friendly active unit to control (player phase only) */
    selectUnit(unitId: string): Result;
    /** Get move range for a unit (valid hexes within movement range) */
    moveRange(unitId: string): { q: number; r: number }[];
    /** Get attackable targets for a unit (enemy units in attack range) */
    attackTargets(unitId: string): BattleUnit[];
    /** Get gate targets adjacent to a unit */
    gateTargets(unitId: string): { q: number; r: number; hp: number }[];
    /** Move a unit (does NOT end the unit's turn — can still attack after moving) */
    move(unitId: string, q: number, r: number): Result;
    /** Attack a target (marks unit as done) */
    attack(attackerUnitId: string, targetUnitId: string): Result;
    /** Attack a gate (marks unit as done) */
    attackGate(attackerUnitId: string, gateQ: number, gateR: number): Result;
    /** Execute a tactic (marks unit as done) */
    executeTactic(unitId: string, tactic: BattleTactic, targetId?: string, targetHex?: { q: number; r: number }): Result;
    /** Challenge enemy officer to a duel */
    initDuel(myOfficer: Officer, enemyOfficer: Officer): Result;
    /** End a single unit's turn (marks as done, deselects — does NOT advance to enemy phase) */
    wait(unitId: string): Result;
    /** End entire player phase: marks all remaining player units as done, triggers enemy AI, then advances to next day */
    endPlayerPhase(): Result;
    /** Get map terrain */
    terrain(): BattleMap;
    /** Get gate states */
    gates(): GateState[];
    /** Get fire hexes */
    fireHexes(): { q: number; r: number; turnsLeft: number }[];
    /** Current weather */
    weather(): string;
    /** Current wind direction (0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW) */
    windDirection(): number;
    /** Current day */
    day(): number;
    /** Is the battle finished? */
    isFinished(): boolean;
    /** Who won? */
    winner(): number | null;
    /** Current battle mode: 'idle' | 'move' | 'attack' | 'tactic' */
    mode(): BattleMode;
    /** Battle log messages (combat feedback) */
    battleLog(): string[];
    /** Currently inspected unit id (null if none) */
    inspectedUnit(): string | null;
  };

  // Save/Load
  save(slot: number): Result;
  load(slot: number): Result;
  deleteSave(slot: number): Result;

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
    rtk-api.ts          # The API implementation (~1160 lines)
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

### Battle Command Wrapper Pattern

Battle commands delegate to `useBattleStore` and include battle-phase validation:

```typescript
battle: {
  move(unitId: string, q: number, r: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
    const battle = useBattleStore.getState();
    const unit = battle.units.find(u => u.id === unitId);
    if (!unit) return { ok: false, error: `Unit ${unitId} not found` };
    if (unit.status !== 'active') return { ok: false, error: 'Unit is not active' };
    const posBefore = { x: unit.x, y: unit.y };
    battle.moveUnit(unitId, q, r);
    const unitAfter = useBattleStore.getState().units.find(u => u.id === unitId)!;
    if (unitAfter.x === posBefore.x && unitAfter.y === posBefore.y) {
      return { ok: false, error: 'Move failed (out of range, blocked, or invalid terrain)' };
    }
    return { ok: true, data: { from: posBefore, to: { x: unitAfter.x, y: unitAfter.y } } };
  },

  attackGate(attackerUnitId: string, gateQ: number, gateR: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
    const battle = useBattleStore.getState();
    const gate = battle.gates.find(g => g.q === gateQ && g.r === gateR);
    if (!gate) return { ok: false, error: 'Gate not found at those coordinates' };
    const hpBefore = gate.hp;
    battle.attackGate(attackerUnitId, gateQ, gateR);
    const gateAfter = useBattleStore.getState().gates.find(g => g.q === gateQ && g.r === gateR);
    return {
      ok: true,
      data: { hpBefore, hpAfter: gateAfter?.hp ?? 0, destroyed: !gateAfter || gateAfter.hp <= 0 },
    };
  },

  executeTactic(unitId: string, tactic: BattleTactic, targetId?: string, targetHex?: { q: number; r: number }): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
    const battle = useBattleStore.getState();
    const unitsBefore = battle.units.map(u => ({ id: u.id, troops: u.troops, morale: u.morale, status: u.status }));
    battle.executeTactic(unitId, tactic, targetId, targetHex);
    const unitsAfter = useBattleStore.getState().units;
    const changes = unitsAfter.filter((u, i) =>
      u.troops !== unitsBefore[i].troops || u.morale !== unitsBefore[i].morale || u.status !== unitsBefore[i].status
    ).map(u => ({ id: u.id, troops: u.troops, morale: u.morale, status: u.status }));
    return { ok: true, data: { tactic, changes } };
  },
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
  return { ok: true, data: { year: scenario.year, factions: scenario.factions.length } };
}
```

### `status()` Pretty-Printer

Outputs a human-readable summary:

```
═══ RTK Status ═══
Phase: playing | 189年 3月
Faction: 曹操 (id=1) | Advisor: 荀彧
Cities (3): 陳留, 許昌, 洛陽
Gold: 12,000 | Food: 24,000 | Troops: 35,000
Officers: 8 (5 with stamina) | POWs: 1
Tax: 中 | Tech avg: 45
Pending events: 0 | Governor gaps: 0
═══════════════════
```

When in battle:

```
═══ RTK Battle ═══
Day 3 / 30 | Weather: sunny | Wind: NE
Phase: player | Mode: idle | Log: 3 entries
Attacker: 曹操 (3 units, 12000 troops) — 1/3 done
Defender: 袁紹 (2 units, 8000 troops)
Active: att-0 (曹仁, cavalry, 5000 troops, hasMoved: false)
Gates: 2 (hp: 80, 100) | Fire hexes: 1
═══════════════════
```

---

## Available Scenarios for `newGame`

| `scenarioId` | Year | Name | Notable Factions |
|---|---|---|---|
| 1 | 189 | 反董卓聯盟 | 曹操(1), 劉備(2), 孫堅(3), 董卓(4), 袁紹(5) |
| 2 | 194 | 群雄爭中原 | 曹操(1), 劉備(2), 孫策(3), 袁紹(5), 呂布(6) |
| 3 | 200 | 官渡之戰 | 曹操(1), 劉備(2), 孫策(3), 袁紹(5) |
| 4 | 208 | 赤壁之戰 | 曹操(1), 劉備(2), 孫權(3), 張魯(7) |
| 5 | 219 | 三國鼎立 | 曹操(1), 劉備(2), 孫權(3) |
| 6 | 234 | 星落五丈原 | 曹叡(1), 劉禪(2), 孫權(3) |

---

## Usage Example (from browser console or coding assistant)

```javascript
// Start a new game as 曹操 in the 189 scenario
rtk.newGame(1, 1);

// See what we have
rtk.status();

// Check our cities
rtk.query.myCities();
// → [{ id: 4, name: '陳留', gold: 8000, taxRate: 'medium', ... }]

// Develop commerce in 陳留
rtk.selectCity(4);
rtk.developCommerce(4);
// → { ok: true, data: { commerceBefore: 600, commerceAfter: 618, goldSpent: 500 } }

// Set tax rate to high for more income
rtk.setTaxRate(4, 'high');
// → { ok: true }

// Promote an officer
rtk.promoteOfficer(20, '將軍');
// → { ok: true }

// See who we can recruit
rtk.query.unaffiliatedOfficers(4);
// → [{ id: 42, name: '典韋', ... }]

// Recruit
rtk.recruitOfficer(42);
// → { ok: true }

// Search for hidden officers
rtk.searchOfficer(4);
// → { ok: true, data: { found: '程昱' } }  or  { ok: true, data: { found: null } }

// Draft troops
rtk.draftTroops(4, 5000);

// Transport gold to another city
rtk.transport(4, 5, 'gold', 3000);

// Check adjacent enemies for attack
rtk.query.adjacentEnemyCities(4);
// → [{ id: 7, name: '濮陽', factionId: 6, troops: 8000, ... }]

// Diplomacy
rtk.improveRelations(5);  // Improve relations with 袁紹
rtk.formAlliance(3);       // Propose alliance with 孫堅

// Strategy
rtk.spy(7);                // Spy on 濮陽
rtk.rumor(7);              // Spread rumors in 濮陽

// Set up battle formation and attack (with custom troop allocation)
rtk.setBattleFormation({
  officerIds: [20, 42, 21],
  unitTypes: ['cavalry', 'infantry', 'archer'],
  troops: [8000, 5000, 3000],  // optional — omit for auto-allocation
});
rtk.startBattle(7);

// In battle phase — player freely selects and controls units
rtk.battle.turnPhase();   // → 'player'

// Select a unit to control
rtk.battle.selectUnit('att-0');
rtk.battle.activeUnit();
// → { id: 'att-0', officer: { name: '曹操', ... }, type: 'cavalry', troops: 5000, morale: 80, ... }

// Move it
rtk.battle.moveRange('att-0');
// → [{ q: 5, r: 3 }, { q: 6, r: 2 }, ...]
rtk.battle.move('att-0', 5, 3);
// → { ok: true, data: { from: { x: 7, y: 7 }, to: { x: 5, y: 3 } } }

// Attack with the same unit (can attack after moving)
rtk.battle.attackTargets('att-0');
// → [{ id: 'def-1', officer: { name: '呂布', ... }, troops: 4000, ... }]
rtk.battle.attack('att-0', 'def-1');
// → { ok: true, data: { damage: 800, counterDamage: 300, targetMorale: 62 } }
// Unit is now marked as 'done' — select another unit

// Switch to another unit without ending a turn
rtk.battle.selectUnit('att-1');
rtk.battle.executeTactic('att-1', '火計', undefined, { q: 5, r: 4 });
// → { ok: true, data: { tactic: '火計', changes: [...] } }

// Control a third unit — attack a siege gate
rtk.battle.selectUnit('att-2');
rtk.battle.gateTargets('att-2');
// → [{ q: 7, r: 4, hp: 100 }]
rtk.battle.attackGate('att-2', 7, 4);
// → { ok: true, data: { hpBefore: 100, hpAfter: 60, destroyed: false } }

// Or skip a unit (mark as done without acting)
rtk.battle.wait('att-2');

// When done with all units, end player phase — triggers enemy AI then next day
rtk.battle.endPlayerPhase();
// → enemy units act automatically, then a new day begins
rtk.battle.turnPhase();   // → 'player' (new day)

// Check battle status
rtk.battle.weather();     // → 'sunny'
rtk.battle.day();         // → 3
rtk.battle.mode();        // → 'idle'
rtk.battle.battleLog();   // → ['曹仁 attacks 呂布: 800 damage', ...]
rtk.battle.fireHexes();   // → [{ q: 5, r: 4, turnsLeft: 2 }]
rtk.battle.isFinished();  // → false

// Retreat from battle
rtk.retreat();
// → { ok: true }

// Handle pending events (after endTurn)
rtk.query.pendingEvents();
// → [{ type: 'officerVisit', name: '武將來訪', officerId: 55, ... }]
rtk.popEvent();  // Accept or dismiss

// End turn when done
rtk.endTurn();
// → { ok: true, data: { year: 189, month: 4, events: 2 } }

// Read the game log
rtk.query.log(10);

// Save progress
rtk.save(1);
// → { ok: true }
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
| **No AI actions exposed** | `ai*` prefixed actions are internal — the API only exposes player-facing commands |

---

## Changelog

**v2.4 (2026-02-10):** Phase-Based Battle Turn System (RTK IV style).

- **Phase-based turns:** Battle now uses `turnPhase: 'player' | 'enemy'` instead of per-unit sequential turns. During player phase, freely select and control any friendly unit. When done, end the entire player phase to trigger enemy AI.
- **New `selectUnit(unitId)`:** Click any friendly active unit to make it the active unit during player phase.
- **New `endPlayerPhase()`:** Marks all remaining player units as done, runs enemy AI for all enemy units, then advances to next day.
- **New `turnPhase()`:** Query current phase (`'player'` or `'enemy'`).
- **Changed `wait(unitId)`:** Now only marks the single unit as done and deselects — does NOT auto-advance to the next unit or trigger enemy phase.
- **Changed `move()`:** After moving, the unit stays selected (can still attack). No auto-advance.
- **Changed `attack()` / `attackGate()` / `executeTactic()`:** Mark unit as done but do NOT auto-advance — player picks next unit.
- **Removed old per-unit turn advancement:** No more `_advanceUnit` or auto-cycling through units.
- **Updated status printer:** Now shows `turnPhase` and units-done count.

**v2.3 (2026-02-10):** Troop Allocation in Battle Formation.

- **Manual troop allocation:** `setBattleFormation` now accepts optional `troops` number array for per-officer troop counts.
- **FormationDialog UI:** Added troop input fields per selected officer showing current allocation and max (leadership * 100).
- **Garrison tracking:** Formation dialog now displays total troops deployed, remaining garrison, and prevents over-allocation.
- **Validation:** `startBattle` validates total troops don't exceed city garrison.

**v2.2 (2026-02-10):** Battle Screen UX Overhaul — new state fields and AI.

- **Battle mode system:** Added `mode` field to `BattleState` (`'idle' | 'move' | 'attack' | 'tactic'`) tracking current player interaction mode.
- **Battle log:** Added `battleLog` string array to `BattleState` for combat feedback messages.
- **Unit inspection:** Added `inspectedUnitId` to `BattleState` for inspecting non-active units.
- **Move tracking:** Added `hasMoved` boolean to `BattleUnit` — units can move then attack in the same turn.
- **Enemy AI:** Battle store now includes full enemy AI that executes moves/attacks/tactics automatically.
- **Range validation:** Attacks and tactics now validated against actual unit range (archers get range 2).
- **New battle sub-commands:** `mode()`, `battleLog()`, `inspectedUnit()`.
- **Updated status printer:** Now shows day limit, mode, log count, and `hasMoved` per unit.

**v2.1 (2026-02-09):** Added Specialized Officer Assignment & Event Confirmation.

- **Specialized Assignment:** Added optional `officerId` / `recruiterId` to all domestic, personnel, and drafting commands.
- **Event Handling:** Added `confirmEvent()` for robust popup dismissal.
- **Documentation:** Updated signatures to reflect standard officer selection optionality.

**v2 (2026-02-09):** Updated to reflect Phases 2-7 implementation.

- **Added 30+ commands:** All Phase 2 commands (flood control, technology, train, manufacture, disaster relief, search, POW recruit, reward, execute, dismiss, governor, advisor, transport, transfer, formation, all 6 diplomacy commands, all 6 strategy commands)
- **Added Phase 6 commands:** `setTaxRate`, `promoteOfficer`, `popEvent`
- **Added Phase 7 commands:** `retreat` (with battle consequences)
- **Expanded battle sub-namespace:** `attackGate`, `executeTactic` (13 tactics), `initDuel`, `gateTargets`, `gates`, `fireHexes`, `weather`, `windDirection`, `day`
- **Expanded queries:** `powOfficers`, `ceasefires`, `isCityRevealed`, `pendingEvents`
- **Added scenario reference table** for `newGame`
- **Added battle command wrapper examples** (gate attack, tactic execution)
- **Updated status() printer** to show tax, tech, POWs, pending events, battle weather
- **Estimated implementation size** grew from initial ~300-400 estimate to ~1160 lines
