/**
 * Regression tests for rtk-api.ts bug fixes.
 *
 * These tests verify that the API layer correctly detects store rejections
 * and returns proper ok:false responses instead of misleading ok:true.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rtkApi } from './rtk-api';
import { useGameStore } from '../store/gameStore';
import type { RTK4Skill } from '../types';

/**
 * Shared test state: two cities (player city 1, enemy city 2, empty city 3),
 * one player officer with intelligence + espionage skills.
 */
function setupTestState() {
  useGameStore.setState({
    phase: 'playing',
    scenario: null,
    playerFaction: {
      id: 1, name: '曹操', rulerId: 1, color: '#3b82f6', isPlayer: true,
      relations: { 2: 60 }, allies: [], ceasefires: [],
      hostageOfficerIds: [], powOfficerIds: [], advisorId: null,
    },
    cities: [
      {
        id: 1, name: '許昌', x: 50, y: 50, factionId: 1, population: 100000,
        gold: 10000, food: 50000, commerce: 50, agriculture: 50, defense: 30,
        troops: 10000, adjacentCityIds: [2, 3],
        floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
        crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      },
      {
        id: 2, name: '洛陽', x: 60, y: 50, factionId: 2, population: 100000,
        gold: 10000, food: 50000, commerce: 50, agriculture: 50, defense: 30,
        troops: 10000, adjacentCityIds: [1],
        floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
        crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      },
      {
        id: 3, name: '空城', x: 70, y: 50, factionId: null, population: 10000,
        gold: 1000, food: 5000, commerce: 10, agriculture: 10, defense: 10,
        troops: 0, adjacentCityIds: [1],
        floodControl: 10, technology: 10, peopleLoyalty: 50, morale: 50, training: 50,
        crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      },
    ],
    officers: [
      {
        id: 1, name: '荀彧', leadership: 85, war: 60, intelligence: 95, politics: 95, charisma: 90,
        skills: ['manufacture', 'talent', 'provoke', 'tigerTrap', 'arson', 'intelligence', 'espionage', 'diplomacy'] as RTK4Skill[],
        portraitId: 1, birthYear: 160, deathYear: 220, treasureId: null,
        factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: true,
        rank: 'common' as const, relationships: [],
      },
      {
        id: 2, name: '呂布', leadership: 95, war: 100, intelligence: 20, politics: 15, charisma: 40,
        skills: [] as RTK4Skill[],
        portraitId: 2, birthYear: 160, deathYear: 200, treasureId: null,
        factionId: 2, cityId: 2, acted: false, loyalty: 50, isGovernor: true,
        rank: 'common' as const, relationships: [],
      },
    ],
    factions: [
      { id: 1, name: '曹操', rulerId: 1, color: '#3b82f6', isPlayer: true, relations: { 2: 60 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      { id: 2, name: '董卓', rulerId: 2, color: '#ff0000', isPlayer: false, relations: { 1: 60 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
    ],
    year: 190, month: 1, selectedCityId: 1, activeCommandCategory: null,
    log: [], duelState: null, battleFormation: null,
  });
}

describe('rtk-api — spy rejection detection', () => {
  beforeEach(setupTestState);

  it('returns ok:false when spying on an empty city', () => {
    const result = rtkApi.spy(3, 1);
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    // Officer should NOT have acted
    expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(false);
    // Gold should NOT be deducted
    expect(useGameStore.getState().cities.find(c => c.id === 1)!.gold).toBe(10000);
  });

  it('returns ok:false when spying on own city', () => {
    const result = rtkApi.spy(1, 1);
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(false);
    expect(useGameStore.getState().cities.find(c => c.id === 1)!.gold).toBe(10000);
  });

  it('returns ok:true with success:false when spy fails probabilistically', () => {
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = rtkApi.spy(2, 1);
    expect(result.ok).toBe(true);
    expect((result.data as { success: boolean }).success).toBe(false);
    // Officer SHOULD have acted (action consumed)
    expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(true);
    // Gold SHOULD be deducted
    expect(useGameStore.getState().cities.find(c => c.id === 1)!.gold).toBe(9500);
    mockRandom.mockRestore();
  });

  it('returns ok:false when officer lacks spy skills (no officerId)', () => {
    // Replace officer 1 with one that has no intelligence/espionage skill
    useGameStore.setState({
      officers: useGameStore.getState().officers.map(o =>
        o.id === 1 ? { ...o, skills: ['cavalry'] as RTK4Skill[] } : o
      ),
    });
    const result = rtkApi.spy(2);
    expect(result.ok).toBe(false);
    // Officer should NOT have acted
    expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(false);
  });

  it('correctly detects probabilistic failure without officerId', () => {
    // Officer 1 has espionage skill, but the spy attempt fails by dice roll
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = rtkApi.spy(2); // no officerId — store auto-picks officer 1
    expect(result.ok).toBe(true);
    expect((result.data as { success: boolean }).success).toBe(false);
    // Action SHOULD be consumed even though officerId was not specified
    expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(true);
    mockRandom.mockRestore();
  });
});

describe('rtk-api — searchOfficer rejection detection', () => {
  beforeEach(setupTestState);

  it('returns ok:false when no unaffiliated officers in city', () => {
    // City 1 has no unaffiliated officers in default setup
    const result = rtkApi.searchOfficer(1, 1);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('No unaffiliated officers');
    // Officer should NOT have acted
    expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(false);
  });

  it('returns ok:false when officer already acted', () => {
    // Add unaffiliated officer so the "no unaffiliated" guard doesn't fire first
    useGameStore.setState({
      officers: [
        ...useGameStore.getState().officers,
        {
          id: 10, name: '在野', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
          skills: [] as RTK4Skill[], portraitId: 10, birthYear: 170, deathYear: 230, treasureId: null,
          factionId: null, cityId: 1, acted: false, loyalty: 0, isGovernor: false,
          rank: 'common' as const, relationships: [],
        },
      ],
    });
    // Mark officer 1 as acted
    useGameStore.setState({
      officers: useGameStore.getState().officers.map(o =>
        o.id === 1 ? { ...o, acted: true } : o
      ),
    });
    const result = rtkApi.searchOfficer(1, 1);
    expect(result.ok).toBe(false);
  });

  it('returns ok:true when search succeeds', () => {
    // Add unaffiliated officer
    useGameStore.setState({
      officers: [
        ...useGameStore.getState().officers,
        {
          id: 10, name: '在野', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
          skills: [] as RTK4Skill[], portraitId: 10, birthYear: 170, deathYear: 230, treasureId: null,
          factionId: null, cityId: 1, acted: false, loyalty: 0, isGovernor: false,
          rank: 'common' as const, relationships: [],
        },
      ],
    });
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.01); // force success
    const result = rtkApi.searchOfficer(1, 1);
    expect(result.ok).toBe(true);
    expect((result.data as { type: string }).type).toBe('officer');
    // Officer should have acted
    expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(true);
    mockRandom.mockRestore();
  });

  it('returns ok:true with type=nothing on probability-based failure', () => {
    // Add unaffiliated officer
    useGameStore.setState({
      officers: [
        ...useGameStore.getState().officers,
        {
          id: 10, name: '在野', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
          skills: [] as RTK4Skill[], portraitId: 10, birthYear: 170, deathYear: 230, treasureId: null,
          factionId: null, cityId: 1, acted: false, loyalty: 0, isGovernor: false,
          rank: 'common' as const, relationships: [],
        },
      ],
    });
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99); // force failure
    const result = rtkApi.searchOfficer(1, 1);
    expect(result.ok).toBe(true);
    expect((result.data as { type: string }).type).toBe('nothing');
    expect((result.data as { hint: string }).hint).toContain('probability-based');
    // Officer should have acted (action consumed)
    expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(true);
    mockRandom.mockRestore();
  });
});

describe('rtk-api — setBattleFormation validation', () => {
  beforeEach(setupTestState);

  it('rejects non-existent officer IDs', () => {
    const result = rtkApi.setBattleFormation({
      officerIds: [999],
      unitTypes: ['infantry'],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('rejects officers not belonging to the player', () => {
    const result = rtkApi.setBattleFormation({
      officerIds: [2], // 呂布 belongs to faction 2
      unitTypes: ['infantry'],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not your officer');
  });

  it('rejects officers from different cities', () => {
    // Add a second player officer in a different city
    useGameStore.setState({
      cities: useGameStore.getState().cities.map(c =>
        c.id === 2 ? { ...c, factionId: 1 } : c
      ),
      officers: [
        ...useGameStore.getState().officers,
        {
          id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
          skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
          factionId: 1, cityId: 2, acted: false, loyalty: 100, isGovernor: false,
          rank: 'common' as const, relationships: [],
        },
      ],
    });
    const result = rtkApi.setBattleFormation({
      officerIds: [1, 3], // officer 1 in city 1, officer 3 in city 2
      unitTypes: ['infantry', 'infantry'],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('same city');
  });

  it('rejects mismatched officerIds and unitTypes lengths', () => {
    const result = rtkApi.setBattleFormation({
      officerIds: [1],
      unitTypes: ['infantry', 'cavalry'], // 2 types for 1 officer
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('same length');
  });

  it('accepts valid formation', () => {
    const result = rtkApi.setBattleFormation({
      officerIds: [1],
      unitTypes: ['infantry'],
      troops: [5000],
      food: 10000,
    });
    expect(result.ok).toBe(true);
    expect(useGameStore.getState().battleFormation).not.toBeNull();
  });

  it('accepts null to clear formation', () => {
    // First set a formation
    rtkApi.setBattleFormation({ officerIds: [1], unitTypes: ['infantry'] });
    expect(useGameStore.getState().battleFormation).not.toBeNull();
    // Clear it
    const result = rtkApi.setBattleFormation(null);
    expect(result.ok).toBe(true);
    expect(useGameStore.getState().battleFormation).toBeNull();
  });
});
