# RTK IV Feature Bridging Plan (三國志IV 開發計畫)

A phased plan to bring this project from early prototype to full RTK IV feature parity, based on the gap analysis in [GAP.md](./GAP.md).

**Current state:** Working skeleton with 1 scenario, 49 officers, basic domestic/military/diplomacy/strategy commands, functional duel system, and rudimentary hex battle engine. AI makes zero decisions. Battle victory does not transfer city ownership.

---

## Phase 0 -- Critical Fixes (Week 1)

Fix showstopper bugs that make the current game non-functional.

### 0.1 Battle Consequences
- **Problem:** Winning a battle does not transfer city ownership, capture officers, or adjust troops.
- **Tasks:**
  - In `gameStore.ts`, add a `resolveBattle(winnerFactionId, defenderCityId)` action.
  - On battle end: transfer city to winner, redistribute surviving troops, captured/routed officers become POWs or flee.
  - Wire `BattleScreen` to call `resolveBattle` when `battleStore.isFinished` becomes true.
  - Add tests for city transfer, officer capture, and troop recalculation.

### 0.2 Save / Load Game
- **Problem:** No persistence; progress is lost on refresh.
- **Tasks:**
  - Serialize full `gameStore` state to `localStorage` (JSON).
  - Add `saveGame()` and `loadGame()` actions to `gameStore`.
  - Add Save/Load buttons to `GameHeader` or a new menu overlay.
  - Support multiple save slots (3 slots, matching RTK IV).
  - Add version field to save data for future migration.

### 0.3 Victory Condition
- **Problem:** No win/lose detection.
- **Tasks:**
  - Check at each turn end: if one faction controls all cities, trigger victory screen.
  - Check at each turn end: if the player's faction has no cities, trigger defeat screen.
  - Create a simple `VictoryScreen` / `DefeatScreen` component.

---

## Phase 1 -- Core Data Expansion (Weeks 2-3)

Expand the foundational data layer to support the full RTK IV feature set.

### 1.1 Officer Skill System (22 Skills)
- **Problem:** Current skills are 5 string tags with no mechanical effect. RTK IV has 22 specific skills that gate specific commands.
- **Tasks:**
  - Define a `skills` bitmask or structured object on `Officer` type with all 22 skills:
    - Group 1: 外交, 情報, 人才, 製造, 做敵(反間), 驅虎(煽動), 流言, 燒討(火攻)
    - Group 2: 諜報, 步兵, 騎兵, 弓兵, 海戰
    - Group 3: 火計, 落石, 同討(內鬨), 天變, 風變, 混亂, 連環, 落雷
    - Group 4: 修復, 罵聲, 虛報(謊報)
  - Migrate existing officer data to use the new skill format.
  - Add skill-gating logic to each command that requires it (e.g., 製造 requires 製造 skill).

### 1.2 City Attribute Expansion
- **Problem:** Missing 7+ city attributes critical to gameplay.
- **Tasks:**
  - Add to `City` type: `floodControl (治水)`, `technology (技術)`, `peopleLoyalty (民忠)`, `morale (士氣)`, `training (訓練)`.
  - Add weapon inventory fields: `crossbows (弩)`, `warHorses (軍馬)`, `batteringRams (衝車)`, `catapults (投石機)`.
  - Set sensible defaults in `makeCity()`.
  - Update scenario data for the existing 190 scenario.
  - Update `CityPanel` to display the new attributes.

### 1.3 Officer Data Expansion (~400 officers)
- **Problem:** Only 49 of 454+ officers exist.
- **Tasks:**
  - Research and add remaining RTK IV officers to `data/officers.json` and `src/data/officers.ts`.
  - Include accurate stats (leadership, war, intelligence, politics, charisma) and skill assignments.
  - Add officer metadata: `birthYear`, `deathYear`, `age`, `portraitId`.
  - Batch in groups: prioritize officers needed for the 190 scenario first, then the remaining 5 scenarios.

### 1.4 Treasure / Item System (24 Items)
- **Problem:** Entirely missing.
- **Tasks:**
  - Define `Treasure` type: `id, name, type ('book'|'sword'|'weapon'|'horse'|'seal'), statBonuses, specialEffect`.
  - Add `treasureId: number | null` field to `Officer`.
  - Create `data/treasures.ts` with all 24 RTK IV treasures.
  - Implement treasure discovery via 搜索 (search) command.
  - Implement treasure transfer on officer capture/defeat.
  - Update `CityPanel` officer roster to show equipped treasures.

---

## Phase 2 -- Command Expansion (Weeks 3-5)

Implement missing commands across all 5 command categories.

### 2.1 內政 (Internal Affairs) Expansion
Existing: 商業開發, 農業開發, 城防強化.
- **Add 治水 (Flood Control):** Costs gold, increases `floodControl`. Reduces disaster damage. Requires officer stamina.
- **Add 技術開發 (Technology):** Costs gold, increases `technology`. Gates weapon manufacturing thresholds.
- **Add 訓練 (Train Troops):** Costs food, increases `training` and `morale`. Requires officer stamina.
- **Add 製造 (Manufacture):** Requires 製造 skill + minimum `technology` level. Produces 弩/衝車/投石機 based on tech level.
- **Add 賑災 (Disaster Relief):** Costs gold/food, recovers `peopleLoyalty` after disasters.
- **Add 徵兵 (Draft) reclassification:** Consider moving to 內政 to match certain RTK IV versions, or keep in 軍事 but note the difference.

### 2.2 軍事 (Military) Expansion
Existing: 出征 (basic), 徵兵, 單挑.
- **Add 輸送 (Transport):** Move gold, food, troops, or weapons between adjacent cities. Costs stamina, takes 1 month.
- **Add 軍團編成 (Army Formation):** Assign officers to units before battle, choose unit types (infantry/cavalry/archer) based on available weapons.
- **Add 配備 (Equip):** Assign weapons (弩, 軍馬, 衝車, 投石機) from city inventory to army units.
- **Add 出陣 (Sortie):** Deploy a defensive force from a city when under attack (pre-battle deployment).
- **Move 單挑 into battle context:** Duels should trigger mid-battle, not from the strategy menu. Keep standalone duel for testing but deprioritize it as a menu action.

### 2.3 人事 (Personnel) Expansion
Existing: 招攬 (recruit unaffiliated).
- **Add 搜索 (Search):** Discover hidden officers in a city. Success based on officer charisma + city population. Can also find treasures.
- **Add 登用 (Recruit Captured):** Attempt to recruit a POW/captured officer. Success based on charisma vs loyalty.
- **Add 褒賞 (Reward):** Spend gold or give treasure to increase officer loyalty. Essential for retention.
- **Add 處斬 (Execute):** Execute a captured officer. Lowers loyalty of officers who had high affinity with the executed.
- **Add 追放 (Dismiss):** Release an officer from service. They become unaffiliated.
- **Add 移動 (Transfer):** Move officers between cities controlled by the same faction.
- **Add 太守任命 (Appoint Governor):** Change which officer is governor of a city.
- **Add 軍師任命 (Appoint Advisor):** Designate an officer as faction advisor. Enables advisor suggestions.

### 2.4 外交 (Diplomacy) Expansion
Existing: 贈呈 (gift), 結盟 (alliance).
- **Add 共同作戰 (Joint Attack):** Request an ally to attack a specified enemy city simultaneously.
- **Add 停戰 (Ceasefire):** Propose a temporary non-aggression pact with an enemy faction. Duration: 12 months.
- **Add 勸降 (Demand Surrender):** Demand a weaker faction surrender. Success based on power differential and diplomacy skill.
- **Add 破棄 (Break Alliance):** Unilaterally break an existing alliance. Costs reputation, increases hostility.
- **Add 人質 (Hostage):** Exchange officers as hostages to solidify alliances. Hostaged officers can't act.

### 2.5 謀略 (Strategy) Expansion
Existing: 流言 (rumor).
- **Add 反間 (Counter-espionage):** Attempt to turn an enemy officer disloyal. Requires 做敵 skill. Success based on intelligence vs target loyalty.
- **Add 煽動 (Incite Rebellion):** Cause unrest in an enemy city. Requires 驅虎 skill. Reduces 民忠 and may cause troop desertion.
- **Add 放火 (Arson):** Set fire to an enemy city's supplies. Requires 燒討 skill. Destroys gold/food.
- **Integrate 諜報 (Espionage):** Wire the existing `SpyingSystem.ts` into gameStore. Adapt its officer interface to match the game's `Officer` type. Requires 情報 or 諜報 skill.
- **Add 密偵 (Intelligence Gathering):** Reveal detailed info about an enemy city (troops, officers, resources). Requires 情報 skill. This is the basis for fog of war.

---

## Phase 3 -- Battle System Overhaul (Weeks 5-8)

The battle system needs the most work. RTK IV's primary battle mode (siege) doesn't exist at all.

### 3.1 Unit Type Differentiation
- **Problem:** All units are infantry. Type has no effect.
- **Tasks:**
  - **Infantry (步兵):** Balanced stats. Default type.
  - **Cavalry (騎兵):** +2 movement, +20% attack on plains, -30% in forests/mountains. Requires 軍馬.
  - **Archer (弓兵):** 2-hex attack range, -20% in melee. Requires 弩 for enhanced damage.
  - Apply type-based modifiers to `attackUnit` in `battleStore`.
  - Use army formation (2.2) to set unit types before battle.

### 3.2 Siege Battle (城門攻防戰)
- **Problem:** RTK IV's primary battle type is completely missing.
- **Tasks:**
  - Design a siege battle map: city walls, gate(s), interior. Defender starts inside walls.
  - Implement gate HP mechanic: gate must be destroyed to enter the city.
  - 衝車 (battering ram) deals bonus damage to gates.
  - 投石機 (catapult) deals ranged AoE damage over walls.
  - Defender can use 修復 to repair gates (requires 修復 skill).
  - On gate break: option for single combat (武力決勝) or army clash.
  - Separate map generator for siege maps vs field battle maps.

### 3.3 Battle Tactics (戰術)
- **Problem:** No tactics exist. RTK IV has 13+ battle tactics.
- **Tasks:**
  - Implement each tactic as an officer skill-gated action during battle:
    - **火計 (Fire Attack):** Integrate `FireAttackSystem`. Set adjacent hex on fire. Spread based on wind. Requires 火計 skill.
    - **落石 (Rockslide):** Usable from mountains/walls. Deals heavy damage to units below. Requires 落石 skill.
    - **同討 / 內鬨 (Infighting):** Cause an enemy unit to attack its own ally. Requires 同討 skill.
    - **天變 (Weather Change):** Change weather. Requires 天變 skill.
    - **風變 (Wind Change):** Change wind direction. Requires 風變 skill.
    - **混亂 (Confusion):** Immobilize an enemy unit for 1-2 turns. Requires 混亂 skill.
    - **連環 (Chain Link):** Trap ships/units together so fire spreads between them. Requires 連環 skill.
    - **落雷 (Lightning):** High-damage single-target attack. Requires 落雷 skill. Low success rate.
    - **罵聲 (Taunt):** Reduce enemy morale. Requires 罵聲 skill.
    - **虛報 / 謊報 (False Report):** Cause enemy unit to misread orders. Requires 虛報 skill.
  - Adapt `FireAttackSystem` hex format to match `battleStore` coordinates.
  - Add wind direction and weather change mechanics to `battleStore`.

### 3.4 Morale and Routing
- **Problem:** No morale collapse mechanic.
- **Tasks:**
  - When unit morale drops below 20, it enters `routed` status and flees toward map edge.
  - Routed units can be pursued for bonus damage.
  - Commander death causes all faction units to lose 30 morale.
  - Certain tactics (罵聲, 混亂) directly reduce morale.

### 3.5 Officer Capture (POW System)
- **Problem:** No capture mechanic.
- **Tasks:**
  - When an officer's unit is destroyed, roll for capture (base 50%, modified by war stat).
  - Captured officers become POWs held by the victor.
  - Add POW list to faction state.
  - POWs can be recruited (登用), executed (處斬), or released (追放) -- links to Phase 2.3.

### 3.6 Duels During Battle
- **Problem:** Duels are standalone from the menu. RTK IV has them mid-battle.
- **Tasks:**
  - When two units are adjacent in battle, allow the attacker to challenge the defender to a duel.
  - Reuse existing `DuelScreen` mechanics but trigger from within `BattleScreen`.
  - Duel outcome affects troop morale: winner's troops +20, loser's troops -30 and may rout.

### 3.7 Reinforcements
- **Problem:** No mid-battle reinforcements.
- **Tasks:**
  - During a siege, adjacent friendly cities can send reinforcements (costs an officer + troops).
  - Reinforcements arrive on a specific map edge after a 1-2 day delay.

### 3.8 Naval Battle (海戰)
- **Problem:** Entirely missing.
- **Tasks:**
  - Design water-based battle map for river/coastal combat.
  - Ship units: movement on water hexes, vulnerable to fire (連環+火計).
  - Requires 海戰 skill for full effectiveness.
  - Trigger naval battles when attacking across major rivers (e.g., 長江 crossings).

---

## Phase 4 -- AI System (Weeks 8-10)

Without AI, the game has no challenge. This is the highest-impact single system.

### 4.1 AI Decision Framework
- **Tasks:**
  - Create `src/ai/aiEngine.ts` with a priority-based decision system.
  - Each AI faction evaluates actions by priority: defend > develop > recruit > expand.
  - AI runs during `endTurn` after player's turn.
  - Decisions are logged so the player can see what AI factions did.

### 4.2 AI City Development
- AI develops commerce, agriculture, defense based on city needs.
- Prioritizes cities with low development or high strategic value.
- Balances gold spending between development and military.

### 4.3 AI Military
- AI drafts troops when troop count is low relative to threats.
- AI attacks neighboring weaker factions or neutral cities.
- AI sends reinforcements to threatened cities.
- AI manufactures weapons when technology is sufficient.

### 4.4 AI Personnel
- AI recruits unaffiliated officers in its cities.
- AI rewards officers with low loyalty.
- AI transfers officers to balance city garrisons.
- AI appoints governors and advisors.

### 4.5 AI Diplomacy
- AI proposes alliances with non-threatening factions.
- AI breaks alliances when it becomes much stronger.
- AI requests joint attacks against mutual enemies.
- AI uses ceasefire to buy time when weak.

### 4.6 AI Strategy
- AI spreads rumors against strong neighbors.
- AI uses espionage to gather intelligence.
- AI incites rebellion in enemy border cities.

### 4.7 Difficulty Levels
- Easy: AI makes suboptimal decisions, lower success rates.
- Normal: Standard AI behavior.
- Hard: AI gets minor resource bonuses, makes smarter decisions.

---

## Phase 5 -- Scenarios and Content (Weeks 10-12)

### 5.1 Scenario 2: 群雄爭中原 (194)
- Faction setup: 曹操 rising, 呂布 in 徐州, 劉備 displaced, 袁紹 consolidating north.
- Requires ~80 officers placed correctly.

### 5.2 Scenario 3: 河北風暴起 (200)
- 官渡之戰 era. 曹操 vs 袁紹. 劉備 in 荊州.
- Requires ~100 officers.

### 5.3 Scenario 4: 孔明借東風 (208)
- 赤壁之戰 era. 曹操 dominant north. 孫劉 alliance forming.
- Requires ~120 officers.

### 5.4 Scenario 5: 曹丕廢漢帝 (220)
- Three Kingdoms established. 魏蜀吳 fully formed.
- Requires ~130 officers.

### 5.5 Scenario 6: 星落五丈原 (234)
- Late period. 諸葛亮's northern expeditions. 姜維 era.
- Requires ~100 officers.

### 5.6 Officer Placement per Scenario
- Each scenario needs accurate officer placement: which faction, which city, governor assignments, in-service vs unaffiliated (在野) vs undiscovered.
- Cross-reference with historical records and RTK IV data.

---

## Phase 6 -- Advanced Systems (Weeks 12-16)

### 6.1 Advisor System (軍師)
- Designated advisor gives strategic suggestions at turn start.
- Suggestions based on game state: "Enemy city 宛 is weakly defended" or "Officer 張飛's loyalty is dangerously low".
- Advisor intelligence stat affects suggestion quality.

### 6.2 Officer Ranks (官位)
- Define rank hierarchy: 軍師, 侍中, 武將, etc.
- Rank affects officer salary (gold cost per turn).
- Higher rank increases loyalty retention.
- Promotion command under 人事.

### 6.3 Fog of War
- By default, enemy city details are hidden (show "???" for troops, gold, etc.).
- Use 密偵 (intelligence) to reveal specific city info for a limited time.
- Officers with 情報 skill reveal more info.
- Adjacent cities always partially visible (troop estimate).

### 6.4 Random Events
- Monthly random event rolls: floods (水害), locusts (蝗害), plague (疫病), bumper harvest (豐收), officer discovery.
- Floods: damage based on `floodControl` -- low control means major food/population loss.
- Locusts: food loss.
- Plague: population loss, officer illness chance.
- Bumper harvest: food bonus.
- Implement in `endTurn` after income calculation.

### 6.5 Historical Events
- Scripted events that trigger at specific year/month/conditions:
  - 赤壁之戰 (208): Fire on the river if conditions met.
  - 三顧茅廬: 諸葛亮 recruitment event for 劉備.
  - 董卓暴政: 董卓 assassination event.
- Events include dialogue, choices, and mechanical effects.

### 6.6 Officer Lifecycle
- **Aging:** Officers age each year. Stats may decline after age 50.
- **Illness:** Random chance increases with age. Ill officers can't act. May die.
- **Natural death:** Officers die at or near their historical `deathYear`.
- **Birth of new officers:** Late-game officers appear at their historical `birthYear`.

### 6.7 Population Growth / Tax System
- Population grows monthly based on `peopleLoyalty` and `floodControl`.
- Adjustable tax rate (低/中/高) affects gold income and `peopleLoyalty`.
- High taxes = more gold but lower loyalty, potential unrest.
- Low taxes = slow income but happy populace, faster population growth.

---

## Phase 7 -- Polish and Extras (Weeks 16-20)

### 7.1 New Ruler Creation
- Allow player to create up to 3 custom rulers with custom stats.
- Place custom rulers in a chosen city at game start.
- Custom officer portrait selection.

### 7.2 Multiplayer (Hot-seat)
- Multiple human players take turns on the same device.
- Each player selects a faction during setup.
- Turn order follows faction order.
- Hide information between turns (screen transition / "Pass to Player X" overlay).

### 7.3 Marriage / Blood Relations
- Officers have `relationships` field (father, spouse, sworn brother).
- Related officers have higher base loyalty when serving the same faction.
- Certain recruitment attempts are easier/harder based on relationships.
- Historical marriages can trigger as events.

### 7.4 Sound and Music
- Background music for different phases (title, strategy, battle, duel).
- Sound effects for commands, combat, events.
- Use web audio API or HTML5 audio.

### 7.5 UI/UX Polish
- Animated battle map (unit movement, attack effects).
- Officer portraits (placeholder or AI-generated).
- Minimap for large battle maps.
- Keyboard shortcuts for common commands.
- Tutorial / help overlay for new players.
- Mobile-responsive layout.

---

## Dependency Graph

```
Phase 0 (Critical Fixes)
  ├── 0.1 Battle Consequences  ──────────────────────────────────┐
  ├── 0.2 Save/Load                                             │
  └── 0.3 Victory Condition                                     │
                                                                 │
Phase 1 (Data Expansion)                                         │
  ├── 1.1 Skill System (22 skills) ──┬── gates Phase 2 commands │
  ├── 1.2 City Attributes ───────────┤                          │
  ├── 1.3 Officer Data (400+) ───────┤                          │
  └── 1.4 Treasure System ───────────┘                          │
                                                                 │
Phase 2 (Commands) ─── depends on Phase 1 ──────────────────────┤
  ├── 2.1 內政 Expansion (needs 1.2 city attrs)                 │
  ├── 2.2 軍事 Expansion (needs 1.2 weapons)                    │
  ├── 2.3 人事 Expansion (needs 1.4 treasures)                  │
  ├── 2.4 外交 Expansion                                        │
  └── 2.5 謀略 Expansion (needs 1.1 skills)                     │
                                                                 │
Phase 3 (Battle Overhaul) ─── depends on Phases 1+2 ────────────┘
  ├── 3.1 Unit Types (needs 1.2 weapons)
  ├── 3.2 Siege Battle (needs 1.2 weapons, 3.1 units)
  ├── 3.3 Battle Tactics (needs 1.1 skills)
  ├── 3.4 Morale/Routing
  ├── 3.5 POW System ──── feeds into 2.3 (登用/處斬)
  ├── 3.6 Duels in Battle
  ├── 3.7 Reinforcements
  └── 3.8 Naval Battle (needs 1.1 海戰 skill)

Phase 4 (AI) ─── depends on Phases 2+3 (needs all commands to exist)
  ├── 4.1-4.6 AI subsystems
  └── 4.7 Difficulty levels

Phase 5 (Scenarios) ─── depends on Phase 1.3 (officer data)
  └── 5.1-5.6 Six scenarios with officer placement

Phase 6 (Advanced Systems) ─── depends on Phases 1-4
  ├── 6.1 Advisor (needs Phase 4 AI framework)
  ├── 6.2 Ranks (needs 2.3 personnel)
  ├── 6.3 Fog of War (needs 2.5 espionage)
  ├── 6.4-6.5 Events (needs Phase 1 data)
  ├── 6.6 Officer Lifecycle (needs 1.3 birth/death data)
  └── 6.7 Population/Tax (needs 1.2 city attrs)

Phase 7 (Polish) ─── no hard dependencies
```

---

## Effort Estimates

| Phase | Scope | Est. Effort | Priority |
|-------|-------|-------------|----------|
| **Phase 0** | 3 tasks | ~1 week | **Critical** |
| **Phase 1** | 4 tasks | ~2 weeks | **Critical** |
| **Phase 2** | 5 categories, ~25 commands | ~2 weeks | **High** |
| **Phase 3** | 8 major subsystems | ~3 weeks | **High** |
| **Phase 4** | 7 AI subsystems | ~2 weeks | **High** |
| **Phase 5** | 5 scenarios + officer placement | ~2 weeks | **Medium** |
| **Phase 6** | 7 advanced systems | ~4 weeks | **Medium** |
| **Phase 7** | Polish, multiplayer, UI | ~4 weeks | **Low** |
| **Total** | | **~20 weeks** | |

---

## Implementation Principles

1. **Test as you go.** Every new store action and utility function should have unit tests. Target coverage on `src/store/` and `src/utils/`.
2. **Type safety first.** All new data structures go through `src/types/` with strict typing. Use `import type` for type-only imports.
3. **Incremental integration.** Each phase should result in a playable (if incomplete) game. Don't break existing functionality.
4. **Data accuracy.** Officer stats, city data, and scenario configurations should be cross-referenced with RTK IV source material.
5. **Traditional Chinese.** All user-facing text remains in 繁體中文 as per project convention.
6. **Follow existing patterns.** Zustand single-store pattern, functional components, camelCase actions, PascalCase components.
7. **Wire existing code first.** `FireAttackSystem` and `SpyingSystem` already exist -- adapt and integrate them before writing new systems from scratch.
