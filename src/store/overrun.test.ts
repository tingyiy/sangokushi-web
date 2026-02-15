/**
 * Zero-Troop Overrun Tests
 *
 * When attacking a city that has defending officers but 0 troops,
 * the battle screen should NOT appear. Instead the city is auto-captured
 * and resolveBattle handles officer flee/capture as normal.
 *
 * This applies to:
 *   - Player startBattle  (player attacks enemy city with 0 troops)
 *   - AI aiStartBattle    (AI attacks player/AI city with 0 troops)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useGameStore } from './gameStore';
import { useBattleStore } from './battleStore';
import type { City, Officer, Faction, RTK4Skill } from '../types';

// ── Helpers ──

function makeOfficer(overrides: Partial<Officer> & { id: number; name: string; factionId: number | null; cityId: number }): Officer {
  return {
    portraitId: overrides.id,
    birthYear: 160,
    deathYear: 220,
    leadership: 80,
    war: 80,
    intelligence: 80,
    politics: 80,
    charisma: 80,
    skills: [] as RTK4Skill[],
    acted: false,
    loyalty: 100,
    isGovernor: false,
    treasureId: null,
    rank: 'common',
    relationships: [],
    ...overrides,
  };
}

function makeCity(overrides: Partial<City> & { id: number; name: string }): City {
  return {
    x: 50, y: 50,
    factionId: null,
    population: 100000,
    gold: 10000,
    food: 50000,
    commerce: 50,
    agriculture: 50,
    defense: 30,
    troops: 10000,
    adjacentCityIds: [],
    floodControl: 50,
    technology: 50,
    peopleLoyalty: 70,
    morale: 60,
    training: 60,
    crossbows: 0,
    warHorses: 0,
    batteringRams: 0,
    catapults: 0,
    taxRate: 'medium',
    ...overrides,
  };
}

function makeFaction(overrides: Partial<Faction> & { id: number; name: string; rulerId: number }): Faction {
  return {
    color: '#ff0000',
    isPlayer: false,
    relations: {},
    allies: [],
    ceasefires: [],
    hostageOfficerIds: [],
    powOfficerIds: [],
    advisorId: null,
    ...overrides,
  };
}

describe('Zero-Troop Overrun (no battle screen)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Player startBattle', () => {
    it('auto-captures city when defenders have 0 troops', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1, 3] });
      const fleeCity = makeCity({ id: 3, name: '鄴', factionId: 2, adjacentCityIds: [2] });

      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity, fleeCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();

      // Phase should remain 'playing' — no battle screen shown
      expect(state.phase).toBe('playing');

      // Target city should now belong to the attacker
      const captured = state.cities.find(c => c.id === 2);
      expect(captured?.factionId).toBe(1);
    });

    it('does not initialize battleStore when defenders have 0 troops', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1] });

      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      const initSpy = vi.spyOn(useBattleStore.getState(), 'initBattle');
      useGameStore.getState().startBattle(2);

      expect(initSpy).not.toHaveBeenCalled();
    });

    it('defender officers flee to adjacent friendly city', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // high roll → flee (not the 30% escape path)

      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1, 3] });
      const fleeCity = makeCity({ id: 3, name: '鄴', factionId: 2, adjacentCityIds: [2] });

      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity, fleeCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();
      const defOfficer = state.officers.find(o => o.id === 10);

      // Defender should have fled to the friendly adjacent city
      // (either fled from battle unit 0-troop path, or non-participant 30%/70% path)
      // With random=0.99, non-participants get captured (70% path), but the officer
      // participated in battle (was in battleUnits with troops=0) so they flee.
      expect(defOfficer?.cityId).toBe(3);
      expect(defOfficer?.factionId).toBe(2); // keeps faction affiliation
    });

    it('defender officers captured when no adjacent friendly/unoccupied city', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      // Target city with no adjacent friendly or unoccupied cities to flee to
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1] });

      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();
      const defOfficer = state.officers.find(o => o.id === 10);

      // No flee destination → captured (factionId = -1)
      expect(defOfficer?.factionId).toBe(-1);
    });

    it('deducts troops from source city', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1] });

      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true, leadership: 80 });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();
      const src = state.cities.find(c => c.id === 1);
      // Troops should have been deducted from source city
      expect(src!.troops).toBeLessThan(20000);
    });

    it('marks attacking officers as acted', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1] });

      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();
      const attackerOfficer = state.officers.find(o => o.id === 1);
      expect(attackerOfficer?.acted).toBe(true);
    });

    it('logs the overrun message', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1] });

      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const log = useGameStore.getState().log;
      // Should contain the overrun log message
      expect(log).toContainEqual(expect.stringContaining('守軍無兵可戰'));
    });

    it('auto-assigns governor for source city when governor leaves', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1] });

      // Attacker1 is governor and will be sent to battle
      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true, leadership: 90 });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1, leadership: 85 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();
      // Attacker2 (荀彧) should still be in city 1 and become governor
      const remaining = state.officers.find(o => o.id === 2);
      expect(remaining?.cityId).toBe(1);
      expect(remaining?.isGovernor).toBe(true);
    });

    it('still enters battle when defender has >0 troops (no overrun)', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 5000, adjacentCityIds: [1] });

      const attacker1 = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
      const attacker2 = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });
      const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, tgtCity],
        officers: [attacker1, attacker2, defender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      // Should enter battle phase normally
      expect(useGameStore.getState().phase).toBe('battle');
    });
  });

  describe('AI aiStartBattle', () => {
    it('AI vs AI auto-resolves 0-troop defenders without battle screen', () => {
      // AI faction 2 attacks AI faction 3 city with 0 troops
      const aiSrcCity = makeCity({ id: 1, name: '許昌', factionId: 2, troops: 30000, adjacentCityIds: [2] });
      const aiTgtCity = makeCity({ id: 2, name: '洛陽', factionId: 3, troops: 0, adjacentCityIds: [1] });

      const aiAttacker1 = makeOfficer({ id: 20, name: '袁紹', factionId: 2, cityId: 1, isGovernor: true, leadership: 90 });
      const aiAttacker2 = makeOfficer({ id: 21, name: '顏良', factionId: 2, cityId: 1, leadership: 85 });
      const aiDefender = makeOfficer({ id: 30, name: '公孫瓚', factionId: 3, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: null,
        cities: [aiSrcCity, aiTgtCity],
        officers: [aiAttacker1, aiAttacker2, aiDefender],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 99, isPlayer: true }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 20, relations: { 3: 80 } }),
          makeFaction({ id: 3, name: '公孫瓚', rulerId: 30, relations: { 2: 80 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 99, isPlayer: true }),
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().aiStartBattle(1, 2);

      const state = useGameStore.getState();
      // Phase should remain playing — AI vs AI auto-resolved
      expect(state.phase).toBe('playing');
      // Target city should be captured by AI attacker
      const captured = state.cities.find(c => c.id === 2);
      expect(captured?.factionId).toBe(2);
    });

    it('AI vs Player overruns 0-troop player city without battle screen', () => {
      const aiSrcCity = makeCity({ id: 1, name: '許昌', factionId: 2, troops: 30000, adjacentCityIds: [2] });
      const playerCity = makeCity({ id: 2, name: '洛陽', factionId: 1, troops: 0, adjacentCityIds: [1] });

      const aiAttacker1 = makeOfficer({ id: 20, name: '袁紹', factionId: 2, cityId: 1, isGovernor: true, leadership: 90 });
      const aiAttacker2 = makeOfficer({ id: 21, name: '顏良', factionId: 2, cityId: 1, leadership: 85 });
      const playerDef = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 2, isGovernor: true });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: null,
        cities: [aiSrcCity, playerCity],
        officers: [aiAttacker1, aiAttacker2, playerDef],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true, relations: { 2: 60 } }),
          makeFaction({ id: 2, name: '袁紹', rulerId: 20, relations: { 1: 60 } }),
        ],
        playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true, relations: { 2: 60 } }),
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().aiStartBattle(1, 2);

      const state = useGameStore.getState();
      // Phase should remain playing — no battle screen for 0-troop overrun
      expect(state.phase).toBe('playing');
      // Target city should be captured by AI
      const captured = state.cities.find(c => c.id === 2);
      expect(captured?.factionId).toBe(2);
    });
  });
});
