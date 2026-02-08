# Implementation Plan: Phases 4-7 -- AI, Scenarios, Advanced Systems, Polish

> Phases 4-7 are later-stage work. This document provides architectural guidance and key implementation points without the same line-level detail as Phases 0.5-3, since the codebase will have evolved significantly by the time these are reached.

---

## Phase 4 -- AI System (Weeks 8-10)

> **Depends on:** Phases 2 + 3 (all commands must exist)
> **Estimated effort:** ~2 weeks

### 4.1 AI Decision Framework

#### Architecture
**New directory:** `src/ai/`
**New file:** `src/ai/aiEngine.ts`

The AI runs during `endTurn()` in `src/store/gameStore.ts` (line ~145). Currently `endTurn` only does income and stamina recovery. The AI phase inserts between income and stamina recovery.

```typescript
// src/ai/aiEngine.ts
import type { GameState } from '../types';

export interface AIDecision {
  factionId: number;
  action: string;
  params: Record<string, unknown>;
  description: string;  // for game log
}

export function runAI(state: GameState): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  for (const faction of state.factions.filter(f => !f.isPlayer)) {
    const factionDecisions = evaluateFaction(faction, state);
    decisions.push(...factionDecisions);
  }
  
  return decisions;
}

function evaluateFaction(faction, state): AIDecision[] {
  // Priority order:
  // 1. Defend threatened cities (if enemy adjacent with large army)
  // 2. Develop weakest cities (commerce, agriculture, defense)
  // 3. Recruit unaffiliated officers
  // 4. Reward disloyal officers
  // 5. Expand (attack weak neighbors)
  // 6. Diplomacy (ally against strong enemies)
}
```

#### Integration point
**File:** `src/store/gameStore.ts` in `endTurn`

```typescript
endTurn: () => {
  const state = get();
  // 1. Player income (existing)
  // 2. AI turns (NEW)
  const decisions = runAI(state);
  decisions.forEach(d => applyAIDecision(d, state));
  // 3. All faction income (existing)
  // 4. Stamina recovery (existing)
  // 5. Log AI actions
  decisions.forEach(d => state.log.push(d.description));
}
```

### 4.2-4.6 AI Subsystems

Each subsystem is a function called by `evaluateFaction`:

| Subsystem | File | Logic |
|-----------|------|-------|
| **4.2 City Development** | `src/ai/aiDevelopment.ts` | Develop city with lowest `(commerce + agriculture) / 2`. Prioritize defense for border cities. |
| **4.3 Military** | `src/ai/aiMilitary.ts` | Draft if troops < 5000 per city. Attack if 2:1 troop advantage vs neighbor. |
| **4.4 Personnel** | `src/ai/aiPersonnel.ts` | Recruit any unaffiliated officers. Reward officers with loyalty < 60. Transfer officers to understaffed cities. |
| **4.5 Diplomacy** | `src/ai/aiDiplomacy.ts` | Propose alliance if mutual enemy exists. Break alliance if now dominant. |
| **4.6 Strategy** | `src/ai/aiStrategy.ts` | Spread rumors against strongest neighbor. Spy on border cities. |

### 4.7 Difficulty Levels

Store in `gameSettings.difficulty: 'easy' | 'normal' | 'hard'`:
- **Easy:** AI skips actions 50% of the time, attack threshold 3:1
- **Normal:** Standard behavior, 2:1 attack threshold
- **Hard:** AI gets +20% income bonus, 1.5:1 attack threshold, smarter targeting

---

## Phase 5 -- Scenarios and Content (Weeks 10-12)

> **Depends on:** Phase 1.3 (officer data)
> **Estimated effort:** ~2 weeks

### Scenario Data Structure

Each scenario is defined in `src/data/scenarios.ts` using `makeCity()` and `makeOfficer()` helpers. The pattern is established by `scenario190`.

### 5.1-5.5 New Scenarios

**File:** `src/data/scenarios.ts`

For each scenario, define:
1. Factions array with ruler IDs, colors, relations
2. Cities array with faction ownership and resource levels
3. Officers array with faction/city assignments, loyalty, governor flags

| Scenario | Year | Key Factions | Officers Needed | Key Events |
|----------|------|-------------|----------------|------------|
| **5.1** 群雄爭中原 | 194 | 曹操(expanded), 呂布(徐州), 劉備(無城), 袁紹(河北) | ~80 | 呂布叛亂 |
| **5.2** 河北風暴起 | 200 | 曹操 vs 袁紹, 劉備(荊州) | ~100 | 官渡之戰 |
| **5.3** 孔明借東風 | 208 | 曹操(北方), 孫劉聯盟 | ~120 | 赤壁之戰 |
| **5.4** 曹丕廢漢帝 | 220 | 魏蜀吳 three kingdoms | ~130 | 三足鼎立 |
| **5.5** 星落五丈原 | 234 | 蜀漢北伐, 姜維 | ~100 | 五丈原 |

### 5.6 Officer Placement per Scenario

Create a shared helper for batch officer placement:

```typescript
// src/data/scenarioHelpers.ts
export function placeOfficers(
  placements: { id: number; factionId: number | null; cityId: number; 
                loyalty?: number; isGovernor?: boolean; treasureId?: number }[]
): Officer[] {
  return placements.map(p => makeOfficer(p.id, p.factionId, p.cityId, {
    loyalty: p.loyalty,
    isGovernor: p.isGovernor,
    treasureId: p.treasureId,
  }));
}
```

### Update scenario list

```typescript
export const scenarios: Scenario[] = [
  scenario189,  // renamed from scenario190
  scenario194,
  scenario200,
  scenario208,
  scenario220,
  scenario234,
];
```

---

## Phase 6 -- Advanced Systems (Weeks 12-16)

> **Depends on:** Phases 1-4
> **Estimated effort:** ~4 weeks

### 6.1 Advisor System

**New file:** `src/systems/advisor.ts`

```typescript
export function getAdvisorSuggestions(state: GameState): string[] {
  const advisor = state.officers.find(o => o.id === playerFaction.advisorId);
  if (!advisor) return [];
  
  const suggestions: string[] = [];
  const quality = advisor.intelligence; // higher = better suggestions
  
  // Check for weak cities
  state.cities.filter(c => c.factionId === playerFaction.id).forEach(city => {
    if (city.gold < 1000 && quality > 60) suggestions.push(`${city.name}的金錢不足，應當開發商業。`);
    if (city.troops < 3000 && quality > 50) suggestions.push(`${city.name}兵力薄弱，建議徵兵。`);
  });
  
  // Check for disloyal officers
  state.officers.filter(o => o.factionId === playerFaction.id && o.loyalty < 50).forEach(o => {
    if (quality > 70) suggestions.push(`${o.name}忠誠度過低(${o.loyalty})，應立即褒賞！`);
  });
  
  return suggestions.slice(0, 3); // Max 3 suggestions
}
```

Display suggestions at turn start in a modal or in the GameLog.

### 6.2 Officer Ranks

Add to `Officer` type:
```typescript
rank: OfficerRank;  // '太守' | '將軍' | '都督' | '軍師' | '侍中' | '一般'
```

Rank affects:
- Monthly salary deducted from faction treasury
- Loyalty retention: higher rank = slower loyalty decay

### 6.3 Fog of War

Add to `GameState`:
```typescript
revealedCities: Map<number, { until: { year: number; month: number } }>;
```

In `CityPanel`, when viewing non-player cities:
- If not revealed: show "???" for troops, gold, food, officers
- If revealed: show actual values
- Adjacent cities always show estimated troops (±30%)

### 6.4 Random Events

**New file:** `src/systems/events.ts`

```typescript
export function rollRandomEvents(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  
  state.cities.forEach(city => {
    if (city.factionId === null) return;
    
    const roll = Math.random() * 100;
    if (roll < 3) events.push({ type: 'flood', cityId: city.id });
    else if (roll < 5) events.push({ type: 'locusts', cityId: city.id });
    else if (roll < 6) events.push({ type: 'plague', cityId: city.id });
    else if (roll < 10) events.push({ type: 'harvest', cityId: city.id });
  });
  
  return events;
}
```

Call in `endTurn` after income. Show event notifications to player.

### 6.4.1 Officer Visit Events

In `endTurn` (or at turn start):
```typescript
// Roll for officer visits in player cities
playerCities.forEach(city => {
  const unaffiliated = officers.filter(o => o.cityId === city.id && o.factionId === null);
  unaffiliated.forEach(officer => {
    if (Math.random() < 0.1 * (playerFaction.ruler.charisma / 100)) {
      // Queue visit event
      pendingEvents.push({ type: 'officerVisit', officerId: officer.id, cityId: city.id });
    }
  });
});
```

Show modal: "劉備主公，有位叫 {name} 的人在 {city} 求見，同他會面嗎？"

### 6.5 Historical Events

**New file:** `src/data/historicalEvents.ts`

```typescript
export const historicalEvents = [
  {
    id: 'chibi',
    triggerConditions: (state) => state.year === 208 && state.month === 11,
    name: '赤壁之戰',
    description: '曹操大軍南下，孫劉聯軍火攻破敵...',
    effects: (state) => { /* apply effects */ },
  },
  // ...
];
```

Only trigger in `gameMode: 'historical'`.

### 6.6 Officer Lifecycle

In `endTurn`, once per year (month === 1):
```typescript
officers.forEach(o => {
  const age = state.year - o.birthYear;
  if (state.year >= o.deathYear) {
    // Officer dies of natural causes
    if (Math.random() < 0.5) { /* remove officer, log death */ }
  }
  if (age > 50 && Math.random() < (age - 50) * 0.02) {
    // Illness chance increases with age
    o.stamina = Math.max(0, o.stamina - 50);
  }
});
```

### 6.7 Population Growth / Tax System

Add to `GameState` or `City`:
```typescript
taxRate: 'low' | 'medium' | 'high';  // per faction or per city
```

Monthly effects:
- `low`: gold income × 0.5, peopleLoyalty +2/month, population +1%
- `medium`: gold income × 1.0, peopleLoyalty ±0
- `high`: gold income × 1.5, peopleLoyalty -2/month, population -0.5%

---

## Phase 7 -- Polish and Extras (Weeks 16-20)

> **Depends on:** No hard dependencies
> **Estimated effort:** ~5 weeks

### 7.1 New Ruler Creation

**New component:** `src/components/RulerCreation.tsx`
- Form to input: name, stats (point allocation from pool of 350), portrait selection, starting city
- Store up to 3 custom rulers in `gameSettings.customRulers[]`
- Insert into scenario data during `selectScenario`

### 7.2 Multiplayer (Hot-seat)

- Multiple factions marked `isPlayer: true`
- Turn order: process each player faction in ID order
- Between turns: show "請 {faction} 玩家就座" overlay to prevent info leaking

### 7.3 Marriage / Blood Relations

Add to `Officer`:
```typescript
relationships: { type: 'father' | 'spouse' | 'sworn'; targetId: number }[];
```

Related officers get +10 base loyalty when in same faction.

### 7.4 Sound and Music

**New file:** `src/systems/audio.ts`

```typescript
const tracks = {
  title: '/audio/title.mp3',
  strategy: '/audio/strategy.mp3',
  battle: '/audio/battle.mp3',
  duel: '/audio/duel.mp3',
};

export function playBGM(track: keyof typeof tracks) {
  // Use HTML5 Audio API
}
```

### 7.5-7.9 UI Polish

See PLAN.md for full descriptions. Key implementation points:

**7.6 Strategic Map:** Use `public/terrain-map.svg` as `<image>` background in GameMap SVG. Add pan/zoom via CSS transform + wheel/drag handlers.

**7.7 Domestic Status Panel:** Create `DomesticStatusPanel.tsx` with sortable table component. Toggle with button in GameHeader.

**7.8 Map Toolbar:** Floating `<div>` with absolute positioning over the map area. Each button opens a panel overlay.

**7.9 Governor Assignment Phase:** At turn start, check for cities without governors. Show assignment modal before command phase.

---

## File Summary for Phases 4-7

| Phase | New Files | Modified Files |
|-------|-----------|---------------|
| **4** | `src/ai/aiEngine.ts`, `src/ai/aiDevelopment.ts`, `src/ai/aiMilitary.ts`, `src/ai/aiPersonnel.ts`, `src/ai/aiDiplomacy.ts`, `src/ai/aiStrategy.ts` | `src/store/gameStore.ts` (endTurn) |
| **5** | Scenario data in `src/data/scenarios.ts` (expand), `src/data/scenarioHelpers.ts` | `src/data/officers.ts` (expand to 400+) |
| **6** | `src/systems/advisor.ts`, `src/systems/events.ts`, `src/data/historicalEvents.ts` | `src/types/index.ts`, `src/store/gameStore.ts` |
| **7** | `src/components/RulerCreation.tsx`, `src/components/DomesticStatusPanel.tsx`, `src/systems/audio.ts` | `src/components/map/GameMap.tsx`, `src/components/GameHeader.tsx`, `src/App.css` |
