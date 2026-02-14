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
import { getMaxTroops } from '../utils/officers';
import { audioSystem } from '../systems/audio';
import type { BattleUnit } from '../types/battle';
import type { City } from '../types';
import { localizedName } from '../i18n/dataNames';

// Import CLI-specific i18n (Node.js, no browser detector)
// Must be imported before any i18next.t() calls
import '../i18n/cli';
import i18next from 'i18next';

// Disable audio in CLI mode
audioSystem.setMute(true);

// ── Helpers ──

/** Shorthand for CLI-namespace translations */
function t(key: string, opts?: Record<string, unknown>): string {
  return String(i18next.t(`cli:${key}`, opts as never));
}

/** Shorthand for localized data names (officers, cities, factions) */
const ln = localizedName;

/** Translate a skill key to its localized name */
function localizedSkill(skill: string): string {
  return String(i18next.t(`data:skill.${skill}`));
}

/** Translate an array of skill keys to a localized bracket string */
function localizedSkills(skills: string[]): string {
  if (skills.length === 0) return '';
  return ` [${skills.map(localizedSkill).join(',')}]`;
}

/** Translate a rank key to its localized name */
function localizedRank(rank: string): string {
  return String(i18next.t(`data:rank.${rank}`));
}

/** Translate a relationship type key */
function localizedRelType(relType: string): string {
  return String(i18next.t(`data:relationship.${relType}`));
}

/** Translate a unit type key */
function localizedUnitType(unitType: string): string {
  return String(i18next.t(`battle:unitType.${unitType}`));
}

/** Translate a tax rate key */
function localizedTaxRate(rate: string): string {
  return String(i18next.t(`data:taxRate.${rate}`));
}

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

  log(t('battle.summary', { attackerId: bs.attackerId, defenderId: bs.defenderId, isSiege: bs.isSiege, gateCount: bs.gates.length }));
  bs.units.forEach(u => {
    const side = u.factionId === playerFaction ? t('battle.sideAttack') : t('battle.sideDefend');
    log(t('battle.unitInfo', { side, name: ln(u.officer.name), troops: u.troops, war: u.officer.war, type: localizedUnitType(u.type) }));
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
      log(t('battle.dayReport', { day, atkUnits: pa.length, atkTroops: pa.reduce((s, u) => s + u.troops, 0), defUnits: ea.length, defTroops: ea.reduce((s, u) => s + u.troops, 0) }));    }
  }

  const result = battle.getState();
  const winnerFactionId = result.winnerFactionId;
  const factions = game.getState().factions;
  const winnerName = factions.find(f => f.id === winnerFactionId)?.name || t('battle.unknownFaction', { id: winnerFactionId });

  if (result.isFinished && winnerFactionId !== null) {
    const loserFactionId = winnerFactionId === result.attackerId ? result.defenderId : result.attackerId;
    game.getState().addLog(i18next.t('logs:ai.battleEnd', { winner: winnerName }));

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
  logSection(t('status.title', { name: ln(faction?.name ?? '?'), year: state.year, month: state.month }));

  const myCities = state.cities.filter(c => c.factionId === factionId);
  for (const city of myCities) {
    const officers = state.officers.filter(o => o.cityId === city.id && o.factionId === factionId);
    const governor = officers.find(o => o.isGovernor);
    const govLabel = governor ? t('status.governor', { name: ln(governor.name) }) : t('status.noGovernor');
    log(t('status.cityHeader', { id: city.id, name: ln(city.name), governor: govLabel }));
    log(t('status.resources', { troops: city.troops, gold: city.gold, food: city.food, population: city.population }));
    log(t('status.development', { commerce: city.commerce, agriculture: city.agriculture, defense: city.defense, training: city.training, technology: city.technology }));
    log(t('status.weapons', { crossbows: city.crossbows, warHorses: city.warHorses, batteringRams: city.batteringRams, catapults: city.catapults }));

    // Show officers
    for (const o of officers) {
      const skills = localizedSkills(o.skills);
      const acted = o.acted ? t('status.actedYes') : t('status.actedNo');
      log(t('status.officerLine', { gov: o.isGovernor ? '*' : ' ', name: ln(o.name), leadership: o.leadership, war: o.war, intelligence: o.intelligence, politics: o.politics, charisma: o.charisma, acted, loyalty: o.loyalty, skills }));
    }

    // Show POWs
    const pows = state.officers.filter(o => o.cityId === city.id && o.factionId === -1);
    if (pows.length > 0) {
      log(t('status.pows', { list: pows.map(o => `${ln(o.name)}(L${o.leadership},W${o.war})`).join(', ') }));
    }

    // Show neighbors (fog-gated via store)
    const neighbors = state.getNeighborSummary(city.id);
    for (const n of neighbors) {
      const label = n.factionId === factionId ? t('status.neighborOurs') : n.factionId === null ? t('status.neighborEmpty') : `(${ln(n.factionName || '?')})`;
      const troopStr = n.troops !== null ? t('status.neighborTroops', { troops: n.troops, officers: n.officerCount }) : '';
      log(t('status.neighborLine', { id: n.cityId, name: ln(n.cityName), label, troops: troopStr }));
    }
  }

  // Unaffiliated officers in our cities
  for (const city of myCities) {
    const unaffiliated = state.officers.filter(o => o.cityId === city.id && o.factionId === null);
    if (unaffiliated.length > 0) {
      log(t('status.unaffiliated', { city: ln(city.name), list: unaffiliated.map(o => `${ln(o.name)}(L${o.leadership},W${o.war},P${o.politics})`).join(', ') }));
    }
  }
}

function showWorld() {
  const state = game.getState();
  logSection(t('world.title'));
  const summaries = state.getFactionSummaries();
  for (const f of summaries) {
    const troopStr = f.totalTroops !== null ? `, ${t('world.troops', { count: f.totalTroops })}` : '';
    const offStr = f.officerCount !== null ? `, ${t('world.officers', { count: f.officerCount })}` : '';
    log(t('world.factionLine', { name: ln(f.name), cityCount: f.cityNames.length, officers: offStr, troops: troopStr, cities: f.cityNames.map(n => ln(n)).join(', ') }));
  }
  const emptyCities = state.cities.filter(c => c.factionId === null);
  if (emptyCities.length > 0) {
    log(t('world.emptyCities', { cities: emptyCities.map(c => ln(c.name)).join(', ') }));
  }
}

function showHelp() {
  log('');
  log(t('help.header'));
  log('');
  log(t('help.queryHeader'));
  log(t('help.status'));
  log(t('help.world'));
  log(t('help.city'));
  log(t('help.officer'));
  log(t('help.officers'));
  log(t('help.factions'));
  log(t('help.log'));
  log('');
  log(t('help.domesticHeader'));
  log(t('help.commerce'));
  log(t('help.agriculture'));
  log(t('help.defense'));
  log(t('help.train'));
  log(t('help.technology'));
  log(t('help.flood'));
  log(t('help.manufacture'));
  log(t('help.relief'));
  log(t('help.tax'));
  log(t('help.actionNote'));
  log('');
  log(t('help.personnelHeader'));
  log(t('help.recruit'));
  log(t('help.recruitpow'));
  log(t('help.search'));
  log(t('help.reward'));
  log(t('help.governor'));
  log(t('help.advisor'));
  log(t('help.promote'));
  log(t('help.transfer'));
  log(t('help.execute'));
  log(t('help.dismiss'));
  log('');
  log(t('help.militaryHeader'));
  log(t('help.draft'));
  log(t('help.attack'));
  log(t('help.attackOfficerDesc'));
  log(t('help.attackExample1'));
  log(t('help.attackExample2'));
  log(t('help.attackExample3'));
  log(t('help.transport'));
  log(t('help.retreat'));
  log('');
  log(t('help.diplomacyHeader'));
  log(t('help.relations'));
  log(t('help.alliance'));
  log(t('help.breakalliance'));
  log(t('help.jointattack'));
  log(t('help.ceasefire'));
  log(t('help.surrender'));
  log(t('help.hostage'));
  log('');
  log(t('help.strategyHeader'));
  log(t('help.spy'));
  log(t('help.intel'));
  log(t('help.rumor'));
  log(t('help.arson'));
  log(t('help.rebel'));
  log(t('help.counter'));
  log('');
  log(t('help.turnHeader'));
  log(t('help.end'));
  log(t('help.help'));
  log(t('help.quit'));
  log('');
}

function showLog() {
  const logs = game.getState().log;
  const recent = logs.slice(-20);
  logSection(t('log.title'));
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      if (!city) { log(t('error.cityNotFound')); return false; }
      const view = state.getCityView(city.id);
      if (!view) { log(t('error.cityNotFound')); return false; }
      log(`  ${ln(view.name)} [id=${view.id}] (${view.factionName ? ln(view.factionName) : t('city.emptyCity')})`);

      // Fog of war: store returns null fields for unrevealed data
      if (!view.isRevealed) {
        log(t('city.fogOfWar'));
        return false;
      }

      log(t('city.resources', { troops: view.troops, gold: view.gold, food: view.food, population: view.population }));
      log(t('city.development', { commerce: view.commerce, agriculture: view.agriculture, defense: view.defense, training: view.training, technology: view.technology }));
      log(t('city.extraStats', { floodControl: view.floodControl, peopleLoyalty: view.peopleLoyalty, morale: view.morale, taxRate: view.taxRate ? localizedTaxRate(view.taxRate) : view.taxRate }));
      // Weapons: store returns null for non-own cities
      if (view.crossbows !== null) {
        log(t('city.weapons', { crossbows: view.crossbows, warHorses: view.warHorses, batteringRams: view.batteringRams, catapults: view.catapults }));
      }
      // Officers: store already filters by visibility
      if (view.officers.length > 0) {
        log(t('city.officerHeader'));
        for (const o of view.officers) {
          const skills = localizedSkills(o.skills);
          if (o.acted !== null) {
            const acted = o.acted ? t('status.actedYes') : t('status.actedNo');
            log(t('status.officerLine', { gov: o.isGovernor ? '*' : ' ', name: ln(o.name), leadership: o.leadership, war: o.war, intelligence: o.intelligence, politics: o.politics, charisma: o.charisma, acted, loyalty: o.loyalty, skills }));
          } else {
            // Revealed enemy city: no acted/loyalty
            log(t('status.officerLineEnemy', { gov: o.isGovernor ? '*' : ' ', name: ln(o.name), leadership: o.leadership, war: o.war, intelligence: o.intelligence, politics: o.politics, charisma: o.charisma, skills }));
          }
        }
      }
      if (view.pows.length > 0) log(t('city.pows', { list: view.pows.map(o => `${ln(o.name)}(L${o.leadership},W${o.war})`).join(', ') }));
      if (view.unaffiliated.length > 0) log(t('city.unaffiliated', { list: view.unaffiliated.map(o => `${ln(o.name)}(L${o.leadership},W${o.war},P${o.politics})`).join(', ') }));
      // Neighbors (fog-gated via store)
      const neighbors = state.getNeighborSummary(city.id);
      for (const n of neighbors) {
        const troopStr = n.troops !== null ? t('status.neighborTroops', { troops: n.troops, officers: n.officerCount }) : '';
        log(t('status.neighborLine', { id: n.cityId, name: ln(n.cityName), label: `(${n.factionName ? ln(n.factionName) : t('city.emptyCity')})`, troops: troopStr }));
      }
      return false;
    }

    case 'officer': {
      const name = parts.slice(1).join('');
      const officer = state.officers.find(o => o.name === name);
      if (!officer) { log(t('error.officerNotFound', { name })); return false; }
      const view = state.getOfficerView(officer.id);
      if (!view) { log(t('error.officerNotFound', { name })); return false; }
      log(`  ${ln(view.name)} [id=${view.id}]${view.affiliation ? ` — ${ln(view.affiliation)}` : ''}`);
      if (view.cityName !== null) {
        log(t('officer.location', { city: ln(view.cityName), rank: view.rank ? localizedRank(view.rank) : '', governor: view.isGovernor ? t('officer.governor') : '' }));
      }
      log(t('officer.stats', { leadership: view.leadership, war: view.war, intelligence: view.intelligence, politics: view.politics, charisma: view.charisma }));
      if (view.acted !== null) {
        log(t('officer.detail', { acted: view.acted ? t('officer.actedYes') : t('officer.actedNo'), loyalty: view.loyalty, age: view.age }));
      } else {
        log(t('officer.ageOnly', { age: view.age }));
      }
      log(t('officer.skills', { skills: view.skills.length > 0 ? view.skills.map(localizedSkill).join(', ') : t('officer.noSkills') }));
      if (view.relationships.length > 0) {
        const rels = view.relationships.map(r => {
          const target = state.officers.find(o => o.id === r.targetId);
          return `${localizedRelType(r.type)}:${ln(target?.name || '?')}`;
        });
        log(t('officer.relationships', { list: rels.join(', ') }));
      }
      return false;
    }

    case 'officers': {
      const cityFilter = parts[1] ? findCityByIdOrName(parts[1]) : null;
      const myOfficers = state.officers
        .filter(o => o.factionId === factionId)
        .filter(o => !cityFilter || o.cityId === cityFilter.id);
      if (myOfficers.length === 0) { log(t('error.noOfficers')); return false; }
      const grouped = new Map<number, typeof myOfficers>();
      for (const o of myOfficers) {
        if (!grouped.has(o.cityId)) grouped.set(o.cityId, []);
        grouped.get(o.cityId)!.push(o);
      }
      for (const [cityId, officers] of grouped) {
        const city = state.cities.find(c => c.id === cityId);
        log(`  ${ln(city?.name || '?')}:`);
        for (const o of officers) {
          const skills = localizedSkills(o.skills);
          const acted = o.acted ? t('status.actedYes') : t('status.actedNo');
          log(t('status.officerLine', { gov: o.isGovernor ? '*' : ' ', name: ln(o.name), leadership: o.leadership, war: o.war, intelligence: o.intelligence, politics: o.politics, charisma: o.charisma, acted, loyalty: o.loyalty, skills }));
        }
      }
      return false;
    }

    case 'factions': {
      const summaries = state.getFactionSummaries();
      for (const f of summaries) {
        log(`  ${ln(f.name)} ${t('factions.ruler', { name: ln(f.rulerName || '?') })}`);
        const offStr = f.officerCount !== null ? t('factions.officers', { count: f.officerCount }) : t('factions.officersHidden');
        const troopStr = f.totalTroops !== null ? t('factions.troops', { count: f.totalTroops }) : t('factions.troopsHidden');
        log(t('factions.line', { cities: f.cityNames.map(n => ln(n)).join(', ') || t('factions.noCities'), officers: offStr, troops: troopStr }));
        if (f.hostility !== null) {
          log(t('factions.hostility', { value: f.hostility, allied: f.isAlly ? t('factions.allied') : '' }));
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
      if (!city) { log(t('error.draftUsage')); return false; }
      game.getState().selectCity(city.id);
      game.getState().draftTroops(city.id, amount, executor?.id);
      return false;
    }

    case 'commerce': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(city.id);
      game.getState().developCommerce(city.id, executor?.id);
      return false;
    }

    case 'agriculture': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(city.id);
      game.getState().developAgriculture(city.id, executor?.id);
      return false;
    }

    case 'defense': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(city.id);
      game.getState().reinforceDefense(city.id, executor?.id);
      return false;
    }

    case 'train': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(city.id);
      game.getState().trainTroops(city.id, executor?.id);
      return false;
    }

    case 'technology': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(city.id);
      game.getState().developTechnology(city.id, executor?.id);
      return false;
    }

    case 'flood': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log(t('error.cityNotFound')); return false; }
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
      if (!city || !weaponType) { log(t('error.manufactureUsage')); return false; }
      game.getState().selectCity(city.id);
      game.getState().manufacture(city.id, weaponType, executor?.id);
      return false;
    }

    case 'relief': {
      const city = findCityByIdOrName(parts[1] || '');
      const executorName = parts[2] || '';
      const executor = executorName ? findOfficerByName(executorName, factionId) : undefined;
      if (!city) { log(t('error.cityNotFound')); return false; }
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
      if (!city || !rate) { log(t('error.taxUsage')); return false; }
      game.getState().setTaxRate(city.id, rate);
      return false;
    }

    // ── Personnel ──

    case 'recruit': {
      const name = parts[1] || '';
      const recruiterName = parts[2] || '';
      const officer = findOfficerByName(name, null); // unaffiliated
      if (!officer) { log(t('error.recruitNotFound', { name })); return false; }
      const recruiter = recruiterName ? findOfficerByName(recruiterName, factionId) : undefined;
      game.getState().recruitOfficer(officer.id, recruiter?.id);
      return false;
    }

    case 'recruitpow': {
      const name = parts[1] || '';
      const recruiterName = parts[2] || '';
      const officer = findOfficerByName(name, -1); // POW
      if (!officer) { log(t('error.powNotFound', { name })); return false; }
      const recruiter = recruiterName ? findOfficerByName(recruiterName, factionId) : undefined;
      // Select the city where the POW is held so the store can find recruiters
      game.getState().selectCity(officer.cityId);
      game.getState().recruitPOW(officer.id, recruiter?.id);
      return false;
    }

    case 'search': {
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log(t('error.cityNotFound')); return false; }
      const searcherName = parts[2] || '';
      const searcher = searcherName ? findOfficerByName(searcherName, factionId) : undefined;
      game.getState().selectCity(city.id);
      game.getState().searchOfficer(city.id, searcher?.id);
      return false;
    }

    case 'reward': {
      const name = parts[1] || '';
      const officer = findOfficerByName(name, factionId);
      if (!officer) { log(t('error.officerNotInFaction', { name })); return false; }
      const amount = parseInt(parts[2] || '1000', 10);
      game.getState().rewardOfficer(officer.id, 'gold', amount);
      return false;
    }

    case 'governor': {
      const city = findCityByIdOrName(parts[1] || '');
      const officerName = parts[2] || '';
      const officer = findOfficerByName(officerName, factionId);
      if (!city || !officer) { log(t('error.governorUsage')); return false; }
      game.getState().appointGovernor(city.id, officer.id);
      return false;
    }

    case 'advisor': {
      const name = parts.slice(1).join('');
      const officer = findOfficerByName(name, factionId);
      if (!officer) { log(t('error.advisorUsage', { name })); return false; }
      game.getState().appointAdvisor(officer.id);
      return false;
    }

    case 'promote': {
      const name = parts[1] || '';
      const officer = findOfficerByName(name, factionId);
      const rankMap: Record<string, string> = {
        'common': 'common', 'attendant': 'attendant', 'advisor': 'advisor', 'general': 'general', 'viceroy': 'viceroy', 'governor': 'governor',
        'strategist': 'advisor', 'commander': 'general',
      };
      const rank = rankMap[(parts[2] || '').toLowerCase()] || rankMap[parts[2] || ''];
      if (!officer || !rank) { log(t('error.promoteUsage')); return false; }
      game.getState().promoteOfficer(officer.id, rank as import('../types').OfficerRank);
      return false;
    }

    case 'transfer': {
      const officerName = parts[1] || '';
      const targetCity = findCityByIdOrName(parts[2] || '');
      const officer = findOfficerByName(officerName, factionId);
      if (!officer || !targetCity) { log(t('error.transferUsage')); return false; }
      game.getState().transferOfficer(officer.id, targetCity.id);
      return false;
    }

    case 'execute': {
      const name = parts.slice(1).join('');
      const officer = findOfficerByName(name, -1); // POW
      if (!officer) { log(t('error.powNotFound', { name: parts.slice(1).join('') })); return false; }
      game.getState().executeOfficer(officer.id);
      return false;
    }

    case 'dismiss': {
      const name = parts.slice(1).join('');
      const officer = findOfficerByName(name, factionId);
      if (!officer) { log(t('error.officerNotInFaction', { name })); return false; }
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
      if (!targetCity) { log(t('error.attackCityNotFound', { name: targetName })); return false; }
      if (targetCity.factionId === factionId) { log(t('error.attackOwnCity')); return false; }

      const myCities = state.cities.filter(c => c.factionId === factionId);
      const adjacentCities = myCities
        .filter(c => c.adjacentCityIds.includes(targetCity.id))
        .sort((a, b) => {
          // Prefer cities with more officers and troops
          const aOff = state.officers.filter(o => o.cityId === a.id && o.factionId === factionId && !o.acted).length;
          const bOff = state.officers.filter(o => o.cityId === b.id && o.factionId === factionId && !o.acted).length;
          if (bOff !== aOff) return bOff - aOff;
          return b.troops - a.troops;
        });
      const sourceCity = adjacentCities[0];
      if (!sourceCity) { log(t('error.noAdjacentCity', { name: ln(targetCity.name) })); return false; }

      // Get available officers sorted by leadership
      const available = state.officers
        .filter(o => o.cityId === sourceCity.id && o.factionId === factionId && !o.acted)
        .sort((a, b) => b.leadership - a.leadership);

      if (available.length === 0) {
        log(t('error.noAvailableOfficers', { name: ln(sourceCity.name) }));
        return false;
      }

      // Select officers — supports names (張遼,關羽) or 1-based indices (1,2,3) or "all"
      let selectedOfficers;
      if (!officerArg || officerArg.toLowerCase() === 'all') {
        selectedOfficers = available.slice(0, 5);
      } else {
        const parts2 = officerArg.split(',').map(s => s.trim());
        // Detect if ALL parts are numeric → index mode; otherwise name mode
        const allNumeric = parts2.every(s => /^\d+$/.test(s));
        if (allNumeric) {
          const indices = parts2.map(s => parseInt(s, 10) - 1).filter(i => i >= 0 && i < available.length);
          selectedOfficers = indices.map(i => available[i]).slice(0, 5);
        } else {
          selectedOfficers = parts2
            .map(name => available.find(o => o.name === name))
            .filter((o): o is NonNullable<typeof o> => o != null)
            .slice(0, 5);
        }
      }

      if (selectedOfficers.length === 0) {
        log(t('error.noValidOfficers'));
        const myFaction = state.factions.find(f => f.id === factionId);
        available.forEach((o, i) => {
          const skills = localizedSkills(o.skills);
          const max = getMaxTroops(o, o.id === myFaction?.rulerId);
          const acted = o.acted ? t('status.actedYes') : t('status.actedNo');
          log(`    ${i + 1}. ${ln(o.name)} L${o.leadership} W${o.war} max=${max} Act=${acted}${skills}`);
        });
        return false;
      }

      // Select unit types
      let unitTypes: ('infantry' | 'cavalry' | 'archer')[];
      if (!typeArg || typeArg.toLowerCase() === 'auto') {
        let crossbowsAvail = sourceCity.crossbows;
        let horsesAvail = sourceCity.warHorses;
        unitTypes = selectedOfficers.map(o => {
          if (hasSkill(o, 'cavalry') && horsesAvail >= 1000) {
            horsesAvail -= 1000;
            return 'cavalry';
          }
          if (hasSkill(o, 'archery') && crossbowsAvail >= 1000) {
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

      log(t('attack.route', { from: ln(sourceCity.name), to: ln(targetCity.name) }));
      const cliMyFaction = state.factions.find(f => f.id === factionId);
      log(`  ${selectedOfficers.map((o, i) => {
        const max = getMaxTroops(o, o.id === cliMyFaction?.rulerId);
        const tp = troopsPerOfficer ? troopsPerOfficer[i] : `auto(max ${max})`;
        return `${ln(o.name)}(${localizedUnitType(unitTypes[i])},${tp})`;
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
          log(t('attack.undefended', { name: ln(targetCity.name) }));
        } else {
          log(t('attack.notStarted'));
          game.getState().log.slice(-3).forEach(l => log(`    ${l}`));
        }
        return false;
      }

      const result = runBattle();
      logSection(t('battle.result', { winner: ln(result.winner) }));
      result.log.slice(-15).forEach(l => log(`  ${l}`));
      return false;
    }

    case 'transport': {
      const from = findCityByIdOrName(parts[1] || '');
      const to = findCityByIdOrName(parts[2] || '');
      if (!from || !to) {
        log(t('error.transportUsage'));
        log(t('error.transportExample1'));
        log(t('error.transportExample2'));
        return false;
      }
      // Parse resource specs and officer from remaining parts
      // Also support old format: transport <from> <to> <resource> <amount>
      const resources: { gold?: number; food?: number; troops?: number } = {};
      const resMap: Record<string, 'gold' | 'food' | 'troops'> = {
        gold: 'gold', '金': 'gold',
        food: 'food', '糧': 'food',
        troops: 'troops', '兵': 'troops',
      };
      const remaining = parts.slice(3);
      let escortOfficerId: number | undefined;
      if (remaining.length === 2 && resMap[remaining[0].toLowerCase()]) {
        // Old format: transport <from> <to> gold 5000
        resources[resMap[remaining[0].toLowerCase()]] = parseInt(remaining[1], 10);
      } else {
        // New format: transport <from> <to> gold=5000 food=3000 officer=張遼
        for (const spec of remaining) {
          const [key, val] = spec.split('=');
          if ((key || '').toLowerCase() === 'officer' && val) {
            const escort = findOfficerByName(val, factionId);
            if (escort) escortOfficerId = escort.id;
            else { log(t('error.officerNotInFaction', { name: val })); return false; }
            continue;
          }
          const res = resMap[(key || '').toLowerCase()];
          if (res && val) resources[res] = parseInt(val, 10);
        }
      }
      if (Object.keys(resources).length === 0) {
        log(t('error.transportUsage'));
        return false;
      }
      game.getState().transport(from.id, to.id, resources, escortOfficerId);
      return false;
    }

    // ── Diplomacy ──

    case 'relations': {
      // Parse officer=Name from args
      let relOfficerId: number | undefined;
      const relParts = parts.slice(1).filter(p => {
        if (p.toLowerCase().startsWith('officer=')) {
          const oName = p.slice(8);
          const o = findOfficerByName(oName, factionId);
          if (o) relOfficerId = o.id;
          return false;
        }
        return true;
      });
      const fName = relParts.join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(t('error.factionNotFound', { name: fName })); return false; }
      game.getState().improveRelations(targetFaction.id, relOfficerId);
      return false;
    }

    case 'alliance': {
      let alliOfficerId: number | undefined;
      const alliParts = parts.slice(1).filter(p => {
        if (p.toLowerCase().startsWith('officer=')) {
          const oName = p.slice(8);
          const o = findOfficerByName(oName, factionId);
          if (o) alliOfficerId = o.id;
          return false;
        }
        return true;
      });
      const fName = alliParts.join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(t('error.factionNotFound', { name: fName })); return false; }
      game.getState().formAlliance(targetFaction.id, alliOfficerId);
      return false;
    }

    case 'breakalliance': {
      const fName = parts.slice(1).join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(t('error.factionNotFound', { name: fName })); return false; }
      game.getState().breakAlliance(targetFaction.id);
      return false;
    }

    case 'jointattack': {
      let jaOfficerId: number | undefined;
      const jaParts = parts.slice(1).filter(p => {
        if (p.toLowerCase().startsWith('officer=')) {
          const oName = p.slice(8);
          const o = findOfficerByName(oName, factionId);
          if (o) jaOfficerId = o.id;
          return false;
        }
        return true;
      });
      const allyName = jaParts[0] || '';
      const cityName = jaParts[1] || '';
      const allyFaction = state.factions.find(f => f.name === allyName);
      const targetCity = findCityByIdOrName(cityName);
      if (!allyFaction || !targetCity) { log(t('error.jointattackUsage')); return false; }
      game.getState().requestJointAttack(allyFaction.id, targetCity.id, jaOfficerId);
      return false;
    }

    case 'ceasefire': {
      let cfOfficerId: number | undefined;
      const cfParts = parts.slice(1).filter(p => {
        if (p.toLowerCase().startsWith('officer=')) {
          const oName = p.slice(8);
          const o = findOfficerByName(oName, factionId);
          if (o) cfOfficerId = o.id;
          return false;
        }
        return true;
      });
      const fName = cfParts.join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(t('error.factionNotFound', { name: fName })); return false; }
      game.getState().proposeCeasefire(targetFaction.id, cfOfficerId);
      return false;
    }

    case 'surrender': {
      let surOfficerId: number | undefined;
      const surParts = parts.slice(1).filter(p => {
        if (p.toLowerCase().startsWith('officer=')) {
          const oName = p.slice(8);
          const o = findOfficerByName(oName, factionId);
          if (o) surOfficerId = o.id;
          return false;
        }
        return true;
      });
      const fName = surParts.join('');
      const targetFaction = state.factions.find(f => f.name === fName);
      if (!targetFaction) { log(t('error.factionNotFound', { name: fName })); return false; }
      game.getState().demandSurrender(targetFaction.id, surOfficerId);
      return false;
    }

    case 'hostage': {
      const officerName = parts[1] || '';
      const factionName = parts[2] || '';
      const officer = findOfficerByName(officerName, factionId);
      const targetFaction = state.factions.find(f => f.name === factionName);
      if (!officer || !targetFaction) { log(t('error.hostageUsage')); return false; }
      game.getState().exchangeHostage(officer.id, targetFaction.id);
      return false;
    }

    // ── Strategy ──

    case 'spy': {
      const stratExecutorName = parts[2] || '';
      const stratExecutor = stratExecutorName ? findOfficerByName(stratExecutorName, factionId) : undefined;
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().spy(city.id, stratExecutor?.id);
      return false;
    }

    case 'intel': {
      const stratExecutorName = parts[2] || '';
      const stratExecutor = stratExecutorName ? findOfficerByName(stratExecutorName, factionId) : undefined;
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().gatherIntelligence(city.id, stratExecutor?.id);
      return false;
    }

    case 'rumor': {
      const stratExecutorName = parts[2] || '';
      const stratExecutor = stratExecutorName ? findOfficerByName(stratExecutorName, factionId) : undefined;
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().rumor(city.id, stratExecutor?.id);
      return false;
    }

    case 'arson': {
      const stratExecutorName = parts[2] || '';
      const stratExecutor = stratExecutorName ? findOfficerByName(stratExecutorName, factionId) : undefined;
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().arson(city.id, stratExecutor?.id);
      return false;
    }

    case 'rebel': {
      const stratExecutorName = parts[2] || '';
      const stratExecutor = stratExecutorName ? findOfficerByName(stratExecutorName, factionId) : undefined;
      const city = findCityByIdOrName(parts[1] || '');
      if (!city) { log(t('error.cityNotFound')); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().inciteRebellion(city.id, stratExecutor?.id);
      return false;
    }

    case 'counter': {
      const cityName = parts[1] || '';
      const officerName = parts[2] || '';
      const stratExecutorName = parts[3] || '';
      const stratExecutor = stratExecutorName ? findOfficerByName(stratExecutorName, factionId) : undefined;
      const city = findCityByIdOrName(cityName);
      const officer = officerName ? state.officers.find(o => o.name === officerName && o.cityId === city?.id) : undefined;
      if (!city || !officer) { log(t('error.counterUsage')); return false; }
      game.getState().selectCity(state.cities.find(c => c.factionId === factionId)?.id || 0);
      game.getState().counterEspionage(city.id, officer.id, stratExecutor?.id);
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
          log(t('turn.autoGovernor', { name: ln(govCandidates[0].name) }));
        }
      }

      game.getState().endTurn();
      log(t('turn.newDate', { year: game.getState().year, month: game.getState().month }));

      // Handle AI attacks on us
      if (game.getState().phase === 'battle') {
        log(t('turn.aiAttacking'));
        const defResult = runBattle();
        log(t('turn.defenseResult', { winner: ln(defResult.winner) }));
        defResult.log.slice(-10).forEach(l => log(`    ${l}`));
      }

      return true; // Signal: turn ended
    }

    case 'quit':
    case 'exit':
    case 'q':
      log(t('quit.goodbye'));
      rl.close();
      process.exit(0);
      break; // unreachable but satisfies no-fallthrough

    default:
      log(t('error.unknownCommand', { cmd }));
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
    const date = t('prompt.date', { year: state.year, month: state.month });
    const myCities = state.cities.filter(c => c.factionId === factionId);

    if (myCities.length === 0) {
      logSection(t('campaign.defeat'));
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
      
      // Force an immediate flush of the game log after every command
      flushGameLog();

      // After endTurn, show abbreviated status
      if (turnEnded) {
        const s = game.getState();
        const cities = s.cities.filter(c => c.factionId === factionId);
        log(t('campaign.turnSummary', { cities: cities.length, officers: s.officers.filter(o => o.factionId === factionId).length }));
      }
    } catch (e) {
      log(t('error.generic', { message: e instanceof Error ? e.message : String(e) }));
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // ── Language ──
  // Default is English. Use --lang zh-TW for Traditional Chinese.
  // Also respects LANG_RTK env var (handled in i18n/cli.ts at init time).
  const langArg = args.lang;
  if (langArg === 'zh-TW') {
    i18next.changeLanguage('zh-TW');
  } else if (langArg === 'en') {
    i18next.changeLanguage('en');
  }

  // ── Help ──
  if (args.help) {
    log(`
${t('main.title')}

${t('main.usage')}
${t('main.usageLine')}

${t('main.modes')}
${t('main.modeInteractive')}
${t('main.modeBattle')}
${t('main.modeExec')}

${t('main.options')}
${t('main.optHelp')}
${t('main.optScenario')}
${t('main.scenarioList1')}
${t('main.scenarioList2')}
${t('main.optFaction')}
${t('main.optLang')}
${t('main.optAttack')}
${t('main.optSavefile')}
${t('main.optExec')}
${t('main.execExample')}

${t('main.examples')}
${t('main.example1')}
${t('main.example2')}
${t('main.example3')}
${t('main.example4')}

${t('main.statLegend')}

${t('main.helpHint')}
`);
    process.exit(0);
  }

  // ── Exec Mode (non-interactive, for agent/script use) ──
  if (args.exec) {
    const savefile = args.savefile || '/tmp/rtk-game.json';
    let factionId = loadState(savefile);

    if (factionId === null) {
      // No savefile — initialize from --scenario / --faction args
      const scenarioIndex = parseInt(args.scenario || '0', 10);
      const scenario = scenarios[scenarioIndex];
      if (!scenario) {
        log(t('error.invalidScenario', { index: scenarioIndex, list: scenarios.map((s, i) => `${i}=${s.name}`).join(', ') }));
        process.exit(1);
      }
      game.getState().selectScenario(scenario);

      const factions = game.getState().factions;
      const factionArg = args.faction;
      if (factionArg) {
        const found = factions.find(f => f.name === factionArg || f.id === parseInt(factionArg, 10));
        if (!found) {
          log(t('error.invalidFaction', { name: factionArg, list: factions.map(f => `${f.id}=${f.name}`).join(', ') }));
          process.exit(1);
        }
        factionId = found.id;
      } else {
        factionId = factions[0].id;
      }

      game.getState().selectFaction(factionId);
      game.getState().confirmSettings();
      log(t('main.initialized', { scenario: scenario.name, faction: game.getState().factions.find(f => f.id === factionId)?.name }));
    } else {
      const gs = game.getState();
      log(t('main.loaded', { year: gs.year, month: gs.month, faction: gs.factions.find(f => f.id === factionId)?.name }));
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
        log(t('error.generic', { message: e instanceof Error ? e.message : String(e) }));
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
    log(t('error.invalidScenario', { index: scenarioIndex, list: scenarios.map((s, i) => `${i}=${s.name}`).join(', ') }));
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
      log(t('error.invalidFaction', { name: factionArg, list: factions.map(f => `${f.id}=${f.name}`).join(', ') }));
      process.exit(1);
    }
    factionId = found.id;
  } else {
    log(t('main.availableFactions'));
    factions.forEach(f => {
      const cities = game.getState().cities.filter(c => c.factionId === f.id);
      const officers = game.getState().officers.filter(o => o.factionId === f.id);
      log(t('main.factionListItem', { id: f.id, name: ln(f.name), cities: cities.length, officers: officers.length }));
    });
    factionId = factions[0].id;
    log(`\n${t('main.autoSelect', { name: ln(factions[0].name) })}`);
  }

  game.getState().selectFaction(factionId);
  game.getState().confirmSettings();

  // ── Single Battle Mode ──
  if (args.attack) {
    const state = game.getState();
    const playerCities = state.cities.filter(c => c.factionId === factionId);
    const targetCity = state.cities.find(c => c.name === args.attack);
    if (!targetCity) { log(t('error.cityNotFoundName', { name: args.attack })); process.exit(1); }

    const sourceCity = playerCities.find(c => c.adjacentCityIds.includes(targetCity.id));
    if (!sourceCity) { log(t('error.noAdjacentCity', { name: args.attack })); process.exit(1); }

    const attackers = state.officers
      .filter(o => o.cityId === sourceCity.id && o.factionId === factionId)
      .slice(0, 5);

    logSection(t('attack.route', { from: ln(sourceCity.name), to: ln(targetCity.name) }));
    log(t('battle.attackers', { names: attackers.map(o => ln(o.name)).join(', ') }));

    game.getState().selectCity(sourceCity.id);
    game.getState().setBattleFormation({
      officerIds: attackers.map(o => o.id),
      unitTypes: attackers.map(() => 'infantry' as const),
    });
    game.getState().startBattle(targetCity.id);

    if (game.getState().phase !== 'battle') {
      log(t('attack.notStarted'));
      game.getState().log.forEach(l => log(`  ${l}`));
      rl.close();
      return;
    }

    const result = runBattle();
    logSection(t('battle.result', { winner: ln(result.winner) }));
    result.log.slice(-30).forEach(l => log(`  ${l}`));
    rl.close();
    return;
  }

  // ── Interactive Campaign Mode (default) ──
  await runInteractiveCampaign(factionId);
}

main();
