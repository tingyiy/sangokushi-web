import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { Officer, City, Faction, RTK4Skill } from '../types';

/**
 * Tests that AI-specific store actions actually mutate state.
 * These verify the fix for the bug where AI called player-only actions
 * that silently failed due to playerFaction guards.
 */

const createTestCity = (overrides: Partial<City> = {}): City => ({
  id: 1,
  name: '測試城',
  x: 50,
  y: 50,
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
  crossbows: 0,
  warHorses: 0,
  batteringRams: 0,
  catapults: 0,
  taxRate: 'medium',
  ...overrides,
});

const createTestOfficer = (overrides: Partial<Officer> = {}): Officer => ({
  id: 1,
  name: '測試將領',
  leadership: 80,
  war: 85,
  intelligence: 70,
  politics: 60,
  charisma: 75,
  skills: [] as RTK4Skill[],
  factionId: null,
  cityId: 1,
  acted: false,
  loyalty: 80,
  isGovernor: false,
  rank: 'common',
  relationships: [],
  portraitId: 1,
  birthYear: 160,
  deathYear: 220,
  treasureId: null,
  ...overrides,
});

const createTestFaction = (overrides: Partial<Faction> = {}): Faction => ({
  id: 1,
  name: '測試勢力',
  rulerId: 1,
  advisorId: null,
  color: '#ff0000',
  isPlayer: false,
  relations: {},
  allies: [],
  ceasefires: [],
  hostageOfficerIds: [],
  powOfficerIds: [],
  ...overrides,
});

describe('AI Actions Mutate State', () => {
  // Setup: player faction = 1, AI faction = 2
  const playerFaction = createTestFaction({ id: 1, name: '玩家', rulerId: 10, isPlayer: true });
  const aiFaction = createTestFaction({ id: 2, name: 'AI', rulerId: 20, isPlayer: false });

  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      playerFaction,
      factions: [playerFaction, aiFaction],
      cities: [
        createTestCity({ id: 1, factionId: 1 }),
        createTestCity({ id: 2, factionId: 2, name: 'AI城', gold: 10000, food: 10000, troops: 15000 }),
        createTestCity({ id: 3, factionId: 2, name: 'AI城2', gold: 5000, food: 5000, troops: 5000 }),
      ],
      officers: [
        createTestOfficer({ id: 10, factionId: 1, cityId: 1, isGovernor: true }),
        createTestOfficer({ id: 20, factionId: 2, cityId: 2, isGovernor: true, name: 'AI將', politics: 80, intelligence: 80, leadership: 80 }),
        createTestOfficer({ id: 21, factionId: 2, cityId: 3, isGovernor: true, name: 'AI將2' }),
      ],
      year: 190,
      month: 1,
      log: [],
      revealedCities: {},
      pendingEvents: [],
    });
  });

  describe('AI Domestic Actions', () => {
    it('aiDevelopCommerce increases commerce and costs gold', () => {
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiDevelopCommerce(2);
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.commerce).toBeGreaterThan(before.commerce);
      expect(after.gold).toBe(before.gold - 500);
    });

    it('aiDevelopAgriculture increases agriculture and costs gold', () => {
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiDevelopAgriculture(2);
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.agriculture).toBeGreaterThan(before.agriculture);
      expect(after.gold).toBe(before.gold - 500);
    });

    it('aiReinforceDefense increases defense and costs gold', () => {
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiReinforceDefense(2);
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.defense).toBeGreaterThan(before.defense);
      expect(after.gold).toBe(before.gold - 300);
    });

    it('aiDevelopFloodControl increases flood control and costs gold', () => {
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiDevelopFloodControl(2);
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.floodControl).toBeGreaterThan(before.floodControl);
      expect(after.gold).toBe(before.gold - 500);
    });

    it('aiDevelopTechnology increases technology and costs gold', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c =>
          c.id === 2 ? { ...c, gold: 5000 } : c
        ),
      });
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiDevelopTechnology(2);
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.technology).toBeGreaterThan(before.technology);
      expect(after.gold).toBe(before.gold - 800);
    });

    it('aiTrainTroops increases training/morale and costs food', () => {
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiTrainTroops(2);
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.training).toBeGreaterThan(before.training);
      expect(after.morale).toBeGreaterThan(before.morale);
      expect(after.food).toBe(before.food - 500);
    });

    it('aiDisasterRelief increases people loyalty and costs gold+food', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c =>
          c.id === 2 ? { ...c, peopleLoyalty: 30 } : c
        ),
      });
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiDisasterRelief(2);
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.peopleLoyalty).toBeGreaterThan(before.peopleLoyalty);
      expect(after.gold).toBe(before.gold - 500);
      expect(after.food).toBe(before.food - 1000);
    });

    it('aiManufacture increases weapon count with correct skill', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o =>
          o.id === 20 ? { ...o, skills: ['manufacture'] as RTK4Skill[] } : o
        ),
        cities: useGameStore.getState().cities.map(c =>
          c.id === 2 ? { ...c, technology: 50, gold: 5000 } : c
        ),
      });
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiManufacture(2, 'crossbows');
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.crossbows).toBeGreaterThan(before.crossbows);
      expect(after.gold).toBe(before.gold - 1000);
    });
  });

  describe('AI Military/Personnel Actions', () => {
    it('aiDraftTroops increases troops and costs gold/food/population', () => {
      // Set troops below the cap (pop * 0.12 = 12000) so there's room to draft
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c =>
          c.id === 2 ? { ...c, troops: 2000 } : c
        ),
      });
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiDraftTroops(2, 2000);
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.troops).toBeGreaterThan(before.troops);
      expect(after.gold).toBeLessThan(before.gold);
      expect(after.food).toBeLessThan(before.food);
      expect(after.population).toBeLessThan(before.population);
    });

    it('aiTransport moves troops between cities', () => {
      const beforeFrom = useGameStore.getState().cities.find(c => c.id === 2)!;
      const beforeTo = useGameStore.getState().cities.find(c => c.id === 3)!;
      useGameStore.getState().aiTransport(2, 3, { troops: 3000 });
      const afterFrom = useGameStore.getState().cities.find(c => c.id === 2)!;
      const afterTo = useGameStore.getState().cities.find(c => c.id === 3)!;
      expect(afterFrom.troops).toBe(beforeFrom.troops - 3000);
      expect(afterTo.troops).toBe(beforeTo.troops + 3000);
    });

    it('aiTransport rejects if cities belong to different factions', () => {
      const beforeTo = useGameStore.getState().cities.find(c => c.id === 1)!; // player city
      useGameStore.getState().aiTransport(2, 1, { troops: 1000 });
      const afterTo = useGameStore.getState().cities.find(c => c.id === 1)!;
      expect(afterTo.troops).toBe(beforeTo.troops); // unchanged
    });

    it('aiRewardOfficer increases loyalty and costs gold', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o =>
          o.id === 20 ? { ...o, loyalty: 50 } : o
        ),
      });
      const beforeOfficer = useGameStore.getState().officers.find(o => o.id === 20)!;
      const beforeCity = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiRewardOfficer(20, 2, 500);
      const afterOfficer = useGameStore.getState().officers.find(o => o.id === 20)!;
      const afterCity = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(afterOfficer.loyalty).toBeGreaterThan(beforeOfficer.loyalty);
      expect(afterCity.gold).toBe(beforeCity.gold - 500);
    });

    it('aiAppointGovernor sets isGovernor flag', () => {
      // Move ruler (id=20) out of city 2 so R-001 doesn't block
      // Add a non-governor officer in AI city 2
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers.map(o =>
            o.id === 20 ? { ...o, cityId: 3, isGovernor: true } : o
          ),
          createTestOfficer({ id: 22, factionId: 2, cityId: 2, isGovernor: false, name: '新太守' }),
        ],
      });

      useGameStore.getState().aiAppointGovernor(2, 22);
      const appointed = useGameStore.getState().officers.find(o => o.id === 22)!;
      expect(appointed.isGovernor).toBe(true);
    });
  });

  describe('AI actions mark officer as acted', () => {
    it('aiDevelopCommerce marks executor as acted', () => {
      useGameStore.getState().aiDevelopCommerce(2);
      const officer = useGameStore.getState().officers.find(o => o.id === 20)!;
      expect(officer.acted).toBe(true);
    });

    it('aiDraftTroops marks executor as acted', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c =>
          c.id === 2 ? { ...c, troops: 2000 } : c
        ),
      });
      useGameStore.getState().aiDraftTroops(2, 1000);
      const officer = useGameStore.getState().officers.find(o => o.id === 20)!;
      expect(officer.acted).toBe(true);
    });

    it('AI action rejected when officer already acted', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o =>
          o.id === 20 ? { ...o, acted: true } : o
        ),
      });
      const beforeCity = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().aiDevelopCommerce(2);
      const afterCity = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(afterCity.commerce).toBe(beforeCity.commerce); // unchanged
      expect(afterCity.gold).toBe(beforeCity.gold); // unchanged
    });
  });

  describe('Contrast: old player-only actions fail for AI', () => {
    it('developCommerce fails silently for AI faction city', () => {
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().developCommerce(2); // player-only action
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      // Should NOT have changed — playerFaction guard blocks it
      expect(after.commerce).toBe(before.commerce);
      expect(after.gold).toBe(before.gold);
    });

    it('draftTroops fails silently for AI faction city', () => {
      const before = useGameStore.getState().cities.find(c => c.id === 2)!;
      useGameStore.getState().draftTroops(2, 1000); // player-only action
      const after = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(after.troops).toBe(before.troops); // unchanged
    });
  });

  describe('AI log visibility (fog of war)', () => {
    it('aiDevelopCommerce does NOT add to game log', () => {
      const logBefore = useGameStore.getState().log.length;
      useGameStore.getState().aiDevelopCommerce(2);
      const logAfter = useGameStore.getState().log.length;
      expect(logAfter).toBe(logBefore);
    });

    it('aiDraftTroops does NOT add to game log', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c =>
          c.id === 2 ? { ...c, troops: 2000 } : c
        ),
      });
      const logBefore = useGameStore.getState().log.length;
      useGameStore.getState().aiDraftTroops(2, 1000);
      const logAfter = useGameStore.getState().log.length;
      expect(logAfter).toBe(logBefore);
    });

    it('aiRewardOfficer does NOT add to game log', () => {
      const logBefore = useGameStore.getState().log.length;
      useGameStore.getState().aiRewardOfficer(20, 2, 500);
      const logAfter = useGameStore.getState().log.length;
      expect(logAfter).toBe(logBefore);
    });

    it('applyAIDecisions does NOT log d.description to game log', () => {
      const logBefore = useGameStore.getState().log.length;
      useGameStore.getState().applyAIDecisions([
        { action: 'aiDevelopCommerce', params: [2], description: 'AI城：開發商業。' },
        { action: 'aiTrainTroops', params: [2], description: 'AI城：訓練部隊。' },
      ]);
      const logAfter = useGameStore.getState().log.length;
      // d.description should NOT have been logged
      expect(logAfter).toBe(logBefore);
      const log = useGameStore.getState().log;
      expect(log.some(l => l.includes('開發商業'))).toBe(false);
      expect(log.some(l => l.includes('訓練部隊'))).toBe(false);
    });

    it('player actions still appear in game log', () => {
      // Player develops commerce in their own city
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c =>
          c.id === 1 ? { ...c, gold: 5000 } : c
        ),
        officers: useGameStore.getState().officers.map(o =>
          o.id === 10 ? { ...o, acted: false } : o
        ),
      });
      const logBefore = useGameStore.getState().log.length;
      useGameStore.getState().developCommerce(1);
      const logAfter = useGameStore.getState().log.length;
      expect(logAfter).toBeGreaterThan(logBefore);
    });
  });
});
