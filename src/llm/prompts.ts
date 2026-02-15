/**
 * Prompt construction for the LLM agent.
 *
 * System prompt describes the game, available commands, and expected output format.
 * State summaries give the LLM current game context.
 */

import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { formatMemoryForPrompt } from './memory';

// ── System Prompt (Strategic Phase) ─────────────────────

export const SYSTEM_PROMPT_STRATEGIC = `You are an expert AI player for Romance of the Three Kingdoms IV (三國志IV), a turn-based strategy game set in ancient China. You control a faction and must conquer all 43 cities to win.

## Game Rules
- Each officer gets ONE action per turn (marked as "acted" after).
- Domestic actions (commerce, agriculture, defense, technology, training) cost 500 gold each.
- Drafting troops costs 2 gold + 3 food per soldier. Max draft = 10% of city population.
- Tax revenue comes quarterly (months 1, 4, 7, 10). Food harvest in months 7 and 10.
- Each city needs a governor. The ruler IS the governor of their city (cannot be reassigned).

## Available Commands
Respond with a JSON array of commands to execute this turn. Each command is an object:

### Domestic (cost 500 gold each, need available officer)
- { "cmd": "developCommerce", "cityId": <id>, "officerId": <id> }
- { "cmd": "developAgriculture", "cityId": <id>, "officerId": <id> }
- { "cmd": "reinforceDefense", "cityId": <id>, "officerId": <id> }
- { "cmd": "developTechnology", "cityId": <id>, "officerId": <id> }
- { "cmd": "trainTroops", "cityId": <id>, "officerId": <id> }  (costs 500 food, not gold)
- { "cmd": "manufacture", "cityId": <id>, "weaponType": "crossbows"|"warHorses"|"batteringRams"|"catapults", "officerId": <id> }
- { "cmd": "setTaxRate", "cityId": <id>, "rate": "low"|"medium"|"high" }

### Military
- { "cmd": "draftTroops", "cityId": <id>, "amount": <number>, "officerId": <id> }
- { "cmd": "transport", "fromCityId": <id>, "toCityId": <id>, "resources": { "gold": <n>, "food": <n>, "troops": <n> }, "officerId": <id> }
- { "cmd": "transferOfficer", "officerId": <id>, "targetCityId": <id> }
- { "cmd": "startBattle", "targetCityId": <id> }
  NOTE: Before startBattle, you MUST set formation:
  { "cmd": "setBattleFormation", "formation": { "officerIds": [<ids>], "unitTypes": ["infantry"|"cavalry"|"archer"], "troops": [<per-unit>] } }

### Personnel
- { "cmd": "recruitOfficer", "officerId": <id>, "recruiterId": <id> }
- { "cmd": "searchOfficer", "cityId": <id>, "officerId": <id> }
- { "cmd": "recruitPOW", "officerId": <id>, "recruiterId": <id> }
- { "cmd": "rewardOfficer", "officerId": <id>, "type": "gold", "amount": 100 }
- { "cmd": "appointGovernor", "cityId": <id>, "officerId": <id> }

### Diplomacy (requires selecting a city first)
- { "cmd": "selectCity", "cityId": <id> }  (select your city before diplomacy)
- { "cmd": "improveRelations", "targetFactionId": <id>, "officerId": <id> }
- { "cmd": "formAlliance", "targetFactionId": <id>, "officerId": <id> }
- { "cmd": "proposeCeasefire", "targetFactionId": <id>, "officerId": <id> }

### Strategy (requires selecting a city first)
- { "cmd": "spy", "targetCityId": <id>, "officerId": <id> }
- { "cmd": "rumor", "targetCityId": <id>, "officerId": <id> }
- { "cmd": "counterEspionage", "targetCityId": <id>, "targetOfficerId": <id>, "officerId": <id> }

### Turn End
- { "cmd": "endTurn" }

## Response Format
You MUST respond with valid JSON in this exact structure:
{
  "thinking": "<your strategic reasoning for this turn>",
  "commands": [ ...array of command objects... ],
  "strategyNotes": "<notes for yourself about long-term plans, updated each turn>"
}

IMPORTANT RULES:
- Always end with { "cmd": "endTurn" } as the last command.
- Only use officers who have NOT acted yet (acted: false).
- Check city gold/food before issuing commands that cost resources.
- An officer can only act in the city where they are stationed.
- You must selectCity before diplomacy/strategy commands.
- If a battle starts, you'll be asked separately for tactical decisions.
- Think strategically: balance economy, military, and expansion.
- Prioritize: develop economy early, build troops for defense, attack when strong.
`;

// ── System Prompt (Battle Phase) ────────────────────────

export const SYSTEM_PROMPT_BATTLE = `You are controlling units in a tactical hex-based battle in Romance of the Three Kingdoms IV.

## Battle Rules
- Units take turns based on speed. When it's your unit's turn, you can: move, attack, use tactic, or wait.
- Commander (first unit) defeat = immediate loss for that side.
- Each unit has: troops, morale, type (infantry/cavalry/archer/etc), position (hex q,r).
- Cavalry is strong in open terrain, archers have range 2, infantry is balanced.
- When a unit's troops reach 0, the officer may be captured.

## Available Commands
Respond with a JSON object for the current unit's action:

- { "action": "move", "q": <hex_q>, "r": <hex_r> }
- { "action": "attack", "targetUnitId": "<id>" }
- { "action": "attackGate", "gateQ": <q>, "gateR": <r> }  (siege battles only)
- { "action": "tactic", "tactic": "<name>", "targetId": "<unit_id>" }
- { "action": "wait" }
- { "action": "endPlayerPhase" }  (end all remaining unit actions this day)

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

/**
 * Build a comprehensive state summary for the strategic phase.
 * Includes: date, faction info, all cities, officers, diplomacy, memory.
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
    parts.push(`  Commerce: ${city.commerce} | Agri: ${city.agriculture} | Defense: ${city.defense} | Tech: ${city.technology}`);
    parts.push(`  Training: ${city.training} | Morale: ${city.morale} | Loyalty: ${city.peopleLoyalty}`);
    if (city.crossbows > 0 || city.warHorses > 0 || city.batteringRams > 0 || city.catapults > 0) {
      parts.push(`  Weapons: Xbow=${city.crossbows} Horse=${city.warHorses} Ram=${city.batteringRams} Cat=${city.catapults}`);
    }
    parts.push(`  Officers (${officers.length}, ${available.length} available):`);
    for (const o of officers) {
      parts.push(`    ${o.name} id=${o.id} L=${o.leadership}/W=${o.war}/I=${o.intelligence}/P=${o.politics}/C=${o.charisma} ${o.acted ? '[ACTED]' : '[READY]'} loy=${o.loyalty} rank=${o.rank}${o.isGovernor ? ' [GOV]' : ''}`);
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

  // Diplomacy
  parts.push('=== DIPLOMACY ===');
  for (const f of state.factions) {
    if (f.id === pf.id) continue;
    const hostility = pf.relations[f.id] ?? 60;
    const isAlly = pf.allies.includes(f.id);
    const hasCeasefire = pf.ceasefires.some(c => c.factionId === f.id);
    const fCities = state.cities.filter(c => c.factionId === f.id);
    parts.push(`  ${f.name}(id=${f.id}): hostility=${hostility}${isAlly ? ' [ALLY]' : ''}${hasCeasefire ? ' [CEASEFIRE]' : ''} cities=${fCities.length}`);
  }
  parts.push('');

  // Pending events
  if (state.pendingEvents.length > 0) {
    parts.push('=== PENDING EVENTS ===');
    for (const e of state.pendingEvents) {
      parts.push(`  ${e.type}: ${e.name ?? ''}`);
    }
    parts.push('');
  }

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

  // Battle memory
  const memoryText = formatMemoryForPrompt();
  if (memoryText) {
    parts.push(memoryText);
  }

  return parts.join('\n');
}
