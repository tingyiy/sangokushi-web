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

## Adding New Rules

When a new RTK IV rule is discovered and verified:
1. Add an entry here with a unique ID (R-NNN).
2. Include the source of verification (gameplay screenshots, Wikipedia, manual, etc.).
3. Write enforcement test(s) and reference them in the "Enforced by" section.
4. Update AGENTS.md if the rule affects architecture or conventions.
