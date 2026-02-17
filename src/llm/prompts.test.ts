/**
 * Regression test: every command the LLM agent can dispatch must be
 * documented in the corresponding system prompt so the LLM knows about it.
 *
 * Two dispatchers exist:
 *  - executeCommand() in agent.ts  → strategic commands → SYSTEM_PROMPT_STRATEGIC
 *  - runBattlePhase() switch        → battle actions    → SYSTEM_PROMPT_BATTLE
 *
 * If a command exists in a dispatcher but not in its prompt, the LLM will
 * never know it can use it.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SYSTEM_PROMPT_STRATEGIC, SYSTEM_PROMPT_BATTLE, buildQuickStats, buildStrategicContext } from './prompts';
import { useGameStore } from '../store/gameStore';
import type { RTK4Skill } from '../types';

// ── Extract command names from agent.ts ──────────────────────────────

function getAgentSource(): string {
  return readFileSync(resolve(__dirname, 'agent.ts'), 'utf-8');
}

/**
 * Extract case labels from the executeCommand() strategic dispatcher.
 * It starts at `switch (type) {` and ends before the battle dispatcher.
 */
function extractStrategicCommands(src: string): string[] {
  // executeCommand contains `switch (type) {` with cases like `case 'endTurn':`
  // The battle dispatcher uses `switch (actionType) {`
  const strategicBlock = src.split('switch (type)')[1]?.split('switch (actionType)')[0] ?? '';
  const matches = strategicBlock.matchAll(/case\s+'(\w+)'/g);
  return [...new Set([...matches].map(m => m[1]))];
}

/**
 * Extract case labels from the battle dispatcher (`switch (actionType)`).
 */
function extractBattleCommands(src: string): string[] {
  const battleBlock = src.split('switch (actionType)')[1] ?? '';
  const matches = battleBlock.matchAll(/case\s+'(\w+)'/g);
  return [...new Set([...matches].map(m => m[1]))];
}

// Commands that are internal plumbing — the LLM never issues them directly.
// If you add a command here, add a comment explaining why.
const INTERNAL_STRATEGIC_COMMANDS = new Set([
  'selectCity',     // auto-handled by agent before diplomacy/strategy commands
  'confirmEvent',   // event queue processing, not a player action
  'popEvent',       // event queue processing, not a player action
  'retreat',        // handled in battle dispatcher, not strategic prompt
]);

describe('LLM prompt completeness', () => {
  const src = getAgentSource();
  const strategicCmds = extractStrategicCommands(src);
  const battleCmds = extractBattleCommands(src);

  test('extracted strategic commands from dispatcher', () => {
    expect(strategicCmds.length).toBeGreaterThan(15);
  });

  test('extracted battle commands from dispatcher', () => {
    expect(battleCmds.length).toBeGreaterThan(3);
  });

  test('every strategic command appears in SYSTEM_PROMPT_STRATEGIC or is explicitly internal', () => {
    const missing: string[] = [];
    for (const cmd of strategicCmds) {
      if (INTERNAL_STRATEGIC_COMMANDS.has(cmd)) continue;
      if (!SYSTEM_PROMPT_STRATEGIC.includes(cmd)) {
        missing.push(cmd);
      }
    }
    expect(
      missing,
      `Strategic commands in agent dispatcher but missing from SYSTEM_PROMPT_STRATEGIC:\n  ${missing.join('\n  ')}\n\nEither add them to SYSTEM_PROMPT_STRATEGIC in src/llm/prompts.ts, or add them to INTERNAL_STRATEGIC_COMMANDS in this test with a justification.`,
    ).toEqual([]);
  });

  test('every battle command appears in SYSTEM_PROMPT_BATTLE', () => {
    const missing: string[] = [];
    for (const cmd of battleCmds) {
      if (!SYSTEM_PROMPT_BATTLE.includes(cmd)) {
        missing.push(cmd);
      }
    }
    expect(
      missing,
      `Battle commands in agent dispatcher but missing from SYSTEM_PROMPT_BATTLE:\n  ${missing.join('\n  ')}\n\nAdd them to SYSTEM_PROMPT_BATTLE in src/llm/prompts.ts.`,
    ).toEqual([]);
  });

  test('INTERNAL_STRATEGIC_COMMANDS entries are actually in the dispatcher', () => {
    for (const cmd of INTERNAL_STRATEGIC_COMMANDS) {
      expect(
        strategicCmds,
        `${cmd} is in INTERNAL_STRATEGIC_COMMANDS but not in the agent dispatcher — remove it from the exclusion list`,
      ).toContain(cmd);
    }
  });
});

describe('LLM prompt accuracy (Bug #38)', () => {
  test('prompt does NOT claim quarterly-only tax schedule', () => {
    // The game processes economy every month (processEconomy in turnActions.ts).
    // The prompt must not tell the LLM that taxes come only on specific months.
    expect(SYSTEM_PROMPT_STRATEGIC).not.toMatch(/tax revenue comes quarterly/i);
    expect(SYSTEM_PROMPT_STRATEGIC).not.toMatch(/tax revenue arrives quarterly/i);
  });

  test('prompt states income is monthly', () => {
    expect(SYSTEM_PROMPT_STRATEGIC).toMatch(/EVERY month/i);
  });

  test('prompt mentions Bountiful Harvest bonus event timing', () => {
    // Bountiful Harvest can occur in months 7 & 10 — this IS correct
    expect(SYSTEM_PROMPT_STRATEGIC).toMatch(/Bountiful Harvest/);
  });
});

describe('LLM quick stats content (Gap #1)', () => {
  test('buildQuickStats includes training, morale, commerce, agriculture, defense', () => {
    useGameStore.setState({
      phase: 'playing',
      playerFaction: { id: 1, name: 'T', rulerId: 1, color: '#f00', isPlayer: true, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      cities: [{
        id: 1, name: 'TestCity', x: 0, y: 0, factionId: 1, population: 10000,
        gold: 5000, food: 8000, commerce: 300, agriculture: 450, defense: 60,
        troops: 2000, adjacentCityIds: [],
        floodControl: 20, technology: 30, peopleLoyalty: 70, morale: 75, training: 55,
        crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      }],
      officers: [{
        id: 1, name: 'TestOff', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
        skills: [] as RTK4Skill[], portraitId: 1, birthYear: 160, deathYear: 230, treasureId: null,
        factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: true,
        rank: 'common' as const, relationships: [],
      }],
      factions: [{ id: 1, name: 'T', rulerId: 1, color: '#f00', isPlayer: true, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null }],
    });

    const stats = buildQuickStats();

    expect(stats).toContain('Comm:300');
    expect(stats).toContain('Agri:450');
    expect(stats).toContain('Def:60');
    expect(stats).toContain('Train:55');
    expect(stats).toContain('Morale:75');
    // Still contains the basics
    expect(stats).toContain('Gold:5000');
    expect(stats).toContain('Food:8000');
    expect(stats).toContain('Troops:2000');
  });
});

describe('LLM strategic context: revealed enemy cities', () => {
  test('buildStrategicContext includes REVEALED ENEMY CITIES section for spied cities', () => {
    useGameStore.setState({
      phase: 'playing',
      year: 190, month: 3,
      playerFaction: { id: 1, name: 'T', rulerId: 1, color: '#f00', isPlayer: true, relations: { 2: 80 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      cities: [
        {
          id: 1, name: 'MyCity', x: 0, y: 0, factionId: 1, population: 10000,
          gold: 5000, food: 8000, commerce: 300, agriculture: 450, defense: 60,
          troops: 2000, adjacentCityIds: [2],
          floodControl: 20, technology: 30, peopleLoyalty: 70, morale: 75, training: 55,
          crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
        },
        {
          id: 2, name: 'EnemyCity', x: 10, y: 10, factionId: 2, population: 20000,
          gold: 9000, food: 15000, commerce: 400, agriculture: 500, defense: 80,
          troops: 8000, adjacentCityIds: [1],
          floodControl: 30, technology: 40, peopleLoyalty: 60, morale: 70, training: 65,
          crossbows: 100, warHorses: 50, batteringRams: 10, catapults: 5, taxRate: 'medium' as const,
        },
      ],
      officers: [
        {
          id: 1, name: 'MyOff', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
          skills: [] as RTK4Skill[], portraitId: 1, birthYear: 160, deathYear: 230, treasureId: null,
          factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: true,
          rank: 'common' as const, relationships: [],
        },
        {
          id: 2, name: 'EnemyOff', leadership: 90, war: 85, intelligence: 70, politics: 60, charisma: 75,
          skills: ['firePlot'] as RTK4Skill[], portraitId: 2, birthYear: 155, deathYear: 220, treasureId: null,
          factionId: 2, cityId: 2, acted: false, loyalty: 100, isGovernor: true,
          rank: 'governor' as const, relationships: [],
        },
      ],
      factions: [
        { id: 1, name: 'T', rulerId: 1, color: '#f00', isPlayer: true, relations: { 2: 80 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
        { id: 2, name: 'Enemy', rulerId: 2, color: '#00f', isPlayer: false, relations: { 1: 80 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      ],
      // City 2 is revealed (spied)
      revealedCities: { 2: { untilYear: 191, untilMonth: 1 } },
      warLog: [],
      pendingEvents: [],
      log: [],
    });

    const context = buildStrategicContext();

    // Should contain the revealed section
    expect(context).toContain('REVEALED ENEMY CITIES');
    expect(context).toContain('EnemyCity');
    expect(context).toContain('Troops: 8000');
    expect(context).toContain('Gold: 9000');
    expect(context).toContain('EnemyOff');
    expect(context).toContain('L=90');
    expect(context).toContain('firePlot');
  });

  test('buildStrategicContext does NOT show unrevealed enemy cities', () => {
    useGameStore.setState({
      phase: 'playing',
      year: 190, month: 3,
      playerFaction: { id: 1, name: 'T', rulerId: 1, color: '#f00', isPlayer: true, relations: { 2: 80 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      cities: [
        {
          id: 1, name: 'MyCity', x: 0, y: 0, factionId: 1, population: 10000,
          gold: 5000, food: 8000, commerce: 300, agriculture: 450, defense: 60,
          troops: 2000, adjacentCityIds: [2],
          floodControl: 20, technology: 30, peopleLoyalty: 70, morale: 75, training: 55,
          crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
        },
        {
          id: 2, name: 'SecretCity', x: 10, y: 10, factionId: 2, population: 20000,
          gold: 9000, food: 15000, commerce: 400, agriculture: 500, defense: 80,
          troops: 8000, adjacentCityIds: [1],
          floodControl: 30, technology: 40, peopleLoyalty: 60, morale: 70, training: 65,
          crossbows: 100, warHorses: 50, batteringRams: 10, catapults: 5, taxRate: 'medium' as const,
        },
      ],
      officers: [
        {
          id: 1, name: 'MyOff', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
          skills: [] as RTK4Skill[], portraitId: 1, birthYear: 160, deathYear: 230, treasureId: null,
          factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: true,
          rank: 'common' as const, relationships: [],
        },
      ],
      factions: [
        { id: 1, name: 'T', rulerId: 1, color: '#f00', isPlayer: true, relations: { 2: 80 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
        { id: 2, name: 'Enemy', rulerId: 2, color: '#00f', isPlayer: false, relations: { 1: 80 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      ],
      // NOT revealed
      revealedCities: {},
      warLog: [],
      pendingEvents: [],
      log: [],
    });

    const context = buildStrategicContext();

    // Should NOT show revealed section or enemy troop details
    expect(context).not.toContain('REVEALED ENEMY CITIES');
    expect(context).not.toContain('Troops: 8000');
    expect(context).not.toContain('Gold: 9000');
  });
});

describe('LLM strategic context: war history', () => {
  test('buildStrategicContext includes WAR HISTORY section from warLog', () => {
    useGameStore.setState({
      phase: 'playing',
      year: 190, month: 5,
      playerFaction: { id: 1, name: 'Liu', rulerId: 1, color: '#f00', isPlayer: true, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      cities: [{
        id: 1, name: 'C', x: 0, y: 0, factionId: 1, population: 10000,
        gold: 5000, food: 8000, commerce: 300, agriculture: 450, defense: 60,
        troops: 2000, adjacentCityIds: [],
        floodControl: 20, technology: 30, peopleLoyalty: 70, morale: 75, training: 55,
        crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      }],
      officers: [{
        id: 1, name: 'O', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
        skills: [] as RTK4Skill[], portraitId: 1, birthYear: 160, deathYear: 230, treasureId: null,
        factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: true,
        rank: 'common' as const, relationships: [],
      }],
      factions: [
        { id: 1, name: 'Liu', rulerId: 1, color: '#f00', isPlayer: true, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      ],
      warLog: [
        { year: 190, month: 2, attackerFaction: '袁紹', attackerFactionId: 2, defenderFaction: '曹操', defenderFactionId: 3, city: '鄴', cityId: 5, attackerWon: true, type: 'battle' },
        { year: 190, month: 3, attackerFaction: '曹操', attackerFactionId: 3, defenderFaction: 'Liu', defenderFactionId: 1, city: '平原', cityId: 6, attackerWon: false, type: 'battle' },
      ],
      revealedCities: {},
      pendingEvents: [],
      log: [],
    });

    const context = buildStrategicContext();

    expect(context).toContain('WAR HISTORY');
    // AI vs AI war
    expect(context).toContain('袁紹 attacked 曹操 at 鄴');
    expect(context).toContain('袁紹 captured 鄴');
    // Attack on us (★ marker for involvement)
    expect(context).toContain('曹操 attacked Liu at 平原');
    expect(context).toContain('Liu repelled the attack');
    expect(context).toContain('★');
  });
});
