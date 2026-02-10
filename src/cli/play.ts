/**
 * CLI Game Runner
 *
 * Drives the game engine from the terminal without a browser.
 * Uses the existing Zustand stores directly — they work in Node.
 *
 * Usage:
 *   npx tsx src/cli/play.ts
 *   npx tsx src/cli/play.ts --scenario 0 --faction 袁紹 --attack 平原
 */
import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { scenarios } from '../data/scenarios';
import { getDistance } from '../utils/hex';
import { getMovementRange, getAttackRange } from '../utils/unitTypes';
import type { BattleUnit } from '../types/battle';

// ── Helpers ──

const game = useGameStore;
const battle = useBattleStore;

function log(msg: string) {
  console.log(msg);
}

function logSection(title: string) {
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(40));
}

// ── Battle AI ──
// Replicates runEnemyTurn logic but works for any faction's units.
// This lets us auto-play the player side in the CLI.

function runUnitAI(unitId: string) {
  const state = battle.getState();
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || unit.status !== 'active' || unit.troops <= 0) return;

  const enemies = state.units.filter(
    u => u.factionId !== unit.factionId && u.troops > 0 && u.status !== 'routed'
  );
  if (enemies.length === 0) return;

  // Find nearest enemy
  const nearest = enemies.reduce((best, e) => {
    const d = getDistance({ q: e.x, r: e.y }, { q: unit.x, r: unit.y });
    const bestD = getDistance({ q: best.x, r: best.y }, { q: unit.x, r: unit.y });
    return d < bestD ? e : best;
  });

  const distToNearest = getDistance(
    { q: nearest.x, r: nearest.y },
    { q: unit.x, r: unit.y }
  );
  const atkRange = getAttackRange(unit.type);

  // If in attack range, attack directly
  if (distToNearest <= atkRange) {
    battle.getState().attackUnit(unit.id, nearest.id);
    return;
  }

  // Check if we should attack a gate first (siege maps)
  if (state.isSiege && state.gates.length > 0) {
    const nearestGate = findNearestGate(unit);
    if (nearestGate) {
      const gateDist = getDistance(
        { q: nearestGate.q, r: nearestGate.r },
        { q: unit.x, r: unit.y }
      );
      if (gateDist <= 1) {
        battle.getState().attackGate(unit.id, nearestGate.q, nearestGate.r);
        return;
      }
    }
  }

  // Move toward nearest enemy (or gate in siege)
  const moveTarget = getMoveTarget(unit, nearest);
  if (moveTarget && (moveTarget.q !== unit.x || moveTarget.r !== unit.y)) {
    battle.getState().moveUnit(unit.id, moveTarget.q, moveTarget.r);
  }

  // After moving, try to attack
  const updatedUnit = battle.getState().units.find(u => u.id === unit.id);
  if (updatedUnit && updatedUnit.troops > 0) {
    const newDist = getDistance(
      { q: nearest.x, r: nearest.y },
      { q: updatedUnit.x, r: updatedUnit.y }
    );
    if (newDist <= atkRange) {
      battle.getState().attackUnit(unit.id, nearest.id);
      return;
    }

    // Try gate attack after moving
    if (state.isSiege) {
      const nearestGate = findNearestGate(updatedUnit);
      if (nearestGate) {
        const gateDist = getDistance(
          { q: nearestGate.q, r: nearestGate.r },
          { q: updatedUnit.x, r: updatedUnit.y }
        );
        if (gateDist <= 1) {
          battle.getState().attackGate(unit.id, nearestGate.q, nearestGate.r);
          return;
        }
      }
    }
  }
}

function findNearestGate(unit: BattleUnit) {
  const state = battle.getState();
  if (state.gates.length === 0) return null;

  return state.gates.reduce((best, g) => {
    const d = getDistance({ q: g.q, r: g.r }, { q: unit.x, r: unit.y });
    const bestD = getDistance({ q: best.q, r: best.r }, { q: unit.x, r: unit.y });
    return d < bestD ? g : best;
  });
}

function getMoveTarget(unit: BattleUnit, target: BattleUnit | { x: number; y: number }) {
  const state = battle.getState();
  const moveRange = getMovementRange(unit.type);
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];

  const targetPos = { q: target.x, r: target.y };
  let bestHex = { q: unit.x, r: unit.y };
  let bestDist = getDistance(targetPos, { q: unit.x, r: unit.y });

  for (const dir of directions) {
    for (let step = 1; step <= moveRange; step++) {
      const candidate = {
        q: unit.x + dir.q * step,
        r: unit.y + dir.r * step,
      };

      // Bounds check
      if (candidate.q < 0 || candidate.q >= state.battleMap.width ||
          candidate.r < 0 || candidate.r >= state.battleMap.height) break;

      // Terrain check
      const terrain = state.battleMap.terrain[candidate.q][candidate.r];
      if (terrain === 'mountain' || (terrain === 'city' && !state.isSiege)) break;

      // Unit collision
      if (state.units.some(u => u.id !== unit.id && u.x === candidate.q && u.y === candidate.r && u.troops > 0)) break;

      // Gate collision
      if (state.gates.some(g => g.q === candidate.q && g.r === candidate.r && g.hp > 0)) break;

      const d = getDistance(candidate, targetPos);
      if (d < bestDist) {
        bestDist = d;
        bestHex = candidate;
      }
    }
  }

  return bestHex;
}

// ── Battle Loop ──

function runBattle(): { winner: string; log: string[] } {
  const bs = battle.getState();
  const playerFaction = bs.playerFactionId;
  const attackerFaction = bs.attackerId;
  const defenderFaction = bs.defenderId;

  log(`\nBattle: attacker(${attackerFaction}) vs defender(${defenderFaction})`);
  log(`Siege: ${bs.isSiege}, Gates: ${bs.gates.length}`);

  bs.units.forEach(u => {
    const side = u.factionId === playerFaction ? 'PLAYER' : 'ENEMY';
    log(`  ${side} ${u.officer.name} troops=${u.troops} at (${u.x},${u.y})`);
  });

  let maxDays = 30;
  while (!battle.getState().isFinished && battle.getState().day <= maxDays) {
    const state = battle.getState();
    const day = state.day;

    // ── Player Phase ──
    const playerUnits = state.units.filter(
      u => u.factionId === playerFaction && u.troops > 0 && u.status === 'active'
    );

    for (const pu of playerUnits) {
      if (battle.getState().isFinished) break;
      battle.getState().selectUnit(pu.id);
      runUnitAI(pu.id);
    }

    if (battle.getState().isFinished) break;
    battle.getState().endPlayerPhase();

    // ── Enemy Phase ──
    let safety = 0;
    while (battle.getState().stepEnemyPhase() && safety < 50) {
      safety++;
      if (battle.getState().isFinished) break;
    }

    // Print day summary
    const postDay = battle.getState();
    if (postDay.day !== day || postDay.isFinished) {
      const playerAlive = postDay.units.filter(u => u.factionId === playerFaction && u.troops > 0);
      const enemyAlive = postDay.units.filter(u => u.factionId !== playerFaction && u.troops > 0);
      log(`  Day ${day}: player=${playerAlive.length} units (${playerAlive.reduce((s, u) => s + u.troops, 0)} troops) | enemy=${enemyAlive.length} units (${enemyAlive.reduce((s, u) => s + u.troops, 0)} troops)`);
    }
  }

  const result = battle.getState();
  const winnerFactionId = result.winnerFactionId;
  const factions = game.getState().factions;
  const winnerName = factions.find(f => f.id === winnerFactionId)?.name || `faction ${winnerFactionId}`;

  // ── Post-battle resolution (mirrors BattleScreen.tsx useEffect) ──
  if (result.isFinished && winnerFactionId !== null) {
    const loserFactionId = winnerFactionId === result.attackerId ? result.defenderId : result.attackerId;
    game.getState().addLog(`戰鬥結束！勝利者：${winnerName}`);

    const battleUnitsData = result.units.map(u => ({
      officerId: u.officerId,
      troops: u.troops,
      factionId: u.factionId,
      status: u.status,
    }));

    game.getState().resolveBattle(
      winnerFactionId,
      loserFactionId,
      result.defenderCityId,
      battleUnitsData,
      result.capturedOfficerIds,
      result.routedOfficerIds
    );

    game.getState().setPhase('playing');
  }

  return { winner: winnerName, log: result.battleLog };
}

// ── Main ──

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      parsed[args[i].slice(2)] = args[i + 1] || '';
    }
  }
  return parsed;
}

function main() {
  const args = parseArgs();

  // Select scenario
  const scenarioIndex = parseInt(args.scenario || '0', 10);
  const scenario = scenarios[scenarioIndex];
  if (!scenario) {
    log(`Invalid scenario index: ${scenarioIndex}. Available: ${scenarios.map((s, i) => `${i}=${s.name}`).join(', ')}`);
    process.exit(1);
  }

  game.getState().selectScenario(scenario);
  logSection(`${scenario.name} — ${scenario.subtitle}`);

  // Select faction
  const factions = game.getState().factions;
  const factionArg = args.faction;
  let factionId: number;

  if (factionArg) {
    const found = factions.find(f => f.name === factionArg || f.id === parseInt(factionArg, 10));
    if (!found) {
      log(`Invalid faction: ${factionArg}. Available: ${factions.map(f => `${f.id}=${f.name}`).join(', ')}`);
      process.exit(1);
    }
    factionId = found.id;
  } else {
    log('Available factions:');
    factions.forEach(f => {
      const cities = game.getState().cities.filter(c => c.factionId === f.id);
      const officers = game.getState().officers.filter(o => o.factionId === f.id);
      log(`  ${f.id}. ${f.name} (${cities.length} cities, ${officers.length} officers)`);
    });
    factionId = factions[0].id;
    log(`\nAuto-selecting: ${factions[0].name}`);
  }

  game.getState().selectFaction(factionId);
  game.getState().confirmSettings();

  const state = game.getState();
  logSection(`Playing as ${state.playerFaction?.name}`);

  // Show cities
  const playerCities = state.cities.filter(c => c.factionId === factionId);
  for (const city of playerCities) {
    const officers = state.officers.filter(o => o.cityId === city.id && o.factionId === factionId);
    log(`  ${city.name}: troops=${city.troops}, officers=[${officers.map(o => `${o.name}(lead=${o.leadership},war=${o.war})`).join(', ')}]`);

    const targets = city.adjacentCityIds
      .map(id => state.cities.find(c => c.id === id))
      .filter(Boolean);
    for (const t of targets) {
      const tFaction = state.factions.find(f => f.id === t!.factionId);
      log(`    → ${t!.name} (${tFaction?.name || 'empty'}, troops=${t!.troops})`);
    }
  }

  // Attack target
  const attackTarget = args.attack;
  if (!attackTarget) {
    log('\nNo --attack target specified. Use --attack <city name> to start a battle.');
    log('Example: npx tsx src/cli/play.ts --scenario 0 --faction 袁紹 --attack 平原');
    return;
  }

  const targetCity = state.cities.find(c => c.name === attackTarget);
  if (!targetCity) {
    log(`City not found: ${attackTarget}`);
    process.exit(1);
  }

  // Find which player city can attack the target
  const sourceCity = playerCities.find(c => c.adjacentCityIds.includes(targetCity.id));
  if (!sourceCity) {
    log(`No player city adjacent to ${attackTarget}`);
    process.exit(1);
  }

  const attackers = state.officers
    .filter(o => o.cityId === sourceCity.id && o.factionId === factionId)
    .slice(0, 5);

  logSection(`${sourceCity.name} → ${targetCity.name}`);
  log(`Attackers: ${attackers.map(o => o.name).join(', ')}`);

  // Set formation and start battle
  game.getState().selectCity(sourceCity!.id);
  game.getState().setBattleFormation({
    officerIds: attackers.map(o => o.id),
    unitTypes: attackers.map(() => 'infantry' as const),
  });

  game.getState().startBattle(targetCity!.id);

  if (game.getState().phase !== 'battle') {
    log('Battle did not start. Check game log:');
    game.getState().log.forEach(l => log(`  ${l}`));
    return;
  }

  // Run battle
  const result = runBattle();

  logSection(`Battle Result: ${result.winner} wins!`);

  // Print last N battle log entries
  log('\nBattle Log:');
  result.log.slice(-30).forEach(l => log(`  ${l}`));

  // Print game log (post-battle resolution)
  log('\nGame Log:');
  game.getState().log.forEach(l => log(`  ${l}`));

  // Print final state
  logSection('Post-Battle State');
  const postState = game.getState();
  const postCities = postState.cities.filter(c => c.factionId === factionId);
  log(`${postState.playerFaction?.name} cities: ${postCities.map(c => `${c.name}(troops=${c.troops})`).join(', ')}`);

  // Check conquered city
  const conquered = postState.cities.find(c => c.id === targetCity.id);
  if (conquered) {
    const occupants = postState.officers.filter(o => o.cityId === conquered.id);
    const pows = occupants.filter(o => o.factionId === -1);
    const ours = occupants.filter(o => o.factionId === factionId);
    log(`${conquered.name}: faction=${postState.factions.find(f => f.id === conquered.factionId)?.name || 'none'}, troops=${conquered.troops}`);
    log(`  Officers: ${ours.map(o => o.name).join(', ') || 'none'}`);
    if (pows.length > 0) {
      log(`  POWs: ${pows.map(o => o.name).join(', ')}`);
    }
  }

  // Check defeated faction
  const defeatedFaction = state.factions.find(f => f.id === targetCity.factionId);
  if (defeatedFaction) {
    const stillExists = postState.factions.find(f => f.id === defeatedFaction.id);
    if (!stillExists) {
      log(`\n${defeatedFaction.name} has been DESTROYED.`);
    } else {
      const remainingCities = postState.cities.filter(c => c.factionId === defeatedFaction.id);
      log(`\n${defeatedFaction.name}: ${remainingCities.length} cities remaining`);
    }
  }
}

main();
