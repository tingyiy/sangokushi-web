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

    it('overrun does NOT log cityFallen message', () => {
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

      const logs = useGameStore.getState().log;
      // Should have the overrun message
      expect(logs).toContainEqual(expect.stringContaining('守軍無兵可戰'));
      // Should NOT have the redundant "cityFallen" message
      expect(logs).not.toContainEqual(expect.stringContaining('攻陷'));
      expect(logs).not.toContainEqual(expect.stringContaining('has fallen'));
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

    it('deducts food from source city when starting battle', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, food: 100000, adjacentCityIds: [2] });
      const tgtCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 5000, food: 30000, adjacentCityIds: [1] });

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
        battleFormation: { officerIds: [1], unitTypes: ['infantry'], troops: [5000] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();
      const src = state.cities.find(c => c.id === 1);
      // Food should be deducted from source city (default: troops * 10 = 50000)
      expect(src!.food).toBeLessThan(100000);
      expect(src!.food).toBe(100000 - 50000); // 5000 troops * 10 = 50000

      // Battle store should have received the food
      const battle = useBattleStore.getState();
      expect(battle.attackerFood).toBe(50000);
      expect(battle.defenderFood).toBe(30000); // defender uses city food
    });

    it('deducts food from source city on overrun (0-troop defender)', () => {
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, food: 80000, adjacentCityIds: [2] });
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
        battleFormation: { officerIds: [1], unitTypes: ['infantry'], troops: [5000] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();
      const src = state.cities.find(c => c.id === 1);
      // Food should still be deducted even on overrun
      expect(src!.food).toBeLessThan(80000);
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

  describe('Empty city capture (no faction)', () => {
    it('capturing unaffiliated city does NOT log faction destroyed', () => {
      // Target city has factionId: null (truly empty, no owner)
      const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
      const emptyCity = makeCity({ id: 2, name: '洛陽', factionId: null, troops: 0, adjacentCityIds: [1] });

      const attacker = makeOfficer({ id: 1, name: '華雄', factionId: 1, cityId: 1, isGovernor: true });
      const stayBehind = makeOfficer({ id: 2, name: '李儒', factionId: 1, cityId: 1 });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, emptyCity],
        officers: [attacker, stayBehind],
        factions: [
          makeFaction({ id: 1, name: '董卓', rulerId: 1, isPlayer: true }),
        ],
        playerFaction: makeFaction({ id: 1, name: '董卓', rulerId: 1, isPlayer: true }),
        battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();
      // City should be captured
      const captured = state.cities.find(c => c.id === 2);
      expect(captured?.factionId).toBe(1);

      // Log should NOT contain "faction destroyed" message
      const logs = state.log;
      expect(logs).not.toContainEqual(expect.stringContaining('勢力已被消滅'));
      expect(logs).not.toContainEqual(expect.stringContaining('has been destroyed'));
    });

    it('Bug #43: unaffiliated officers do NOT defend null-faction city — auto-capture', () => {
      // When a city has factionId: null (abandoned/unowned) but has unaffiliated officers
      // with troops, the city should STILL be auto-captured. Unaffiliated officers are
      // free agents and do not defend.
      const srcCity = makeCity({ id: 1, name: '北海', factionId: 1, troops: 10000, food: 50000, adjacentCityIds: [2] });
      const targetCity = makeCity({ id: 2, name: '下邳', factionId: null, troops: 4000, adjacentCityIds: [1] });

      const attacker = makeOfficer({ id: 100, name: '關羽', factionId: 1, cityId: 1, isGovernor: true, war: 98 });
      const stayBehind = makeOfficer({ id: 169, name: '劉備', factionId: 1, cityId: 1 });
      // Unaffiliated officers in the target city — should NOT defend
      const unaffiliated1 = makeOfficer({ id: 355, name: '嚴顏', factionId: null, cityId: 2 });
      const unaffiliated2 = makeOfficer({ id: 8, name: '蔡中', factionId: null, cityId: 2 });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, targetCity],
        officers: [attacker, stayBehind, unaffiliated1, unaffiliated2],
        factions: [
          makeFaction({ id: 1, name: '劉備', rulerId: 169, isPlayer: true }),
        ],
        playerFaction: makeFaction({ id: 1, name: '劉備', rulerId: 169, isPlayer: true }),
        battleFormation: { officerIds: [100], unitTypes: ['infantry'], troops: [4000], food: 40000 },
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().startBattle(2);

      const state = useGameStore.getState();

      // Phase should remain 'playing' — no battle screen, auto-capture
      expect(state.phase).toBe('playing');

      // Target city should be captured by player
      const captured = state.cities.find(c => c.id === 2);
      expect(captured?.factionId).toBe(1);

      // Unaffiliated officers should remain unaffiliated and still in the city
      const yanYan = state.officers.find(o => o.id === 355);
      const caiZhong = state.officers.find(o => o.id === 8);
      expect(yanYan?.factionId).toBeNull();
      expect(yanYan?.cityId).toBe(2);
      expect(caiZhong?.factionId).toBeNull();
      expect(caiZhong?.cityId).toBe(2);
    });

    it('Bug #43: AI aiStartBattle also auto-captures null-faction city with unaffiliated officers', () => {
      const srcCity = makeCity({ id: 1, name: '鄴', factionId: 2, troops: 15000, food: 50000, adjacentCityIds: [2] });
      const targetCity = makeCity({ id: 2, name: '濮陽', factionId: null, troops: 3000, adjacentCityIds: [1] });

      const aiAttacker = makeOfficer({ id: 50, name: '袁紹', factionId: 2, cityId: 1, isGovernor: true });
      const aiStay = makeOfficer({ id: 51, name: '審配', factionId: 2, cityId: 1 });
      const unaffiliated = makeOfficer({ id: 90, name: '張任', factionId: null, cityId: 2 });

      useGameStore.setState({
        phase: 'playing',
        selectedCityId: 1,
        cities: [srcCity, targetCity],
        officers: [aiAttacker, aiStay, unaffiliated],
        factions: [
          makeFaction({ id: 2, name: '袁紹', rulerId: 50 }),
        ],
        playerFaction: null,
        log: [],
        battleResolved: false,
      });

      useGameStore.getState().aiStartBattle(1, 2);

      const state = useGameStore.getState();

      // Phase should remain 'playing' — auto-capture, no battle
      expect(state.phase).toBe('playing');

      // City should be captured by AI
      const captured = state.cities.find(c => c.id === 2);
      expect(captured?.factionId).toBe(2);

      // Unaffiliated officer stays unaffiliated
      const zhangRen = state.officers.find(o => o.id === 90);
      expect(zhangRen?.factionId).toBeNull();
      expect(zhangRen?.cityId).toBe(2);
    });

    it('Bug #45: AI auto-capture of null-faction city does NOT produce war log with "?" defender', () => {
      const srcCity = makeCity({ id: 1, name: '陳留', factionId: 1, troops: 20000, food: 80000, adjacentCityIds: [2] });
      const targetCity = makeCity({ id: 2, name: '許昌', factionId: null, troops: 0, adjacentCityIds: [1] });

      const attacker1 = makeOfficer({ id: 11, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
      const attacker2 = makeOfficer({ id: 12, name: '夏侯惇', factionId: 1, cityId: 1 });

      useGameStore.setState({
        phase: 'playing',
        year: 189, month: 7,
        selectedCityId: 1,
        cities: [srcCity, targetCity],
        officers: [attacker1, attacker2],
        factions: [
          makeFaction({ id: 1, name: '曹操', rulerId: 11 }),
        ],
        playerFaction: null,
        log: [],
        warLog: [],
        battleResolved: false,
      });

      useGameStore.getState().aiStartBattle(1, 2);

      const state = useGameStore.getState();

      // City should be captured
      expect(state.cities.find(c => c.id === 2)?.factionId).toBe(1);

      // War log should NOT contain an entry for null-faction city capture
      expect(state.warLog.length).toBe(0);

      // Log should contain the capture message, not an overrun/battle message
      const logText = state.log.join(' ');
      expect(logText).toContain('許昌');
    });
  });
});
