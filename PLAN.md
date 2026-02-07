# Plan: Hex-based Tactical Battle Engine

## Objective
Implement a faithful recreation of the Romance of the Three Kingdoms IV (RTK IV) tactical battle system. This involves a turn-based, hex-grid combat engine where units move, attack, and use tactics.

## Scope
-   Hexagonal grid map system (flat-topped or pointy-topped, typically flat-topped for RTK style).
-   Battle state management (units, turn order, morale, supplies).
-   Unit types (Infantry, Cavalry, Archers) with distinct stats/mobility.
-   Terrain effects (movement cost, defense bonuses).
-   Basic actions: Move, Attack, Wait.
-   Integration with the existing campaign map (triggering battles).

## Architecture

### 1. Data Structures & Types (`src/types/battle.ts`)
Create new types to support the battle engine.

-   **`BattleUnit`**: Represents a deployed unit.
    -   `id`: unique ID.
    -   `officerId`: Link to the commanding officer.
    -   `troops`: Current troop count.
    -   `morale`: 0-100.
    -   `x`, `y`: Hex coordinates.
    -   `type`: 'infantry' | 'cavalry' | 'archer'.
    -   `status`: 'active' | 'done' | 'routed'.
    -   `direction`: Facing direction (0-5).
-   **`BattleMap`**:
    -   `width`, `height`: Grid dimensions.
    -   `terrain`: 2D array of TerrainType ('plain', 'forest', 'mountain', 'river', 'city', 'gate').
-   **`BattleState`**:
    -   `units`: Array of `BattleUnit`.
    -   `turn`: Current turn number.
    -   `weather`: 'sunny' | 'rain' | 'cloudy'.
    -   `activeUnitId`: ID of the unit currently acting.
    -   `attackerId`: Faction ID of attacker.
    -   `defenderId`: Faction ID of defender.
    -   `maxTurns`: e.g., 30 days.

### 2. State Management (`src/store/battleStore.ts` or extend `gameStore.ts`)
Likely better to keep a separate slice or store for battles to avoid bloating `gameStore.ts`.

-   **Actions**:
    -   `initBattle(attackerId, defenderCityId, deployedOfficers)`: Setup map and units.
    -   `selectUnit(unitId)`: Highlight unit.
    -   `moveUnit(unitId, x, y)`: Update coordinates, deduct movement points.
    -   `attackUnit(attackerId, targetId)`: Calculate damage, update troops/morale.
    -   `endTurn()`: Rotate to next unit or next day.

### 3. Hex Grid Logic (`src/utils/hex.ts`)
Utility functions for hex math (using "Cube Coordinates" or "Axial Coordinates").

-   `getNeighbors(x, y)`: Return adjacent hexes.
-   `getDistance(a, b)`: Calculate range.
-   `getLineOfSight(a, b)`: For ranged attacks.
-   `pathfinding(start, end, map)`: A* algorithm for movement range.

### 4. Components

-   **`BattleScreen.tsx`**: Main container, visible when `GamePhase === 'battle'`.
-   **`BattleMap.tsx`**: Renders the hex grid (SVG or Canvas).
    -   Draws terrain tiles.
    -   Draws units on top.
    -   Handles clicks for selection/movement.
-   **`BattleMenu.tsx`**: Context menu for the active unit (Move, Attack, Tactic, Retreat).
-   **`UnitInfo.tsx`**: Display stats of selected unit.

## Implementation Steps

### Phase 1: Foundation
1.  Define `BattleUnit`, `TerrainType` types in `src/types/battle.ts`.
2.  Create `src/utils/hex.ts` for coordinate systems and distance calc.
3.  Add `battle` state to `useGameStore` (or create `useBattleStore`).

### Phase 2: Visuals
1.  Implement `BattleScreen` component shell.
2.  Implement `BattleMap` to render a static hex grid with dummy terrain.
3.  Render dummy units on the grid.

### Phase 3: Movement & Turns
1.  Implement pathfinding (A*) in `src/utils/pathfinding.ts`.
2.  Handle unit selection and highlight valid move ranges.
3.  Update store when a move is confirmed.
4.  Implement turn cycling (active unit switching).

### Phase 4: Combat
1.  Implement `Attack` command logic.
2.  Damage formula: `(Attack * Troops) / Defense` scaled by unit compatibility.
3.  Add "Counter-attack" logic (defender hits back if in range).
4.  Handle unit death (removal from map).

### Phase 5: Integration
1.  Add "March" or "Attack" command to the main `CommandMenu`.
2.  Transition `GamePhase` to `'battle'` upon confirmation.
3.  Resolve battle result (Win/Loss) and transition back to `GameScreen` with updated city control.

## Gap Analysis (vs Original RTK IV)
-   **Weather:** RTK IV battles are heavily affected by weather (wind for fire, rain for mobility). Need to implement weather state.
-   **Siege:** Battle involves attacking gates and city walls. Map generation must include these structures.
-   **Provisions:** Army consumes food daily. Run out -> morale drop -> flee.
