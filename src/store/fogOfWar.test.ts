import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { Officer, City, Faction } from '../types';

// ── Test Helpers ──

const createCity = (overrides: Partial<City> = {}): City => ({
  id: 1,
  name: '鄴',
  x: 50, y: 50,
  factionId: null,
  population: 100000,
  gold: 5000,
  food: 10000,
  commerce: 500,
  agriculture: 500,
  defense: 50,
  troops: 20000,
  adjacentCityIds: [],
  floodControl: 50,
  technology: 30,
  peopleLoyalty: 70,
  morale: 60,
  training: 40,
  crossbows: 10,
  warHorses: 5,
  batteringRams: 3,
  catapults: 2,
  taxRate: 'medium',
  ...overrides,
});

const createOfficer = (overrides: Partial<Officer> = {}): Officer => ({
  id: 1,
  name: '曹操',
  leadership: 96,
  war: 72,
  intelligence: 91,
  politics: 94,
  charisma: 96,
  skills: ['intelligence', 'diplomacy'],
  factionId: null,
  cityId: 1,
  stamina: 100,
  loyalty: 100,
  isGovernor: false,
  rank: 'common',
  relationships: [],
  portraitId: 1,
  birthYear: 155,
  deathYear: 220,
  treasureId: null,
  ...overrides,
});

const createFaction = (overrides: Partial<Faction> = {}): Faction => ({
  id: 1,
  name: '曹操',
  rulerId: 1,
  advisorId: null,
  color: '#3b82f6',
  isPlayer: true,
  relations: {},
  allies: [],
  ceasefires: [],
  hostageOfficerIds: [],
  powOfficerIds: [],
  ...overrides,
});

// ── Fog of War: isCityRevealed ──

describe('Fog of War — isCityRevealed', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      playerFaction: createFaction({ id: 1 }),
      factions: [
        createFaction({ id: 1, isPlayer: true }),
        createFaction({ id: 2, name: '劉備', rulerId: 10, isPlayer: false }),
      ],
      cities: [
        createCity({ id: 1, factionId: 1, adjacentCityIds: [2, 3] }),
        createCity({ id: 2, factionId: 2, name: '平原', adjacentCityIds: [1] }),
        createCity({ id: 3, factionId: null, name: '許昌', adjacentCityIds: [1] }),
        createCity({ id: 4, factionId: 2, name: '洛陽', adjacentCityIds: [] }),
      ],
      officers: [],
      year: 190,
      month: 1,
      revealedCities: {},
    });
  });

  it('returns true for own cities', () => {
    expect(useGameStore.getState().isCityRevealed(1)).toBe(true);
  });

  it('returns false for enemy cities', () => {
    expect(useGameStore.getState().isCityRevealed(2)).toBe(false);
  });

  it('returns false for empty cities', () => {
    expect(useGameStore.getState().isCityRevealed(3)).toBe(false);
  });

  it('returns false for adjacent enemy cities (regression)', () => {
    // City 2 is adjacent to our city 1, but should NOT be revealed
    expect(useGameStore.getState().isCityRevealed(2)).toBe(false);
  });

  it('returns false for adjacent empty cities (regression)', () => {
    // City 3 is adjacent to our city 1, but should NOT be revealed
    expect(useGameStore.getState().isCityRevealed(3)).toBe(false);
  });

  it('returns true for spied cities within TTL', () => {
    useGameStore.setState({
      revealedCities: { 2: { untilYear: 190, untilMonth: 6 } },
    });
    expect(useGameStore.getState().isCityRevealed(2)).toBe(true);
  });

  it('returns false for spied cities after TTL expires', () => {
    useGameStore.setState({
      revealedCities: { 2: { untilYear: 189, untilMonth: 12 } },
    });
    expect(useGameStore.getState().isCityRevealed(2)).toBe(false);
  });

  it('returns true in spectator mode (no player faction)', () => {
    useGameStore.setState({ playerFaction: null });
    expect(useGameStore.getState().isCityRevealed(2)).toBe(true);
    expect(useGameStore.getState().isCityRevealed(4)).toBe(true);
  });

  it('returns false for non-existent city', () => {
    expect(useGameStore.getState().isCityRevealed(999)).toBe(false);
  });
});

// ── Fog of War: getCityView ──

describe('Fog of War — getCityView', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      playerFaction: createFaction({ id: 1 }),
      factions: [
        createFaction({ id: 1, isPlayer: true }),
        createFaction({ id: 2, name: '劉備', rulerId: 10, isPlayer: false }),
      ],
      cities: [
        createCity({ id: 1, factionId: 1, adjacentCityIds: [2], troops: 30000, gold: 8000 }),
        createCity({ id: 2, factionId: 2, name: '平原', adjacentCityIds: [1], troops: 15000, gold: 3000 }),
      ],
      officers: [
        createOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true, stamina: 80, loyalty: 100 }),
        createOfficer({ id: 2, name: '夏侯惇', factionId: 1, cityId: 1, stamina: 60, loyalty: 85 }),
        createOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 2, isGovernor: true, stamina: 90, loyalty: 100 }),
        createOfficer({ id: 11, name: '張飛', factionId: 2, cityId: 2, stamina: 75, loyalty: 95 }),
        createOfficer({ id: 20, name: '司馬徽', factionId: null, cityId: 1 }), // unaffiliated in own city
        createOfficer({ id: 21, name: '管寧', factionId: null, cityId: 2 }), // unaffiliated in enemy city
        createOfficer({ id: 30, name: '呂布', factionId: -1, cityId: 1 }), // POW in own city
      ],
      year: 190,
      month: 1,
      revealedCities: {},
    });
  });

  it('returns full data for own city', () => {
    const view = useGameStore.getState().getCityView(1);
    expect(view).not.toBeNull();
    expect(view!.isOwn).toBe(true);
    expect(view!.isRevealed).toBe(true);
    expect(view!.troops).toBe(30000);
    expect(view!.gold).toBe(8000);
    expect(view!.commerce).toBe(500);
    // Weapons visible for own city
    expect(view!.crossbows).toBe(10);
    expect(view!.warHorses).toBe(5);
    // Officers with full data
    expect(view!.officers.length).toBe(2);
    expect(view!.officers[0].stamina).toBe(80);
    expect(view!.officers[0].loyalty).toBe(100);
    // Unaffiliated visible
    expect(view!.unaffiliated.length).toBe(1);
    expect(view!.unaffiliated[0].name).toBe('司馬徽');
    // POWs visible
    expect(view!.pows.length).toBe(1);
    expect(view!.pows[0].name).toBe('呂布');
  });

  it('returns null fields for unrevealed enemy city', () => {
    const view = useGameStore.getState().getCityView(2);
    expect(view).not.toBeNull();
    expect(view!.isOwn).toBe(false);
    expect(view!.isRevealed).toBe(false);
    // City name + faction always visible
    expect(view!.name).toBe('平原');
    expect(view!.factionName).toBe('劉備');
    // All stats hidden
    expect(view!.troops).toBeNull();
    expect(view!.gold).toBeNull();
    expect(view!.commerce).toBeNull();
    expect(view!.agriculture).toBeNull();
    expect(view!.defense).toBeNull();
    // Weapons hidden
    expect(view!.crossbows).toBeNull();
    // Officers hidden
    expect(view!.officers.length).toBe(0);
    // Unaffiliated hidden
    expect(view!.unaffiliated.length).toBe(0);
    // POWs hidden (none here, but still empty)
    expect(view!.pows.length).toBe(0);
  });

  it('reveals stats but NOT weapons for spied enemy city', () => {
    useGameStore.setState({
      revealedCities: { 2: { untilYear: 190, untilMonth: 6 } },
    });
    const view = useGameStore.getState().getCityView(2);
    expect(view!.isRevealed).toBe(true);
    expect(view!.isOwn).toBe(false);
    // Stats visible
    expect(view!.troops).toBe(15000);
    expect(view!.gold).toBe(3000);
    expect(view!.commerce).toBe(500);
    // Weapons still hidden (not own city)
    expect(view!.crossbows).toBeNull();
    expect(view!.warHorses).toBeNull();
    // Officers visible but without stamina/loyalty
    expect(view!.officers.length).toBe(2);
    expect(view!.officers[0].name).toBe('劉備');
    expect(view!.officers[0].stamina).toBeNull();
    expect(view!.officers[0].loyalty).toBeNull();
    // Unaffiliated hidden (internal info)
    expect(view!.unaffiliated.length).toBe(0);
  });

  it('returns null for non-existent city', () => {
    expect(useGameStore.getState().getCityView(999)).toBeNull();
  });
});

// ── Fog of War: getOfficerView ──

describe('Fog of War — getOfficerView', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      playerFaction: createFaction({ id: 1 }),
      factions: [
        createFaction({ id: 1, isPlayer: true }),
        createFaction({ id: 2, name: '劉備', rulerId: 10, isPlayer: false }),
      ],
      cities: [
        createCity({ id: 1, factionId: 1 }),
        createCity({ id: 2, factionId: 2, name: '平原' }),
      ],
      officers: [
        createOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, stamina: 80, loyalty: 100, rank: 'governor', isGovernor: true }),
        createOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 2, stamina: 90, loyalty: 100, rank: 'governor', isGovernor: true }),
      ],
      year: 190,
      month: 1,
      revealedCities: {},
    });
  });

  it('shows full data for own officer', () => {
    const view = useGameStore.getState().getOfficerView(1);
    expect(view).not.toBeNull();
    // Base stats always visible
    expect(view!.leadership).toBe(96);
    expect(view!.war).toBe(72);
    expect(view!.skills).toEqual(['intelligence', 'diplomacy']);
    expect(view!.age).toBe(35);
    // Location visible
    expect(view!.cityName).toBe('鄴');
    expect(view!.rank).toBe('governor');
    expect(view!.isGovernor).toBe(true);
    // Internal stats visible
    expect(view!.stamina).toBe(80);
    expect(view!.loyalty).toBe(100);
  });

  it('hides location/internal stats for enemy officer in unrevealed city', () => {
    const view = useGameStore.getState().getOfficerView(10);
    expect(view).not.toBeNull();
    // Base stats always visible (encyclopedia)
    expect(view!.name).toBe('劉備');
    expect(view!.leadership).toBe(96);
    expect(view!.skills).toEqual(['intelligence', 'diplomacy']);
    expect(view!.age).toBe(35);
    // Location hidden
    expect(view!.cityName).toBeNull();
    expect(view!.cityId).toBeNull();
    expect(view!.rank).toBeNull();
    expect(view!.isGovernor).toBeNull();
    expect(view!.affiliation).toBeNull();
    // Internal stats hidden
    expect(view!.stamina).toBeNull();
    expect(view!.loyalty).toBeNull();
  });

  it('shows location but NOT internal stats for enemy officer in revealed city', () => {
    useGameStore.setState({
      revealedCities: { 2: { untilYear: 190, untilMonth: 6 } },
    });
    const view = useGameStore.getState().getOfficerView(10);
    expect(view).not.toBeNull();
    // Location now visible
    expect(view!.cityName).toBe('平原');
    expect(view!.rank).toBe('governor');
    expect(view!.isGovernor).toBe(true);
    expect(view!.affiliation).toBe('劉備');
    // Internal stats still hidden
    expect(view!.stamina).toBeNull();
    expect(view!.loyalty).toBeNull();
  });

  it('returns null for non-existent officer', () => {
    expect(useGameStore.getState().getOfficerView(999)).toBeNull();
  });
});

// ── Fog of War: getNeighborSummary ──

describe('Fog of War — getNeighborSummary', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      playerFaction: createFaction({ id: 1 }),
      factions: [
        createFaction({ id: 1, isPlayer: true }),
        createFaction({ id: 2, name: '劉備', rulerId: 10, isPlayer: false }),
      ],
      cities: [
        createCity({ id: 1, factionId: 1, adjacentCityIds: [2, 3] }),
        createCity({ id: 2, factionId: 2, name: '平原', adjacentCityIds: [1], troops: 15000 }),
        createCity({ id: 3, factionId: null, name: '許昌', adjacentCityIds: [1], troops: 0 }),
      ],
      officers: [
        createOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 2 }),
        createOfficer({ id: 11, name: '張飛', factionId: 2, cityId: 2 }),
      ],
      year: 190,
      month: 1,
      revealedCities: {},
    });
  });

  it('hides troops/officers for unrevealed neighbor', () => {
    const neighbors = useGameStore.getState().getNeighborSummary(1);
    expect(neighbors.length).toBe(2);
    const enemy = neighbors.find(n => n.cityId === 2);
    expect(enemy).toBeDefined();
    expect(enemy!.cityName).toBe('平原');
    expect(enemy!.factionName).toBe('劉備');
    // Troops/officers hidden
    expect(enemy!.troops).toBeNull();
    expect(enemy!.officerCount).toBeNull();
  });

  it('shows troops/officers for revealed neighbor', () => {
    useGameStore.setState({
      revealedCities: { 2: { untilYear: 190, untilMonth: 6 } },
    });
    const neighbors = useGameStore.getState().getNeighborSummary(1);
    const enemy = neighbors.find(n => n.cityId === 2);
    expect(enemy!.troops).toBe(15000);
    expect(enemy!.officerCount).toBe(2);
  });

  it('hides troops for unrevealed empty neighbor', () => {
    const neighbors = useGameStore.getState().getNeighborSummary(1);
    const empty = neighbors.find(n => n.cityId === 3);
    expect(empty!.cityName).toBe('許昌');
    expect(empty!.factionName).toBeNull();
    expect(empty!.troops).toBeNull();
  });
});

// ── Fog of War: getFactionSummaries ──

describe('Fog of War — getFactionSummaries', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      playerFaction: createFaction({ id: 1 }),
      factions: [
        createFaction({ id: 1, isPlayer: true, relations: { 2: 60 }, allies: [] }),
        createFaction({ id: 2, name: '劉備', rulerId: 10, isPlayer: false, relations: { 1: 75 }, allies: [1] }),
      ],
      cities: [
        createCity({ id: 1, factionId: 1, name: '鄴', troops: 30000 }),
        createCity({ id: 2, factionId: 2, name: '平原', troops: 15000 }),
        createCity({ id: 3, factionId: 2, name: '北海', troops: 10000 }),
      ],
      officers: [
        createOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1 }),
        createOfficer({ id: 10, name: '劉備', factionId: 2, cityId: 2 }),
        createOfficer({ id: 11, name: '張飛', factionId: 2, cityId: 2 }),
        createOfficer({ id: 12, name: '關羽', factionId: 2, cityId: 3 }),
      ],
      year: 190,
      month: 1,
      revealedCities: {},
    });
  });

  it('shows full data for own faction', () => {
    const summaries = useGameStore.getState().getFactionSummaries();
    const own = summaries.find(f => f.id === 1);
    expect(own!.name).toBe('曹操');
    expect(own!.cityNames).toEqual(['鄴']);
    expect(own!.totalTroops).toBe(30000);
    expect(own!.officerCount).toBe(1);
    // No hostility toward self
    expect(own!.hostility).toBeNull();
  });

  it('hides troop totals for enemy faction with no revealed cities', () => {
    const summaries = useGameStore.getState().getFactionSummaries();
    const enemy = summaries.find(f => f.id === 2);
    expect(enemy!.name).toBe('劉備');
    // City names always visible (map is public)
    expect(enemy!.cityNames).toEqual(['平原', '北海']);
    // Troops/officers hidden (no revealed cities)
    expect(enemy!.totalTroops).toBeNull();
    expect(enemy!.officerCount).toBeNull();
    // Hostility/alliance always visible
    expect(enemy!.hostility).toBe(75);
    expect(enemy!.isAlly).toBe(true);
  });

  it('aggregates only from revealed cities', () => {
    // Reveal only 平原 (id=2), not 北海 (id=3)
    useGameStore.setState({
      revealedCities: { 2: { untilYear: 190, untilMonth: 6 } },
    });
    const summaries = useGameStore.getState().getFactionSummaries();
    const enemy = summaries.find(f => f.id === 2);
    // Only counts from 平原 (15000 troops, 2 officers)
    expect(enemy!.totalTroops).toBe(15000);
    expect(enemy!.officerCount).toBe(2);
    // NOT 25000 or 3 officers
  });
});
