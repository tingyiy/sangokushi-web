# ROADMAP.md — Future Enhancements

Features planned for future implementation, separated from the architectural refactor (see [REFACTOR.md](./REFACTOR.md)).

---

## Battle System

### Multi-City Attack
RTK IV allows attacking from multiple cities simultaneously. Attackers from different cities spawn on different edges of the battle map based on their approach direction.

### Allied Reinforcements
Both attacker and defender can have allied factions join the battle. Allied units spawn separately and are AI-controlled even during the player phase.

### Spawn Point Selection
RTK IV lets both sides pick spawn positions from ~10 predefined locations before battle starts. Fewer options than total officers — adds a tactical layer to deployment.

### Per-City Battle Maps
Each of the 46 cities should have a unique battle map reflecting its geography and historical significance:
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

## Technical

### Per-City Battle Maps (Data)
Define 46 battle map JSON files in `data/battlemaps/` — each with hand-crafted terrain grids, gate positions, and spawn point options. Maps should be reviewed for historical accuracy.

### AI Improvements
- Smarter battle AI (flanking, focus fire, retreat when losing)
- Strategic AI long-term planning (alliance timing, when to attack vs develop)
- Difficulty levels affecting AI decision quality
