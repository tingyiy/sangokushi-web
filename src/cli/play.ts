/**
 * CLI Game Runner — Interactive Campaign Mode
 *
 * Drives the game engine from the terminal without a browser.
 * Uses the existing Zustand stores directly — they work in Node.
 *
 * Usage:
 *   npx tsx src/cli/play.ts --scenario 0 --faction 袁紹                 # interactive campaign
 *   npx tsx src/cli/play.ts --scenario 0 --faction 袁紹 --attack 平原   # single battle then exit
 *
 *   # Exec mode (non-interactive, for agent/script use):
 *   npx tsx src/cli/play.ts --scenario 0 --faction 袁紹 --savefile /tmp/g.json --exec "status"
 *   npx tsx src/cli/play.ts --savefile /tmp/g.json --exec "draft 鄴 2000; end; status"
 */
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { scenarios } from '../data/scenarios';
import { getDistance } from '../utils/hex';
import { getMovementRange, getAttackRange } from '../utils/unitTypes';
import { hasSkill } from '../utils/skills';
import { audioSystem } from '../systems/audio';
import type { BattleUnit } from '../types/battle';
import type { City } from '../types';

// Disable audio in CLI mode
audioSystem.setMute(true);

// ── Helpers ──

const game = useGameStore;
const battle = useBattleStore;

function log(msg: string) {
  console.log(msg);
}

function logSection(title: string) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

// ── Readline Setup ──
// When stdin is piped (non-TTY), we buffer all lines first because
// readline fires 'close' before our async loop can consume them.

const isTTY = process.stdin.isTTY ?? false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: isTTY,
});

// Line buffer for piped mode
const lineBuffer: string[] = [];
let stdinDone = false;
let lineResolve: ((line: string) => void) | null = null;

if (!isTTY) {
  rl.on('line', (line) => {
    if (lineResolve) {
      const resolve = lineResolve;
      lineResolve = null;
      resolve(line.trim());
    } else {
      lineBuffer.push(line.trim());
    }
  });
  rl.on('close', () => {
    stdinDone = true;
    // If someone is waiting for a line, give them empty string to unblock
    if (lineResolve) {
      const resolve = lineResolve;
      lineResolve = null;
      resolve('');
    }
  });
}

function ask(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  if (isTTY) {
    return new Promise(resolve => {
      rl.question('', answer => resolve(answer.trim()));
    });
  }
  // Piped mode: read from buffer
  if (lineBuffer.length > 0) {
    return Promise.resolve(lineBuffer.shift()!);
  }
  if (stdinDone) {
    return Promise.resolve('quit');
  }
  return new Promise(resolve => {
    lineResolve = resolve;
  });
}

// ── Battle AI ──
// Replicates runEnemyTurn logic but works for any faction's units.

function runUnitAI(unitId: string) {
  const state = battle.getState();
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || unit.status !== 'active' || unit.troops <= 0) return;

  const enemies = state.units.filter(
    u => u.factionId !== unit.factionId && u.troops > 0 && u.status !== 'routed'
  );
  if (enemies.length === 0) return;

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

  // 1. If enemy is in attack range, attack directly
  if (distToNearest <= atkRange) {
    battle.getState().attackUnit(unit.id, nearest.id);
    return;
  }

  // 2. In siege with intact gates: prioritize gate attacks
  const intactGates = state.isSiege
    ? state.gates.filter(g => g.hp > 0)
    : [];

  if (intactGates.length > 0) {
    const nearestGate = findNearestIntactGate(unit, intactGates);
    if (nearestGate) {
      const gateDist = getDistance(
        { q: nearestGate.q, r: nearestGate.r },
        { q: unit.x, r: unit.y }
      );
      // If already adjacent to gate, attack it
      if (gateDist <= 1) {
        battle.getState().attackGate(unit.id, nearestGate.q, nearestGate.r);
        return;
      }
      // Move TOWARD the gate (not toward enemies behind walls)
      const moveTarget = getMoveTarget(unit, { x: nearestGate.q, y: nearestGate.r });
      if (moveTarget && (moveTarget.q !== unit.x || moveTarget.r !== unit.y)) {
        battle.getState().moveUnit(unit.id, moveTarget.q, moveTarget.r);
      }
      // After moving, check if now adjacent to a gate
      const updatedUnit = battle.getState().units.find(u => u.id === unit.id);
      if (updatedUnit && updatedUnit.troops > 0) {
        const gateAfterMove = findNearestIntactGate(updatedUnit, battle.getState().gates.filter(g => g.hp > 0));
        if (gateAfterMove) {
          const gd = getDistance(
            { q: gateAfterMove.q, r: gateAfterMove.r },
            { q: updatedUnit.x, r: updatedUnit.y }
          );
          if (gd <= 1) {
            battle.getState().attackGate(unit.id, gateAfterMove.q, gateAfterMove.r);
          }
        }
      }
      return;
    }
  }

  // 3. No intact gates (field battle or gates breached): move toward enemy
  const moveTarget = getMoveTarget(unit, nearest);
  if (moveTarget && (moveTarget.q !== unit.x || moveTarget.r !== unit.y)) {
    battle.getState().moveUnit(unit.id, moveTarget.q, moveTarget.r);
  }

  const updatedUnit = battle.getState().units.find(u => u.id === unit.id);
  if (updatedUnit && updatedUnit.troops > 0) {
    const newDist = getDistance(
      { q: nearest.x, r: nearest.y },
      { q: updatedUnit.x, r: updatedUnit.y }
    );
    if (newDist <= atkRange) {
      battle.getState().attackUnit(unit.id, nearest.id);
    }
  }
}

function findNearestIntactGate(unit: BattleUnit, intactGates?: { q: number; r: number; hp: number }[]) {
  const gates = intactGates ?? battle.getState().gates.filter(g => g.hp > 0);
  if (gates.length === 0) return null;
  return gates.reduce((best, g) => {
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

  // In siege, breached gate hexes are passable
  const breachedGateSet = new Set(
    state.gates.filter(g => g.hp <= 0).map(g => `${g.q},${g.r}`)
  );

  const targetPos = { q: target.x, r: target.y };
  let bestHex = { q: unit.x, r: unit.y };
  let bestDist = getDistance(targetPos, { q: unit.x, r: unit.y });

  for (const dir of directions) {
    for (let step = 1; step <= moveRange; step++) {
      const candidate = {
        q: unit.x + dir.q * step,
        r: unit.y + dir.r * step,
      };
      if (candidate.q < 0 || candidate.q >= state.battleMap.width ||
          candidate.r < 0 || candidate.r >= state.battleMap.height) break;
      const terrain = state.battleMap.terrain[candidate.q][candidate.r];
      if (terrain === 'mountain') break;
      // In siege: walls ('city' terrain) block unless it's a breached gate hex
      if (terrain === 'city') {
        const key = `${candidate.q},${candidate.r}`;
        if (!breachedGateSet.has(key)) break;
      }
      if (state.units.some(u => u.id !== unit.id && u.x === candidate.q && u.y === candidate.r && u.troops > 0)) break;
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

function runBattle(): { winner: string; winnerFactionId: number | null; log: string[] } {
  const bs = battle.getState();
  const playerFaction = bs.playerFactionId;

  log(`  Battle: attacker(${bs.attackerId}) vs defender(${bs.defenderId}), siege=${bs.isSiege}, gates=${bs.gates.length}`);
  bs.units.forEach(u => {
    const side = u.factionId === playerFaction ? 'ATK' : 'DEF';
    log(`    ${side} ${u.officer.name} troops=${u.troops} war=${u.officer.war} type=${u.type}`);
  });

  const maxDays = 30;
  while (!battle.getState().isFinished && battle.getState().day <= maxDays) {
    const state = battle.getState();
    const day = state.day;

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

    let safety = 0;
    while (battle.getState().stepEnemyPhase() && safety < 50) {
      safety++;
      if (battle.getState().isFinished) break;
    }

    const postDay = battle.getState();
    if (postDay.day !== day || postDay.isFinished) {
      const pa = postDay.units.filter(u => u.factionId === playerFaction && u.troops > 0);
      const ea = postDay.units.filter(u => u.factionId !== playerFaction && u.troops > 0);
      log(`    Day ${day}: ATK=${pa.length}(${pa.reduce((s, u) => s + u.troops, 0)}) DEF=${ea.length}(${ea.reduce((s, u) => s + u.troops, 0)})`);
    }
  }

  const result = battle.getState();
  const winnerFactionId = result.winnerFactionId;
  const factions = game.getState().factions;
  const winnerName = factions.find(f => f.id === winnerFactionId)?.name || `faction ${winnerFactionId}`;

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

  return { winner: winnerName, winnerFactionId, log: result.battleLog };
}

// ── Display Helpers ──

function showStatus(factionId: number) {
  const state = game.getState();
  const faction = state.factions.find(f => f.id === factionId);
  logSection(`${faction?.name} — ${state.year}年${state.month}月`);

  const myCities = state.cities.filter(c => c.factionId === factionId);
  for (const city of myCities) {
    const officers = state.officers.filter(o => o.cityId === city.id && o.factionId === factionId);
    const governor = officers.find(o => o.isGovernor);
    const govLabel = governor ? `太守:${governor.name}` : '(無太守)';
    log(`  [${city.id}] ${city.name} ${govLabel}`);
    log(`      兵=${city.troops} 金=${city.gold} 糧=${city.food} 人口=${city.population}`);
    log(`      商=${city.commerce} 農=${city.agriculture} 防=${city.defense} 訓=${city.training} 技=${city.technology}`);
    log(`      弩=${city.crossbows} 馬=${city.warHorses} 車=${city.batteringRams} 石=${city.catapults}`);

    // Show officers
    for (const o of officers) {
      const skills = o.skills.length > 0 ? ` [${o.skills.join(',')}]` : '';
      log(`      ${o.isGovernor ? '*' : ' '} ${o.name} L${o.leadership} W${o.war} I${o.intelligence} P${o.politics} C${o.charisma} 體=${o.stamina} 忠=${o.loyalty}${skills}`);
    }

    // Show POWs
    const pows = state.officers.filter(o => o.cityId === city.id && o.factionId === -1);
    if (pows.length > 0) {
      log(`      POWs: ${pows.map(o => `${o.name}(L${o.leadership},W${o.war})`).join(', ')}`);
    }

    // Show neighbors
    const neighbors = city.adjacentCityIds
      .map(id => state.cities.find(c => c.id === id))
      .filter(Boolean);
    for (const n of neighbors) {
      const nFaction = state.factions.find(f => f.id === n!.factionId);
      const nOfficers = state.officers.filter(o => o.cityId === n!.id && o.factionId === n!.factionId);
      const label = n!.factionId === factionId ? '(ours)' : n!.factionId === null ? '(empty)' : `(${nFaction?.name || '?'})`;
      log(`      → [${n!.id}] ${n!.name} ${label} 兵=${n!.troops} off=${nOfficers.length}`);
    }
  }

  // Unaffiliated officers in our cities
  for (const city of myCities) {
    const unaffiliated = state.officers.filter(o => o.cityId === city.id && o.factionId === null);
    if (unaffiliated.length > 0) {
      log(`  在野 at ${city.name}: ${unaffiliated.map(o => `${o.name}(L${o.leadership},W${o.war},P${o.politics})`).join(', ')}`);
    }
  }
}

function showWorld() {
  const state = game.getState();
  logSection('World Map');
  for (const faction of state.factions) {
    const cities = state.cities.filter(c => c.factionId === faction.id);
    const officers = state.officers.filter(o => o.factionId === faction.id);
    const totalTroops = cities.reduce((s, c) => s + c.troops, 0);
    log(`  ${faction.name}: ${cities.length} cities, ${officers.length} off, ${totalTroops} troops — [${cities.map(c => c.name).join(', ')}]`);
  }
  const emptyCities = state.cities.filter(c => c.factionId === null);
  if (emptyCities.length > 0) {
    log(`  (空城): ${emptyCities.map(c => c.name).join(', ')}`);
  }
}

function showHelp() {
  log('');
  log('Commands (all single-line, no follow-up prompts):');
  log('');
  log('  --- Query ---');
  log('  status | s                 — Show your faction status (cities, officers, neighbors)');
  log('  world | w                  — Show all factions overview');
  log('  city <name|id>             — Detailed city info (stats, officers, POWs, neighbors)');
  log('  officer <name>             — Detailed officer info');
  log('  officers [city]            — List officers (optionally filter by city)');
  log('  factions                   — Detailed faction list with relations');
  log('  log | l                    — Show recent game log (last 20)');
  log('');
  log('  --- 內政 (Domestic) ---');
  log('  commerce <city> [officer]       — Develop commerce (+10~20, costs 500g, stamina -20)');
  log('  agriculture <city> [officer]    — Develop agriculture (+10~20, costs 500g, stamina -20)');
  log('  defense <city> [officer]        — Reinforce defense (+5, costs 300g, stamina -20)');
  log('  train <city> [officer]          — Train troops (+training/morale, costs 500f, stamina -20)');
  log('  technology <city> [officer]     — Develop technology (+5~10, costs 800g, stamina -25)');
  log('  flood <city> [officer]          — Flood control (+8~14, costs 500g, stamina -20)');
  log('  manufacture <city> <type> [off] — Manufacture weapons (crossbows|horses|rams|catapults, 1000g)');
  log('  relief <city> [officer]         — Disaster relief (+loyalty, costs 500g+1000f, stamina -15)');
  log('  tax <city> <low|med|high>       — Set tax rate');
  log('');
  log('  --- 人事 (Personnel) ---');
  log('  recruit <officer name>          — Recruit unaffiliated officer (在野)');
  log('  recruitpow <officer name>       — Recruit captured officer (POW)');
  log('  search <city>                   — Search for officers/treasures');
  log('  reward <officer> <amount>       — Reward officer with gold (+loyalty)');
  log('  governor <city> <officer>       — Appoint governor (太守)');
  log('  advisor <officer>               — Appoint advisor (軍師)');
  log('  promote <officer> <rank>        — Promote (一般|侍中|軍師|將軍|都督)');
  log('  transfer <officer> <city>       — Transfer officer to another city');
  log('  execute <officer>               — Execute POW');
  log('  dismiss <officer>               — Dismiss officer from service');
  log('');
  log('  --- 軍事 (Military) ---');
  log('  draft <city> <amount> [officer]                — Draft troops (costs 2g+3f per soldier)');
  log('  attack <city> [officers] [types] [troops]      — Attack enemy city');
  log('    officers: "all" or 1,2,3 (index from status) | types: i,c,a or "auto" | troops: 5000 or 5000,3000');
  log('    e.g. attack 平原                              — auto everything');
  log('    e.g. attack 平原 1,2 i,c 5000,4000           — officers 1&2, infantry+cavalry, 5000+4000 troops');
  log('  transport <from> <to> <gold|food|troops> <amt> — Transport resources between cities');
  log('  retreat                                         — Retreat from current battle');
  log('');
  log('  --- 外交 (Diplomacy) ---');
  log('  relations <faction>             — Improve relations / gift (costs 1000g)');
  log('  alliance <faction>              — Propose alliance (costs 2000g)');
  log('  breakalliance <faction>         — Break existing alliance');
  log('  jointattack <faction> <city>    — Request joint attack with ally');
  log('  ceasefire <faction>             — Propose ceasefire');
  log('  surrender <faction>             — Demand surrender');
  log('  hostage <officer> <faction>     — Exchange hostage');
  log('');
  log('  --- 謀略 (Strategy) ---');
  log('  spy <city>                      — Spy on enemy city (requires 情報/諜報 skill)');
  log('  intel <city>                    — Gather intelligence (requires 情報 skill)');
  log('  rumor <city>                    — Spread rumors (-loyalty/-pop, requires 流言 skill)');
  log('  arson <city>                    — Set fire to enemy city (requires 燒討 skill)');
  log('  rebel <city>                    — Incite rebellion (requires 驅虎 skill)');
  log('  counter <city> <officer>        — Counter-espionage (requires 做敵 skill)');
  log('');
  log('  --- Turn ---');
  log('  end                             — End turn (AI acts, income, stamina +20, next month)');
  log('  help | h | ?                    — Show this help');
  log('  quit | q                        — Exit');
  log('');
}

function showLog() {
  const logs = game.getState().log;
  const recent = logs.slice(-20);
  logSection('Recent Log');
  recent.forEach(l => log(`  ${l}`));
}

// ── Game Log Flushing ──
// The game store's addLog() keeps only the last 50 entries (slice(-49) + 1).
// We can't track by index since the array gets trimmed. Instead we snapshot
// the last entry we've seen and print everything after it.

let lastSeenLog: string[] = [];

function flushGameLog() {
  const logs = game.getState().log;
  if (logs.length === 0) return;

  // Find how many new entries there are
  // Compare from the end of lastSeenLog against current logs
  let newCount = 0;
  if (lastSeenLog.length === 0) {
    newCount = logs.length;
  } else {
    // Find where the old snapshot ends in the current log
    // The log may have been trimmed, so we look for the last entry we saw
    const lastSeen = lastSeenLog[lastSeenLog.length - 1];
    const lastSeenIdx = logs.lastIndexOf(lastSeen);

    if (lastSeenIdx === -1) {
      // Our last seen entry was trimmed out — print everything
      newCount = logs.length;
    } else {
      newCount = logs.length - lastSeenIdx - 1;
    }
  }

  if (newCount > 0) {
    const newEntries = logs.slice(-newCount);
    newEntries.forEach(l => log(`  📜 ${l}`));
  }

  // Snapshot current state
  lastSeenLog = [...logs];
}

function syncLogIndex() {
  lastSeenLog = [...game.getState().log];
}

// ── Command Router ──

function findCity(name: string): City | null {
  const state = game.getState();
  return state.cities.find(c => c.name === name) || null;
}

function findCityByIdOrName(input: string): City | null {
  const state = game.getState();
  const asNum = parseInt(input, 10);
  if (!isNaN(asNum)) {
    return state.cities.find(c => c.id === asNum) || null;
  }
  return state.cities.find(c => c.name === input) || null;
}

function findOfficerByName(name: string, factionId?: number | null) {
  const state = game.getState();
  return state.officers.find(o => {
    if (o.name !== name) return false;
    if (factionId !== undefined) return o.factionId === factionId;
    return true;
  });
}

function handleCommand(input: string, factionId: number): boolean {
  const parts = input.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  if (!cmd) return false;

  const state = game.getState();

  switch (cmd) {
    case 'help':
    case 'h':
    case '?':
      showHelp();
      return false;

    case 'status':
    case 's':
      showStatus(factionId);
      return false;

    case 'world':
    case 'w':
      showWorld();
      return false;

    case 'log':
    case 'l':
      showLog();
      return false;

    case 'city': {
      const city = findCityByIdOrName(parts.slice(1).join(''));
      if (!city) { log('  City not found.'); return false; }
      const officers = state.officers.filter(o => o.cityId === city.id);
      const faction = state.factions.find(f => f.id === city.factionId);
      log(`  ${city.name} [id=${city.id}] (${faction?.name || '空城'})`);
      log(`    兵=${city.troops} 金=${city.gold} 糧=${city.food} 人口=${city.population}`);
      log(`    商=${city.commerce} 農=${city.agriculture} 防=${city.defense} 訓=${city.training} 技=${city.technology}`);
      log(`    治水=${city.floodControl} 民忠=${city.peopleLoyalty} 士氣=${city.morale} 稅=${city.taxRate}`);
      log(`    弩=${city.crossbows} 馬=${city.warHorses} 車=${city.batteringRams} 石=${city.catapults}`);
      const ours = officers.filter(o => o.factionId === city.factionId);
      const pows = officers.filter(o => o.factionId === -1);
      const unaffiliated = officers.filter(o => o.factionId === null);
      if (ours.length > 0) {
        log('    Officers:');
        for (const o of ours) {
          const skills = o.skills.length > 0 ? ` [${o.skills.join(',')}]` : '';
          log(`      ${o.isGovernor ? '*' : ' '} ${o.name} L${o.leadership} W${o.war} I${o.intelligence} P${o.politics} C${o.charisma} 體=${o.stamina} 忠=${o.loyalty} ${o.rank}${skills}`);
        }
      }
      if (pows.length > 0) log(`    POWs: ${pows.map(o => `${o.name}(L${o.leadership},W${o.war})`).join(', ')}`);
      if (unaffiliated.length > 0) log(`    在野: ${unaffiliated.map(o => `${o.name}(L${o.leadership},W${o.war},P${o.politics})`).join(', ')}`);
      // Neighbors
      const neighbors = city.adjacentCityIds.map(id => state.cities.find(c => c.id === id)).filter(Boolean);
      for (const n of neighbors) {
        const nFaction = state.factions.find(f => f.id === n!.factionId);
        const nOff = state.officers.filter(o => o.cityId === n!.id && o.factionId === n!.factionId);
        log(`    → [${n!.id}] ${n!.name} (${nFaction?.name || '空城'}) 兵=${n!.troops} off=${nOff.length}`);
      }
      return false;
    }

    case 'officer': {
      const name = parts.slice(1).join('');
      const officer = state.officers.find(o => o.name === name);
      if (!officer) { log(`  Officer "${name}" not found.`); return false; }
      const city = state.cities.find(c => c.id === officer.cityId);
      const faction = state.factions.find(f => f.id === officer.factionId);
      const affil = officer.factionId === -1 ? 'POW' : officer.factionId === null ? '在野' : faction?.name || '?';
      log(`  ${officer.name} [id=${officer.id}] — ${affil}`);
      log(`    City: ${city?.name || '?'} | Rank: ${officer.rank} | ${officer.isGovernor ? 'Governor' : ''}`);
      log(`    L=${officer.leadership} W=${officer.war} I=${officer.intelligence} P=${officer.politics} C=${officer.charisma}`);
      log(`    Stamina=${officer.stamina} Loyalty=${officer.loyalty} Age=${state.year - officer.birthYear}`);
      log(`    Skills: ${officer.skills.length > 0 ? officer.skills.join(', ') : 'none'}`);
      if (officer.relationships.length > 0) {
        const rels = officer.relationships.map(r => {
          const target = state.officers.find(o => o.id === r.targetId);
          return `${r.type}:${target?.name || '?'}`;
        });
        log(`    Relationships: ${rels.join(', ')}`);
      }
      return false;
    }

    case 'officers': {
      const cityFilter = parts[1] ? findCityByIdOrName(parts[1]) : null;
      const myOfficers = state.officers
        .filter(o => o.factionId === factionId)
        .filter(o => !cityFilter || o.cityId === cityFilter.id);
      if (myOfficers.length === 0) { log('  No officers found.'); return false; }
      const grouped = new Map<number, typeof myOfficers>();
      for (const o of myOfficers) {
        if (!grouped.has(o.cityId)) grouped.set(o.cityId, []);
        grouped.get(o.cityId)!.push(o);
      }
      for (const [cityId, officers] of grouped) {
        const city = state.cities.find(c => c.id === cityId);
        log(`  ${city?.name || '?'}:`);
        for (const o of officers) {
          const skills = o.skills.length > 0 ? ` [${o.skills.join(',')}]` : '';
          log(`    ${o.isGovernor ? '*' : ' '} ${o.name} L${o.leadership} W${o.war} I${o.intelligence} P${o.politics} 體=${o.stamina} 忠=${o.loyalty} ${o.rank}${skills}`);
        }
      }
      return false;
    }

    case 'factions': {
      for (const f of state.factions) {
        const cities = state.cities.filter(c => c.factionId === f.id);
        const officers = state.officers.filter(o => o.factionId === f.id);
        const ruler = state.officers.find(o => o.id === f.rulerId);
        const totalTroops = cities.reduce((s, c) => s + c.troops, 0);
        log(`  ${f.name} (ruler: ${ruler?.name || '?'})`);
        log(`    Cities: ${cities.map(c => c.name).join(', ') || 'none'} | Officers: ${officers.length} | Troops: ${totalTroops}`);
        // Relations with player
        if (f.id !== factionId) {
          const hostility = f.relations[factionId] ?? 60;
          const isAlly = f.allies?.includes(factionId);
          log(`    Hostility toward us: ${hostility} ${isAlly ? '(ALLIED)' : ''}`);
        }
      }
      return false;
    }

    // ── Domestic ──

    case 'draft': {
      const city = findCityByIdOrName(parts[1] || '');
      const amount = parseInt(parts[2] || '1000', 10);
      const executorName = parts[3] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log('  City not found. Usage: draft <city> <amount> [officer]'); return false; }
      game.getState().selectCity(city.id);
      game.getState().draftTroops(city.id, amount, executor?.id);
      return false;
    }

    case 'commerce': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(city.id);
      game.getState().developCommerce(city.id, executor?.id);
      return false;
    }

    case 'agriculture': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(city.id);
      game.getState().developAgriculture(city.id, executor?.id);
      return false;
    }

    case 'defense': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(city.id);
      game.getState().reinforceDefense(city.id, executor?.id);
      return false;
    }

    case 'train': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(city.id);
      game.getState().trainTroops(city.id, executor?.id);
      return false;
    }

    case 'technology': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(city.id);
      game.getState().developTechnology(city.id, executor?.id);
      return false;
    }

    case 'flood': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(city.id);
      game.getState().developFloodControl(city.id, executor?.id);
      return false;
    }

    case 'manufacture': {
      const city = findCityByIdOrName(parts[1] || '');
      const typeMap: Record<string, 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults'> = {
        crossbows: 'crossbows', bows: 'crossbows', '弩': 'crossbows',
        horses: 'warHorses', cavalry: 'warHorses', '馬': 'warHorses',
        rams: 'batteringRams', '車': 'batteringRams',
        catapults: 'catapults', '石': 'catapults',
      };
      const weaponType = typeMap[(parts[2] || '').toLowerCase()];
      const executorName = parts[3] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city || !weaponType) { log('  Usage: manufacture <city> <crossbows|horses|rams|catapults> [officer]'); return false; }
      game.getState().selectCity(city.id);
      game.getState().manufacture(city.id, weaponType, executor?.id);
      return false;
    }

    case 'relief': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(city.id);
      game.getState().disasterRelief(city.id, executor?.id);
      return false;
    }

    case 'tax': {
      const city = findCityByIdOrName(parts[1] || '');
      const rateMap: Record<string, 'low' | 'medium' | 'high'> = {
        low: 'low', '低': 'low',
        med: 'medium', medium: 'medium', '中': 'medium',
        high: 'high', '高': 'high',
      };
      const rate = rateMap[(parts[2] || '').toLowerCase()];
      if (!city || !rate) { log('  Usage: tax <city> <low|med|high>'); return false; }
      game.getState().setTaxRate(city.id, rate);
      return false;
    }

    // ── Personnel ──

    case 'recruit': {
      const name = parts.slice(1).join('');
      const officer = findOfficerByName(name, null); // unaffiliated
      if (!officer) { log(`  Officer "${name}" not found (must be 在野).`); return false; }
      game.getState().recruitOfficer(officer.id);
      return false;
    }

    case 'recruitpow': {
      const name = parts.slice(1).join('');
      const officer = findOfficerByName(name, -1); // POW
      if (!officer) { log(`  POW "${name}" not found.`); return false; }
      // Select the city where the POW is held so the store can find recruiters
      game.getState().selectCity(officer.cityId);
      game.getState().recruitPOW(officer.id);
      return false;
    }

    case 'search': {
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(city.id);
      game.getState().searchOfficer(city.id);
      return false;
    }

    case 'reward': {
      const name = parts[1] || '';
      const officer = findOfficerByName(name, factionId);
      if (!officer) { log(`  Officer "${name}" not found in your faction.`); return false; }
      const amount = parseInt(parts[2] || '1000', 10);
      game.getState().rewardOfficer(officer.id, 'gold', amount);
      return false;
    }

    case 'governor': {
      const city = findCityByIdOrName(parts[1] || '');
      const officerName = parts[2] || '';
      const officer = findOfficerByName(officerName, factionId);
      if (!city || !officer) { log('  Usage: governor <city> <officer name>'); return false; }
      game.getState().appointGovernor(city.id, officer.id);
      return false;
    }

    case 'advisor': {
      const name = parts.slice(1).join('');
      const officer = findOfficerByName(name, factionId);
      if (!officer) { log(`  Officer "${name}" not found. Usage: advisor <officer name>`); return false; }
      game.getState().appointAdvisor(officer.id);
      return false;
    }

    case 'promote': {
      const name = parts[1] || '';
      const officer = findOfficerByName(name, factionId);
      const rankMap: Record<string, string> = {
        '一般': '一般', '侍中': '侍中', '軍師': '軍師', '將軍': '將軍', '都督': '都督', '太守': '太守',
        general: '一般', attendant: '侍中', strategist: '軍師', commander: '將軍', viceroy: '都督', governor: '太守',
      };
      const rank = rankMap[(parts[2] || '').toLowerCase()] || rankMap[parts[2] || ''];
      if (!officer || !rank) { log('  Usage: promote <officer> <一般|侍中|軍師|將軍|都督>'); return false; }
      game.getState().promoteOfficer(officer.id, rank as import('../types').OfficerRank);
      return false;
    }

    case 'transfer': {
      const officerName = parts[1] || '';
      const targetCity = findCityByIdOrName(parts[2] || '');
      const officer = findOfficerByName(officerName, factionId);
      if (!officer || !targetCity) { log('  Usage: transfer <officer name> <target city>'); return false; }
      game.getState().transferOfficer(officer.id, targetCity.id);
      return false;
    }

    case 'execute': {
      const name = parts.slice(1).join('');
      const officer = findOfficerByName(name, -1); // POW
      if (!officer) { log(`  POW "${name}" not found.`); return false; }
      game.getState().executeOfficer(officer.id);
      return false;
    }

    case 'dismiss': {
      const name = parts.slice(1).join('');
      const officer = findOfficerByName(name, factionId);
      if (!officer) { log(`  Officer "${name}" not found in your faction.`); return false; }
      game.getState().dismissOfficer(officer.id);
      return false;
    }

    // ── Military ──

    case 'attack': {
      // Single-line: attack <city> [officers] [types] [troops]
      //   attack 平原                         — auto officers, auto types, auto troops
      //   attack 平原 all                     — all officers (up to 5), auto types/troops
      //   attack 平原 1,2,3                   — pick officers by index, auto types/troops
      //   attack 平原 1,2,3 i,c,a             — pick officers + explicit types, auto troops
      //   attack 平原 1,2,3 i,c,a 5000,4000,3000  — explicit troops per officer
      //   attack 平原 all auto 3000           — all officers, auto types, 3000 each
      const targetName = parts[1] || '';
      const officerArg = parts[2] || '';
      const typeArg = parts[3] || '';
      const troopArg = parts[4] || '';

      const targetCity = findCityByIdOrName(targetName);
      if (!targetCity) { log(`  City "${targetName}" not found. Usage: attack <city> [officers] [types] [troops]`); return false; }
      if (targetCity.factionId === factionId) { log('  Cannot attack your own city.'); return false; }

      const myCities = state.cities.filter(c => c.factionId === factionId);
      const adjacentCities = myCities
        .filter(c => c.adjacentCityIds.includes(targetCity.id))
        .sort((a, b) => {
          // Prefer cities with more officers and troops
          const aOff = state.officers.filter(o => o.cityId === a.id && o.factionId === factionId && o.stamina >= 30).length;
          const bOff = state.officers.filter(o => o.cityId === b.id && o.factionId === factionId && o.stamina >= 30).length;
          if (bOff !== aOff) return bOff - aOff;
          return b.troops - a.troops;
        });
      const sourceCity = adjacentCities[0];
      if (!sourceCity) { log(`  No friendly city adjacent to ${targetCity.name}.`); return false; }

      // Get available officers sorted by leadership
      const available = state.officers
        .filter(o => o.cityId === sourceCity.id && o.factionId === factionId && o.stamina >= 30)
        .sort((a, b) => b.leadership - a.leadership);

      if (available.length === 0) {
        log(`  No officers with enough stamina (30+) at ${sourceCity.name}.`);
        return false;
      }

      // Select officers
      let selectedOfficers;
      if (!officerArg || officerArg.toLowerCase() === 'all') {
        selectedOfficers = available.slice(0, 5);
      } else {
        const indices = officerArg.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => i >= 0 && i < available.length);
        selectedOfficers = indices.map(i => available[i]).slice(0, 5);
      }

      if (selectedOfficers.length === 0) {
        log('  No valid officers selected. Available:');
        available.forEach((o, i) => {
          const skills = o.skills.length > 0 ? ` [${o.skills.join(',')}]` : '';
          log(`    ${i + 1}. ${o.name} L${o.leadership} W${o.war} max=${o.leadership * 100} 體=${o.stamina}${skills}`);
        });
        return false;
      }

      // Select unit types
      let unitTypes: ('infantry' | 'cavalry' | 'archer')[];
      if (!typeArg || typeArg.toLowerCase() === 'auto') {
        let crossbowsAvail = sourceCity.crossbows;
        let horsesAvail = sourceCity.warHorses;
        unitTypes = selectedOfficers.map(o => {
          if (hasSkill(o, '騎兵') && horsesAvail >= 1000) {
            horsesAvail -= 1000;
            return 'cavalry';
          }
          if (hasSkill(o, '弓兵') && crossbowsAvail >= 1000) {
            crossbowsAvail -= 1000;
            return 'archer';
          }
          return 'infantry';
        });
      } else {
        const typeMap: Record<string, 'infantry' | 'cavalry' | 'archer'> = {
          i: 'infantry', infantry: 'infantry',
          c: 'cavalry', cavalry: 'cavalry',
          a: 'archer', archer: 'archer',
        };
        const typeParts = typeArg.split(',').map(s => s.trim().toLowerCase());
        unitTypes = selectedOfficers.map((_, idx) => typeMap[typeParts[idx]] || 'infantry');
      }

      // Parse troops per officer
      let troopsPerOfficer: number[] | undefined;
      if (troopArg) {
        const troopParts = troopArg.split(',').map(s => parseInt(s.trim(), 10));
        // If only one number given, apply to all officers
        if (troopParts.length === 1 && !isNaN(troopParts[0])) {
          troopsPerOfficer = selectedOfficers.map(() => troopParts[0]);
        } else {
          troopsPerOfficer = selectedOfficers.map((_, idx) => {
            const v = troopParts[idx];
            return isNaN(v) ? 0 : v;
          });
        }
      }

      log(`  ${sourceCity.name} → ${targetCity.name}`);
      log(`  ${selectedOfficers.map((o, i) => {
        const t = troopsPerOfficer ? troopsPerOfficer[i] : `auto(max ${o.leadership * 100})`;
        return `${o.name}(${unitTypes[i]},${t})`;
      }).join(', ')}`);

      game.getState().selectCity(sourceCity.id);
      game.getState().setBattleFormation({
        officerIds: selectedOfficers.map(o => o.id),
        unitTypes,
        troops: troopsPerOfficer,
      });
      game.getState().startBattle(targetCity.id);

      if (game.getState().phase !== 'battle') {
        const updated = game.getState().cities.find(c => c.id === targetCity.id);
        if (updated?.factionId === factionId) {
          log(`  ${targetCity.name} was undefended — captured!`);
        } else {
          log('  Battle did not start:');
          game.getState().log.slice(-3).forEach(l => log(`    ${l}`));
        }
        return false;
      }

      const result = runBattle();
      logSection(`Battle Result: ${result.winner} wins!`);
      result.log.slice(-15).forEach(l => log(`  ${l}`));
      return false;
    }

    case 'transport': {
      const from = findCityByIdOrName(parts[1] || '');
      const to = findCityByIdOrName(parts[2] || '');
      const resMap: Record<string, 'gold' | 'food' | 'troops'> = {
        gold: 'gold', '金': 'gold',
        food: 'food', '糧': 'food',
        troops: 'troops', '兵': 'troops',
      };
      const resource = resMap[(parts[3] || '').toLowerCase()];
      const amount = parseInt(parts[4] || '1000', 10);
      if (!from || !to || !resource) {
        log('  Usage: transport <from city> <to city> <gold|food|troops> <amount>');
        return false;
      }
      game.getState().transport(from.id, to.id, resource, amount);
      return false;
    }

    // ── Diplomacy ──

    case 'relations': {
      const fName = parts.slice(1).join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(`  Faction "${fName}" not found.`); return false; }
      game.getState().improveRelations(targetFaction.id);
      return false;
    }

    case 'alliance': {
      const fName = parts.slice(1).join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(`  Faction "${fName}" not found.`); return false; }
      game.getState().formAlliance(targetFaction.id);
      return false;
    }

    case 'breakalliance': {
      const fName = parts.slice(1).join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(`  Faction "${fName}" not found.`); return false; }
      game.getState().breakAlliance(targetFaction.id);
      return false;
    }

    case 'jointattack': {
      const allyName = parts[1] || '';
      const cityName = parts[2] || '';
      const allyFaction = state.factions.find(f => f.name === allyName);
      const targetCity = findCityByIdOrName(cityName);
      if (!allyFaction || !targetCity) { log('  Usage: jointattack <ally faction> <target city>'); return false; }
      game.getState().requestJointAttack(allyFaction.id, targetCity.id);
      return false;
    }

    case 'ceasefire': {
      const fName = parts.slice(1).join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(`  Faction "${fName}" not found.`); return false; }
      game.getState().proposeCeasefire(targetFaction.id);
      return false;
    }

    case 'surrender': {
      const fName = parts.slice(1).join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(`  Faction "${fName}" not found.`); return false; }
      game.getState().demandSurrender(targetFaction.id);
      return false;
    }

    case 'hostage': {
      const officerName = parts[1] || '';
      const factionName = parts[2] || '';
      const officer = findOfficerByName(officerName, factionId);
      const targetFaction = state.factions.find(f => f.name === factionName);
      if (!officer || !targetFaction) { log('  Usage: hostage <officer name> <faction name>'); return false; }
      game.getState().exchangeHostage(officer.id, targetFaction.id);
      return false;
    }

    // ── Strategy ──

    case 'spy': {
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().spy(city.id);
      return false;
    }

    case 'intel': {
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().gatherIntelligence(city.id);
      return false;
    }

    case 'rumor': {
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().rumor(city.id);
      return false;
    }

    case 'arson': {
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().arson(city.id);
      return false;
    }

    case 'rebel': {
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log('  City not found.'); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().inciteRebellion(city.id);
      return false;
    }

    case 'counter': {
      const cityName = parts[1] || '';
      const officerName = parts[2] || '';
      const city = findCityByIdOrName(cityName);
      const officer = officerName ? state.officers.find(o => o.name === officerName && o.cityId === city?.id) : undefined;
      if (!city || !officer) { log('  Usage: counter <city> <target officer name>'); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().counterEspionage(city.id, officer.id);
      return false;
    }

    // ── Military extras ──

    case 'retreat': {
      game.getState().retreat();
      return false;
    }

    // ── Turn ──

    case 'end':
    case 'endturn': {
      // Auto-assign governors for cities without one
      const pendingGovCity = game.getState().pendingGovernorAssignmentCityId;
      if (pendingGovCity !== null) {
        const govCandidates = game.getState().officers
          .filter(o => o.cityId === pendingGovCity && o.factionId === factionId && !o.isGovernor)
          .sort((a, b) => (b.politics + b.leadership) - (a.politics + a.leadership));
        if (govCandidates.length > 0) {
          game.setState(s => ({
            officers: s.officers.map(o =>
              o.id === govCandidates[0].id ? { ...o, isGovernor: true } : o
            ),
            pendingGovernorAssignmentCityId: null,
          }));
          log(`  Auto-assigned governor: ${govCandidates[0].name}`);
        }
      }

      game.getState().endTurn();
      log(`  → ${game.getState().year}年${game.getState().month}月`);

      // Handle AI attacks on us
      if (game.getState().phase === 'battle') {
        log('  AI is attacking us! Auto-defending...');
        const defResult = runBattle();
        log(`  → Defense result: ${defResult.winner} wins`);
        defResult.log.slice(-10).forEach(l => log(`    ${l}`));
      }

      return true; // Signal: turn ended
    }

    case 'quit':
    case 'exit':
    case 'q':
      log('Goodbye.');
      rl.close();
      process.exit(0);

    default:
      log(`  Unknown command: "${cmd}". Type "help" for commands.`);
      return false;
  }
}

// ── Interactive Campaign Loop ──

async function runInteractiveCampaign(factionId: number) {
  syncLogIndex(); // Start tracking from current log position
  showStatus(factionId);
  showHelp();

  // Handle piped stdin closing gracefully
  let stdinClosed = false;
  rl.on('close', () => { stdinClosed = true; });

  // Main loop: prompt until quit
  while (!stdinClosed) {
    const state = game.getState();
    const date = `${state.year}年${state.month}月`;
    const myCities = state.cities.filter(c => c.factionId === factionId);

    if (myCities.length === 0) {
      logSection('DEFEAT — You have lost all your cities.');
      break;
    }

    let input: string;
    try {
      input = await ask(`\n[${date}] > `);
    } catch {
      break; // stdin closed
    }
    if (!input) continue;

    log(`> ${input}`);

    try {
      const turnEnded = handleCommand(input, factionId);
      flushGameLog();

      // After endTurn, show abbreviated status
      if (turnEnded) {
        const s = game.getState();
        const cities = s.cities.filter(c => c.factionId === factionId);
        log(`  You have ${cities.length} cities, ${s.officers.filter(o => o.factionId === factionId).length} officers.`);
      }
    } catch (e) {
      log(`  ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  rl.close();
}

// ── State Persistence (for --exec mode) ──

function saveState(filepath: string) {
  const gs = game.getState();
  const bs = battle.getState();

  // Strip non-serializable `mutate` functions from pendingEvents
  const safePendingEvents = (gs.pendingEvents || []).map(e => {
    if (e.mutate) {
      const { mutate: _mutate, ...rest } = e;
      return rest;
    }
    return e;
  });

  const data = {
    version: 1,
    // ── Game Store state (all 19 properties) ──
    gameState: {
      phase: gs.phase,
      scenario: gs.scenario,
      playerFaction: gs.playerFaction,
      cities: gs.cities,
      officers: gs.officers,
      factions: gs.factions,
      selectedFactionId: gs.selectedFactionId,
      gameSettings: gs.gameSettings,
      year: gs.year,
      month: gs.month,
      selectedCityId: gs.selectedCityId,
      activeCommandCategory: gs.activeCommandCategory,
      log: gs.log,
      duelState: gs.duelState,
      revealedCities: gs.revealedCities,
      pendingGovernorAssignmentCityId: gs.pendingGovernorAssignmentCityId,
      battleFormation: gs.battleFormation,
      pendingEvents: safePendingEvents,
      battleResolved: gs.battleResolved,
    },
    // ── Battle Store state (all 24 properties) ──
    battleState: {
      units: bs.units,
      turn: bs.turn,
      day: bs.day,
      weather: bs.weather,
      windDirection: bs.windDirection,
      activeUnitId: bs.activeUnitId,
      attackerId: bs.attackerId,
      defenderId: bs.defenderId,
      defenderCityId: bs.defenderCityId,
      maxDays: bs.maxDays,
      isFinished: bs.isFinished,
      winnerFactionId: bs.winnerFactionId,
      battleMap: bs.battleMap,
      isSiege: bs.isSiege,
      gates: bs.gates,
      fireHexes: bs.fireHexes,
      mode: bs.mode,
      selectedTactic: bs.selectedTactic,
      capturedOfficerIds: bs.capturedOfficerIds,
      routedOfficerIds: bs.routedOfficerIds,
      battleLog: bs.battleLog,
      inspectedUnitId: bs.inspectedUnitId,
      turnPhase: bs.turnPhase,
      playerFactionId: bs.playerFactionId,
    },
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function loadState(filepath: string): number | null {
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(raw);

  // v1 format: separate gameState / battleState
  if (data.version === 1) {
    game.setState(data.gameState);
    if (data.battleState) {
      battle.setState(data.battleState);
    }
    return data.gameState.playerFaction?.id ?? null;
  }

  // Legacy format (flat gameState fields at top level)
  game.setState(data);
  return data.playerFaction?.id ?? null;
}

// ── Main ──

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed[key] = args[i + 1];
        i++;
      } else {
        parsed[key] = 'true';
      }
    }
  }
  return parsed;
}

async function main() {
  const args = parseArgs();

  // ── Exec Mode (non-interactive, for agent/script use) ──
  if (args.exec) {
    const savefile = args.savefile || '/tmp/rtk-game.json';
    let factionId = loadState(savefile);

    if (factionId === null) {
      // No savefile — initialize from --scenario / --faction args
      const scenarioIndex = parseInt(args.scenario || '0', 10);
      const scenario = scenarios[scenarioIndex];
      if (!scenario) {
        log(`Invalid scenario index: ${scenarioIndex}. Available: ${scenarios.map((s, i) => `${i}=${s.name}`).join(', ')}`);
        process.exit(1);
      }
      game.getState().selectScenario(scenario);

      const factions = game.getState().factions;
      const factionArg = args.faction;
      if (factionArg) {
        const found = factions.find(f => f.name === factionArg || f.id === parseInt(factionArg, 10));
        if (!found) {
          log(`Invalid faction: ${factionArg}. Available: ${factions.map(f => `${f.id}=${f.name}`).join(', ')}`);
          process.exit(1);
        }
        factionId = found.id;
      } else {
        factionId = factions[0].id;
      }

      game.getState().selectFaction(factionId);
      game.getState().confirmSettings();
      log(`Initialized: ${scenario.name} — ${game.getState().factions.find(f => f.id === factionId)?.name}`);
    } else {
      const gs = game.getState();
      log(`Loaded: ${gs.year}年${gs.month}月 — ${gs.factions.find(f => f.id === factionId)?.name}`);
    }

    // Don't print old log entries
    syncLogIndex();

    // Split on semicolons for multi-command support
    const commands = args.exec.split(';').map((s: string) => s.trim()).filter(Boolean);
    for (const cmd of commands) {
      try {
        handleCommand(cmd, factionId);
        flushGameLog();
      } catch (e) {
        log(`  ERROR: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    saveState(savefile);
    rl.close();
    process.exit(0);
  }

  // ── Standard modes (interactive / single-battle) require scenario setup ──

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

  // ── Single Battle Mode ──
  if (args.attack) {
    const state = game.getState();
    const playerCities = state.cities.filter(c => c.factionId === factionId);
    const targetCity = state.cities.find(c => c.name === args.attack);
    if (!targetCity) { log(`City not found: ${args.attack}`); process.exit(1); }

    const sourceCity = playerCities.find(c => c.adjacentCityIds.includes(targetCity.id));
    if (!sourceCity) { log(`No player city adjacent to ${args.attack}`); process.exit(1); }

    const attackers = state.officers
      .filter(o => o.cityId === sourceCity.id && o.factionId === factionId)
      .slice(0, 5);

    logSection(`${sourceCity.name} → ${targetCity.name}`);
    log(`Attackers: ${attackers.map(o => o.name).join(', ')}`);

    game.getState().selectCity(sourceCity.id);
    game.getState().setBattleFormation({
      officerIds: attackers.map(o => o.id),
      unitTypes: attackers.map(() => 'infantry' as const),
    });
    game.getState().startBattle(targetCity.id);

    if (game.getState().phase !== 'battle') {
      log('Battle did not start:');
      game.getState().log.forEach(l => log(`  ${l}`));
      rl.close();
      return;
    }

    const result = runBattle();
    logSection(`Battle Result: ${result.winner} wins!`);
    result.log.slice(-30).forEach(l => log(`  ${l}`));
    rl.close();
    return;
  }

  // ── Interactive Campaign Mode (default) ──
  await runInteractiveCampaign(factionId);
}

main();
