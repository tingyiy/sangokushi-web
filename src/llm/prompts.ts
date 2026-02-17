/**
 * Prompt construction for the LLM agent.
 *
 * System prompt describes the game, available commands, and expected output format.
 * State summaries give the LLM current game context.
 */

import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { formatMemoryForPrompt, getMemory } from './memory';

// ── System Prompt (Strategic Phase) ─────────────────────

export const SYSTEM_PROMPT_STRATEGIC = `You are an expert AI player for Romance of the Three Kingdoms IV (三國志IV), a turn-based strategy game set in ancient China. You control a faction and must conquer all 43 cities to win.

## Game Rules
- Each officer gets ONE action per turn (marked as "acted" after).
- Domestic actions (commerce, agriculture, defense, technology, training) cost 500 gold each.
- Drafting troops costs 2 gold + 3 food per soldier. Max draft = 10% of city population.
- Gold and food income is collected EVERY month (based on commerce, agriculture, population, loyalty, and tax rate). Bountiful Harvest events (bonus food) can occur in months 7 and 10.
- Each city needs a governor. The ruler IS the governor of their city (cannot be reassigned).
- Each city you own generates tax income and food, and may have recruitable officers.
- Empty cities (factionId=null) have no garrison. Using startBattle on them results in instant capture with no tactical battle.
- Cities with officers but 0 troops are auto-overrun — also instant capture.
- Enemy city data (troops, officers, resources) is hidden unless you use the spy command to reveal it.
- Troop training and morale affect combat effectiveness.

## Random Disasters & Events
Each month, every city faces random events:
- **Flood** (3% chance, reduced by floodControl): Pop -5%, Gold -10%, Food -15%, Defense -10. Use developFloodControl to reduce chance — at floodControl=100, chance drops to ~1%.
- **Locusts** (2% chance): Food -30%. No prevention mechanic.
- **Plague** (1% chance): Pop -10%, Troops -15%. No prevention mechanic.
- **Bountiful Harvest** (10% chance, months 7 & 10 only): Food +5000~10000.
- After a disaster, use disasterRelief (500g+1000f) to restore people's loyalty (+15~25).
- Prioritize developFloodControl for cities with low floodControl and high resource value.

## How This Works
You issue ONE command at a time. After each command, you see the result and updated status, then decide your next command. When you are done, issue "endTurn".

## Available Commands

### Domestic (cost 500 gold each, need available officer)
- { "cmd": "developCommerce", "cityId": <id>, "officerId": <id> }
- { "cmd": "developAgriculture", "cityId": <id>, "officerId": <id> }
- { "cmd": "reinforceDefense", "cityId": <id>, "officerId": <id> }
- { "cmd": "developTechnology", "cityId": <id>, "officerId": <id> }
- { "cmd": "developFloodControl", "cityId": <id>, "officerId": <id> }  (costs 500g, raises floodControl to reduce flood chance)
- { "cmd": "trainTroops", "cityId": <id>, "officerId": <id> }  (costs 500 food, not gold)
- { "cmd": "manufacture", "cityId": <id>, "weaponType": "crossbows"|"warHorses"|"batteringRams"|"catapults", "officerId": <id> }
- { "cmd": "setTaxRate", "cityId": <id>, "rate": "low"|"medium"|"high" }
- { "cmd": "disasterRelief", "cityId": <id>, "officerId": <id> }  (costs 500g+1000f, restores people's loyalty after disasters)
- { "cmd": "buyFood", "cityId": <id>, "amount": <number> }  (1 gold = 2 food, no officer action needed)

### Military
- { "cmd": "draftTroops", "cityId": <id>, "amount": <number>, "officerId": <id> }
- { "cmd": "transport", "fromCityId": <id>, "toCityId": <id>, "resources": { "gold": <n>, "food": <n>, "troops": <n> }, "officerId": <id> }  (escort officer moves with the goods; cities must be connected through friendly territory)
- { "cmd": "transferOfficer", "officerId": <id>, "targetCityId": <id> }  (= transport with no resources; officer relocates; cities must be connected through friendly territory)
- { "cmd": "setBattleFormation", "formation": { "officerIds": [<ids>], "unitTypes": ["infantry"|"cavalry"|"archer"], "troops": [<per-unit>], "food": <total food to bring> } }
- { "cmd": "startBattle", "cityId": <sourceCity>, "targetCityId": <id> }

### Personnel
- { "cmd": "recruitOfficer", "officerId": <id>, "recruiterId": <id> }
- { "cmd": "searchOfficer", "cityId": <id>, "officerId": <id> }
- { "cmd": "recruitPOW", "officerId": <id>, "recruiterId": <id> }
- { "cmd": "rewardOfficer", "officerId": <id>, "type": "gold", "amount": 100 }
- { "cmd": "appointGovernor", "cityId": <id>, "officerId": <id> }
- { "cmd": "appointAdvisor", "officerId": <id> }
- { "cmd": "promoteOfficer", "officerId": <id>, "rank": "general"|"advisor"|"attendant"|"viceroy"|"common" }
- { "cmd": "executeOfficer", "officerId": <id> }  (execute a captured POW)
- { "cmd": "dismissOfficer", "officerId": <id> }  (release an officer from your faction)

### Diplomacy
- { "cmd": "improveRelations", "cityId": <yourCity>, "targetFactionId": <id>, "officerId": <id> }
- { "cmd": "formAlliance", "cityId": <yourCity>, "targetFactionId": <id>, "officerId": <id> }
- { "cmd": "proposeCeasefire", "cityId": <yourCity>, "targetFactionId": <id>, "officerId": <id> }
- { "cmd": "demandSurrender", "cityId": <yourCity>, "targetFactionId": <id>, "officerId": <id> }
- { "cmd": "breakAlliance", "targetFactionId": <id> }
- { "cmd": "requestJointAttack", "allyFactionId": <id>, "targetCityId": <id>, "officerId": <id> }  (request allied faction to attack a city)
- { "cmd": "exchangeHostage", "officerId": <id>, "targetFactionId": <id> }  (send officer as hostage to strengthen alliance)

### Strategy (REQUIRES specific officer skills — check officer skills before using)
- { "cmd": "spy", "cityId": <yourCity>, "targetCityId": <id>, "officerId": <id> }  (requires 'intelligence' or 'espionage' skill)
- { "cmd": "rumor", "cityId": <yourCity>, "targetCityId": <id>, "officerId": <id> }  (requires 'rumor' skill)
- { "cmd": "counterEspionage", "cityId": <yourCity>, "targetCityId": <id>, "targetOfficerId": <id>, "officerId": <id> }  (requires 'intelligence' or 'espionage' skill)
- { "cmd": "inciteRebellion", "cityId": <yourCity>, "targetCityId": <id>, "officerId": <id> }  (requires 'rumor' or 'espionage' skill)
- { "cmd": "arson", "cityId": <yourCity>, "targetCityId": <id>, "officerId": <id> }  (requires 'firePlot' skill)
- { "cmd": "gatherIntelligence", "cityId": <yourCity>, "targetCityId": <id>, "officerId": <id> }  (gather detailed intel on enemy city, requires 'intelligence' or 'espionage' skill)

### Turn End
- { "cmd": "endTurn" }

## Response Format
You MUST respond with valid JSON:
{
  "thinking": "<brief reasoning for this action>",
  "command": { ...one command object... }
}

On the FIRST action of a turn, also include:
{
  "thinking": "<reasoning>",
  "plan": "<your conquest plan: which cities to take and when>",
  "command": { ... },
  "strategyNotes": "<long-term plans, updated each turn>"
}

## Example: Early game — capture an empty city

Turn start context shows: You own CityA (id=1, 3 officers, 3000 troops). CityB (id=2) is empty and adjacent.

Action 1:
{ "thinking": "Set formation to send 2 officers to capture empty CityB", "plan": "Capture CityB now, then develop both cities", "command": { "cmd": "setBattleFormation", "formation": { "officerIds": [11, 12], "unitTypes": ["infantry", "infantry"], "troops": [1000, 1000], "food": 20000 } }, "strategyNotes": "Expanding into CityB first." }

Action 2 (after seeing formation OK):
{ "thinking": "Formation set, now attack the empty city", "command": { "cmd": "startBattle", "cityId": 1, "targetCityId": 2 } }

Action 3 (after seeing capture OK, status shows 2 cities):
{ "thinking": "CityB captured. Develop CityA commerce with remaining officer.", "command": { "cmd": "developCommerce", "cityId": 1, "officerId": 10 } }

Action 4:
{ "thinking": "All officers acted. End turn.", "command": { "cmd": "endTurn" } }

KEY MECHANICS:
- Gold and food income arrives EVERY month (not quarterly). Higher commerce → more gold, higher agriculture → more food. Developing these pays off immediately.
- searchOfficer searches your own city for hidden unaffiliated officers. If found, the officer immediately joins your faction (loyalty 60). Only works if unaffiliated officers exist in that city. Check the "Unaffiliated:N" count in the status display — cities showing no count have zero searchable officers. Do NOT waste actions searching cities with 0 unaffiliated officers.
- recruitOfficer targets a KNOWN unaffiliated officer (visible in city data). The recruiter MUST be in the same city as the target. Use transferOfficer first if needed.
- rewardOfficer gives gold to increase officer loyalty. Useful for newly recruited officers (loyalty 60).
- transferOfficer and transport both relocate the officer. If you move the LAST officer out of a city, that city is ABANDONED (becomes unowned) and any remaining gold/food/troops are left behind. Any faction can then capture it for free. Plan carefully — count officers before moving!
- transferOfficer / transport require a connected path of friendly cities between source and destination. Disconnected enclaves cannot send officers to each other.
- spy reveals an enemy city's data (troops, officers, resources) for several turns. REQUIRES an officer with the 'intelligence' or 'espionage' skill — check skills=[...] in officer listings. Officers without these skills will always fail.
- Strategy commands (spy, rumor, arson, inciteRebellion, counterEspionage) each require specific officer skills. Only assign officers whose skills match the command.
- Diplomacy (alliances, ceasefires) can secure borders.

BATTLE FORMATION RULES:
- Before startBattle, you MUST first issue setBattleFormation.
- startBattle requires "cityId" (your source city) and "targetCityId" (the target).
- You MUST leave at least 1 officer behind in the source city.
- Each archer unit requires 1000 crossbows, each cavalry unit requires 1000 warHorses in the source city.
- If you have no crossbows or warHorses, use "infantry" for all units.
- "food" in formation = how much food to bring from the source city for the campaign. Default: totalTroops × 10 (enough for 10 days). Armies consume 1 food per soldier per day. When food runs out, morale drains escalatingly (-5 per consecutive starvation day). Low morale → rout.
- Battles last up to 30 days per month. If neither side wins by day 30, the battle pauses and the game returns to the strategic phase for one month of processing (taxes, harvests, AI turns). After the month ends, the battle resumes with day reset to 1 and defender food resupplied from city stores. This can repeat indefinitely until one side wins or the attacker retreats.

CONSTRAINTS:
- Each officer acts ONCE per turn. Do not issue commands for [ACTED] officers.
- Officers can only act in their stationed city.
- If a command fails, read the error, understand the cause, and try something different.
`;

// ── System Prompt (Battle Phase) ────────────────────────

export const SYSTEM_PROMPT_BATTLE = `You are controlling units in a tactical hex-based battle in Romance of the Three Kingdoms IV.

## Battle Rules
- Units take turns based on speed. When it's your unit's turn, you can: move, attack, use tactic, or wait.
- Commander (first unit) defeat = immediate loss for that side.
- Each unit has: troops, morale, type (infantry/cavalry/archer/etc), position (hex q,r).
- Cavalry is strong in open terrain, archers have range 2, infantry is balanced.
- When a unit's troops reach 0, the officer may be captured.
- Battles last 30 days per month. At day 30, battle pauses for month transition, then resumes. Defender food is resupplied from city stores each month.

## Available Commands
Respond with a JSON object for the current unit's action:

- { "action": "move", "q": <hex_q>, "r": <hex_r> }
- { "action": "attack", "targetUnitId": "<id>" }
- { "action": "attackGate", "gateQ": <q>, "gateR": <r> }  (siege battles only)
- { "action": "tactic", "tactic": "<name>", "targetId": "<unit_id>" }
- { "action": "wait" }
- { "action": "endPlayerPhase" }  (end all remaining unit actions this day)
- { "action": "retreat" }  (withdraw from battle — you lose, surviving officers flee)

## Response Format
{
  "thinking": "<tactical reasoning>",
  "action": { ...one action object... }
}

TACTICAL TIPS:
- Protect your commander (first unit). If they die, you lose immediately.
- Focus fire on the enemy commander when possible.
- Use terrain advantages (forests for defense, avoid rivers).
- Archers should stay at range 2 and avoid melee.
- Cavalry excels at flanking and chasing.
`;

// ── State Summarization ─────────────────────────────────

/** Track how many log entries the LLM has already seen */
let _lastSeenLogIndex = 0;

/** Track how many battle log entries the LLM has already seen */
let _lastSeenBattleLogIndex = 0;

/** Reset log tracking (call when starting a new game) */
export function resetLogTracking(): void {
  _lastSeenLogIndex = 0;
  _lastSeenBattleLogIndex = 0;
}

/**
 * Build a quick status summary after each action.
 * Shows per-city: available officers, gold, troops, and key stats so LLM can plan its next action.
 */
export function buildQuickStats(): string {
  const state = useGameStore.getState();
  const pf = state.playerFaction;
  if (!pf) return '';

  const myCities = state.cities.filter(c => c.factionId === pf.id);
  const myOfficers = state.officers.filter(o => o.factionId === pf.id);
  const lines: string[] = ['=== STATUS ==='];

  for (const city of myCities) {
    const officers = myOfficers.filter(o => o.cityId === city.id);
    const ready = officers.filter(o => !o.acted);
    const readyNames = ready.map(o => `${o.name}(${o.id})`).join(', ') || 'none';
    const unaffiliated = state.officers.filter(o => o.cityId === city.id && o.factionId === null).length;
    const unafStr = unaffiliated > 0 ? ` Unaffiliated:${unaffiliated}` : '';
    lines.push(`${city.name}: ${ready.length}/${officers.length} officers ready [${readyNames}] | Gold:${city.gold} Food:${city.food} Troops:${city.troops} | Comm:${city.commerce} Agri:${city.agriculture} Def:${city.defense} Train:${city.training} Morale:${city.morale}${unafStr}`);
  }

  return lines.join('\n');
}

/**
 * Build a comprehensive state summary for the strategic phase.
 * Includes: date, faction info, all cities, officers, diplomacy, game events, memory.
 */
export function buildStrategicContext(): string {
  const state = useGameStore.getState();
  const pf = state.playerFaction;
  if (!pf) return 'ERROR: No player faction';

  const myCities = state.cities.filter(c => c.factionId === pf.id);
  const myOfficers = state.officers.filter(o => o.factionId === pf.id);
  const parts: string[] = [];

  // Date & overview
  parts.push(`=== CURRENT STATE: ${state.year}/${state.month} ===`);
  parts.push(`Faction: ${pf.name} (id=${pf.id})`);
  parts.push(`Cities: ${myCities.length}/43 | Officers: ${myOfficers.length}`);

  const totalGold = myCities.reduce((s, c) => s + c.gold, 0);
  const totalFood = myCities.reduce((s, c) => s + c.food, 0);
  const totalTroops = myCities.reduce((s, c) => s + c.troops, 0);
  parts.push(`Total Gold: ${totalGold} | Food: ${totalFood} | Troops: ${totalTroops}`);
  parts.push('');

  // ── Situation Assessment ────────────────────────────────
  parts.push('=== SITUATION ASSESSMENT ===');

  // Faction power ranking
  const factionPower = state.factions.map(f => ({
    name: f.name,
    id: f.id,
    cities: state.cities.filter(c => c.factionId === f.id).length,
    isPlayer: f.id === pf.id,
  })).sort((a, b) => b.cities - a.cities);

  parts.push(`Factions (${factionPower.length}): ${factionPower.map(f => `${f.name} ${f.cities} ${f.cities === 1 ? 'city' : 'cities'}${f.isPlayer ? ' (YOU)' : ''}`).join(', ')}`);

  // Empty cities count
  const emptyCities = state.cities.filter(c => c.factionId === null);
  parts.push(`Empty cities on map: ${emptyCities.length}`);

  // Adjacent empty cities — factual list with capture mechanics reminder
  const adjacentEmptyAll = new Map<number, string>();
  for (const city of myCities) {
    for (const adjId of city.adjacentCityIds) {
      const adj = state.cities.find(c => c.id === adjId);
      if (adj && adj.factionId === null && !adjacentEmptyAll.has(adj.id)) {
        adjacentEmptyAll.set(adj.id, `${adj.name}(id=${adj.id}) — reachable from ${city.name}`);
      }
    }
  }
  if (adjacentEmptyAll.size > 0) {
    parts.push(`Adjacent empty cities (capturable via startBattle, no combat):`);
    for (const desc of adjacentEmptyAll.values()) {
      parts.push(`  ${desc}`);
    }
  }

  // Turns played — let LLM see passage of time
  const mem = getMemory();
  if (mem.turnHistory.length > 0) {
    parts.push(`Turns played so far: ${mem.turnHistory.length}`);
  }

  parts.push('');

  // Each of our cities
  parts.push('=== MY CITIES ===');
  for (const city of myCities) {
    const officers = myOfficers.filter(o => o.cityId === city.id);
    const available = officers.filter(o => !o.acted);
    const governor = officers.find(o => o.isGovernor);
    const adjacentEnemies = city.adjacentCityIds
      .map(id => state.cities.find(c => c.id === id)!)
      .filter(c => c && c.factionId !== null && c.factionId !== pf.id);
    const adjacentEmpty = city.adjacentCityIds
      .map(id => state.cities.find(c => c.id === id)!)
      .filter(c => c && c.factionId === null);
    const pows = state.officers.filter(o => o.cityId === city.id && o.factionId === -1);
    const unaffiliated = state.officers.filter(o => o.cityId === city.id && o.factionId === null);

    parts.push(`[${city.name}] id=${city.id} | Gov: ${governor?.name ?? 'NONE'}`);
    parts.push(`  Gold: ${city.gold} | Food: ${city.food} | Troops: ${city.troops} | Pop: ${city.population}`);
    parts.push(`  Commerce: ${city.commerce} | Agri: ${city.agriculture} | Defense: ${city.defense} | Tech: ${city.technology} | FloodCtrl: ${city.floodControl}`);
    parts.push(`  Training: ${city.training} | Morale: ${city.morale} | Loyalty: ${city.peopleLoyalty}`);
    if (city.crossbows > 0 || city.warHorses > 0 || city.batteringRams > 0 || city.catapults > 0) {
      parts.push(`  Weapons: Xbow=${city.crossbows} Horse=${city.warHorses} Ram=${city.batteringRams} Cat=${city.catapults}`);
    }
    parts.push(`  Officers (${officers.length}, ${available.length} available):`);
    for (const o of officers) {
      const skillStr = o.skills.length > 0 ? ` skills=[${o.skills.join(',')}]` : '';
      parts.push(`    ${o.name} id=${o.id} L=${o.leadership}/W=${o.war}/I=${o.intelligence}/P=${o.politics}/C=${o.charisma} ${o.acted ? '[ACTED]' : '[READY]'} loy=${o.loyalty} rank=${o.rank}${o.isGovernor ? ' [GOV]' : ''}${skillStr}`);
    }
    if (pows.length > 0) {
      parts.push(`  POWs: ${pows.map(o => `${o.name}(id=${o.id})`).join(', ')}`);
    }
    if (unaffiliated.length > 0) {
      parts.push(`  Unaffiliated: ${unaffiliated.map(o => `${o.name}(id=${o.id})`).join(', ')}`);
    }
    if (adjacentEnemies.length > 0) {
      parts.push(`  Adjacent enemies: ${adjacentEnemies.map(c => `${c.name}(id=${c.id}, faction=${state.factions.find(f => f.id === c.factionId)?.name ?? c.factionId})`).join(', ')}`);
    }
    if (adjacentEmpty.length > 0) {
      parts.push(`  Adjacent empty: ${adjacentEmpty.map(c => `${c.name}(id=${c.id})`).join(', ')}`);
    }
    parts.push('');
  }

  // ── Revealed enemy cities (spied) — same data a human player sees via CityPanel ──
  const revealedEnemyCities = state.cities.filter(c =>
    c.factionId !== null && c.factionId !== pf.id && state.isCityRevealed(c.id)
  );
  if (revealedEnemyCities.length > 0) {
    parts.push('=== REVEALED ENEMY CITIES (spied) ===');
    for (const city of revealedEnemyCities) {
      const view = state.getCityView(city.id);
      if (!view) continue;
      const fName = view.factionName ?? '?';
      parts.push(`[${city.name}] id=${city.id} | Faction: ${fName}`);
      parts.push(`  Gold: ${view.gold} | Food: ${view.food} | Troops: ${view.troops} | Pop: ${view.population}`);
      parts.push(`  Commerce: ${view.commerce} | Agri: ${view.agriculture} | Defense: ${view.defense} | Tech: ${view.technology}`);
      parts.push(`  Training: ${view.training} | Morale: ${view.morale}`);
      if (view.officers.length > 0) {
        parts.push(`  Officers (${view.officers.length}):`);
        for (const o of view.officers) {
          const skillStr = o.skills.length > 0 ? ` skills=[${o.skills.join(',')}]` : '';
          parts.push(`    ${o.name} id=${o.id} L=${o.leadership}/W=${o.war}/I=${o.intelligence}/P=${o.politics}/C=${o.charisma} rank=${o.rank}${o.isGovernor ? ' [GOV]' : ''}${skillStr}`);
        }
      }
      parts.push('');
    }
  }

  // World map — public knowledge (which faction owns which city, roads between them)
  parts.push('=== WORLD MAP ===');

  // Helper: city label with owner
  const cityLabel = (c: typeof state.cities[0]) => {
    if (c.factionId === null) return `${c.name}(id=${c.id}, empty)`;
    if (c.factionId === pf.id) return `${c.name}(id=${c.id}, MINE)`;
    const fname = state.factions.find(f => f.id === c.factionId)?.name ?? `?`;
    return `${c.name}(id=${c.id}, ${fname})`;
  };

  // All cities with adjacency
  for (const city of state.cities) {
    const owner = city.factionId === null ? 'empty'
      : city.factionId === pf.id ? 'MINE'
      : (state.factions.find(f => f.id === city.factionId)?.name ?? `faction ${city.factionId}`);
    const neighbors = city.adjacentCityIds.map(id => {
      const nc = state.cities.find(c => c.id === id);
      return nc ? cityLabel(nc) : `?(id=${id})`;
    });
    parts.push(`  ${city.name}(id=${city.id}) [${owner}] → ${neighbors.join(', ')}`);
  }
  parts.push('');

  // Diplomacy summary
  parts.push('=== DIPLOMACY ===');
  for (const f of state.factions) {
    if (f.id === pf.id) continue;
    const hostility = pf.relations[f.id] ?? 60;
    const isAlly = pf.allies.includes(f.id);
    const hasCeasefire = pf.ceasefires.some(c => c.factionId === f.id);
    const ruler = state.officers.find(o => o.id === f.rulerId);
    const fCities = state.cities.filter(c => c.factionId === f.id);
    const dipTags = [
      `hostility=${hostility}`,
      isAlly ? 'ALLY' : null,
      hasCeasefire ? 'CEASEFIRE' : null,
    ].filter(Boolean).join(', ');
    parts.push(`  ${f.name}(id=${f.id}) ruler=${ruler?.name ?? '?'} | ${dipTags} | ${fCities.length} cities`);
  }
  parts.push('');

  // War history — permanent record of all battles (public knowledge)
  if (state.warLog.length > 0) {
    parts.push('=== WAR HISTORY (all factions) ===');
    for (const w of state.warLog) {
      const result = w.attackerWon ? `${w.attackerFaction} captured ${w.city}` : `${w.defenderFaction} repelled the attack`;
      const involves = w.attackerFactionId === pf.id || w.defenderFactionId === pf.id;
      const tag = involves ? ' ★' : '';
      parts.push(`  ${w.year}/${w.month}: ${w.attackerFaction} attacked ${w.defenderFaction} at ${w.city} (${w.type}) — ${result}${tag}`);
    }
    parts.push('');
  }

  // Pending events
  if (state.pendingEvents.length > 0) {
    parts.push('=== PENDING EVENTS ===');
    for (const e of state.pendingEvents) {
      parts.push(`  ${e.type}: ${e.name ?? ''}`);
    }
    parts.push('');
  }

  // Game log — recent events since last turn
  const gameLog = state.log;
  const newEntries = gameLog.slice(_lastSeenLogIndex);
  if (newEntries.length > 0) {
    parts.push('=== RECENT EVENTS (since your last turn) ===');
    // Show last 20 entries max to keep context reasonable
    const shown = newEntries.slice(-20);
    for (const entry of shown) {
      parts.push(`  - ${entry}`);
    }
    if (newEntries.length > 20) {
      parts.push(`  ... and ${newEntries.length - 20} earlier events`);
    }
    parts.push('');
  }
  _lastSeenLogIndex = gameLog.length;

  // Memory
  const memoryText = formatMemoryForPrompt();
  if (memoryText) {
    parts.push(memoryText);
  }

  return parts.join('\n');
}

/**
 * Build context for a tactical battle decision.
 */
export function buildBattleContext(): string {
  const battle = useBattleStore.getState();
  const game = useGameStore.getState();
  const parts: string[] = [];

  parts.push(`=== BATTLE STATE ===`);
  parts.push(`Day: ${battle.day} | Weather: ${battle.weather} | Wind: ${battle.windDirection}`);
  parts.push(`Siege: ${battle.isSiege ? 'Yes' : 'No'} | Turn Phase: ${battle.turnPhase}`);
  const isAttacker = battle.playerFactionId === battle.attackerId;
  const playerFood = isAttacker ? battle.attackerFood : battle.defenderFood;
  const enemyFood = isAttacker ? battle.defenderFood : battle.attackerFood;
  const playerStarveDays = isAttacker ? battle.attackerStarveDays : battle.defenderStarveDays;
  parts.push(`Our Food: ${playerFood} | Enemy Food: ${enemyFood}${playerStarveDays > 0 ? ` | STARVING (day ${playerStarveDays})` : ''}`);
  parts.push('');

  // Active unit
  const activeUnit = battle.units.find(u => u.id === battle.activeUnitId);
  if (activeUnit) {
    parts.push(`=== YOUR ACTIVE UNIT ===`);
    parts.push(`${activeUnit.officer.name} (${activeUnit.id}) | Type: ${activeUnit.type} | Troops: ${activeUnit.troops}/${activeUnit.maxTroops}`);
    parts.push(`Position: (${activeUnit.x}, ${activeUnit.y}) | Morale: ${activeUnit.morale}`);
    parts.push(`Stats: L=${activeUnit.officer.leadership} W=${activeUnit.officer.war} I=${activeUnit.officer.intelligence}`);
    parts.push('');
  }

  // Our units
  const playerFactionId = battle.playerFactionId;
  const ourUnits = battle.units.filter(u => u.factionId === playerFactionId && u.troops > 0);
  const enemyUnits = battle.units.filter(u => u.factionId !== playerFactionId && u.troops > 0);

  parts.push(`=== OUR UNITS (${ourUnits.length}) ===`);
  for (const u of ourUnits) {
    const isCommander = ourUnits.indexOf(u) === 0;
    parts.push(`  ${u.officer.name} (${u.id}) ${u.type} | HP: ${u.troops}/${u.maxTroops} | Morale: ${u.morale} | Pos: (${u.x},${u.y})${isCommander ? ' [COMMANDER]' : ''} ${u.status}`);
  }
  parts.push('');

  parts.push(`=== ENEMY UNITS (${enemyUnits.length}) ===`);
  for (const u of enemyUnits) {
    const isCommander = enemyUnits.indexOf(u) === 0;
    parts.push(`  ${u.officer.name} (${u.id}) ${u.type} | HP: ${u.troops}/${u.maxTroops} | Morale: ${u.morale} | Pos: (${u.x},${u.y})${isCommander ? ' [COMMANDER]' : ''} ${u.status}`);
  }
  parts.push('');

  // Gates (siege)
  if (battle.gates.length > 0) {
    parts.push('=== GATES ===');
    for (const g of battle.gates) {
      parts.push(`  Gate at (${g.q},${g.r}) HP: ${g.hp}`);
    }
    parts.push('');
  }

  // Move range and attack targets for active unit
  if (activeUnit && game.phase === 'battle') {
    const rtkApi = (window as unknown as { rtk: typeof import('../debug/rtk-api').rtkApi }).rtk;
    if (rtkApi) {
      const moveRange = rtkApi.battle.moveRange(activeUnit.id);
      const attackTargets = rtkApi.battle.attackTargets(activeUnit.id);
      const gateTargets = rtkApi.battle.gateTargets(activeUnit.id);

      if (moveRange.length > 0) {
        parts.push(`Available moves: ${moveRange.map(h => `(${h.q},${h.r})`).join(' ')}`);
      }
      if (attackTargets.length > 0) {
        parts.push(`Attack targets: ${attackTargets.map(u => `${u.officer.name}(${u.id}) at (${u.x},${u.y}) HP=${u.troops}`).join(', ')}`);
      }
      if (gateTargets.length > 0) {
        parts.push(`Gate targets: ${gateTargets.map(g => `(${g.q},${g.r}) HP=${g.hp}`).join(', ')}`);
      }
      parts.push('');
    }
  }

  // Recent battle events (damage, kills, enemy actions, day transitions)
  const battleLog = battle.battleLog;
  const newBattleEntries = battleLog.slice(_lastSeenBattleLogIndex);
  if (newBattleEntries.length > 0) {
    parts.push('=== RECENT BATTLE EVENTS ===');
    const shown = newBattleEntries.slice(-15);
    for (const entry of shown) {
      parts.push(`  - ${entry}`);
    }
    if (newBattleEntries.length > 15) {
      parts.push(`  ... and ${newBattleEntries.length - 15} earlier events`);
    }
    parts.push('');
  }
  _lastSeenBattleLogIndex = battleLog.length;

  // Battle memory
  const memoryText = formatMemoryForPrompt();
  if (memoryText) {
    parts.push(memoryText);
  }

  return parts.join('\n');
}
