# Implementation Plan: Phase 3 -- Battle System Overhaul

> **Depends on:** Phases 1 + 2 (skills, weapons, formation)
> **Estimated effort:** ~3 weeks
> **Priority:** High

---

## Current Battle System State

**Files:**
- `src/store/battleStore.ts` (202 lines) -- Zustand store with state + actions
- `src/components/BattleScreen.tsx` (128 lines) -- battle UI wrapper
- `src/components/map/BattleMap.tsx` (129 lines) -- hex grid renderer
- `src/types/battle.ts` (45 lines) -- battle type definitions
- `src/utils/hex.ts` -- hex coordinate math
- `src/utils/pathfinding.ts` -- A* pathfinding
- `src/game/battle/fire/FireAttackSystem.ts` (118 lines) -- standalone fire system (NOT integrated)

**Current capabilities:**
- 15x15 hex grid with random terrain (plain/forest/mountain/river/city)
- Up to 5 units per side, each initialized with 5000 troops
- Movement with terrain costs, A* pathfinding
- Simplified attack: `(war * troops / 1000)` damage formula, 30% counter
- Day progression (max 30 days), defender wins on timeout
- All units are functionally identical (UnitType exists but has no effect)

---

## 3.1 Unit Type Differentiation

### Implementation Steps

#### Step 1: Add unit type modifiers
**New file:** `src/utils/unitTypes.ts`

```typescript
import type { UnitType, TerrainType } from '../types/battle';

interface UnitModifiers {
  movement: number;          // base movement range
  attackModifier: Record<TerrainType, number>;  // multiplier by terrain
  defenseModifier: Record<TerrainType, number>;
  attackRange: number;       // 1 for melee, 2 for archer
}

export const UNIT_TYPE_MODIFIERS: Record<UnitType, UnitModifiers> = {
  infantry: {
    movement: 5,
    attackModifier: { plain: 1.0, forest: 1.0, mountain: 0.8, river: 0.7, city: 1.0, gate: 0.5, bridge: 0.9 },
    defenseModifier: { plain: 1.0, forest: 1.3, mountain: 1.5, river: 0.7, city: 1.5, gate: 2.0, bridge: 1.0 },
    attackRange: 1,
  },
  cavalry: {
    movement: 7,
    attackModifier: { plain: 1.3, forest: 0.7, mountain: 0.5, river: 0.5, city: 0.8, gate: 0.3, bridge: 0.8 },
    defenseModifier: { plain: 1.0, forest: 0.8, mountain: 0.6, river: 0.5, city: 0.8, gate: 0.5, bridge: 0.8 },
    attackRange: 1,
  },
  archer: {
    movement: 4,
    attackModifier: { plain: 1.0, forest: 0.8, mountain: 1.2, river: 0.8, city: 1.0, gate: 0.8, bridge: 1.0 },
    defenseModifier: { plain: 0.8, forest: 1.0, mountain: 1.3, river: 0.6, city: 1.2, gate: 1.5, bridge: 0.8 },
    attackRange: 2,
  },
};
```

#### Step 2: Apply modifiers in battleStore
**File:** `src/store/battleStore.ts`

Modify `attackUnit` (line ~123):
```typescript
attackUnit: (attackerId, targetId) => {
  const attacker = units.find(u => u.id === attackerId)!;
  const target = units.find(u => u.id === targetId)!;
  const attackerMods = UNIT_TYPE_MODIFIERS[attacker.type];
  const defenderMods = UNIT_TYPE_MODIFIERS[target.type];
  const terrain = battleMap.terrain[target.x][target.y];
  
  const attackMod = attackerMods.attackModifier[terrain];
  const defenseMod = defenderMods.defenseModifier[terrain];
  
  const rawDamage = (attacker.officer.war * attacker.troops) / 1000;
  const damage = Math.floor(rawDamage * attackMod / defenseMod);
  // ... apply damage
}
```

Modify movement range to use unit type:
```typescript
const range = UNIT_TYPE_MODIFIERS[activeUnit.type].movement;
```

#### Step 3: Accept formation config from gameStore
**File:** `src/store/battleStore.ts` in `initBattle`

Change signature to accept unit types from Phase 2 formation:
```typescript
initBattle: (attackerOfficers, defenderOfficers, map, attackerTypes?: UnitType[]) => {
  // attackerTypes[i] is the unit type for attackerOfficers[i]
  // Default to 'infantry' if not provided
}
```

#### Step 4: Allow ranged attack for archers
**File:** `src/components/map/BattleMap.tsx:83-89`

Current: only attacks at distance 1. Add range check:
```typescript
const attackRange = UNIT_TYPE_MODIFIERS[activeUnit.type].attackRange;
if (dist <= attackRange && activeUnit.status === 'active') {
  battle.attackUnit(activeUnit.id, unitAtHex.id);
}
```

#### Step 5: Visual unit type indicators
**File:** `src/components/map/BattleMap.tsx:64-73`

Add unit type icon/color:
```tsx
{/* Show unit type indicator */}
<text x={0} y={-HEX_SIZE * 0.5} textAnchor="middle" fontSize="8" fill="#ffd700">
  {unit.type === 'cavalry' ? '騎' : unit.type === 'archer' ? '弓' : '步'}
</text>
```

---

## 3.2 Siege Battle (城門攻防戰)

### Implementation Steps

#### Step 1: Create siege map generator
**New file:** `src/utils/siegeMap.ts`

```typescript
import type { BattleMap, TerrainType } from '../types/battle';

export function generateSiegeMap(width: number, height: number): BattleMap {
  const terrain: TerrainType[][] = [];
  for (let q = 0; q < width; q++) {
    terrain[q] = [];
    for (let r = 0; r < height; r++) {
      // Outer ring: plains for attackers
      // Middle ring: city walls (mountain terrain, impassable except via gate)
      // Inner: city terrain for defenders
      // Gate: 1-2 hex openings in the wall
      if (isWallPosition(q, r, width, height)) terrain[q][r] = 'mountain';
      else if (isGatePosition(q, r, width, height)) terrain[q][r] = 'gate';
      else if (isInsideWalls(q, r, width, height)) terrain[q][r] = 'city';
      else terrain[q][r] = 'plain';
    }
  }
  return { width, height, terrain };
}
```

#### Step 2: Add gate HP mechanic
**File:** `src/types/battle.ts`

Add to `BattleState`:
```typescript
gates: { q: number; r: number; hp: number; maxHp: number }[];
```

#### Step 3: Gate-specific combat
**File:** `src/store/battleStore.ts`

Add `attackGate` action:
```typescript
attackGate: (attackerId: string, gateQ: number, gateR: number) => {
  const attacker = state.units.find(u => u.id === attackerId)!;
  let damage = Math.floor(attacker.troops / 100);
  
  // Battering rams deal 3x damage to gates
  if (attacker.type === 'infantry' && cityHasBatteringRams) {
    damage *= 3;
  }
  
  gate.hp = Math.max(0, gate.hp - damage);
  if (gate.hp === 0) {
    // Gate broken! Change terrain to plain, allow entry
    state.battleMap.terrain[gateQ][gateR] = 'plain';
  }
}
```

#### Step 4: Determine battle type
**File:** `src/store/battleStore.ts` in `initBattle`

```typescript
// If attacking a city, use siege map; otherwise use field battle map
const isSiege = defenderCityId !== null;
const map = isSiege 
  ? generateSiegeMap(15, 15) 
  : generateMap(15, 15);
```

---

## 3.3 Battle Tactics (戰術)

### Implementation Steps

#### Step 1: Integrate FireAttackSystem
**File:** `src/store/battleStore.ts`

Adapt `src/game/battle/fire/FireAttackSystem.ts` to use battleStore coordinates:

Add `useTactic` action:
```typescript
useTactic: (unitId: string, tactic: string, targetQ: number, targetR: number) => {
  const unit = state.units.find(u => u.id === unitId)!;
  const officer = unit.officer;
  
  // Verify officer has the required skill
  if (!officer.skills.includes(tactic as RTK4Skill)) return;
  
  switch (tactic) {
    case '火計': {
      // Set adjacent hex on fire
      const success = Math.random() < (officer.intelligence / 200 + 0.2);
      if (success) {
        state.fireHexes.push({ q: targetQ, r: targetR, turnsLeft: 3 });
        // Damage any unit on that hex
      }
      break;
    }
    case '落石': { /* mountain/wall only, heavy damage below */ break; }
    case '混亂': { /* immobilize target unit 1-2 turns */ break; }
    case '罵聲': { /* reduce target morale by 15-25 */ break; }
    // ... etc
  }
}
```

#### Step 2: Add fire/weather state to BattleState
**File:** `src/types/battle.ts`

```typescript
export interface BattleState {
  // ... existing
  fireHexes: { q: number; r: number; turnsLeft: number }[];
  windDirection: number;  // 0-5 hex direction
  weather: 'sunny' | 'rain' | 'cloudy' | 'storm';
}
```

#### Step 3: Process fire spread each day
**File:** `src/store/battleStore.ts` in `nextDay`

```typescript
// Process fire: spread in wind direction, damage units on fire hexes
state.fireHexes.forEach(fire => {
  const unitsOnFire = state.units.filter(u => u.x === fire.q && u.y === fire.r);
  unitsOnFire.forEach(u => { u.troops -= Math.floor(u.troops * 0.1); });
  fire.turnsLeft--;
  
  // Spread in wind direction
  if (state.weather === 'sunny') {
    const spread = getNeighbor(fire.q, fire.r, state.windDirection);
    if (state.battleMap.terrain[spread.q]?.[spread.r] !== 'river') {
      state.fireHexes.push({ q: spread.q, r: spread.r, turnsLeft: 2 });
    }
  }
});
state.fireHexes = state.fireHexes.filter(f => f.turnsLeft > 0);
```

#### Step 4: Tactic buttons in BattleScreen
**File:** `src/components/BattleScreen.tsx:96-104`

Add tactic buttons based on active unit officer's skills:
```tsx
{activeUnit.officer.skills.filter(s => BATTLE_TACTICS.includes(s)).map(tactic => (
  <button key={tactic} onClick={() => battle.useTactic(activeUnit.id, tactic, selectedHex.q, selectedHex.r)}>
    {tactic}
  </button>
))}
```

---

## 3.4 Morale and Routing

#### Step 1: Check morale after damage
**File:** `src/store/battleStore.ts` in `attackUnit`

After applying damage:
```typescript
if (target.morale < 20) {
  target.status = 'routed';
  // Routed unit moves toward nearest map edge each turn
}
```

#### Step 2: Rout propagation
When commander (first unit) dies, all same-faction units lose 30 morale.

#### Step 3: Routed unit behavior in `nextDay`
Routed units automatically move toward the nearest map edge. When they reach the edge, they are removed from battle.

---

## 3.5 Officer Capture (POW System)

#### Step 1: Add POW state
**File:** `src/types/index.ts`

Add to `Faction`:
```typescript
export interface Faction {
  // ... existing
  powOfficerIds: number[];  // captured officer IDs
}
```

#### Step 2: Roll for capture on unit destruction
**File:** `src/store/gameStore.ts` in `resolveBattle`

Currently (line ~749): 50% capture chance. Keep this and add:
```typescript
// Captured officers go into winner faction's POW list
capturedOfficers.forEach(o => {
  o.factionId = null;  // not affiliated
  winnerFaction.powOfficerIds.push(o.id);
});
```

#### Step 3: Wire POW commands (Phase 2.3: 登用, 處斬, 追放)
These already stubbed in IMPL-2.md. They operate on `faction.powOfficerIds`.

---

## 3.6 Duels During Battle

#### Step 1: Add `challengeDuel` action to battleStore
```typescript
challengeDuel: (attackerUnitId: string, defenderUnitId: string) => {
  // Trigger gameStore duel with the two officers
  // On duel end, apply morale effects to battle units
}
```

#### Step 2: Bridge between battleStore and gameStore duel
When duel triggers mid-battle:
1. Save battle state
2. Transition to duel phase
3. On duel end, return to battle phase
4. Apply: winner's unit morale +20, loser's unit morale -30

---

## 3.7 Reinforcements

#### Step 1: Add reinforcement request
During siege battle, add button "請求援軍" that lists adjacent friendly cities with troops.

#### Step 2: Delayed arrival
Reinforcements arrive 1-2 days after request, appearing on the attacker's side of the map.

---

## 3.8 Naval Battle

#### Step 1: Add water terrain and ship units
- New terrain types: `'deepWater' | 'shallowWater'`
- Ship units move on water, cannot move on land
- 海戰 skill: full effectiveness on water (units without it fight at 50%)

#### Step 2: Generate naval maps
Trigger when attacking across 長江: use a water-heavy map layout.

---

## File Change Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `src/utils/unitTypes.ts` | Unit type modifier definitions |
| Create | `src/utils/siegeMap.ts` | Siege map generator |
| Modify | `src/types/battle.ts` | Add gates, fireHexes, windDirection, weather extensions |
| Modify | `src/types/index.ts` | Add `powOfficerIds` to Faction |
| Modify | `src/store/battleStore.ts` | Unit type modifiers, siege gates, tactics, morale, fire processing |
| Modify | `src/components/BattleScreen.tsx` | Tactic buttons, gate attack UI, duel challenge |
| Modify | `src/components/map/BattleMap.tsx` | Render fire, unit types, gate HP, ranged attack range |
| Modify | `src/store/gameStore.ts` | POW capture in resolveBattle, duel bridge |

---

## Verification Checklist

- [ ] Cavalry has +movement, +attack on plains, -attack in forests
- [ ] Archers can attack at 2-hex range
- [ ] Siege maps have walls and gates
- [ ] Gates have HP; battering rams deal bonus damage
- [ ] Fire spreads in wind direction, damages units
- [ ] Units with morale < 20 rout toward map edge
- [ ] Commander death causes morale drop for all units
- [ ] Destroyed unit officers have capture roll
- [ ] Captured officers enter POW list
- [ ] Mid-battle duels transition to duel screen and back
- [ ] Build passes, lint clean, tests pass
