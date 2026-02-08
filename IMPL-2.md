# Implementation Plan: Phase 2 -- Command Expansion

> **Depends on:** Phase 1 (skills, city attrs, treasures)
> **Estimated effort:** ~2 weeks
> **Priority:** High

---

## Architecture Note

All new commands follow the same pattern as existing ones in `src/store/gameStore.ts`:
1. Add action signature to `GameState` interface (around line 20-80)
2. Implement action in the `create()` block
3. Validate: selected city is owned, governor exists, has stamina, has required skill
4. Deduct costs (gold, food, stamina)
5. Apply effect (modify city/officer/faction state)
6. Log result via `addLog()`
7. Wire into `CommandMenu` UI

**Governor pattern:** Most commands are executed by the city governor. Find governor:
```typescript
const governor = state.officers.find(o => 
  o.cityId === city.id && o.isGovernor && o.factionId === state.playerFaction?.id
);
if (!governor || governor.stamina < STAMINA_COST) { /* reject */ }
```

---

## 2.1 內政 (Internal Affairs) Expansion

### Existing: `developCommerce`, `developAgriculture`, `reinforceDefense`

### New Commands

#### 治水 (Flood Control)
**Store action:** `developFloodControl(cityId: number)`
- **Cost:** 500 gold, 20 stamina
- **Effect:** `floodControl += 8 + politics / 15` (cap at 100)
- **Skill required:** None
- **File:** `src/store/gameStore.ts` -- add after `reinforceDefense` (line ~277)

#### 技術開發 (Technology)
**Store action:** `developTechnology(cityId: number)`
- **Cost:** 800 gold, 25 stamina
- **Effect:** `technology += 5 + intelligence / 20` (cap at 100)
- **Skill required:** None
- **File:** `src/store/gameStore.ts`

#### 訓練 (Train Troops)
**Store action:** `trainTroops(cityId: number)`
- **Cost:** 500 food, 20 stamina. Requires troops > 0.
- **Effect:** `training += 8 + leadership / 15`, `morale += 3` (cap at 100)
- **Skill required:** None
- **File:** `src/store/gameStore.ts`

#### 製造 (Manufacture)
**Store action:** `manufacture(cityId: number, weaponType: 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults')`
- **Cost:** 1000 gold, 30 stamina
- **Skill required:** `製造`
- **Tech gates:** crossbows at tech ≥ 30, warHorses ≥ 40, batteringRams ≥ 60, catapults ≥ 80
- **Effect:** Produces `10 + technology / 10` units of the chosen weapon
- **File:** `src/store/gameStore.ts`

#### 賑災 (Disaster Relief)
**Store action:** `disasterRelief(cityId: number)`
- **Cost:** 500 gold + 1000 food, 15 stamina
- **Effect:** `peopleLoyalty += 15 + politics / 10` (cap at 100)
- **Skill required:** None
- **File:** `src/store/gameStore.ts`

### UI Changes
**File:** `src/components/menu/CommandMenu.tsx:50-61`

Expand 內政 section:
```tsx
{activeCommandCategory === '內政' && (
  <>
    <button onClick={() => developCommerce(city.id)}>商業開發（500金）</button>
    <button onClick={() => developAgriculture(city.id)}>農業開發（500金）</button>
    <button onClick={() => reinforceDefense(city.id)}>強化城防（300金）</button>
    <button onClick={() => developFloodControl(city.id)}>治水（500金）</button>
    <button onClick={() => developTechnology(city.id)}>技術開發（800金）</button>
    <button onClick={() => trainTroops(city.id)}>訓練（500糧）</button>
    {/* Manufacture sub-menu */}
    <button onClick={() => manufacture(city.id, 'crossbows')}>製造弩（1000金）</button>
    <button onClick={() => manufacture(city.id, 'warHorses')}>製造軍馬（1000金）</button>
    <button onClick={() => manufacture(city.id, 'batteringRams')}>製造衝車（1000金）</button>
    <button onClick={() => manufacture(city.id, 'catapults')}>製造投石機（1000金）</button>
    <button onClick={() => disasterRelief(city.id)}>賑災（500金+1000糧）</button>
  </>
)}
```

---

## 2.2 軍事 (Military) Expansion

### Existing: `draftTroops`, `startDuel`, `startBattle`

### New Commands

#### 輸送 (Transport)
**Store action:** `transport(fromCityId: number, toCityId: number, resource: 'gold' | 'food' | 'troops', amount: number)`
- **Cost:** 20 stamina for the transporting officer
- **Validation:** Cities must be adjacent, both owned by player, have sufficient resources
- **Effect:** Deduct from source, add to destination
- **UI:** Show adjacent own cities as targets, with resource type and amount selector

#### 移動 (Officer Transfer) — cross-listed with 人事
**Store action:** `transferOfficer(officerId: number, targetCityId: number)`
- **Cost:** 10 stamina for the moving officer
- **Validation:** Both cities owned by player, cities must be adjacent or connected
- **Effect:** Change officer's `cityId`. If governor, unset `isGovernor`.

#### 軍團編成 (Army Formation)
This is a pre-battle setup, not a standalone command. Implementation:
- Before `startBattle`, show a formation dialog listing available officers and city weapons
- Player assigns officers to up to 5 units, chooses unit type per officer:
  - Infantry (步兵): default, no weapon required
  - Cavalry (騎兵): requires warHorses > 0, deducts warHorses from city
  - Archer (弓兵): requires crossbows > 0, deducts crossbows from city
- Store selected formation in `battleConfig` state before transitioning to battle

**New state in gameStore:**
```typescript
battleFormation: {
  officerIds: number[];
  unitTypes: UnitType[];  // parallel array
} | null;
```

**New component:** `src/components/FormationDialog.tsx`
- Modal overlay shown when player clicks 出征
- Lists officers in selected city with stamina > 0
- Checkboxes to select (max 5)
- Dropdown per officer: 步兵/騎兵/弓兵 (gated by city weapons)
- 出陣 button confirms and starts battle

#### 配備 (Equip Weapons)
This is handled by the formation dialog above. Weapon deduction happens when forming the army, not as a separate command.

### UI Changes
**File:** `src/components/menu/CommandMenu.tsx:63-88`

```tsx
{activeCommandCategory === '軍事' && (
  <>
    {/* Draft troops - existing */}
    <button onClick={() => draftTroops(city.id, 1000)}>徵兵 1000</button>
    <button onClick={() => draftTroops(city.id, 5000)}>徵兵 5000</button>
    
    {/* Transport to adjacent own cities */}
    <h5>輸送</h5>
    {adjacentOwnCities.map(adj => (
      <TransportButton key={adj.id} from={city} to={adj} />
    ))}
    
    {/* Attack with formation */}
    <h5>出征</h5>
    {adjacentEnemyCities.map(adj => (
      <button key={adj.id} onClick={() => openFormationDialog(adj.id)}>
        出征 {adj.name}
      </button>
    ))}
  </>
)}
```

---

## 2.3 人事 (Personnel) Expansion

### Existing: `recruitOfficer`

### New Commands

#### 搜索 (Search)
**Store action:** `searchOfficer(cityId: number)`
- **Cost:** 15 stamina
- **Effect:** Rolls for discovery. Base chance = `30 + charisma / 2`% per hidden officer.
  - If officer found: reveal them (already in city, just show notification)
  - If treasure found: `Math.random() < 0.15` chance to find a treasure from pool
- **Skill required:** `人才` skill increases chance by +15%

#### 登用 (Recruit Captured / POW)
**Store action:** `recruitPOW(officerId: number)`
- **Cost:** 15 stamina
- **Effect:** Attempt to recruit a captured officer. Success = `40 + charisma - officer.loyalty / 2`%
- **Requires:** Officer must be in POW status (Phase 3.5 -- can stub with a `pow` list on faction)
- **On success:** Officer joins player faction, assigned to current city

#### 褒賞 (Reward)
**Store action:** `rewardOfficer(officerId: number, type: 'gold' | 'treasure', amount?: number)`
- Gold reward: Cost 500-2000 gold, increases loyalty by `5 + amount / 500`
- Treasure reward: Give a treasure to officer (increases loyalty by 10-20 based on treasure value)
- **Validation:** Officer must be in player faction
- **File:** `src/store/gameStore.ts`

#### 處斬 (Execute)
**Store action:** `executeOfficer(officerId: number)`
- **Effect:** Remove officer from game. All officers with high affinity lose 5-10 loyalty.
- **Validation:** Officer must be a POW
- For now, implement without affinity system (just remove officer)

#### 追放 (Dismiss)
**Store action:** `dismissOfficer(officerId: number)`
- **Effect:** Set officer `factionId = null`. They become unaffiliated in current city.
- **Validation:** Officer is in player faction, is not the ruler

#### 太守任命 (Appoint Governor)
**Store action:** `appointGovernor(cityId: number, officerId: number)`
- **Effect:** Unset current governor's `isGovernor`, set new officer's `isGovernor = true`
- **Validation:** Officer is in the same city, in player faction

#### 軍師任命 (Appoint Advisor)
**Store action:** `appointAdvisor(officerId: number)`
- **New state:** `advisorId: number | null` on `Faction` type
- **Effect:** Set `faction.advisorId`. Advisor provides suggestions (Phase 6.1)
- **Validation:** Officer is in player faction

### UI Changes
**File:** `src/components/menu/CommandMenu.tsx:90-105`

```tsx
{activeCommandCategory === '人事' && (
  <>
    <button onClick={() => searchOfficer(city.id)}>搜索</button>
    
    {/* Recruit unaffiliated - existing */}
    {unaffiliated.map(o => (
      <button key={o.id} onClick={() => recruitOfficer(o.id)}>招攬 {o.name}</button>
    ))}
    
    {/* Reward own officers */}
    <h5>褒賞</h5>
    {ownOfficers.map(o => (
      <button key={o.id} onClick={() => rewardOfficer(o.id, 'gold', 1000)}>
        褒賞 {o.name}（1000金）
      </button>
    ))}
    
    {/* Governor appointment */}
    <h5>太守任命</h5>
    {ownOfficers.filter(o => !o.isGovernor).map(o => (
      <button key={o.id} onClick={() => appointGovernor(city.id, o.id)}>
        任命 {o.name} 為太守
      </button>
    ))}
    
    {/* Transfer officers */}
    <h5>移動</h5>
    {ownOfficers.filter(o => !o.isGovernor).map(o => (
      <OfficerTransferButton key={o.id} officer={o} adjacentCities={adjacentOwnCities} />
    ))}
    
    {/* Dismiss */}
    {ownOfficers.filter(o => o.id !== playerFaction?.rulerId).map(o => (
      <button key={o.id} onClick={() => dismissOfficer(o.id)} className="btn-danger">
        追放 {o.name}
      </button>
    ))}
  </>
)}
```

---

## 2.4 外交 (Diplomacy) Expansion

### Existing: `improveRelations`, `formAlliance`

### New Commands

#### 共同作戰 (Joint Attack)
**Store action:** `requestJointAttack(allyFactionId: number, targetCityId: number)`
- **Cost:** 20 stamina, requires existing alliance
- **Effect:** AI ally attacks target city on next turn (if they have adjacent city with troops)
- **Success rate:** `50 + politics / 5`%
- **Requires:** `外交` skill boosts success +15%

#### 停戰 (Ceasefire)
**Store action:** `proposeCeasefire(targetFactionId: number)`
- **Cost:** 1000 gold, 20 stamina
- **Effect:** On success, set hostility to 20 and add ceasefire flag (12-month duration)
- **Success:** `30 + politics / 3 + (100 - hostility) / 5`%
- **New state:** `ceasefires: { factionId: number; expiresMonth: number; expiresYear: number }[]` on Faction

#### 勸降 (Demand Surrender)
**Store action:** `demandSurrender(targetFactionId: number)`
- **Cost:** 20 stamina
- **Effect:** If target faction is very weak (< 1 city, low troops), they may surrender
- **Success:** Based on power ratio. Very low base rate unless overwhelming.
- **On success:** All target cities and officers transfer to player

#### 破棄 (Break Alliance)
**Store action:** `breakAlliance(targetFactionId: number)`
- **Cost:** None (but has consequences)
- **Effect:** Remove alliance. Increase hostility by 40. All factions' hostility toward player +10.
- **Validation:** Must have active alliance with target

#### 人質 (Hostage Exchange)
**Store action:** `exchangeHostage(officerId: number, targetFactionId: number)`
- **Cost:** None
- **Effect:** Officer sent as hostage cannot act. Solidifies alliance (alliance break causes hostage death).
- **New state:** `hostageOfficerIds: number[]` on Faction

### UI Changes
**File:** `src/components/menu/CommandMenu.tsx:107-134`

Add new buttons for each faction in the diplomacy section, showing available actions based on relationship status.

---

## 2.5 謀略 (Strategy) Expansion

### Existing: `rumor`

### New Commands

#### 反間 (Counter-espionage)
**Store action:** `counterEspionage(targetCityId: number, targetOfficerId: number)`
- **Cost:** 800 gold, 20 stamina
- **Skill required:** `做敵`
- **Effect:** Attempt to reduce target officer loyalty. `success = 30 + intelligence / 3 - targetLoyalty / 4`%
- **On success:** Target loyalty decreases by `10 + intelligence / 10`

#### 煽動 (Incite Rebellion)
**Store action:** `inciteRebellion(targetCityId: number)`
- **Cost:** 1000 gold, 25 stamina
- **Skill required:** `驅虎`
- **Effect:** Reduce target city `peopleLoyalty` by `10 + intelligence / 8`. May cause troop desertion (5% of troops leave if peopleLoyalty < 30).

#### 放火 (Arson)
**Store action:** `arson(targetCityId: number)`
- **Cost:** 500 gold, 20 stamina
- **Skill required:** `燒討`
- **Effect:** Destroy `10-20%` of target city gold and food. `success = 25 + intelligence / 3`%

#### 諜報 (Espionage) -- Wire existing SpyingSystem
**Store action:** `spy(targetCityId: number)`
- **Cost:** 500 gold, 15 stamina
- **Skill required:** `情報` or `諜報`
- **Effect:** Reveal target city stats for 3 months (store reveal timestamp)
- **Integration:** Adapt `src/game/spy/SpyingSystem.ts` interface to use game `Officer` type, call from store action

#### 密偵 (Intelligence Gathering)
**Store action:** `gatherIntelligence(targetCityId: number)`
- **Cost:** 300 gold, 15 stamina
- **Skill required:** `情報`
- **Effect:** Same as spy but also reveals officer details (loyalty, stamina)
- **Note:** Foundation for fog of war (Phase 6.3)

### UI Changes
**File:** `src/components/menu/CommandMenu.tsx:136-161`

Expand 謀略 section to show all new commands for each adjacent enemy city, with skill-gating (gray out if governor lacks required skill).

---

## File Change Summary

| Action | File | Description |
|--------|------|-------------|
| Modify | `src/types/index.ts` | Add `advisorId` to Faction, ceasefire/hostage types |
| Modify | `src/store/gameStore.ts` | Add ~20 new store actions |
| Modify | `src/components/menu/CommandMenu.tsx` | Wire all new commands into UI |
| Create | `src/components/FormationDialog.tsx` | Pre-battle army formation modal |
| Create | `src/components/TransportDialog.tsx` | Resource transport modal (optional) |
| Modify | `src/store/battleStore.ts` | Accept formation config in `initBattle` |

### Store Action Count

| Category | Existing | New | Total |
|----------|----------|-----|-------|
| 內政 | 3 | 6 | 9 |
| 軍事 | 3 | 2 | 5 |
| 人事 | 1 | 7 | 8 |
| 外交 | 2 | 5 | 7 |
| 謀略 | 1 | 5 | 6 |
| **Total** | **10** | **25** | **35** |

---

## Verification Checklist

- [ ] All 6 new 內政 commands work with correct cost/effect
- [ ] 製造 is gated by `製造` skill and technology level
- [ ] Transport moves resources between adjacent own cities
- [ ] FormationDialog allows unit type selection gated by weapons
- [ ] All 7 人事 commands work (search, reward, appoint, dismiss, transfer)
- [ ] Governor appointment updates `isGovernor` correctly
- [ ] All 5 外交 commands work with correct success formulas
- [ ] Ceasefire has 12-month expiry tracked in state
- [ ] All 5 謀略 commands gated by correct skills
- [ ] SpyingSystem integrated from `src/game/spy/` into store
- [ ] CommandMenu UI shows/hides commands based on skill availability
- [ ] Build passes, lint clean, tests pass
