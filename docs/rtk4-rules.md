# RTK IV Verified Rules

Rules verified against the original Romance of the Three Kingdoms IV (三國志IV, KOEI 1994).
Each rule includes the source of verification and the test(s) that enforce it.

---

## R-001: Ruler IS the Governor of Their City

**Rule:** When the ruler (君主) is present in a city, they hold the governor (太守) role directly. No other officer can be appointed governor in that city. The city panel shows both 君主 and 太守 as the same person.

**Corollaries:**
- `isGovernor` must be `true` for the ruler in their city.
- `appointGovernor` must reject any appointment in a city where the ruler is present.
- When the ruler transfers to a new city, they become governor there; the old city needs a new governor via auto-assignment.
- When the ruler leaves (battle, transfer), a new governor is auto-assigned from remaining officers.
- The "任命 → 太守" menu in RTK IV shows "沒有可擔任太守的武將" (no eligible officers) when only the ruler is in the city.

**Source:** Original RTK IV gameplay (SFC/PC), Scenario 1 (189), playing as 曹操 in 陳留. Screenshots confirm:
- City panel: 君主 曹操 / 太守 曹操
- 人事 → 任命 → 陳留 → 太守 → "沒有可擔任太守的武將"

**Enforced by:**
- `src/store/rulerGovernor.test.ts` — ruler-governor invariant tests

---

## R-002: Battle End — Commander Defeated

**Rule:** When the commander (主將, first unit in faction's array) is defeated, that side loses immediately. Remaining units get -30 morale but battle ends right away.

**Source:** RTK IV Wikipedia (JP): https://ja.wikipedia.org/wiki/三國志IV — battle mechanics section.

**Enforced by:**
- `src/store/battleStore.test.ts` — commander defeat tests

---

## R-003: Post-Battle Flee Destination

**Rule:** Fleeing officers can only escape to directly adjacent cities. Priority:
1. Adjacent friendly city (same faction, not the battle city)
2. Adjacent unoccupied city (claimed by the losing faction)
3. No adjacent option → 100% captured

**Source:** RTK IV Wikipedia (JP): https://ja.wikipedia.org/wiki/三國志IV — post-battle section. Also documented in AGENTS.md.

**Enforced by:**
- `src/store/resolveBattle.test.ts` — flee destination tests

---

## R-004: One Action Per Turn (Acted Flag)

**Rule:** Each officer can perform only one action per turn. After acting, they are marked as `acted: true` and cannot act again until the next turn resets the flag.

**Source:** RTK IV core mechanic — officers have limited actions per turn.

**Enforced by:**
- `src/store/gameStore.test.ts` — acted flag system tests

---

## R-005: Rank-Based Troop Cap

**Rule:** Maximum troops an officer can command = `leadership x 1000 x rank_multiplier`. Rank multipliers: common 1.0, attendant 1.0, advisor 1.0, general 1.05, governor 1.10, viceroy 1.20.

**Source:** RTK IV troop allocation system.

**Enforced by:**
- `src/utils/officers.test.ts` — troop cap tests

---

## R-006: Rank Slot Limits & Promotion Eligibility

**Rule:** Each rank has a faction-wide slot limit and stat requirements for promotion.

| Rank | zh-TW | Slot Limit | Stat Requirement |
|------|-------|-----------|-----------------|
| 軍師 (advisor) | 軍師 | 1 per faction | Intelligence >= 90 |
| 都督 (viceroy) | 都督 | ceil(cities/4), min 1 | Leadership >= 85 |
| 太守 (governor) | 太守 | Auto-assigned only (not manually promotable) | — |
| 將軍 (general) | 將軍 | cities × 2 | Leadership >= 70 OR War >= 75 |
| 侍中 (attendant) | 侍中 | cities | — |
| 一般 (common) | 一般 | Unlimited | — |

**Corollaries:**
- Governor rank cannot be manually assigned via promote — it is tied to the `isGovernor` flag and auto-assigned.
- When a faction loses cities, the slot limits shrink. Officers keep their rank until next promotion attempt.
- Rulers are always `viceroy` and cannot be re-ranked (enforced by R-001 and `promoteOfficer` guard).
- AI should respect these limits when promoting officers.

**Source:** RTK IV rank system design, adapted for balance. Slot formulas designed to prevent late-game rank inflation while giving small factions enough flexibility.

**Enforced by:**
- `src/utils/officers.test.ts` — `getRankSlots`, `meetsRankRequirements`, `hasRankSlot` unit tests
- `src/store/gameStore.commands.test.ts` — R-006 store-level enforcement tests

---

## R-007: Battle Food Supply System

**Rule:** Armies carry food supplies that are consumed daily during battle. When food runs out, morale drains progressively until the army routs.

**Mechanics:**
- **Food consumption:** 1 food per soldier per day. Calculated from living troops across all units on each side.
- **Attacker food:** Deducted from the source city when the battle starts. Default: `totalTroops × 10` (enough for 10 days). Players can specify a custom amount via battle formation.
- **Defender food:** Uses the defending city's entire food stores.
- **Starvation morale drain:** When food reaches 0, all units on that side suffer `-5 × consecutiveStarveDays` morale per day. Day 1: -5, Day 2: -10, Day 3: -15, etc. The penalty escalates until morale collapses.
- **Rout threshold:** Units with morale below 20 rout (standard morale rout rule). Starvation-induced rout cascades when the entire army's morale collapses.
- **Starvation reset:** If food becomes available again (not currently possible mid-battle), the starvation day counter resets.

**Corollaries:**
- Battles against well-supplied defenders require sufficient food stockpiles or fast victories.
- AI armies also carry food (default 10 days' supply) and can starve during prolonged sieges.
- Food deducted from source city is not returned if the army wins quickly (RTK IV simplification).

**Source:** RTK IV battle mechanics — armies that run out of food during prolonged campaigns suffer morale collapse. Adapted for balance with escalating penalty formula.

**Enforced by:**
- `src/store/battleFood.test.ts` — 13 tests covering food consumption, starvation morale drain, escalation, rout, depletion timing

---

## R-008: Multi-Month Battles (30-Day Month Cycle)

**Rule:** Battles are not limited to a fixed number of days. Instead, battles run for up to 30 days per month. If neither side wins after day 30, the battle pauses for a strategic phase (month transition), then resumes in the next month.

**Mechanics:**
- **30 days per month:** Each battle month allows up to 30 days of combat. On the day after day 30, the battle pauses (`battlePaused = true`).
- **Strategic pause:** During the pause, the game returns to the strategic phase. The player can issue limited commands (diplomacy, ceasefires). All factions take their AI turns, taxes are collected, harvests occur, events trigger.
- **Battle resumes:** After the month transition completes, the battle resumes automatically. Day resets to 1, defender food is resupplied from updated city stores, starvation counters reset, and all living non-routed units are reactivated.
- **Defender resupply:** The defender's food is replenished from their city's food stores after each month transition. This means well-supplied cities can hold out indefinitely, while attackers must bring enough food or win quickly.
- **No automatic attacker loss:** Unlike some implementations, the attacker does NOT automatically lose at day 30. The battle continues into the next month.
- **Infinite continuation:** Battles can span any number of months until one side wins (troops eliminated, commander defeated, starvation rout) or the attacker retreats.

**Corollaries:**
- Prolonged sieges favor defenders who have large city food stores and receive resupply.
- Attackers who bring insufficient food will starve over time (R-007 starvation mechanics apply).
- The strategic pause allows diplomacy (e.g., negotiating ceasefires to end a losing battle).
- AI must account for multi-month battles when planning attacks.

**Source:** RTK IV battle mechanics — battles in the original game can span multiple months when neither side is eliminated. The 30-day month cycle matches RTK IV's turn structure.

**Enforced by:**
- `src/store/battleMultiMonth.test.ts` — 11 tests covering: battle pauses at day 30, resumeBattle resets day/food/starvation, initBattle clears stale pause state, routed units stay routed across months

---

## R-009: Transfer/Transport Requires Connected Friendly Path

**Rule:** Officers can only be transferred or transported between cities connected through a contiguous chain of friendly (same-faction) cities. Both the source and destination must belong to the faction, and every intermediate city on the path must also belong to the faction. Disconnected enclaves cannot exchange officers or resources.

**Mechanics:**
- **Connectivity check:** BFS on the city adjacency graph, only traversing cities with the same `factionId`.
- **Not just adjacent:** Non-adjacent cities are allowed as long as a friendly path exists (e.g., A→B→C where A and C are not adjacent but B connects them).
- **Enemy/neutral cities block the path:** If an intermediate city is enemy or unowned (`factionId === null`), the path is broken.
- **Applies to both transport and transferOfficer:** Both operations relocate an escort officer and require the same connectivity.

**Corollaries:**
- Losing a city to enemy conquest can split your territory, cutting off transfer/transport between disconnected groups.
- Abandoning a city (last officer leaves) can also break connectivity.
- Plan officer movements carefully to avoid stranding cities.

**Source:** RTK IV gameplay — transfers and transports follow supply lines through controlled territory. Officers cannot teleport across enemy-held territory.

**Enforced by:**
- `src/store/storeHelpers.test.ts` — 7 unit tests for `areCitiesConnected()` BFS
- `src/store/gameStore.commands.test.ts` — 4 integration tests (Bug #47: transport/transfer reject disconnected, allow connected non-adjacent)
- `src/store/actedEnforcement.test.ts` — 2 tests (transport connected path, transport disconnected rejection)

---

## Adding New Rules

When a new RTK IV rule is discovered and verified:
1. Add an entry here with a unique ID (R-NNN).
2. Include the source of verification (gameplay screenshots, Wikipedia, manual, etc.).
3. Write enforcement test(s) and reference them in the "Enforced by" section.
4. Update AGENTS.md if the rule affects architecture or conventions.
