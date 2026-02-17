/**
 * RTK IV Post-Battle Mechanics Tests
 *
 * These tests enforce the canonical RTK IV rules for what happens after a battle ends.
 * See AGENTS.md "Battle Mechanics (RTK IV Rules)" for the full spec.
 *
 * Key rules:
 * - 全軍覆沒: officer's army wiped out, but the officer can escape or be captured
 * - Captured officers → imprisoned (factionId: -1, cityId: -1)
 * - Non-captured defeated officers → flee
 * - Flee priority: adjacent friendly > adjacent unoccupied (claim) > 100% captured
 * - RTK IV only allows flee to directly connected (adjacent) cities
 * - ALL fleeing officers go to the SAME city
 * - Claimed unoccupied cities become owned by the losing faction
 * - Officers who flee keep their faction affiliation
 * - No flee destination → 100% captured
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { City, Officer, Faction, RTK4Skill } from '../types';

// ── Helpers ──

function makeOfficer(overrides: Partial<Officer> & { id: number; name: string; factionId: number; cityId: number }): Officer {
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

describe('resolveBattle - RTK IV Post-Battle Mechanics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Setup: Attacker (faction 1) conquers City A (faction 2).
   * Faction 2 also owns City B (adjacent to A).
   * Defeated officers should flee to City B.
   */
  test('officers flee to adjacent friendly city', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2, 3] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 2, adjacentCityIds: [1] });
    const cityC = makeCity({ id: 3, name: '鄴', factionId: null, adjacentCityIds: [1] }); // unoccupied

    const officer1 = makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1, isGovernor: true });
    const officer2 = makeOfficer({ id: 11, name: '關羽', factionId: 2, cityId: 1 });
    const attacker = makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 });

    useGameStore.setState({
      cities: [cityA, cityB, cityC],
      officers: [officer1, officer2, attacker],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, // winner
      2, // loser
      1, // cityId (平原)
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },   // destroyed
        { officerId: 11, troops: 0, factionId: 2, status: 'active' },   // destroyed
      ],
      [] // no captures
    );

    const state = useGameStore.getState();

    // Officers should flee to 北海 (adjacent friendly), NOT become unaffiliated
    const liu = state.officers.find(o => o.id === 10)!;
    const guan = state.officers.find(o => o.id === 11)!;

    expect(liu.cityId).toBe(2); // 北海
    expect(liu.factionId).toBe(2); // Still 劉備 faction
    expect(guan.cityId).toBe(2);
    expect(guan.factionId).toBe(2);

    // 鄴 should remain unoccupied
    expect(state.cities.find(c => c.id === 3)!.factionId).toBeNull();
  });

  /**
   * Faction 2 has NO other cities. Adjacent unoccupied city exists.
   * Officers should flee there and CLAIM it for faction 2.
   */
  test('officers flee to unoccupied city and claim it when no friendly cities', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: null, adjacentCityIds: [1] }); // unoccupied

    const officer1 = makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 });
    const officer2 = makeOfficer({ id: 11, name: '關羽', factionId: 2, cityId: 1 });

    useGameStore.setState({
      cities: [cityA, cityB],
      officers: [officer1, officer2, makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 })],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
        { officerId: 11, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();

    // Officers should flee to 北海
    expect(state.officers.find(o => o.id === 10)!.cityId).toBe(2);
    expect(state.officers.find(o => o.id === 10)!.factionId).toBe(2); // keeps faction

    expect(state.officers.find(o => o.id === 11)!.cityId).toBe(2);
    expect(state.officers.find(o => o.id === 11)!.factionId).toBe(2);

    // 北海 should now be claimed by faction 2
    expect(state.cities.find(c => c.id === 2)!.factionId).toBe(2);
  });

  /**
   * No friendly cities AND no unoccupied cities.
   * Officers should be 100% captured — nowhere to flee.
   */
  test('officers 100% captured when nowhere to flee', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 1, adjacentCityIds: [1] }); // enemy city

    const officer1 = makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 });

    useGameStore.setState({
      cities: [cityA, cityB],
      officers: [officer1, makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 2 })],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();
    const liu = state.officers.find(o => o.id === 10)!;

    // Captured — nowhere to flee, held as POW at battle city
    expect(liu.factionId).toBe(-1);
    expect(liu.cityId).toBe(1);
    expect(state.log.some(l => l.includes('無處可逃'))).toBe(true);
  });

  /**
   * Officers captured in battle (via capturedOfficerIds) should be imprisoned
   * regardless of flee destination availability.
   */
  test('captured officers are imprisoned, not fled', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 2, adjacentCityIds: [1] });

    const officer1 = makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 });
    const officer2 = makeOfficer({ id: 11, name: '關羽', factionId: 2, cityId: 1 });

    useGameStore.setState({
      cities: [cityA, cityB],
      officers: [officer1, officer2, makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 })],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
        { officerId: 11, troops: 0, factionId: 2, status: 'active' },
      ],
      [10] // 劉備 captured during battle
    );

    const state = useGameStore.getState();

    // 劉備 captured — held as POW at battle city
    const liu = state.officers.find(o => o.id === 10)!;
    expect(liu.factionId).toBe(-1);
    expect(liu.cityId).toBe(1);

    // 關羽 NOT captured — should flee to 北海
    const guan = state.officers.find(o => o.id === 11)!;
    expect(guan.cityId).toBe(2);
    expect(guan.factionId).toBe(2);
  });

  /**
   * All fleeing officers should go to the SAME city (RTK IV rule).
   */
  test('all fleeing officers go to the same city', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 2, adjacentCityIds: [1] });

    const officers = [
      makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
      makeOfficer({ id: 11, name: '關羽', factionId: 2, cityId: 1 }),
      makeOfficer({ id: 12, name: '張飛', factionId: 2, cityId: 1 }),
    ];

    useGameStore.setState({
      cities: [cityA, cityB],
      officers: [...officers, makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 })],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
        { officerId: 11, troops: 0, factionId: 2, status: 'active' },
        { officerId: 12, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();
    const fledOfficers = state.officers.filter(o => [10, 11, 12].includes(o.id));

    // All three should be at the same city
    const cityIds = new Set(fledOfficers.map(o => o.cityId));
    expect(cityIds.size).toBe(1);
    expect(fledOfficers[0].cityId).toBe(2); // 北海
  });

  /**
   * Non-participating officers in the city: 30% flee, 70% captured.
   */
  test('non-participating officers: 30% flee, 70% captured', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 2, adjacentCityIds: [1] });

    // officer 10 participated, officer 11 did NOT participate
    const officer1 = makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 });
    const officer2 = makeOfficer({ id: 11, name: '徐庶', factionId: 2, cityId: 1 });

    useGameStore.setState({
      cities: [cityA, cityB],
      officers: [officer1, officer2, makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 })],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    // Math.random < 0.3 → escape
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
        // officer 11 NOT in battleUnits → non-participant
      ],
      []
    );

    let state = useGameStore.getState();
    // 徐庶 should have escaped (random 0.1 < 0.3)
    expect(state.officers.find(o => o.id === 11)!.cityId).toBe(2);
    expect(state.officers.find(o => o.id === 11)!.factionId).toBe(2);

    vi.restoreAllMocks();

    // Now test 70% captured path
    useGameStore.setState({
      cities: [
        makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] }),
        makeCity({ id: 2, name: '北海', factionId: 2, adjacentCityIds: [1] }),
      ],
      officers: [
        makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 11, name: '徐庶', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 }),
      ],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.5); // > 0.3 → captured

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    state = useGameStore.getState();
    // 徐庶 should be captured (random 0.5 >= 0.3), held as POW at battle city
    expect(state.officers.find(o => o.id === 11)!.factionId).toBe(-1);
    expect(state.officers.find(o => o.id === 11)!.cityId).toBe(1);
  });

  /**
   * City ownership transfer: attacker wins → city changes to attacker faction.
   */
  test('winning attacker takes the city', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [] });

    useGameStore.setState({
      cities: [cityA],
      officers: [
        makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 }),
      ],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 8000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();
    // City now belongs to attacker
    expect(state.cities.find(c => c.id === 1)!.factionId).toBe(1);
    // Garrison = 80% of surviving troops
    expect(state.cities.find(c => c.id === 1)!.troops).toBe(6400);
  });

  /**
   * RTK IV: only adjacent cities are valid flee targets.
   * Non-adjacent friendly city should NOT be reachable — officer is captured.
   */
  test('officers captured when only non-adjacent friendly city exists', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 1, adjacentCityIds: [1] }); // enemy, adjacent
    const cityC = makeCity({ id: 3, name: '成都', factionId: 2, adjacentCityIds: [] }); // friendly, non-adjacent

    useGameStore.setState({
      cities: [cityA, cityB, cityC],
      officers: [
        makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 2 }),
      ],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();
    const liu = state.officers.find(o => o.id === 10)!;

    // No adjacent friendly or unoccupied cities — captured
    expect(liu.factionId).toBe(-1);
    expect(liu.cityId).toBe(1);
    expect(state.log.some(l => l.includes('無處可逃'))).toBe(true);
  });

  /**
   * Flee to adjacent unoccupied city preferred over non-adjacent unoccupied.
   */
  test('adjacent unoccupied preferred over non-adjacent unoccupied', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: null, adjacentCityIds: [1] }); // unoccupied, adjacent
    const cityC = makeCity({ id: 3, name: '成都', factionId: null, adjacentCityIds: [] }); // unoccupied, non-adjacent

    useGameStore.setState({
      cities: [cityA, cityB, cityC],
      officers: [
        makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 }),
      ],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();

    // Should claim adjacent 北海, not far 成都
    expect(state.officers.find(o => o.id === 10)!.cityId).toBe(2);
    expect(state.cities.find(c => c.id === 2)!.factionId).toBe(2); // claimed
    expect(state.cities.find(c => c.id === 3)!.factionId).toBeNull(); // untouched
  });

  /**
   * Winning attacker officers should be relocated to the conquered city.
   * First attacker officer becomes governor.
   */
  test('winning attacker officers relocate to conquered city', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [] });
    const cityOrigin = makeCity({ id: 10, name: '南皮', factionId: 1, adjacentCityIds: [1] });

    const attacker1 = makeOfficer({ id: 20, name: '顏良', factionId: 1, cityId: 10 });
    const attacker2 = makeOfficer({ id: 21, name: '高覽', factionId: 1, cityId: 10 });
    const defender = makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 });

    useGameStore.setState({
      cities: [cityA, cityOrigin],
      officers: [attacker1, attacker2, defender],
      factions: [
        makeFaction({ id: 1, name: '袁紹', rulerId: 99 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 21, troops: 3000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();

    // Both attackers should now be at 平原 (conquered city)
    expect(state.officers.find(o => o.id === 20)!.cityId).toBe(1);
    expect(state.officers.find(o => o.id === 21)!.cityId).toBe(1);

    // First attacker officer should be governor
    expect(state.officers.find(o => o.id === 20)!.isGovernor).toBe(true);
    expect(state.officers.find(o => o.id === 21)!.isGovernor).toBe(false);
  });

  /**
   * Captured officers should be held as POWs at the battle city, not in limbo.
   */
  test('captured officers held as POW at battle city', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [] });

    useGameStore.setState({
      cities: [cityA],
      officers: [
        makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 }),
      ],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      [10] // 劉備 captured
    );

    const state = useGameStore.getState();
    const liu = state.officers.find(o => o.id === 10)!;

    // POW at the battle city, not in limbo (-1)
    expect(liu.factionId).toBe(-1);
    expect(liu.cityId).toBe(1); // held at 平原
  });

  /**
   * If the captured officer is the ruler, the faction must pick a new ruler.
   */
  test('ruler captured triggers succession', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 2, adjacentCityIds: [1] });

    const ruler = makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1, leadership: 60, charisma: 99 });
    const officer2 = makeOfficer({ id: 11, name: '關羽', factionId: 2, cityId: 2, leadership: 100, charisma: 96 });

    useGameStore.setState({
      cities: [cityA, cityB],
      officers: [ruler, officer2, makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 })],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }), // 劉備 is ruler
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      [10] // 劉備 captured
    );

    const state = useGameStore.getState();

    // 劉備 captured
    expect(state.officers.find(o => o.id === 10)!.factionId).toBe(-1);

    // 關羽 should be the new ruler
    const loserFaction = state.factions.find(f => f.id === 2);
    expect(loserFaction).toBeDefined();
    expect(loserFaction!.rulerId).toBe(11); // 關羽

    // Succession message in log
    expect(state.log.some(l => l.includes('關羽') && l.includes('繼任'))).toBe(true);
  });

  /**
   * If the ruler is captured and no officers remain, faction is destroyed.
   */
  test('ruler captured with no remaining officers destroys faction', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [] });

    useGameStore.setState({
      cities: [cityA],
      officers: [
        makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 }),
      ],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      [10] // 劉備 captured, no other officers in faction
    );

    const state = useGameStore.getState();

    // Faction 2 should be destroyed
    expect(state.factions.find(f => f.id === 2)).toBeUndefined();
    expect(state.log.some(l => l.includes('已被消滅'))).toBe(true);
  });

  /**
   * RTK IV: non-adjacent unoccupied city (even 2 hops) is NOT a valid flee target.
   * Officer should be captured.
   */
  test('officers cannot flee to non-adjacent unoccupied city (2 hops)', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 1, adjacentCityIds: [1, 3] }); // enemy, adjacent
    const cityC = makeCity({ id: 3, name: '濮陽', factionId: null, adjacentCityIds: [2] }); // unoccupied, 2 hops

    useGameStore.setState({
      cities: [cityA, cityB, cityC],
      officers: [
        makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 2 }),
      ],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();
    const liu = state.officers.find(o => o.id === 10)!;

    // No adjacent friendly or unoccupied — captured even though 濮陽 is 2 hops away
    expect(liu.factionId).toBe(-1);
    expect(liu.cityId).toBe(1);
    expect(state.cities.find(c => c.id === 3)!.factionId).toBeNull(); // unclaimed
  });

  /**
   * Distant unoccupied city (3+ hops) is obviously unreachable.
   * Officers should be captured.
   */
  test('officers cannot flee to distant unoccupied city beyond 2 hops', () => {
    const cityA = makeCity({ id: 1, name: '下邳', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 1, adjacentCityIds: [1, 3] }); // enemy
    const cityC = makeCity({ id: 3, name: '平原', factionId: 1, adjacentCityIds: [2, 4] }); // enemy
    const cityD = makeCity({ id: 4, name: '會稽', factionId: null, adjacentCityIds: [3] }); // unoccupied, 3 hops away

    useGameStore.setState({
      cities: [cityA, cityB, cityC, cityD],
      officers: [
        makeOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 1 }),
        makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 2 }),
      ],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 10 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
      []
    );

    const state = useGameStore.getState();
    const liu = state.officers.find(o => o.id === 10)!;

    // Should be captured — 會稽 is 3 hops away, out of range
    expect(liu.factionId).toBe(-1);
    expect(liu.cityId).toBe(1); // held at battle city
    expect(state.cities.find(c => c.id === 4)!.factionId).toBeNull(); // unclaimed
    expect(state.log.some(l => l.includes('無處可逃'))).toBe(true);
  });

  /**
   * Bug #42 regression: losing officer with troops > 0 and status 'done'
   * should still flee, not become a ghost stuck in the enemy city.
   *
   * Scenario: Liu Bei defends Puyang, battle ends (e.g., from bug #39),
   * Liu Bei still has troops > 0 and status 'done'. He must flee to
   * an adjacent friendly city, not remain stranded in Puyang.
   */
  test('Bug #42: losing officer with troops > 0 and status "done" still flees', () => {
    const puyang = makeCity({ id: 16, name: '濮陽', factionId: 2, adjacentCityIds: [6] });
    const pingyuan = makeCity({ id: 6, name: '平原', factionId: 2, adjacentCityIds: [16] });

    const liuBei = makeOfficer({ id: 169, name: '劉備', factionId: 2, cityId: 16, isGovernor: true });
    const dianWei = makeOfficer({ id: 50, name: '典韋', factionId: 1, cityId: 99 });

    useGameStore.setState({
      cities: [puyang, pingyuan],
      officers: [liuBei, dianWei],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 50 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 169 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, // winner: Cao Cao
      2, // loser: Liu Bei
      16, // cityId: Puyang
      [
        { officerId: 50, troops: 5820, factionId: 1, status: 'active' },
        { officerId: 169, troops: 4850, factionId: 2, status: 'done' }, // Bug #39 scenario: alive but 'done'
      ],
      [] // no captures
    );

    const state = useGameStore.getState();
    const liu = state.officers.find(o => o.id === 169)!;

    // Liu Bei MUST flee to Pingyuan (adjacent friendly), NOT stay stranded in Puyang
    expect(liu.cityId).toBe(6); // Pingyuan
    expect(liu.factionId).toBe(2); // Still Liu Bei's faction

    // Puyang should now belong to Cao Cao
    expect(state.cities.find(c => c.id === 16)!.factionId).toBe(1);
  });

  test('Bug #42: losing officer with troops > 0 and status "active" still flees', () => {
    const puyang = makeCity({ id: 16, name: '濮陽', factionId: 2, adjacentCityIds: [6] });
    const pingyuan = makeCity({ id: 6, name: '平原', factionId: 2, adjacentCityIds: [16] });

    const liuBei = makeOfficer({ id: 169, name: '劉備', factionId: 2, cityId: 16, isGovernor: true });
    const dianWei = makeOfficer({ id: 50, name: '典韋', factionId: 1, cityId: 99 });

    useGameStore.setState({
      cities: [puyang, pingyuan],
      officers: [liuBei, dianWei],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 50 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 169 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 16,
      [
        { officerId: 50, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 169, troops: 3000, factionId: 2, status: 'active' }, // alive and active
      ],
      []
    );

    const state = useGameStore.getState();
    const liu = state.officers.find(o => o.id === 169)!;

    // Must flee regardless of troops/status — battle was lost
    expect(liu.cityId).toBe(6);
    expect(liu.factionId).toBe(2);
  });

  test('Bug #42: losing officer with troops > 0, no flee destination → captured', () => {
    // Only one city, no adjacent friendly or unoccupied
    const puyang = makeCity({ id: 16, name: '濮陽', factionId: 2, adjacentCityIds: [8] });
    const ye = makeCity({ id: 8, name: '鄴', factionId: 1, adjacentCityIds: [16] }); // enemy

    const liuBei = makeOfficer({ id: 169, name: '劉備', factionId: 2, cityId: 16, isGovernor: true });
    const dianWei = makeOfficer({ id: 50, name: '典韋', factionId: 1, cityId: 8 });

    useGameStore.setState({
      cities: [puyang, ye],
      officers: [liuBei, dianWei],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 50 }),
        makeFaction({ id: 2, name: '劉備', rulerId: 169 }),
      ],
      log: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 16,
      [
        { officerId: 50, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 169, troops: 4000, factionId: 2, status: 'done' },
      ],
      []
    );

    const state = useGameStore.getState();
    const liu = state.officers.find(o => o.id === 169)!;

    // Nowhere to flee → captured
    expect(liu.factionId).toBe(-1);
    expect(liu.cityId).toBe(16);
  });
});

describe('resolveBattle - War Log (public knowledge)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('resolveBattle records war log entry on attacker victory', () => {
    const cityA = makeCity({ id: 1, name: '平原', factionId: 2, adjacentCityIds: [2] });
    const cityB = makeCity({ id: 2, name: '北海', factionId: 2, adjacentCityIds: [1] });
    const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 1, isGovernor: true });
    const attacker = makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 });

    useGameStore.setState({
      phase: 'playing',
      year: 190, month: 3,
      cities: [cityA, cityB],
      officers: [defender, attacker],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20, isPlayer: true }),
        makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
      ],
      playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 20, isPlayer: true }),
      log: [],
      warLog: [],
      battleResolved: false,
    });

    useGameStore.getState().resolveBattle(
      1, 2, 1,
      [
        { officerId: 20, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 10, troops: 0, factionId: 2, status: 'active' },
      ],
    );

    const warLog = useGameStore.getState().warLog;
    expect(warLog.length).toBe(1);
    expect(warLog[0].attackerFactionId).toBe(1);
    expect(warLog[0].defenderFactionId).toBe(2);
    expect(warLog[0].attackerWon).toBe(true);
    expect(warLog[0].city).toBe('平原');
    expect(warLog[0].year).toBe(190);
    expect(warLog[0].month).toBe(3);
  });

  test('resolveBattle records war log entry on defender victory', () => {
    const cityA = makeCity({ id: 1, name: '鄴', factionId: 2, adjacentCityIds: [] });
    const defender = makeOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 1, isGovernor: true });
    const attacker = makeOfficer({ id: 20, name: '曹操', factionId: 1, cityId: 99 });

    useGameStore.setState({
      phase: 'playing',
      year: 191, month: 7,
      cities: [cityA],
      officers: [defender, attacker],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 20, isPlayer: true }),
        makeFaction({ id: 2, name: '袁紹', rulerId: 10, relations: { 1: 60 } }),
      ],
      playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 20, isPlayer: true }),
      log: [],
      warLog: [],
      battleResolved: false,
    });

    // Defender (faction 2) wins — attacker (faction 1) loses
    useGameStore.getState().resolveBattle(
      2, 1, 1,
      [
        { officerId: 10, troops: 3000, factionId: 2, status: 'active' },
        { officerId: 20, troops: 0, factionId: 1, status: 'active' },
      ],
    );

    const warLog = useGameStore.getState().warLog;
    expect(warLog.length).toBe(1);
    expect(warLog[0].attackerWon).toBe(false); // Defender won
    expect(warLog[0].defenderFactionId).toBe(2); // Defender owned the city
    expect(warLog[0].type).toBe('overrun'); // 0 troops = overrun
  });

  test('auto-capture of empty faction city also records war log', () => {
    const srcCity = makeCity({ id: 1, name: '許昌', factionId: 1, troops: 20000, adjacentCityIds: [2] });
    const emptyCity = makeCity({ id: 2, name: '洛陽', factionId: 2, troops: 0, adjacentCityIds: [1] });

    const attacker = makeOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true });
    const stayBehind = makeOfficer({ id: 2, name: '荀彧', factionId: 1, cityId: 1 });

    useGameStore.setState({
      phase: 'playing',
      selectedCityId: 1,
      year: 189, month: 1,
      cities: [srcCity, emptyCity],
      officers: [attacker, stayBehind],
      factions: [
        makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
        makeFaction({ id: 2, name: '袁紹', rulerId: 99, relations: { 1: 60 } }),
      ],
      playerFaction: makeFaction({ id: 1, name: '曹操', rulerId: 1, isPlayer: true }),
      battleFormation: { officerIds: [1], unitTypes: ['infantry'] },
      log: [],
      warLog: [],
      battleResolved: false,
    });

    useGameStore.getState().startBattle(2);

    const warLog = useGameStore.getState().warLog;
    // Auto-capture records war log for faction-owned cities
    expect(warLog.length).toBe(1);
    expect(warLog[0].attackerWon).toBe(true);
    expect(warLog[0].type).toBe('auto-capture');
    expect(warLog[0].city).toBe('洛陽');
  });
});
