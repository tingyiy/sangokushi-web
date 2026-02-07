# PLAN.md — Bridging the Gap to RTK IV (三國志IV)

Reference: https://chiuinan.github.io/game/game/intro/ch/c32/san4.htm

This document analyzes the gap between the current web remake and the original **Romance of the Three Kingdoms IV** (三國志IV, KOEI 1994), then provides a phased implementation plan to close that gap.

---

## Part 1: Gap Analysis

### Legend

| Symbol | Meaning |
|--------|---------|
| **Done** | Fully implemented and functional |
| **Partial** | Exists but incomplete or disconnected |
| **Missing** | Not implemented at all |

---

### 1.1 Scenarios & Setup

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| 6 historical scenarios (190–234 AD) | 6 periods with distinct faction layouts | 1 scenario (190 AD only) | **Partial** |
| Multiple playable factions per scenario | Up to 19 factions selectable (incl. 3 custom) | 10 factions, all selectable | **Partial** |
| Create custom ruler/officers (新君主) | 3 custom ruler slots per scenario | Not implemented | **Missing** |
| Multiplayer (hot-seat) | Multiple human players | Single player only | **Missing** |
| Password protection per player | Yes | N/A | **Missing** |
| Save / Load game | Yes | Not implemented | **Missing** |

### 1.2 Officer System

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| 5 base attributes (統率/武力/智力/政治/魅力) | Yes | Yes (leadership/war/intelligence/politics/charisma) | **Done** |
| Stamina (體力) | Depletes on action, recovers per turn | Modeled but not consumed by actions | **Partial** |
| Loyalty (忠誠) | Affected by rewards, rumors, events | Exists; only affected by rumors | **Partial** |
| Special Skills (特異功能) — 22 skills | 4 categories: Diplomacy, Intel, Battle Tactics, etc. | Only 5 unit-type aptitudes stored (步/騎/弓/水/計); not used mechanically | **Partial** |
| Skill: 外交 (Diplomacy) | Required for diplomacy commands | Anyone can do diplomacy | **Missing** |
| Skill: 情報 (Intelligence/Spy) | Required for 密偵 | Not gated by skill | **Missing** |
| Skill: 人才 (Talent Search) | Required for recruitment/search | Not gated by skill | **Missing** |
| Skill: 製造 (Manufacture) | Required for building weapons | No manufacturing system | **Missing** |
| Skill: 反間 (Counter-espionage/Bribery) | Cause enemy officers to defect in battle | Not implemented | **Missing** |
| Skill: 煽動 (Incite Rebellion) | Make enemy governor declare independence | Not implemented | **Missing** |
| Skill: 造謠 (Rumor) | Required for rumor command | Rumor exists but not skill-gated | **Missing** |
| Skill: 火攻 (Arson) | Burn enemy city resources | Command not implemented (fire system exists for battle only) | **Missing** |
| Skill: 諜報 (Espionage) | Steal tech/commerce/agriculture from enemy city | SpyingSystem exists but disconnected | **Partial** |
| Battle skills: 步兵/騎兵/弓兵/海戰 | Boost effectiveness of matching unit type | Stored but have no mechanical effect | **Partial** |
| Battle skills: 火計/落石/混亂/連環/雷擊/etc. | 14 battle tactics usable in combat | FireAttackSystem exists but disconnected; rest missing | **Partial** |
| Skill: 修復 (Repair) | Repair gate during siege defense | Not implemented | **Missing** |
| Skill: 罵聲 (Taunt) | Lower enemy morale in battle | Not implemented | **Missing** |
| Skill: 謊報 (False Report) | Make enemy reinforcements retreat | Not implemented | **Missing** |
| Officer military rank (軍師/侍中/武將) | Promotable ranks affecting commands | Not implemented | **Missing** |
| Officer aging, illness, and natural death | Officers age, can fall ill (青囊書 cures), die of old age | Not implemented | **Missing** |
| Officer blood relations & oaths | Loyalty bonus, cannot be bribed | Not implemented | **Missing** |
| Officer imprisonment & persuasion | Captured officers held until persuaded or executed | Not implemented | **Missing** |

### 1.3 Treasures & Items (寶物)

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| 24 unique treasures | Books, swords, spears, horses, Imperial Seal | Not implemented | **Missing** |
| Stat bonuses from items | Weapons: +2–10 武力; Books: +1–8 智力/政治; Seal: 統率+魅力→100 | N/A | **Missing** |
| Item discovery via search | Found by officers with 人才 skill | N/A | **Missing** |
| Item transfer between officers | Reward items to raise loyalty | N/A | **Missing** |
| Horses affect duel outcomes | Named horses (赤兔/的蘆/爪黃飛電) prevent enemy escape | N/A | **Missing** |

### 1.4 City & Economy

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| City attributes (人口/金/糧/兵/商業/農業) | Yes | Yes | **Done** |
| City defense (防禦) | Used in siege battles | Exists but not used in battle calculations | **Partial** |
| City technology (技術) | Determines weapon manufacturing tier | Not implemented | **Missing** |
| Flood control (治水) | Reduces flood damage | Not implemented | **Missing** |
| Training (訓練) | Improves troop quality / battle effectiveness | Not implemented | **Missing** |
| City morale (士氣) | Affects battle performance | Not implemented at city level | **Missing** |
| Population loyalty (民忠) | Affects tax income, rebellion risk | Not implemented | **Missing** |
| Monthly food consumption by troops | Troops eat food each turn | Not implemented — troops are free to maintain | **Missing** |
| Seasonal income variation | Spring planting, autumn harvest bonuses | No seasonal effects | **Missing** |
| Weapon manufacturing (弩/強弩/連弩/衝車/投石車) | 5 tiers of weapons buildable based on tech level | Not implemented | **Missing** |
| Transfer resources between cities | Move gold/food/troops between owned cities | Not implemented | **Missing** |
| Move officers between cities | Reassign officers to other cities | Not implemented | **Missing** |

### 1.5 Commands — Internal Affairs (內政)

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| Develop Commerce (商業開發) | Yes | Yes (+10 + politics bonus) | **Done** |
| Develop Agriculture (農業開發) | Yes | Yes (+10 + politics bonus) | **Done** |
| Reinforce Defense (城防強化) | Yes | Yes (+5, max 100) | **Done** |
| Develop Technology (技術研究) | Raise tech level for weapons | Not implemented | **Missing** |
| Flood Control (治水) | Reduce flood/disaster damage | Not implemented | **Missing** |
| Train Troops (訓練) | Improve troop quality | Not implemented | **Missing** |
| Manufacture Weapons (製造) | Build military equipment | Not implemented | **Missing** |

### 1.6 Commands — Military (軍事)

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| Draft troops (徵兵) | Yes, scales with population | Yes, 3 tiers (1k/5k/10k) | **Done** |
| Attack adjacent city (出征) | Triggers siege or field battle | Triggers hex battle (no siege distinction) | **Partial** |
| Move troops between cities | March armies along paths | Not implemented | **Missing** |
| Duel challenge (單挑) | Part of battle; affects battle outcome | Standalone screen; no consequences on win/loss | **Partial** |
| Equip weapons to armies | Assign 弩/衝車/投石車 to battle units | Not implemented | **Missing** |
| Reinforcements (援軍) | Send additional armies mid-battle | Not implemented | **Missing** |

### 1.7 Commands — Personnel (人事)

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| Recruit unaffiliated (招攬) | Yes, based on charisma vs politics | Yes | **Done** |
| Search for hidden officers (探索) | Discover undiscovered officers/items in a city | Not implemented | **Missing** |
| Reward officer with gold (褒賞) | Increase loyalty by spending gold | Not implemented | **Missing** |
| Promote officer rank (升官) | 軍師/侍中/武將 ranks | Not implemented | **Missing** |
| Transfer officer to another city | Reassign officers between cities | Not implemented | **Missing** |
| Exile / Release officer (追放) | Dismiss from service | Not implemented | **Missing** |

### 1.8 Commands — Diplomacy (外交)

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| Improve relations (贈呈) | Gift gold to reduce hostility | Yes | **Done** |
| Form alliance (結盟) | Mutual alliance pact | Yes | **Done** |
| Break alliance (解盟) | End an existing alliance | Not implemented | **Missing** |
| Demand surrender (勸降) | Force weaker faction to capitulate | Not implemented | **Missing** |
| Request ceasefire (停戰) | Temporary peace agreement | Not implemented | **Missing** |
| Joint attack proposal (共同作戦) | Coordinate with ally to attack | Not implemented | **Missing** |
| Requires 外交 skill | Only skilled officers can do diplomacy | Not skill-gated | **Missing** |

### 1.9 Commands — Strategy/Espionage (謀略)

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| Rumor (流言) | Lower loyalty and population | Yes (targets adjacent enemy city) | **Done** |
| Spy (密偵) | Reveal enemy city details over time | SpyingSystem class exists; not connected to UI/store | **Partial** |
| Bribery / Counter-espionage (反間) | Make enemy officer defect during battle | Not implemented | **Missing** |
| Incite Rebellion (煽動) | Governor declares independence | Not implemented | **Missing** |
| Arson (燒討/火攻) | Burn enemy city resources | Not implemented (only battle fire exists) | **Missing** |
| Espionage/Tech Theft (諜報) | Steal tech/commerce from enemy | SpyingSystem exists but disconnected | **Partial** |

### 1.10 Battle System

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| Siege battle (城門攻防戰) | Primary battle type; attack city gate | No siege mechanics; all battles are field battles | **Missing** |
| Field battle (野戰) | Open terrain combat | Hex-grid battle exists (15x15) | **Partial** |
| Unit types: Infantry/Cavalry/Archer | Different stats and movement | All units are infantry; types stored but unused | **Partial** |
| Weapon equipment (弩/連弩/衝車/投石車) | Equippable per army; drastically affects combat | Not implemented | **Missing** |
| Battle tactics (火計/落石/混亂/連環/etc.) | 14 tactical skills usable in combat | FireAttackSystem exists but disconnected; rest missing | **Partial** |
| Weather effects (天氣) | Rain boosts 弩 damage; enables 雷擊 | Weather tracked but has no effect | **Partial** |
| Wind direction (風向) | Affects fire spread direction | Not implemented | **Missing** |
| Terrain effects in battle | Forest, mountain, river affect movement/combat | Terrain affects move cost only; no combat effects | **Partial** |
| City gate HP and repair | Gate must be breached; defenders can repair | Not implemented | **Missing** |
| Gate breach resolution (武力/兵力決勝負) | Choose officer duel or army clash | Not implemented | **Missing** |
| Naval combat (海戰) | Water-based battle mechanics | Not implemented | **Missing** |
| Officer capture after battle | Defeated officers can be captured/executed | Not implemented | **Missing** |
| Morale system in battle | Morale affects combat effectiveness | Morale tracked but has no mechanical effect | **Partial** |
| Battle AI (defender) | AI moves and attacks | AI units are completely passive (no AI logic) | **Missing** |
| Single combat during battle (單挑) | Challenge officer during tactical battle | Duel is separate screen; not integrated into battle | **Partial** |
| Retreat mechanics | Armies can retreat with losses | Retreat button exists; no penalties | **Partial** |
| Day limit (30 days) | Attacker loses if time runs out | Implemented | **Done** |
| City ownership transfer on victory | Winner takes the city | Not implemented (TODO in code) | **Missing** |

### 1.11 AI

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| AI internal development | AI builds commerce/agriculture/defense | Not implemented | **Missing** |
| AI military actions | AI drafts troops, attacks neighbors | Not implemented | **Missing** |
| AI diplomacy | AI forms alliances, breaks them | Not implemented | **Missing** |
| AI recruitment | AI recruits unaffiliated officers | Not implemented | **Missing** |
| AI battle tactics | AI moves units, uses tactics | Battle AI completely absent (units are static) | **Missing** |
| AI difficulty/personality | Different AI personalities per ruler | Not implemented | **Missing** |

### 1.12 Game Flow & Victory

| Feature | RTK IV | Current | Status |
|---------|--------|---------|--------|
| Victory condition (unify China) | Conquer all 43 cities | Not implemented | **Missing** |
| Faction elimination | Faction removed when losing all cities | Not implemented | **Missing** |
| Game over screen | Special ending scene | Not implemented | **Missing** |
| Random events (disasters, etc.) | Floods, plagues, droughts, bumper harvests | Not implemented | **Missing** |
| Officer discovery events | Visit 許子將/司馬徽 to learn skills | Not implemented | **Missing** |
| Advisor suggestions | Advisor recommends actions each turn | Not implemented | **Missing** |
| Change player control mid-game | Take over another faction during AI play | Not implemented | **Missing** |

---

## Part 2: Implementation Plan

The plan is divided into **6 phases**, ordered by priority: core gameplay loop first, then depth, then polish. Each phase is designed to produce a playable improvement on its own.

---

### Phase 1: Core Gameplay Loop (Critical)

*Goal: Make the game actually playable end-to-end — win battles, take cities, eliminate factions, win the game.*

#### 1.1 City Ownership Transfer After Battle
- When attacker wins, transfer `city.factionId` to attacker's faction
- Transfer remaining defender officers to captured/unaffiliated status
- Update game log with conquest message
- **Files**: `src/store/gameStore.ts`, `src/store/battleStore.ts`

#### 1.2 Faction Elimination
- After city transfer, check if the losing faction owns 0 cities
- Mark faction as eliminated; redistribute unaffiliated officers
- Log elimination event
- Handle edge case: ruler captured -> faction destroyed
- **Files**: `src/store/gameStore.ts`

#### 1.3 Victory Condition
- Check after each city conquest: does player own all 43 cities?
- Add `victory` phase and `VictoryScreen` component
- Show final stats (years elapsed, officers, battles won)
- Add game over condition when player loses all cities
- **Files**: `src/store/gameStore.ts`, new `src/components/VictoryScreen.tsx`

#### 1.4 Officer Capture & Imprisonment
- Defeated officers have a chance to be captured (based on charisma difference)
- Captured officers can be: recruited (招降), imprisoned (囚禁), or executed (處斬)
- Imprisoned officers lose hostility over time, eventually recruitable
- **Files**: `src/store/gameStore.ts`, `src/types/index.ts`

#### 1.5 Duel Consequences
- Integrate duel into battle flow or pre-battle challenge
- Losing duel: officer killed or captured, troops lose morale
- Winning duel: enemy troops morale drops, possible rout
- **Files**: `src/store/gameStore.ts`, `src/components/DuelScreen.tsx`

#### 1.6 Save / Load System
- Serialize full game state to JSON
- Save to `localStorage` (with export/import as file)
- Load game option on title screen
- Auto-save each turn
- **Files**: `src/store/gameStore.ts`, `src/components/TitleScreen.tsx`

#### 1.7 Stamina Consumption
- Each command action costs stamina (e.g. develop: -20, recruit: -15, attack: -30)
- Officers with 0 stamina cannot perform actions
- Enforces strategic decisions about officer usage per turn
- **Files**: `src/store/gameStore.ts`

---

### Phase 2: AI System (Critical)

*Goal: AI factions take meaningful actions so the game is not a static sandbox.*

#### 2.1 AI Turn Framework
- After player ends turn, loop through each AI faction
- Each AI faction evaluates its cities and makes decisions
- Rate-limit AI actions to keep turns fast
- **Files**: new `src/game/ai/AIManager.ts`, `src/store/gameStore.ts`

#### 2.2 AI Internal Development
- AI invests in commerce/agriculture for cities with low values
- Priority: agriculture first (food is critical), then commerce, then defense
- **Files**: `src/game/ai/AIManager.ts`

#### 2.3 AI Military
- AI drafts troops when population allows and gold/food are sufficient
- AI attacks adjacent weak cities when troops are overwhelming (2:1 ratio)
- AI avoids attacking allies
- **Files**: `src/game/ai/AIManager.ts`

#### 2.4 AI Recruitment
- AI attempts to recruit unaffiliated officers in its cities
- Prioritize officers with high war or intelligence stats
- **Files**: `src/game/ai/AIManager.ts`

#### 2.5 AI Diplomacy
- AI improves relations with neighbors when hostility is high
- AI forms alliances with factions sharing a common strong enemy
- **Files**: `src/game/ai/AIManager.ts`

#### 2.6 Battle AI
- AI units move toward nearest enemy
- AI units attack when adjacent to an enemy
- Simple priority: target weakest nearby enemy unit
- Later: use terrain advantageously (archers on mountains, etc.)
- **Files**: `src/store/battleStore.ts`, new `src/game/ai/BattleAI.ts`

---

### Phase 3: Officer & Personnel Depth

*Goal: Make officers feel like valuable, distinct assets — not interchangeable pawns.*

#### 3.1 Special Skills System (特異功能)
- Implement the full 22-skill system from RTK IV, organized in 4 categories:
  - **Strategic**: 外交, 情報, 人才, 製造, 反間, 煽動, 造謠, 燒討
  - **Intelligence**: 諜報
  - **Combat Unit**: 步兵, 騎兵, 弓兵, 海戰
  - **Battle Tactics**: 火計, 落石, 內鬨, 天變, 風變, 混亂, 連環, 落雷
  - **Siege**: 修復, 罵聲, 謊報
- Gate commands behind matching skills (e.g. only 外交 officers can do diplomacy)
- Store as a bitmask or `Set<SkillId>` on each officer
- **Files**: `src/types/index.ts`, `src/data/officers.ts`, `src/store/gameStore.ts`

#### 3.2 Officer Transfer & Reassignment
- New command under 人事: move officer to an adjacent owned city
- Costs stamina; officer unavailable for 1 turn during travel
- **Files**: `src/store/gameStore.ts`

#### 3.3 Reward Officers (褒賞)
- Spend gold to increase officer loyalty
- Loyalty gain = floor(gold / 100) + (ruler charisma / 20), capped at 100
- **Files**: `src/store/gameStore.ts`

#### 3.4 Officer Search (探索)
- Discover hidden officers and treasures in a city
- Success rate based on searcher's 人才 skill and politics
- Uncovers 1 hidden officer or item per successful search
- **Files**: `src/store/gameStore.ts`, `src/data/scenarios.ts`

#### 3.5 Officer Rank System (軍師/侍中/武將)
- Promote officers to ranks that unlock additional capabilities
- 軍師 (Strategist): can advise, use battle tactics
- 侍中 (Attendant): diplomatic missions
- 武將 (General): lead armies, duel
- **Files**: `src/types/index.ts`, `src/store/gameStore.ts`

#### 3.6 Officer Relations & Blood Ties
- Model historical relationships (義兄弟, 親族)
- Officers with blood ties or oaths cannot be bribed
- Loyalty bonus for related officers in same city
- **Files**: `src/types/index.ts`, `src/data/officers.ts`

#### 3.7 Officer Aging, Illness, and Death
- Officers age 1 year per 12 turns
- Death probability increases with age (starts at 50+)
- Illness events reduce stamina; 青囊書 item prevents illness
- **Files**: `src/store/gameStore.ts`, `src/types/index.ts`

---

### Phase 4: Battle System Depth

*Goal: Make tactical battles interesting, with unit variety, siege mechanics, and battle tactics.*

#### 4.1 Unit Type Differentiation
- **Infantry** (步兵): balanced stats, 5 move, no terrain penalty
- **Cavalry** (騎兵): +30% attack on plains, 7 move, penalized in forest/mountain
- **Archer** (弓兵): ranged attack (2-hex range), weak in melee, 4 move
- Apply officer unit skills as combat multiplier (+20% with matching skill)
- **Files**: `src/store/battleStore.ts`, `src/types/battle.ts`

#### 4.2 Siege Battle (城門攻防戰)
- When attacking a city with defense > 0, enter siege mode
- City gate has HP = defense * 100
- Attackers must breach gate; defenders deploy on walls
- Gate breach -> choose 武力 (officer war stat) or 兵力 (army strength) resolution
- Defenders can use 修復 skill to repair gate
- **Files**: `src/store/battleStore.ts`, new `src/components/SiegeMap.tsx`

#### 4.3 Integrate Fire Attack System
- Connect existing `FireAttackSystem` to battle store
- Officers with 火計 skill can ignite adjacent hexes
- Fire spreads based on wind direction; damages units on burning hexes
- **Files**: `src/store/battleStore.ts`, `src/game/battle/fire/FireAttackSystem.ts`

#### 4.4 Weather & Wind Effects
- Weather changes each battle day (sunny -> cloudy -> rain cycle)
- Rain: boosts 弩 damage by 50%, enables 雷擊, extinguishes fire
- Wind direction: affects fire spread, rotates periodically
- Officers with 天變 can change weather; 風變 can change wind
- **Files**: `src/store/battleStore.ts`, `src/types/battle.ts`

#### 4.5 Additional Battle Tactics
- **落石** (Rockfall): usable from mountain/wall hexes, high damage in area
- **混亂** (Confusion): target cannot act for 2 turns
- **連環** (Chain Link): in water, lock enemy ships together (enables fire combo)
- **雷擊** (Lightning): massive damage in rain, but can backfire
- **罵聲** (Taunt): lower target morale; chance of backfire
- **內鬨** (Infighting): make adjacent enemies attack each other
- Each tactic gated by matching officer skill
- **Files**: `src/store/battleStore.ts`, new `src/game/battle/tactics/`

#### 4.6 Morale Effects
- Morale affects damage dealt: below 50 -> -20% damage; below 30 -> -40%
- Morale drops on taking damage, ally rout, failed tactics
- Morale <= 0 -> unit routs (flees, removed from battle)
- **Files**: `src/store/battleStore.ts`

#### 4.7 Duel During Battle
- Officers can challenge adjacent enemy officers to duels
- Duel outcome directly affects troop morale (winner's troops +20, loser's -30)
- Defeated officer is captured
- Horses affect pursuit: with named horse, enemy cannot flee duel
- **Files**: `src/store/battleStore.ts`, `src/components/DuelScreen.tsx`

#### 4.8 Weapons & Equipment System
- 5 weapon tiers: 弩 (crossbow), 強弩 (strong crossbow), 連弩 (repeating crossbow), 衝車 (battering ram), 投石車 (catapult)
- City tech level determines what can be manufactured
- Weapons equippable to battle units; dramatically affect combat
- 投石車: best for sieges; 連弩: best for field battles
- **Files**: `src/types/index.ts`, `src/store/gameStore.ts`, `src/store/battleStore.ts`

---

### Phase 5: Economy & Strategy Depth

*Goal: Add economic pressure, espionage, and strategic choices that make peacetime gameplay engaging.*

#### 5.1 Food Consumption
- Troops consume food monthly: food -= floor(totalTroops / 100)
- Starvation: if food <= 0, troop morale drops; troops desert (lose 10% per month)
- Creates genuine resource pressure and strategic tension
- **Files**: `src/store/gameStore.ts`

#### 5.2 Technology System (技術)
- City attribute: technology (0-100)
- New 內政 command: research technology (+5 per action + politics bonus)
- Tech thresholds: 30 -> 弩, 50 -> 強弩, 70 -> 連弩, 90 -> 衝車, 100 -> 投石車
- **Files**: `src/types/index.ts`, `src/store/gameStore.ts`

#### 5.3 Training System (訓練)
- City attribute: training (0-100)
- New 軍事 command: train troops (+10 per action + leadership bonus)
- Training level multiplies troop combat effectiveness
- **Files**: `src/types/index.ts`, `src/store/gameStore.ts`

#### 5.4 Integrate Spying System
- Connect existing `SpyingSystem` to game store and UI
- New 謀略 command: 密偵 — reveal enemy city stats progressively
- 諜報 variant: if your stat < enemy stat, steal +2-12 points
- **Files**: `src/store/gameStore.ts`, `src/game/spy/SpyingSystem.ts`

#### 5.5 Additional Espionage Commands
- **反間** (Bribery): target enemy officer to defect during next battle
- **煽動** (Incite): make enemy governor declare independence (splits faction)
- **燒討** (Arson): burn enemy city food/weapons (small effect, low success)
- Each gated by matching officer skill
- **Files**: `src/store/gameStore.ts`

#### 5.6 Resource Transfer Between Cities
- New 軍事 command: 輸送 — move gold, food, or troops to adjacent owned city
- Takes 1 month; troops arrive next turn
- Enables supply-line strategy
- **Files**: `src/store/gameStore.ts`

#### 5.7 Additional Diplomacy Commands
- **解盟** (Break Alliance): end alliance with a faction (+hostility)
- **停戰** (Ceasefire): propose temporary truce (6-month non-aggression)
- **勸降** (Demand Surrender): if overwhelmingly stronger, demand capitulation
- **共同作戦** (Joint Attack): coordinate attack timing with ally
- **Files**: `src/store/gameStore.ts`

#### 5.8 Seasonal Effects
- Spring (months 1-3): agriculture development bonus +50%
- Summer (months 4-6): normal
- Autumn (months 7-9): harvest bonus — food income doubled
- Winter (months 10-12): troop drafting costs more food; flood control matters
- **Files**: `src/store/gameStore.ts`

#### 5.9 Random Events
- Floods (reduced by 治水), droughts, plagues, bumper harvests
- Probability-based each month per city
- Natural disasters reduce population, food, or gold
- Bumper harvest doubles food income for 1 turn
- **Files**: `src/store/gameStore.ts`, new `src/game/events/RandomEvents.ts`

---

### Phase 6: Content & Polish

*Goal: Add remaining content, treasures, scenarios, and UI polish.*

#### 6.1 Treasures System (寶物)
- 24 items from RTK IV with exact stat effects:
  - **Books**: 孫子兵法 (+5智/+8政), 孟德新書 (+3智/+5政), 遁甲天書 (+1智), 太平要術 (+1智), 太平清領道, 青囊書 (prevents illness)
  - **Swords**: 倚天劍 (+10武), 青釭劍 (+9武), 七星劍 (+8武)
  - **Polearms**: 方天畫戟 (+7武), 青龍偃月刀 (+6武), 丈八蛇矛 (+5武), 雙鐵戟 (+4武), 大斧 (+4武), 古錠刀 (+3武), 鐵脊蛇矛 (+3武), 流星鎚 (+3武), 三尖兩刃刀 (+3武), 鐵蒺藜骨朵 (+3武), 雙股劍 (+2武)
  - **Horses**: 赤兔馬, 的蘆, 爪黃飛電 (affect duel pursuit)
  - **Seal**: 玉璽 (統率+魅力 set to 100, +15政)
- Note: 玉璽, 青釭劍, 倚天劍, 七星劍, 赤兔馬, 的蘆, 爪黃飛電 each have 2 copies
- Items discoverable via 探索, obtainable from captured officers
- **Files**: `src/types/index.ts`, new `src/data/treasures.ts`, `src/store/gameStore.ts`

#### 6.2 Additional Scenarios (5 remaining)
Per RTK IV reference:
- **Scenario 1** (190 AD): 董卓廢少帝，火燒洛陽 — *Already implemented*
- **Scenario 2** (~194 AD): 群雄爭中原，曹操掘起 — 16 factions + 3 custom
- **Scenario 3** (~200 AD): 河北風暴起，春臨荊州 — 8 factions + 3 custom
- **Scenario 4** (~208 AD): 孔明借東風，赤壁鏖兵 — 10 factions + 3 custom
- **Scenario 5** (~220 AD): 曹丕廢漢帝，三足鼎立 — 3 factions + 3 custom
- **Scenario 6** (~234 AD): 星落五丈原，姜維繼志 — 3 factions + 3 custom
- Each with historically accurate faction/officer/city placement
- **Files**: `src/data/scenarios.ts`, `src/data/officers.ts`

#### 6.3 Custom Ruler Creation (新君主)
- Allow creating up to 3 custom rulers per scenario
- Set name, attributes, skills, starting city
- Create custom officers to accompany ruler
- **Files**: new `src/components/CustomRulerScreen.tsx`, `src/store/gameStore.ts`

#### 6.4 Flood Control (治水)
- New city attribute: flood control (0-100)
- New 內政 command: develop flood control
- Reduces flood damage probability and severity
- **Files**: `src/types/index.ts`, `src/store/gameStore.ts`

#### 6.5 Advisor System
- Designate one officer as 軍師 (chief strategist)
- Advisor provides turn-start suggestions ("我軍應該...")
- Context-aware: suggest development if stats are low, attack if army is strong
- **Files**: new `src/game/advisor/AdvisorSystem.ts`, `src/components/GameScreen.tsx`

#### 6.6 Naval Combat
- Water terrain triggers naval battle mode
- Ships replace land units; 海戰 skill boosts naval effectiveness
- 連環 tactic: lock ships together (vulnerable to fire — recreating 赤壁之戰)
- **Files**: `src/store/battleStore.ts`

#### 6.7 Population Loyalty (民忠)
- New city attribute: citizen loyalty (0-100)
- Affected by: tax rate, disasters, ruler charisma, governor politics
- Low loyalty -> reduced tax income, rebellion risk
- **Files**: `src/types/index.ts`, `src/store/gameStore.ts`

#### 6.8 UI Polish
- Officer portraits (generated or sprite-based)
- Battle animations (attack, fire, tactic effects)
- Sound effects for key actions
- Turn summary report screen
- Mini-map during battle
- Tooltip system for all stats and commands
- Mobile-responsive layout
- **Files**: various component files

---

## Part 3: Priority Summary

| Phase | Priority | Effort | Impact | Description |
|-------|----------|--------|--------|-------------|
| **Phase 1** | **P0 — Critical** | Medium | Very High | Core loop: capture cities, eliminate factions, win/lose |
| **Phase 2** | **P0 — Critical** | High | Very High | AI opponents; without this, the game has no challenge |
| **Phase 3** | **P1 — High** | High | High | Officer depth; makes every officer unique and valuable |
| **Phase 4** | **P1 — High** | Very High | High | Battle depth; makes tactical combat interesting |
| **Phase 5** | **P2 — Medium** | High | Medium | Economic/strategy depth; makes peacetime gameplay engaging |
| **Phase 6** | **P3 — Low** | Very High | Medium | Content completeness and polish |

---

## Part 4: Current Progress Scorecard

| Category | RTK IV Features | Implemented | Coverage |
|----------|----------------|-------------|----------|
| Scenarios & Setup | 10 | 2 | 20% |
| Officer System | 22 | 5 | 23% |
| Treasures & Items | 5 | 0 | 0% |
| City & Economy | 12 | 6 | 50% |
| Internal Affairs | 7 | 3 | 43% |
| Military Commands | 6 | 3 | 50% |
| Personnel Commands | 6 | 1 | 17% |
| Diplomacy Commands | 7 | 2 | 29% |
| Strategy Commands | 6 | 1 | 17% |
| Battle System | 18 | 4 | 22% |
| AI System | 6 | 0 | 0% |
| Game Flow & Victory | 7 | 0 | 0% |
| **Total** | **112** | **27** | **24%** |

**Overall implementation: ~24% of RTK IV feature set.**

The most critical gaps are:
1. **No city capture** — battles have no consequence
2. **No AI** — enemy factions are completely passive
3. **No victory/defeat** — the game cannot end
4. **No save/load** — progress is lost on page refresh
5. **No battle tactics** — combat is a simple move-and-hit loop

Phases 1 and 2 alone would bring the game from a tech demo to a genuinely playable strategy game.

---

## Verification

- Run `npm test` after each feature to ensure no regressions
- Add unit tests for all new game logic (target: `src/utils/`, `src/store/`, `src/game/`)
- Playtest each phase end-to-end before starting the next
- Compare behavior against RTK IV reference for accuracy
