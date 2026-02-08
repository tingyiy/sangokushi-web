# Implementation Plan: Phase 1 -- Core Data Expansion

> **Depends on:** Phase 0.5 (portraits, settings)
> **Estimated effort:** ~2 weeks
> **Priority:** Critical

---

## 1.1 Officer Skill System (22 Skills)

### Current State
Skills are already defined! `src/types/index.ts:8-17` defines `RTK4_SKILLS` (25 entries) and `RTK4Skill` type. Each officer in `src/data/officers.ts` already has a `skills: RTK4Skill[]` array. **However, no command checks these skills -- they have zero mechanical effect.**

### Implementation Steps

#### Step 1: Create skill utility functions
**New file:** `src/utils/skills.ts`

```typescript
import type { Officer, RTK4Skill } from '../types';

/** Check if an officer has a specific skill */
export function hasSkill(officer: Officer, skill: RTK4Skill): boolean {
  return officer.skills.includes(skill);
}

/** Get all officers with a specific skill from a list */
export function officersWithSkill(officers: Officer[], skill: RTK4Skill): Officer[] {
  return officers.filter(o => o.skills.includes(skill));
}

/** Skill requirements map: command -> required skill (null = no requirement) */
export const SKILL_REQUIREMENTS: Record<string, RTK4Skill | null> = {
  // 內政
  '製造': '製造',
  // 謀略
  '反間': '做敵',
  '煽動': '驅虎',
  '放火': '燒討',
  '諜報': '情報',
  '密偵': '情報',
  // 外交
  '外交': '外交',
  // 戰鬥
  '火計': '火計',
  '落石': '落石',
  '同討': '同討',
  '天變': '天變',
  '風變': '風變',
  '混亂': '混亂',
  '連環': '連環',
  '落雷': '落雷',
  '修復': '修復',
  '罵聲': '罵聲',
  '虛報': '虛報',
};

/** Check if an officer can use a specific command */
export function canUseCommand(officer: Officer, command: string): boolean {
  const required = SKILL_REQUIREMENTS[command];
  if (!required) return true;
  return hasSkill(officer, required);
}
```

#### Step 2: Wire skill checks into existing commands
**File:** `src/store/gameStore.ts`

For the existing `rumor` action (line ~690), add skill check:
```typescript
rumor: (targetCityId: number) => {
  const state = get();
  const city = state.cities.find(c => c.id === state.selectedCityId);
  const governor = state.officers.find(o => 
    o.cityId === city?.id && o.isGovernor && o.factionId === state.playerFaction?.id
  );
  
  // NEW: Check for 流言 skill
  if (governor && !governor.skills.includes('流言')) {
    set({ log: [...state.log, `${governor.name} 不具備流言技能。`] });
    return;
  }
  // ... rest of existing logic
```

This pattern will be applied to all new commands added in Phase 2.

#### Step 3: Display skills in CityPanel
**File:** `src/components/CityPanel.tsx`

Add skill display to officer rows (after line 69):
```tsx
<span className="officer-skills">
  {o.skills.slice(0, 3).join('·')}
  {o.skills.length > 3 && `+${o.skills.length - 3}`}
</span>
```

CSS:
```css
.officer-skills { color: #a78bfa; font-size: 0.7rem; }
```

#### Step 4: Tests
**New file:** `src/utils/skills.test.ts`

```typescript
test('hasSkill returns true for officer with skill', () => { ... });
test('canUseCommand blocks officer without required skill', () => { ... });
test('canUseCommand allows officer with no requirement', () => { ... });
```

---

## 1.2 City Attribute Expansion

### Current State
All 14 new city attributes already exist in the `City` type (`src/types/index.ts:79-99`) and `makeCity()` already sets defaults (`src/data/scenarios.ts:24-34`). **However, only 7 of 14 are displayed in `CityPanel`, and none have any gameplay effect.**

### Implementation Steps

#### Step 1: Display all city attributes in CityPanel
**File:** `src/components/CityPanel.tsx:34-56`

Add the missing stat rows after `防禦`:
```tsx
<div className="stat-row"><span>治水</span><span>{city.floodControl}</span></div>
<div className="stat-row"><span>技術</span><span>{city.technology}</span></div>
<div className="stat-row"><span>民忠</span><span>{city.peopleLoyalty}</span></div>
<div className="stat-row"><span>士氣</span><span>{city.morale}</span></div>
<div className="stat-row"><span>訓練</span><span>{city.training}</span></div>

{/* Weapon inventory - only show for own cities */}
{isOwnCity && (
  <div className="stat-section">
    <h5>武器庫存</h5>
    <div className="stat-row"><span>弩</span><span>{city.crossbows}</span></div>
    <div className="stat-row"><span>軍馬</span><span>{city.warHorses}</span></div>
    <div className="stat-row"><span>衝車</span><span>{city.batteringRams}</span></div>
    <div className="stat-row"><span>投石機</span><span>{city.catapults}</span></div>
  </div>
)}
```

#### Step 2: Adjust scenario defaults for realism
**File:** `src/data/scenarios.ts`

Update `makeCity` calls to differentiate cities. Example:
```typescript
// 長安 - high tech, high defense, low flood control (inland)
makeCity(11, 4, { gold: 15000, food: 30000, troops: 50000, defense: 90, 
  technology: 60, peopleLoyalty: 40, morale: 70, training: 60,
  warHorses: 200, crossbows: 100 }),
  
// 柴桑 - river city, high flood control, naval resources
makeCity(25, 3, { troops: 15000, 
  floodControl: 80, technology: 40, peopleLoyalty: 75 }),
```

#### Step 3: Wire peopleLoyalty into monthly income
**File:** `src/store/gameStore.ts` in `endTurn` (around line 150)

Currently income is: `commerce * 0.5` gold, `agriculture * 0.8` food.

Add peopleLoyalty modifier:
```typescript
const loyaltyMultiplier = city.peopleLoyalty / 100;  // 0.0 to 1.0
const goldIncome = Math.floor(city.commerce * 0.5 * loyaltyMultiplier);
const foodIncome = Math.floor(city.agriculture * 0.8 * loyaltyMultiplier);
```

#### Step 4: Wire morale/training into battle
**File:** `src/store/battleStore.ts` in `initBattle` (around line 50)

Set unit morale from city morale:
```typescript
morale: city.morale,  // instead of hardcoded 100
```

Apply training modifier to attack calculations in `attackUnit`:
```typescript
const trainingBonus = 1 + (attackerCity.training / 200);  // +0% to +50%
const damage = Math.floor(baseDamage * trainingBonus);
```

---

## 1.3 Officer Data Expansion (~400 officers)

### Current State
`src/data/officers.ts` has 45 officers (IDs 1-87, sparse). `src/data/scenarios.ts` uses 38 in the 190 scenario. RTK IV has 454+ officers.

### Implementation Steps

#### Step 1: Add officer metadata fields
**File:** `src/types/index.ts:23-51`

Add to `Officer` interface:
```typescript
export interface Officer {
  // ... existing fields
  portraitId: number;       // NEW (from Phase 0.5.4)
  birthYear: number;        // NEW: e.g., 161 for 劉備
  deathYear: number;        // NEW: e.g., 223 for 劉備
  // age is computed: scenario.year - birthYear
}
```

#### Step 2: Update BaseOfficer type
**File:** `src/data/officers.ts:10`

```typescript
type BaseOfficer = Omit<Officer, 'factionId' | 'cityId' | 'stamina' | 'loyalty' | 'isGovernor'>;
```

This already excludes the runtime fields. Add `portraitId`, `birthYear`, `deathYear` to each entry:
```typescript
{ id: 1, name: '劉備', portraitId: 1, birthYear: 161, deathYear: 223, 
  leadership: 78, war: 72, intelligence: 75, politics: 80, charisma: 99, 
  skills: ['外交', '人才', '步兵'] },
```

#### Step 3: Add officers in batches

**Batch 1: 190 scenario officers (~80 total, ~35 new)**
Focus on officers needed for all 10 factions in scenario 189:
- 董卓 faction: 李儒, 張濟, 牛輔, 李傕, 郭汜
- 袁紹 faction: 田豐, 沮授, 審配, 逢紀, 高覽, 張郃(already exists)
- 袁術 faction: 紀靈, 張勳, 楊弘
- 劉表 faction: 蔡瑁, 蒯良, 蒯越, 文聘
- 公孫瓚 faction: 田楷, 嚴綱
- 陶謙 faction: 糜竺, 糜芳, 陳登
- 馬騰 faction: 龐德, 馬岱
- Unaffiliated: 徐庶, 孟獲(already), 張任, 嚴顏, etc.

**Batch 2: Additional historical officers for scenarios 2-6 (~300+ new)**
To be added iteratively as scenarios are built (Phase 5).

#### Step 4: Move officer data to JSON
**File:** `data/officers.json` (already exists but may need updating)

For maintainability with 400+ officers, keep the JSON file as source of truth and have `src/data/officers.ts` import and type-assert it:
```typescript
import officerData from '../../data/officers.json';
import type { Officer } from '../types';

type BaseOfficer = Omit<Officer, 'factionId' | 'cityId' | 'stamina' | 'loyalty' | 'isGovernor'>;
export const baseOfficers: BaseOfficer[] = officerData as BaseOfficer[];
```

#### Step 5: Tests
- Verify all officers have valid skills (each skill in `RTK4_SKILLS`)
- Verify all officers have birthYear < deathYear
- Verify no duplicate IDs
- Verify all officers referenced in scenarios exist in baseOfficers

---

## 1.4 Treasure / Item System (24 Items)

### Current State
No treasure system exists. No `Treasure` type, no `treasureId` on officers.

### Implementation Steps

#### Step 1: Define Treasure type
**File:** `src/types/index.ts`

Add after the `Officer` interface:
```typescript
export type TreasureType = 'book' | 'sword' | 'weapon' | 'horse' | 'seal';

export interface Treasure {
  id: number;
  name: string;
  type: TreasureType;
  /** Which stat gets a bonus when equipped */
  statBonuses: Partial<Record<'leadership' | 'war' | 'intelligence' | 'politics' | 'charisma', number>>;
  /** Special effect description (for display) */
  specialEffect: string | null;
}
```

Add to `Officer` interface:
```typescript
export interface Officer {
  // ... existing
  treasureId: number | null;  // NEW: equipped treasure id, null = none
}
```

#### Step 2: Create treasure data
**New file:** `src/data/treasures.ts`

```typescript
import type { Treasure } from '../types';

export const treasures: Treasure[] = [
  // 書 (Books) - boost intelligence/politics
  { id: 1, name: '孟德新書', type: 'book', statBonuses: { intelligence: 5, politics: 5 }, specialEffect: null },
  { id: 2, name: '太平要術', type: 'book', statBonuses: { intelligence: 8 }, specialEffect: '可使用落雷' },
  { id: 3, name: '遁甲天書', type: 'book', statBonuses: { intelligence: 10 }, specialEffect: '可使用天變/風變' },
  { id: 4, name: '孫子兵法', type: 'book', statBonuses: { leadership: 8, intelligence: 5 }, specialEffect: null },
  
  // 劍 (Swords) - boost war
  { id: 5, name: '倚天劍', type: 'sword', statBonuses: { war: 8 }, specialEffect: null },
  { id: 6, name: '青釭劍', type: 'sword', statBonuses: { war: 5, leadership: 3 }, specialEffect: null },
  { id: 7, name: '七星寶刀', type: 'sword', statBonuses: { war: 6 }, specialEffect: null },
  { id: 8, name: '古錠刀', type: 'sword', statBonuses: { war: 7 }, specialEffect: null },
  
  // 武器 (Weapons) - boost war/leadership
  { id: 9,  name: '方天畫戟', type: 'weapon', statBonuses: { war: 10 }, specialEffect: null },
  { id: 10, name: '青龍偃月刀', type: 'weapon', statBonuses: { war: 8, leadership: 3 }, specialEffect: null },
  { id: 11, name: '丈八蛇矛', type: 'weapon', statBonuses: { war: 7 }, specialEffect: null },
  { id: 12, name: '雙鐵戟', type: 'weapon', statBonuses: { war: 6 }, specialEffect: null },
  
  // 馬 (Horses) - boost leadership, movement in battle
  { id: 13, name: '赤兔馬', type: 'horse', statBonuses: { leadership: 5 }, specialEffect: '移動力+2' },
  { id: 14, name: '的盧', type: 'horse', statBonuses: { leadership: 3 }, specialEffect: '逃跑成功率+30%' },
  { id: 15, name: '爪黃飛電', type: 'horse', statBonuses: { leadership: 3 }, specialEffect: '移動力+1' },
  { id: 16, name: '絕影', type: 'horse', statBonuses: { leadership: 2 }, specialEffect: '移動力+1' },
  
  // 印 (Seals) - boost charisma/politics
  { id: 17, name: '玉璽', type: 'seal', statBonuses: { charisma: 10, politics: 5 }, specialEffect: '全軍忠誠+5' },
  { id: 18, name: '和氏璧', type: 'seal', statBonuses: { charisma: 5, politics: 3 }, specialEffect: null },
  
  // Additional items (to reach 24)
  { id: 19, name: '銅雀', type: 'seal', statBonuses: { politics: 5, charisma: 3 }, specialEffect: null },
  { id: 20, name: '六韜', type: 'book', statBonuses: { leadership: 5, intelligence: 3 }, specialEffect: null },
  { id: 21, name: '三略', type: 'book', statBonuses: { leadership: 5, intelligence: 3 }, specialEffect: null },
  { id: 22, name: '兵法二十四篇', type: 'book', statBonuses: { leadership: 10 }, specialEffect: null },
  { id: 23, name: '鐵脊蛇矛', type: 'weapon', statBonuses: { war: 5 }, specialEffect: null },
  { id: 24, name: '白馬', type: 'horse', statBonuses: { leadership: 2 }, specialEffect: '移動力+1' },
];
```

#### Step 3: Create effective stat calculation utility
**New file:** `src/utils/officers.ts`

```typescript
import type { Officer, Treasure } from '../types';
import { treasures } from '../data/treasures';

/** Get officer stats with treasure bonuses applied */
export function getEffectiveStats(officer: Officer): {
  leadership: number; war: number; intelligence: number; 
  politics: number; charisma: number;
} {
  const base = {
    leadership: officer.leadership,
    war: officer.war,
    intelligence: officer.intelligence,
    politics: officer.politics,
    charisma: officer.charisma,
  };
  
  if (officer.treasureId === null) return base;
  
  const treasure = treasures.find(t => t.id === officer.treasureId);
  if (!treasure) return base;
  
  return {
    leadership: Math.min(100, base.leadership + (treasure.statBonuses.leadership ?? 0)),
    war: Math.min(100, base.war + (treasure.statBonuses.war ?? 0)),
    intelligence: Math.min(100, base.intelligence + (treasure.statBonuses.intelligence ?? 0)),
    politics: Math.min(100, base.politics + (treasure.statBonuses.politics ?? 0)),
    charisma: Math.min(100, base.charisma + (treasure.statBonuses.charisma ?? 0)),
  };
}
```

#### Step 4: Add treasureId to Officer and scenarios
**File:** `src/types/index.ts` - Add `treasureId: number | null` to Officer
**File:** `src/data/officers.ts` - Add `treasureId: null` to all existing officers
**File:** `src/data/scenarios.ts` - `makeOfficer` sets `treasureId: null` by default

Assign initial treasures in scenario 190:
```typescript
// In scenario officer setup, after makeOfficer calls:
// 呂布 gets 方天畫戟 and 赤兔馬 — but only 1 treasure slot, so 方天畫戟
makeOfficer(70, 4, 11, { loyalty: 40 }),  // add treasureId in overrides
```

Update `makeOfficer` to accept `treasureId`:
```typescript
function makeOfficer(id, factionId, cityId, overrides = {}): Officer {
  return {
    ...base, factionId, cityId, stamina: 100,
    loyalty: overrides.loyalty ?? 80,
    isGovernor: overrides.isGovernor ?? false,
    treasureId: overrides.treasureId ?? null,  // NEW
  };
}
```

#### Step 5: Display treasures in CityPanel
**File:** `src/components/CityPanel.tsx`

In officer rows, after stats, show treasure name if equipped:
```tsx
{o.treasureId && (
  <span className="officer-treasure">
    {treasures.find(t => t.id === o.treasureId)?.name}
  </span>
)}
```

#### Step 6: Tests
**New file:** `src/utils/officers.test.ts`
- Verify `getEffectiveStats` correctly adds bonuses
- Verify stats are capped at 100
- Verify null treasureId returns base stats

---

## File Change Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `src/utils/skills.ts` | Skill utility functions and requirements map |
| Create | `src/utils/skills.test.ts` | Skill utility tests |
| Create | `src/utils/officers.ts` | Effective stat calculation with treasure bonuses |
| Create | `src/utils/officers.test.ts` | Officer utility tests |
| Create | `src/data/treasures.ts` | 24 treasure definitions |
| Modify | `src/types/index.ts` | Add `Treasure` type, `treasureId` to Officer, `birthYear`/`deathYear` |
| Modify | `src/data/officers.ts` | Add `portraitId`, `birthYear`, `deathYear`, `treasureId` to all officers |
| Modify | `src/data/scenarios.ts` | Update `makeOfficer` for treasureId, differentiate city attributes |
| Modify | `src/store/gameStore.ts` | Add skill checks to `rumor`, wire peopleLoyalty into income |
| Modify | `src/store/battleStore.ts` | Use city morale/training in battle initialization |
| Modify | `src/components/CityPanel.tsx` | Display all 14 city attrs, officer skills, treasure names |

---

## Verification Checklist

- [ ] All 22 skills defined in `RTK4_SKILLS` are used by at least one officer
- [ ] `canUseCommand` correctly gates commands by skill
- [ ] CityPanel shows all 14 city attributes
- [ ] PeopleLoyalty affects monthly gold/food income
- [ ] City morale feeds into battle unit morale
- [ ] All 24 treasures defined with valid stat bonuses
- [ ] `getEffectiveStats` correctly computes bonuses
- [ ] All officers have `birthYear`, `deathYear`, `portraitId`
- [ ] Build passes with `npm run build`
- [ ] All new tests pass with `npm test`
