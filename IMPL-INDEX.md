# Implementation Plan Index (三國志IV 實作計畫)

Detailed implementation plans for bringing this project to RTK IV feature parity. Each document contains file-level and line-level implementation guidance, code examples, and verification checklists.

> **Master plan:** [PLAN.md](./PLAN.md) -- high-level feature descriptions and dependency graph
> **Gap analysis:** [GAP.md](./GAP.md) -- what's missing vs RTK IV

---

## Documents

| Document | Phase | Scope | Priority | Status |
|----------|-------|-------|----------|--------|
| [IMPL-0.5.md](./IMPL-0.5.md) | Phase 0.5: Game Setup Flow & UI Foundation | Scenario/faction selection overhaul, pre-game settings, officer portraits, city illustrations | Critical | ✅ Completed |
| [IMPL-1.md](./IMPL-1.md) | Phase 1: Core Data Expansion | Skill system mechanics, city attribute wiring, officer data (400+), treasure system (24 items) | Critical | Not started |
| [IMPL-2.md](./IMPL-2.md) | Phase 2: Command Expansion | 25 new commands across 5 categories (內政/軍事/人事/外交/謀略), army formation dialog | High | Not started |
| [IMPL-3.md](./IMPL-3.md) | Phase 3: Battle System Overhaul | Unit type differentiation, siege battles, 13 battle tactics, morale/routing, POW system, naval battles | High | Not started |
| [IMPL-4-7.md](./IMPL-4-7.md) | Phases 4-7: AI, Scenarios, Advanced Systems, Polish | AI engine, 5 new scenarios, advisor/ranks/fog/events, map overhaul, UI panels | Medium-Low | Not started |

---

## Implementation Order

```
Phase 0   ██████████ COMPLETED
Phase 0.5 ░░░░░░░░░░ ← START HERE
Phase 1   ░░░░░░░░░░   (can overlap with 0.5)
Phase 2   ░░░░░░░░░░   (depends on 1)
Phase 3   ░░░░░░░░░░   (depends on 1+2)
Phase 4   ░░░░░░░░░░   (depends on 2+3)
Phase 5   ░░░░░░░░░░   (depends on 1.3)
Phase 6   ░░░░░░░░░░   (depends on 1-4)
Phase 7   ░░░░░░░░░░   (no hard deps)
```

### Recommended parallelism:
- **Phase 0.5** and **Phase 1** can be worked on simultaneously (different files)
- **Phase 5** (scenarios) can start once Phase 1.3 (officer data) is done, independent of Phases 2-4
- **Phase 7** (polish) items like strategic map overhaul (7.6) can start anytime

---

## Key Files Modified Across All Phases

| File | Phases | Description |
|------|--------|-------------|
| `src/types/index.ts` | 0.5, 1, 2, 3, 6 | Core type definitions -- most phases add fields |
| `src/store/gameStore.ts` | 0.5, 1, 2, 3, 4, 6 | Central store -- every phase adds actions |
| `src/store/battleStore.ts` | 1, 2, 3 | Battle state -- unit types, tactics, siege |
| `src/components/menu/CommandMenu.tsx` | 2 | All new commands wired here |
| `src/components/CityPanel.tsx` | 0.5, 1 | Portraits, illustrations, expanded stats |
| `src/data/officers.ts` | 1, 5 | Officer data grows from 45 to 400+ |
| `src/data/scenarios.ts` | 0.5, 1, 5 | Scenario data grows from 1 to 6 |
| `src/App.tsx` | 0.5 | New phases and component routing |
| `src/App.css` | 0.5, 1, 7 | Styles for new screens and components |

---

## New Files Created Across All Phases

### Components (10 new)
- `src/components/FactionSelect.tsx` -- Phase 0.5
- `src/components/GameSettingsScreen.tsx` -- Phase 0.5
- `src/components/Portrait.tsx` -- Phase 0.5
- `src/components/CityIllustration.tsx` -- Phase 0.5
- `src/components/map/SelectionMinimap.tsx` -- Phase 0.5
- `src/components/FormationDialog.tsx` -- Phase 2
- `src/components/TransportDialog.tsx` -- Phase 2
- `src/components/DomesticStatusPanel.tsx` -- Phase 7
- `src/components/RulerCreation.tsx` -- Phase 7
- `src/components/EventDialog.tsx` -- Phase 6

### Utilities (4 new)
- `src/utils/skills.ts` -- Phase 1
- `src/utils/officers.ts` -- Phase 1
- `src/utils/unitTypes.ts` -- Phase 3
- `src/utils/siegeMap.ts` -- Phase 3

### Data (2 new)
- `src/data/treasures.ts` -- Phase 1
- `src/data/historicalEvents.ts` -- Phase 6

### AI (6 new)
- `src/ai/aiEngine.ts` -- Phase 4
- `src/ai/aiDevelopment.ts` -- Phase 4
- `src/ai/aiMilitary.ts` -- Phase 4
- `src/ai/aiPersonnel.ts` -- Phase 4
- `src/ai/aiDiplomacy.ts` -- Phase 4
- `src/ai/aiStrategy.ts` -- Phase 4

### Systems (3 new)
- `src/systems/advisor.ts` -- Phase 6
- `src/systems/events.ts` -- Phase 6
- `src/systems/audio.ts` -- Phase 7

### Assets
- `public/portraits/` -- Phase 0.5
- `public/terrain-map.svg` -- Already created

---

## Total Effort Summary

| Phase | New Actions | New Files | Est. Lines | Est. Effort |
|-------|-----------|-----------|-----------|-------------|
| 0.5 | 3 | 5 components | ~500 | 2 weeks |
| 1 | 2 | 4 utils/data | ~600 | 2 weeks |
| 2 | 25 | 2 components | ~1200 | 2 weeks |
| 3 | 10 | 2 utils | ~800 | 3 weeks |
| 4 | 1 (AI runner) | 6 AI files | ~600 | 2 weeks |
| 5 | 0 | 0 (data only) | ~1000 | 2 weeks |
| 6 | 5 | 3 systems | ~500 | 4 weeks |
| 7 | 3 | 3 components | ~600 | 5 weeks |
| **Total** | **~49** | **~25** | **~5800** | **~22 weeks** |
