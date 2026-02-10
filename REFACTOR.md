# REFACTOR.md — Architecture Refactoring Plan

## Current State (Updated)

The codebase has ~3600 lines of game logic in two Zustand store files (`gameStore.ts`, `battleStore.ts`). While the original plan assumed these were tightly coupled to React/browser, **testing revealed the stores work natively in Node.js** via `tsx` with zero modifications.

### Key Discovery

Zustand's `create()` returns a vanilla store — `useGameStore.getState()` and `useBattleStore.getState()` work in any JavaScript runtime. The stores have:

- **Zero React hook imports** — no `useEffect`, `useState`, etc.
- **Zero DOM/browser API imports** — no `window`, `document`, `navigator`
- **Zero audio/visual imports** — `AudioSystem` is only consumed by UI components
- **Only browser dependency:** `localStorage` in 4 save/load functions (easily abstracted)
- **Only third-party dependency:** Zustand (works in Node)

### Architecture (actual)

```
┌─────────────────────────────────────┐
│  React Components (UI)              │  ← Browser-only
│  ├── BattleScreen, GameScreen, ...  │
│  └── Audio, SVG maps, dialogs       │
├─────────────────────────────────────┤
│  Zustand Stores (logic + state)     │  ← Works in Node!
│  ├── gameStore.ts (~2900 lines)     │     67 actions
│  └── battleStore.ts (~840 lines)    │     16 actions
├─────────────────────────────────────┤
│  Utils / AI / Data (pure)           │  ← Already clean
│  ├── ai/, utils/, data/, game/      │
│  └── types/, systems/               │
├─────────────────────────────────────┤
│  CLI Runner                         │  ← NEW
│  └── src/cli/play.ts                │     Drives stores from terminal
└─────────────────────────────────────┘
```

### What's Done

| Item | Status |
|------|--------|
| CLI runner (`src/cli/play.ts`) | ✅ Working — full battle simulation from terminal |
| `tsx` dev dependency | ✅ Installed |
| `npm run cli` script | ✅ Added |
| Post-battle resolution in CLI | ✅ Calls `resolveBattle` (mirrors BattleScreen.tsx) |
| Battle AI for auto-play | ✅ Player and enemy units both use AI |

### What Remains

| Item | Priority | Effort |
|------|----------|--------|
| Abstract `localStorage` into `StorageAdapter` | Medium | 1 day |
| Rule engine extraction (single source of truth) | Low | 2-3 days |
| Engine extraction (pure `apply(state, action)`) | Low | 3-5 days |
| Interactive CLI (arrow keys, menus) | Low | 2-3 days |

---

## Remaining Phases (Revised)

### Phase 1: Abstract I/O (localStorage)

The only browser API used by the stores. 4 functions in `gameStore.ts`:
- `saveGame` — `localStorage.setItem()`
- `loadGame` — `localStorage.getItem()`
- `getSaveSlots` — `localStorage.getItem()`
- `deleteSave` — `localStorage.removeItem()`

**Solution:**
```typescript
// src/engine/persistence.ts
export interface StorageAdapter {
  save(slot: number, data: string): void;
  load(slot: number): string | null;
  list(): { slot: number; label: string }[];
  delete(slot: number): void;
}

export class LocalStorageAdapter implements StorageAdapter { ... }  // Browser
export class FileSystemAdapter implements StorageAdapter { ... }    // Node.js
export class InMemoryAdapter implements StorageAdapter { ... }      // Tests
```

### Phase 2: Rule Engine Extraction (Optional)

Extract duplicated game rules into `src/engine/rules/`. This is about code quality, not about enabling the CLI (which already works).

Candidates:
- **Terrain rules** — `TERRAIN_COSTS` already in `pathfinding.ts` (single source of truth)
- **Combat formulas** — damage, counter, capture chance, morale
- **Economy rules** — development, tax, draft limits
- **Flee logic** — post-battle officer fate (currently in `resolveBattle`)

### Phase 3: Core Engine Extraction (Optional)

Convert stores to thin wrappers over pure `apply(state, action) → newState` functions. Benefits:
- Deterministic replay
- Time-travel debugging
- Server-side game simulation

This is a large refactor (3-5 days) and is not needed for the CLI to work.

### Phase 4: Interactive CLI (Optional)

Current CLI is auto-play only. For interactive play:
- Use **Ink** (React for terminals) or **prompts + chalk**
- Text-based hex map rendering
- Menu-driven commands
- Save/load to filesystem

---

## CLI Usage

```bash
# List factions for a scenario
npm run cli -- --scenario 0

# Auto-play a battle
npm run cli -- --scenario 0 --faction 袁紹 --attack 平原
npm run cli -- --scenario 0 --faction 曹操 --attack 南皮

# Available scenarios
# 0 = 董卓廢少帝 (189 AD)
# 1 = 群雄爭中原 (194 AD)
# 2 = 官渡之戰 (200 AD)
# 3 = 赤壁之戰 (208 AD)
# 4 = 漢中爭奪 (219 AD)
```

---

## Non-Goals (for now)
- Multiplayer / networking
- Mobile native (React Native)
- Mod support / custom scenarios
- Performance optimization (current perf is fine for the game's scope)
- i18n (game is Traditional Chinese by design, matching RTK IV)
