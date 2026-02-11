# ROADMAP.md — Future Enhancements

---

## RTK IV Gap Analysis

We cover 5 of RTK IV's 7 command categories. Two entire systems are missing: **商人 (Merchant)** — a trading economy with seasonal price fluctuation, and **助言 (Advisor)** — interactive counsel where the player asks their advisor for strategic recommendations before acting. Additionally, RTK IV features **旅人 (Travelers)** — 8 wandering NPCs who teach skills and give treasures, **埋伏 (Plant Spy)** — a mole infiltration system where officers defect to spy and betray in battle, and **異民族 (Barbarian Invasions)** — four border tribes that raid cities. None of these exist in our codebase.

See [plans/rtk4-gap-analysis.md](plans/rtk4-gap-analysis.md) for the full comparison table, implementation plans, effort estimates, and phased rollout order.

---

## Internationalization (i18n)

Currently all text is hardcoded in Traditional Chinese (繁體中文). Target: support English and Japanese. ~1,100 translatable strings across UI components, store logs, CLI text, and game data. Key challenge: type literals (`'內政' | '軍事'`) used as both discriminators and display text must be decoupled into English keys. Officer/city English names already exist in data files (`name_en` fields).

See [plans/i18n.md](plans/i18n.md) for scope audit, 6 implementation phases, stack recommendation (`react-i18next`), and before/after code examples.

---

## Map Overhaul

The current map (`ChinaMap.tsx`, 730 lines) is a single static SVG with flat gradient fills. RTK IV's original maps are pixel-art masterpieces with 4 seasonal variants — spring blossoms, summer green, autumn gold, winter snow. We want to replicate this aesthetic with seasonal palette switching, terrain detail, and castle-style city markers.

See [plans/map-overhaul.md](plans/map-overhaul.md) for the reference screenshots, 3 implementation approaches (SVG layers recommended), and phased plan.

---

## Battle System

### Multi-City Attack
RTK IV allows attacking from multiple cities simultaneously. Attackers from different cities spawn on different edges of the battle map based on their approach direction.

### Allied Reinforcements
Both attacker and defender can have allied factions join the battle. Allied units spawn separately and are AI-controlled even during the player phase.

### Spawn Point Selection
RTK IV lets both sides pick spawn positions from ~10 predefined locations before battle starts. Fewer options than total officers — adds a tactical layer to deployment.

### Per-City Battle Maps
Each of the 43 cities should have a unique battle map reflecting its geography and historical significance:
- 赤壁 — river-heavy, naval elements
- 街亭 — mountain passes
- 漢中 — valleys and ridges
- 虎牢關 — narrow pass with fortifications
- 長安 — large walled city
- etc.

### Tactic Target Selection
Allow player to choose which enemy unit to target with tactics via map click, instead of auto-targeting the nearest enemy.

### Enemy Phase Animation
Improve enemy turn visual feedback — camera follows active enemy unit, brief pause on attacks, damage numbers.

### Undo Move
Allow canceling a move before committing to an attack/tactic (RTK IV supports this).

---

## Strategic Layer

### Officer Relationships
Deepen the officer relationship system — sworn brothers, rivalries, mentor/student bonds affecting loyalty, recruitment, and duel outcomes.

### Historical Events
More scripted historical events tied to specific scenarios and years (e.g., 赤壁之戰 fire attack event, 三顧茅廬 recruitment event).

### City Specialization
Cities with unique bonuses based on geography (e.g., 洛陽 gives political bonuses, 荊州 gives agriculture bonuses).

---

## CLI Improvements

### New Player Onboarding
- `tutorial` command that walks through a first turn (develop, draft, attack, end)
- Suggested first moves printed after game start for new players
- Brief stat legend in the status output header (L=Leadership, W=War, etc.)

### Quality of Life
- `undo` command to reverse the last action within a turn
- `save` / `load` commands for interactive mode (currently exec-mode only)
- Tab completion for city/officer names (readline completer)
- Colored output with chalk (faction colors, damage in red, etc.)
- `map` command showing ASCII territory overview

---

## Technical

### Per-City Battle Maps (Data)
Define 43 battle map JSON files in `data/battlemaps/` — each with hand-crafted terrain grids, gate positions, and spawn point options. Maps should be reviewed for historical accuracy.

### AI Improvements
- Smarter battle AI (flanking, focus fire, retreat when losing)
- Strategic AI long-term planning (alliance timing, when to attack vs develop)
- Difficulty levels affecting AI decision quality

### StorageAdapter Interface
Unify browser `localStorage` and CLI filesystem-based saves behind a common `StorageAdapter` interface. Would allow tests to use an in-memory adapter. See AGENTS.md for details.
