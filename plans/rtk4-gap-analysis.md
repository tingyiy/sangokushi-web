# RTK IV Gap Analysis — Detailed Implementation Plan

This document compares our game's command system against the original Romance of the Three Kingdoms IV (三國志IV, 1994 Koei) and identifies every missing feature, with implementation plans for each.

**References:**
- [三國志IV — Japanese Wikipedia](https://ja.wikipedia.org/wiki/%E4%B8%89%E5%9C%8B%E5%BF%97IV) (system, skills, rank details)
- [三國志IV — Chinese Wikipedia](https://zh.wikipedia.org/wiki/%E4%B8%89%E5%9C%8B%E5%BF%97IV) (skills, scenarios, travelers)
- [RTK IV Seasonal Maps (PTT)](https://www.ptt.cc/bbs/Koei/M.1577608357.A.75F.html) (spring/summer/autumn/winter map reference)

---

## 1. RTK IV Command Categories — Overview

The original game has **7 command categories**:

| # | Category | Chinese | Our Status |
|---|----------|---------|------------|
| 1 | Military | 軍事 | **~80%** — attack, draft, transport implemented; missing multi-city attack |
| 2 | Personnel | 人事 | **~90%** — recruit, search, reward, promote, transfer, governor, advisor appointment all work |
| 3 | Diplomacy | 外交 | **~85%** — alliance, relations, ceasefire, surrender, hostage work; missing item gifts (進物) |
| 4 | Domestic | 內政 | **~95%** — commerce, agriculture, defense, train, technology, flood, manufacture, tax, relief |
| 5 | Strategy | 謀略 | **~75%** — spy, intel, rumor, arson, rebel, counter-espionage; missing 埋伏 (plant spy) |
| 6 | Merchant | 商人 | **0%** — entirely missing |
| 7 | Advisor | 助言 | **0%** — only passive end-of-turn tips exist; interactive counsel not implemented |

Additionally, RTK IV has these systems that are not tied to a specific command category:

| System | Our Status |
|--------|------------|
| Travelers (旅人) — 8 wandering NPCs | **0%** — no traces |
| Barbarian Invasions (異民族) — 山越/烏丸/羌/南蠻 | **0%** — no traces |
| Officer Injury/Illness (傷病) | **Partial** — stamina only, no injury/illness/death from overwork |
| Duel (一騎討) in CLI | **Partial** — store complete, CLI has no duel commands |

---

## 2. Current Command Coverage

### 2.1 Our 46 CLI Commands

| Category | Commands | Count |
|----------|----------|-------|
| Query | status, world, city, officer, officers, factions, log, help | 8 |
| Domestic | draft, commerce, agriculture, defense, train, technology, flood, manufacture, relief, tax | 10 |
| Personnel | recruit, recruitpow, search, reward, governor, advisor, promote, transfer, execute, dismiss | 10 |
| Military | attack, transport, retreat | 3 |
| Diplomacy | relations, alliance, breakalliance, jointattack, ceasefire, surrender, hostage | 7 |
| Strategy | spy, intel, rumor, arson, rebel, counter | 6 |
| Turn/System | end, quit | 2 |

### 2.2 Skills (27 defined, RTK IV had 24)

All 24 original RTK IV skills are implemented. We added 3 extra: 鼓舞 (Inspire), 伏兵 (Ambush), and one additional. All 13 battle tactics derived from these skills are fully functional in `battleStore.ts`.

### 2.3 Battle Tactics (13 implemented)

火計, 落石, 同討, 天變, 風變, 混亂, 連環, 落雷, 修復, 罵聲, 虛報, 鼓舞, 伏兵 — all with success formulas, terrain checks, and skill requirements.

---

## 3. Major Missing Systems

### 3.1 助言 (Advisor Counsel) — Interactive Advisory

**What RTK IV does:**
The player can actively consult their 軍師 (military advisor) or 侍中 (civil advisor) before any decision. Examples:
- "Should I attack 平原?" — Advisor evaluates relative troop strength, officer quality, terrain advantage
- "Should I recruit 呂布?" — Advisor assesses loyalty risk based on the officer's stats
- "What should I prioritize this turn?" — Advisor suggests development, military buildup, or diplomacy
- Accuracy depends on the advisor's intelligence. High INT (90+) = reliable; low INT = sometimes gives bad advice intentionally

**What we have today:**
- `src/systems/advisor.ts` (54 lines) — `getAdvisorSuggestions(state)` returns up to 3 passive suggestions at turn end. Checks: low gold/commerce, low food/agriculture, low troops, low training, disloyal officers.
- Called in `gameStore.ts` at the end of `endTurn()`.
- Advisor appointment works (`appointAdvisor` action).

**What's missing:**
- Interactive `advise <topic>` command that evaluates a specific question
- Advisor evaluation of attack viability (troop comparison, officer strength)
- Advisor evaluation of diplomacy success chance
- Inaccuracy for low-INT advisors (currently all suggestions are always correct)

**Implementation Plan:**

1. **Extend `src/systems/advisor.ts`** with new functions:
   ```
   adviseAttack(state, targetCityId) → { recommendation, reasoning, confidence }
   adviseRecruit(state, officerId) → { recommendation, reasoning, confidence }
   adviseDiplomacy(state, targetFactionId, action) → { recommendation, reasoning, confidence }
   adviseGeneral(state) → { topPriority, reasoning }
   ```

2. **Add inaccuracy mechanic**: If advisor INT < 80, there's a `(80 - INT) * 1.5`% chance the advice is deliberately wrong (recommends attack when defense is needed, etc.). This matches RTK IV where bad advisors give misleading counsel.

3. **New store action** in `gameStore.ts`:
   ```
   getAdvisorCounsel(topic: string, targetId?: number) → string
   ```
   Costs no stamina (consultation is free in RTK IV).

4. **New CLI commands**:
   - `advise attack <city>` — "Should I attack this city?"
   - `advise recruit <officer>` — "Should I recruit this officer?"
   - `advise diplomacy <faction>` — "How are relations with this faction?"
   - `advise` (no args) — "What should I focus on?"

5. **Files to modify:**
   - `src/systems/advisor.ts` — add 4 new functions (~150 lines)
   - `src/store/gameStore.ts` — add `getAdvisorCounsel` action
   - `src/cli/play.ts` — add `advise` command in `handleCommand()`

**Effort:** 1-2 days. Smallest scope of the 5 missing systems.

**Agent value:** Very high. An agent can call `advise attack 平原` as a heuristic before committing to a costly attack, without needing to implement its own evaluation logic.

---

### 3.2 商人 (Merchant) — Trading System

**What RTK IV does:**
Traveling merchants visit cities periodically. The player can:
- **Buy food** — prices fluctuate by season (cheap after autumn harvest, expensive in spring)
- **Buy/sell weapons** — 弩 (crossbow), 強弩 (heavy crossbow), horses; some items only available from merchants
- **Sell surplus goods** — convert excess food/weapons to gold
- Merchant visits are random events (higher chance for high-commerce cities)
- Prices vary by region and season

**What we have today:** Nothing. Zero traces of merchant, trade, buy, or sell in the codebase.

**Implementation Plan:**

1. **New data file** `src/data/merchants.ts`:
   ```typescript
   interface MarketPrices {
     food: { buy: number; sell: number };      // per 1000 units
     crossbows: { buy: number; sell: number };  // per 100 units
     horses: { buy: number; sell: number };     // per 100 units
   }

   // Base prices, modified by season and region
   const BASE_PRICES: MarketPrices = {
     food: { buy: 30, sell: 15 },
     crossbows: { buy: 200, sell: 100 },
     horses: { buy: 300, sell: 150 },
   };

   // Seasonal modifiers (multiplier)
   const SEASON_MODIFIERS = {
     spring: { food: 1.3 },   // food expensive before harvest
     summer: { food: 1.1 },
     autumn: { food: 0.7 },   // food cheap after harvest
     winter: { food: 1.0 },
   };
   ```

2. **Merchant visit event** in `gameStore.ts`:
   - At turn end, each player city has a `10 + (commerce / 50)`% chance of a merchant visit
   - Merchant stays for 1 month (visit this turn only)
   - Store tracks `merchantVisits: Map<cityId, MarketPrices>`

3. **New store actions**:
   ```
   buyFromMerchant(cityId, item, quantity) → void
   sellToMerchant(cityId, item, quantity) → void
   ```
   Requires merchant present in city. No stamina cost (ruler decision).

4. **New CLI commands**:
   - `market <city>` — show current merchant prices (if merchant present)
   - `buy <city> <item> <quantity>` — buy food/crossbows/horses
   - `sell <city> <item> <quantity>` — sell food/crossbows/horses

5. **Files to create:**
   - `src/systems/merchant.ts` — price calculation, seasonal modifiers (~100 lines)

6. **Files to modify:**
   - `src/store/gameStore.ts` — add merchant state, buy/sell actions, merchant visit event in `endTurn()`
   - `src/cli/play.ts` — add `market`, `buy`, `sell` commands
   - `src/types/index.ts` — add `MarketPrices` type, extend `GameState`

**Effort:** 2-3 days.

**Agent value:** Medium. Adds economic depth — agents can exploit seasonal price differences to build gold reserves.

---

### 3.3 旅人 (Travelers) — Wandering NPCs

**What RTK IV does:**
8 famous historical figures wander the map independently. When one visits a city where the ruler is present, the player can choose to meet them. Each traveler provides a unique benefit:

| Traveler | Benefit |
|----------|---------|
| 于吉 | Heals injured/sick officers. Gives treasure: 太平清領道 |
| 華佗 | Heals injured/sick officers. Gives treasure: 青嚢書 |
| 管輅 | Extends an officer's lifespan |
| 普淨 | Extends an officer's lifespan |
| 許子將 | Teaches an officer a new special ability |
| 司馬徽 | Teaches an officer a new special ability |
| 左慈 | Gives treasure: 遁甲天書三卷 (enables 天變/風變) |
| 馬鈞 | Boosts the city's technology value |

Rules:
- Travelers move randomly to adjacent cities each month
- Only 1 traveler meeting per city per month
- Traveler can also volunteer information about hidden officers or fake treasures
- Meeting is optional — player initiates with a command

**What we have today:** Nothing. The `遁甲天書` (id: 3) treasure exists in `src/data/treasures.ts` but there's no mechanism to acquire it through traveler visits.

**Implementation Plan:**

1. **New data file** `src/data/travelers.ts`:
   ```typescript
   interface Traveler {
     id: number;
     name: string;
     ability: 'heal' | 'lifespan' | 'teach_skill' | 'give_treasure' | 'boost_tech';
     treasureId?: number;  // for 左慈 → 遁甲天書
     description: string;
   }

   export const travelers: Traveler[] = [
     { id: 1, name: '于吉', ability: 'heal', description: '能治療傷病武將' },
     { id: 2, name: '華佗', ability: 'heal', description: '能治療傷病武將' },
     { id: 3, name: '管輅', ability: 'lifespan', description: '能延長武將壽命' },
     { id: 4, name: '普淨', ability: 'lifespan', description: '能延長武將壽命' },
     { id: 5, name: '許子將', ability: 'teach_skill', description: '能傳授特殊能力' },
     { id: 6, name: '司馬徽', ability: 'teach_skill', description: '能傳授特殊能力' },
     { id: 7, name: '左慈', ability: 'give_treasure', treasureId: 3, description: '持有遁甲天書三卷' },
     { id: 8, name: '馬鈞', ability: 'boost_tech', description: '能提升都市技術力' },
   ];
   ```

2. **Traveler state** in game store:
   ```typescript
   travelerLocations: { travelerId: number; cityId: number }[]
   ```
   Initialized at game start — each traveler placed in a random city.

3. **Traveler movement** in `endTurn()`:
   - Each traveler has 40% chance to move to a random adjacent city each month
   - Movement is invisible to the player until the traveler visits a player-controlled city

4. **New store actions**:
   ```
   meetTraveler(travelerId: number) → void
   ```
   Effects depend on traveler type. For `teach_skill`: picks a random skill the officer doesn't have. For `give_treasure`: one-time only (traveler won't give it again). For `boost_tech`: +10 technology to the city.

5. **New CLI commands**:
   - `travelers` — list travelers currently in your cities
   - `visit <traveler name>` — meet a traveler (if in same city as ruler)

6. **Files to create:**
   - `src/data/travelers.ts` — traveler definitions (~50 lines)
   - `src/systems/travelers.ts` — movement logic, meeting effects (~120 lines)

7. **Files to modify:**
   - `src/store/gameStore.ts` — add traveler state, `meetTraveler` action, movement in `endTurn()`
   - `src/cli/play.ts` — add `travelers`, `visit` commands
   - `src/types/index.ts` — add `Traveler` type, extend `GameState`

**Effort:** 2-3 days.

**Agent value:** Medium. Travelers provide tactical opportunities (acquire powerful treasures, learn new skills) that agents can exploit when available.

**Dependency:** Officer illness/injury system should ideally exist before implementing healers (于吉/華佗). Without it, healing travelers have no purpose. Could implement the healers as "stamina full restore" as a simpler substitute.

---

### 3.4 埋伏 (Plant Spy / Mole) — Strategic Infiltration

**What RTK IV does:**
The most powerful strategy command. You send a loyal officer to "defect" to the enemy:
1. Officer leaves your faction and joins the target city's faction (appears as a normal officer)
2. Every 2 months, the mole sends back intelligence about the enemy city
3. Before battle, the mole can **betray and switch sides**, bringing their troops with them
4. Enemy can detect moles using 做敵 (counter-espionage) — which we already implement as `counterEspionage`
5. Success requires: officer loyalty >= 95, officer must have the 埋伏 skill
6. Was so powerful that the PowerUp Kit nerfed the success rate significantly

**What we have today:**
- The `做敵` (counter-espionage) action exists but works as "turn enemy officer's loyalty" rather than "detect moles"
- The `伏兵` (ambush) battle tactic exists but is a combat move, not the strategic mole system
- No `埋伏` skill in `RTK4_SKILLS` (it was one of RTK IV's original 24 but we omitted it)

**Implementation Plan:**

1. **Add `埋伏` skill** to `RTK4_SKILLS` in `src/types/index.ts` (bringing total to 28)

2. **Mole state tracking** on officers:
   ```typescript
   // In Officer type
   isMole?: boolean;            // true if this officer is a planted spy
   moleOwnerFactionId?: number; // the faction that planted them
   moleTargetCityId?: number;   // where they were planted
   molePlantedMonth?: number;   // when (for 2-month intelligence cycle)
   ```

3. **New store actions**:
   ```
   plantSpy(officerId: number, targetCityId: number) → void
   ```
   - Officer must have 埋伏 skill and loyalty >= 95
   - Success chance: `30 + officer.intelligence / 2 + officer.charisma / 4`%
   - On success: officer moves to target city, `factionId` changes to target faction, `isMole = true`
   - On failure: officer is captured by enemy, becomes POW
   - Stamina cost: -30

4. **Intelligence reports** in `endTurn()`:
   - Every 2 months, each active mole generates an intelligence report
   - Report reveals: troop counts, gold, food, officer loyalty values for the target city
   - Delivered via `addLog()` prefixed with `【密報】`

5. **Battle betrayal**:
   - When attacking a city with an active mole, before battle starts: roll betrayal chance
   - Chance: `40 + mole.intelligence / 2`%
   - On success: mole's unit switches sides at start of battle (troops included)
   - On failure: mole is exposed, becomes POW, `isMole = false`

6. **Counter-espionage integration**:
   - Rework existing `counterEspionage` action to also detect moles
   - If target city has a mole from the counter-espionage executor's faction's enemy: chance to expose
   - Exposed moles are captured (become POW)

7. **New CLI commands**:
   - `plant <officer> <target city>` — plant a spy/mole
   - `moles` — list active moles and their last intelligence reports

8. **Files to modify:**
   - `src/types/index.ts` — add `埋伏` to `RTK4_SKILLS`, add mole fields to `Officer`
   - `src/store/gameStore.ts` — add `plantSpy` action, intelligence report logic in `endTurn()`, betrayal in battle setup
   - `src/store/battleStore.ts` — mole betrayal at battle start
   - `src/cli/play.ts` — add `plant`, `moles` commands

**Effort:** 3-4 days. Complex state tracking and battle integration.

**Agent value:** Very high. This is one of RTK IV's most strategically rich mechanics — agents that learn to use moles effectively have a major advantage.

---

### 3.5 異民族 (Barbarian Invasions) — Random Border Events

**What RTK IV does:**
Four barbarian tribes periodically attack border cities:

| Tribe | Region | Border Cities |
|-------|--------|---------------|
| 山越 | Southeast | 建業, 會稽, 廬江 |
| 烏丸 | Northeast | 薊, 北平, 代 |
| 羌 | Northwest | 天水, 武威, 安定 |
| 南蠻 | Southwest | 建寧, 永昌, 雲南 |

Barbarian attacks:
- Triggered randomly (higher chance during certain seasons)
- A barbarian army of 5,000-15,000 troops attacks a border city
- If the city has no troops, it falls automatically
- Player must defend like a normal battle
- Some scenarios allow diplomacy with barbarians (sending gifts to prevent raids)
- Barbarian officers have unique portraits and high war stats

**What we have today:** Nothing. No barbarian data, events, or tribes.

**Implementation Plan:**

1. **New data file** `src/data/barbarians.ts`:
   ```typescript
   interface BarbarianTribe {
     id: number;
     name: string;
     borderCityIds: number[];     // cities they can attack
     officers: BarbarianOfficer[];  // unique barbarian officers
     baseStrength: number;         // base troops per raid
     activeSeason: number[];       // months with higher raid chance
   }
   ```

2. **Barbarian event** in `endTurn()`:
   - Each tribe: 5% base chance per month (10% during active season)
   - If triggered: generate barbarian army with 5,000-15,000 troops
   - Army attacks a random border city belonging to any faction
   - If the target city is player-controlled: normal battle triggers
   - If AI-controlled: auto-resolve (AI defends)

3. **Barbarian officers** (unique NPCs):
   - 山越: 嚴白虎 (war 78), 祖郎 (war 72)
   - 烏丸: 蹋頓 (war 82), 丘力居 (war 68)
   - 羌: 北宮伯玉 (war 75), 韓遂's 羌 allies
   - 南蠻: 孟獲 (war 80), 祝融 (war 76), 兀突骨 (war 88), 木鹿大王 (war 70)
   - These officers exist for battle only — they cannot be recruited or captured

4. **Barbarian diplomacy** (stretch goal):
   - `appease <tribe>` — send gifts (gold/food) to reduce raid chance for 6 months
   - Cost: 2000 gold + 5000 food
   - Only works if a city borders that tribe's territory

5. **New CLI commands**:
   - `tribes` — show barbarian tribe status and threat levels
   - `appease <tribe>` — send tribute (if implemented)

6. **Files to create:**
   - `src/data/barbarians.ts` — tribe definitions, barbarian officers (~100 lines)
   - `src/systems/barbarians.ts` — raid logic, probability, army generation (~80 lines)

7. **Files to modify:**
   - `src/store/gameStore.ts` — integrate barbarian raids into `endTurn()`, auto-resolve for AI
   - `src/store/battleStore.ts` — handle barbarian units (no capture/recruit)
   - `src/cli/play.ts` — add `tribes` command

**Effort:** 3-5 days. Largest scope — new faction type, event system, special battle rules.

**Agent value:** Medium. Adds unpredictability and defensive planning requirements. Agents must keep border cities garrisoned.

**Dependency:** Requires city adjacency data to determine which cities border barbarian territory. This data already exists (`city.connections` in `src/data/cities.ts`), but we need to tag which connections face barbarian territory.

---

## 4. Smaller Gaps

| Feature | RTK IV Behavior | Our Status | Effort |
|---------|----------------|------------|--------|
| **CLI duel commands** | Duels during battle and standalone | Store complete (`duelAction` has 4 actions). CLI has zero duel support. | Small (2-4 hours) — add `duel <target>`, `duel attack/heavy/defend/flee` |
| **Multi-city attack** | Attack from 2+ cities simultaneously, units spawn on different map edges | Not implemented. `startBattle` only supports single-source attack. | Medium (2-3 days) — requires multi-source formation, spawn point logic |
| **Allied reinforcements** | Allied factions send units to help in battle | Not implemented. `requestJointAttack` exists but allies attack independently. | Medium (2-3 days) — spawn ally AI units, coordinate with existing battle AI |
| **Diplomatic gifts (進物)** | Send treasures to other factions to improve relations | `improveRelations` exists (costs gold). Cannot send specific treasures. | Small (1 day) — add `gift <faction> <treasure>` using existing treasure system |
| **More historical events** | 20+ scripted events across all scenarios | Only 2 events: 赤壁之戰, 曹操歸天 | Medium (incremental) — add events in `src/data/historicalEvents.ts` |
| **Officer injury/illness** | Officers can be injured in battle, fall ill, die from overwork. Recovery takes months. | Only stamina (recovers fully each turn). No persistent injury/illness. | Medium (2-3 days) — add health state to Officer type, recovery timer |
| **Fake treasures** | Some found treasures are counterfeits (stat bonus still applies but they're fake). Travelers can identify them. | Treasures exist but no fake/real distinction. | Small (1 day) — add `isFake` field, discovery during `search` |
| **Fortification tactics** | Defender can set traps (落とし穴/柴草) before field battle if they have a 軍師 | Not implemented | Medium (1-2 days) — pre-battle trap placement phase |

---

## 5. Proposed Implementation Order

Based on dependency chains and progressive complexity:

```
Phase 1 (Quick Wins):
  +-- CLI duel commands (2-4 hours)
  +-- Diplomatic gifts (1 day)
  +-- 助言 Advisor interactive counsel (1-2 days)

Phase 2 (Self-Contained Systems):
  +-- 商人 Merchant trading (2-3 days)
  +-- More historical events (ongoing, incremental)

Phase 3 (Complex Systems):
  +-- 旅人 Travelers (2-3 days)
  |     depends on: treasure system (done), optionally officer illness
  +-- Officer injury/illness (2-3 days)
        enables: traveler healing, battle injury consequences

Phase 4 (Advanced):
  +-- 埋伏 Plant Spy (3-4 days)
  |     depends on: adding 埋伏 skill, integrating with battle betrayal
  +-- 異民族 Barbarian invasions (3-5 days)
        depends on: border city tagging, barbarian officer data

Phase 5 (Battle Enhancements):
  +-- Multi-city attack (2-3 days)
  +-- Allied reinforcements (2-3 days)
  +-- Pre-battle fortification (1-2 days)
```

**Total estimated effort:** 20-30 days for all features.

---

## 6. File Impact Summary

| File | Changes Needed |
|------|---------------|
| `src/types/index.ts` | Add 埋伏 skill, mole fields on Officer, MarketPrices type, traveler types, barbarian types |
| `src/store/gameStore.ts` | Add ~8 new actions (advise, buy, sell, meetTraveler, plantSpy, etc.), extend `endTurn()` with merchant visits, traveler movement, mole reports, barbarian raids |
| `src/store/battleStore.ts` | Mole betrayal at battle start, barbarian unit handling |
| `src/cli/play.ts` | Add ~12 new commands (advise, market, buy, sell, travelers, visit, plant, moles, duel, tribes, gift) |
| `src/systems/advisor.ts` | Extend from 54 lines to ~200 lines with interactive counsel functions |
| `src/systems/merchant.ts` | **New** — price calculation, seasonal modifiers (~100 lines) |
| `src/systems/travelers.ts` | **New** — movement logic, meeting effects (~120 lines) |
| `src/systems/barbarians.ts` | **New** — raid logic, army generation (~80 lines) |
| `src/data/travelers.ts` | **New** — 8 traveler definitions (~50 lines) |
| `src/data/barbarians.ts` | **New** — 4 tribe definitions, barbarian officers (~100 lines) |
| `src/data/merchants.ts` | **New** — base prices, seasonal modifiers (~60 lines) |
| `src/data/historicalEvents.ts` | Add ~15-20 more events (incremental) |
