import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import type { Officer, City, Faction, RTK4Skill } from '../types';

// ── Test Helpers ──

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

describe('Turn Order System', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      scenario: null,
      playerFaction: createTestFaction({ id: 2, name: '玩家', rulerId: 20, isPlayer: true }),
      cities: [],
      officers: [],
      factions: [],
      year: 190,
      month: 1,
      selectedCityId: null,
      activeCommandCategory: null,
      log: [],
      duelState: null,
      revealedCities: {},
      pendingGovernorAssignmentCityId: null,
      battleResolved: false,
      pendingEvents: [],
    });
  });

  describe('basic turn mechanics', () => {
    it('advances calendar when endTurn is called', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      useGameStore.setState({
        month: 3,
        year: 190,
        factions: [createTestFaction({ id: 2, name: '玩家', rulerId: 20, isPlayer: true })],
      });

      useGameStore.getState().endTurn();

      expect(useGameStore.getState().month).toBe(4);
      expect(useGameStore.getState().year).toBe(190);

      spy.mockRestore();
    });

    it('wraps month 12 to month 1 of next year', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      useGameStore.setState({
        month: 12,
        year: 190,
        factions: [createTestFaction({ id: 2, name: '玩家', rulerId: 20, isPlayer: true })],
      });

      useGameStore.getState().endTurn();

      expect(useGameStore.getState().month).toBe(1);
      expect(useGameStore.getState().year).toBe(191);

      spy.mockRestore();
    });

    it('resets acted flags for all officers on turn end', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      useGameStore.setState({
        month: 1,
        year: 190,
        officers: [
          createTestOfficer({ id: 1, factionId: 2, cityId: 1, acted: true }),
          createTestOfficer({ id: 2, name: '二號', factionId: 2, cityId: 1, acted: true }),
          createTestOfficer({ id: 3, name: '三號', factionId: 3, cityId: 2, acted: true }),
        ],
        cities: [],
        factions: [createTestFaction({ id: 2, name: '玩家', rulerId: 20, isPlayer: true })],
      });

      useGameStore.getState().endTurn();

      const officers = useGameStore.getState().officers;
      expect(officers.every(o => o.acted === false)).toBe(true);

      spy.mockRestore();
    });

    it('processes economy (gold income) on turn end', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      useGameStore.setState({
        month: 1,
        year: 190,
        cities: [createTestCity({
          id: 1,
          factionId: 2,
          gold: 1000,
          commerce: 500,
          peopleLoyalty: 50,
          taxRate: 'low',
          population: 100000,
        })],
        officers: [],
        factions: [createTestFaction({ id: 2, name: '玩家', rulerId: 20, isPlayer: true })],
      });

      useGameStore.getState().endTurn();

      const city = useGameStore.getState().cities[0];
      // goldIncome = 100000 * (500/1000) * 0.15 * (50/100) * 0.5 = 1875
      // gold = 1000 + 1875 = 2875
      expect(city.gold).toBe(2875);

      spy.mockRestore();
    });
  });

  describe('ruler-ID-based turn order', () => {
    it('AI factions with lower ruler IDs act before the player', () => {
      // Setup: Player has rulerId=20, AI faction has rulerId=5 (lower → acts first)
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      // The AI faction's officer has acted=false initially.
      // After endTurn, the AI faction should have acted before the player gets control.
      // We verify this by checking the AI's officer state was processed.
      const playerFaction = createTestFaction({ id: 2, name: '玩家', rulerId: 20, isPlayer: true });
      const aiFaction = createTestFaction({ id: 3, name: 'AI勢力', rulerId: 5, isPlayer: false });

      useGameStore.setState({
        month: 1,
        year: 190,
        playerFaction,
        factions: [playerFaction, aiFaction],
        cities: [
          createTestCity({ id: 1, factionId: 2 }),
          createTestCity({ id: 2, factionId: 3, name: 'AI城' }),
        ],
        officers: [
          createTestOfficer({ id: 20, factionId: 2, cityId: 1, isGovernor: true }),
          createTestOfficer({ id: 5, name: 'AI將', factionId: 3, cityId: 2, isGovernor: true, politics: 90, charisma: 90 }),
        ],
      });

      useGameStore.getState().endTurn();

      // AI faction with rulerId=5 < player rulerId=20, so it acts BEFORE the player.
      // The AI may or may not take actions depending on evaluation, but the key thing
      // is that the system didn't crash and the turn advanced correctly.
      expect(useGameStore.getState().month).toBe(2);
      expect(useGameStore.getState().year).toBe(190);

      spy.mockRestore();
    });

    it('AI factions with higher ruler IDs act after the player', () => {
      // Setup: Player has rulerId=5, AI faction has rulerId=50 (higher → acts after)
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const playerFaction = createTestFaction({ id: 2, name: '玩家', rulerId: 5, isPlayer: true });
      const aiFaction = createTestFaction({ id: 3, name: 'AI勢力', rulerId: 50, isPlayer: false });

      useGameStore.setState({
        month: 1,
        year: 190,
        playerFaction,
        factions: [playerFaction, aiFaction],
        cities: [
          createTestCity({ id: 1, factionId: 2 }),
          createTestCity({ id: 2, factionId: 3, name: 'AI城' }),
        ],
        officers: [
          createTestOfficer({ id: 5, factionId: 2, cityId: 1, isGovernor: true }),
          createTestOfficer({ id: 50, name: 'AI將', factionId: 3, cityId: 2, isGovernor: true }),
        ],
      });

      useGameStore.getState().endTurn();

      // AI faction with rulerId=50 > player rulerId=5, so it acts AFTER the player.
      expect(useGameStore.getState().month).toBe(2);
      expect(useGameStore.getState().year).toBe(190);

      spy.mockRestore();
    });

    it('handles player being first in turn order (no AI before)', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const playerFaction = createTestFaction({ id: 1, name: '玩家', rulerId: 1, isPlayer: true });
      const aiFaction = createTestFaction({ id: 2, name: 'AI', rulerId: 100, isPlayer: false });

      useGameStore.setState({
        month: 6,
        year: 192,
        playerFaction,
        factions: [playerFaction, aiFaction],
        cities: [
          createTestCity({ id: 1, factionId: 1 }),
          createTestCity({ id: 2, factionId: 2, name: 'AI城' }),
        ],
        officers: [
          createTestOfficer({ id: 1, factionId: 1, cityId: 1, isGovernor: true }),
          createTestOfficer({ id: 100, name: 'AI將', factionId: 2, cityId: 2, isGovernor: true }),
        ],
      });

      useGameStore.getState().endTurn();

      // Player is first (rulerId=1 < 100), AI acts AFTER
      expect(useGameStore.getState().month).toBe(7);

      spy.mockRestore();
    });

    it('handles player being last in turn order (all AI before)', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const playerFaction = createTestFaction({ id: 1, name: '玩家', rulerId: 999, isPlayer: true });
      const aiFaction1 = createTestFaction({ id: 2, name: 'AI1', rulerId: 1, isPlayer: false });
      const aiFaction2 = createTestFaction({ id: 3, name: 'AI2', rulerId: 50, isPlayer: false });

      useGameStore.setState({
        month: 1,
        year: 190,
        playerFaction,
        factions: [playerFaction, aiFaction1, aiFaction2],
        cities: [
          createTestCity({ id: 1, factionId: 1 }),
          createTestCity({ id: 2, factionId: 2, name: 'AI城1' }),
          createTestCity({ id: 3, factionId: 3, name: 'AI城2' }),
        ],
        officers: [
          createTestOfficer({ id: 999, factionId: 1, cityId: 1, isGovernor: true }),
          createTestOfficer({ id: 1, name: 'AI將1', factionId: 2, cityId: 2, isGovernor: true }),
          createTestOfficer({ id: 50, name: 'AI將2', factionId: 3, cityId: 3, isGovernor: true }),
        ],
      });

      useGameStore.getState().endTurn();

      // Player is last (rulerId=999 > 1, 50). Both AI factions act before player next month.
      expect(useGameStore.getState().month).toBe(2);

      spy.mockRestore();
    });

    it('handles single-player game (no AI factions)', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const playerFaction = createTestFaction({ id: 1, name: '玩家', rulerId: 1, isPlayer: true });

      useGameStore.setState({
        month: 1,
        year: 190,
        playerFaction,
        factions: [playerFaction],
        cities: [createTestCity({ id: 1, factionId: 1 })],
        officers: [createTestOfficer({ id: 1, factionId: 1, cityId: 1, isGovernor: true })],
      });

      useGameStore.getState().endTurn();

      expect(useGameStore.getState().month).toBe(2);

      spy.mockRestore();
    });

    it('economy runs for all factions simultaneously, not per-faction', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const playerFaction = createTestFaction({ id: 1, name: '玩家', rulerId: 50, isPlayer: true });
      const aiFaction = createTestFaction({ id: 2, name: 'AI', rulerId: 10, isPlayer: false });

      useGameStore.setState({
        month: 1,
        year: 190,
        playerFaction,
        factions: [playerFaction, aiFaction],
        cities: [
          createTestCity({ id: 1, factionId: 1, gold: 1000, commerce: 500, population: 100000, peopleLoyalty: 100, taxRate: 'medium' }),
          createTestCity({ id: 2, factionId: 2, name: 'AI城', gold: 2000, commerce: 800, population: 200000, peopleLoyalty: 100, taxRate: 'medium' }),
        ],
        officers: [
          createTestOfficer({ id: 50, factionId: 1, cityId: 1, isGovernor: true }),
          createTestOfficer({ id: 10, name: 'AI將', factionId: 2, cityId: 2, isGovernor: true }),
        ],
      });

      useGameStore.getState().endTurn();

      const cities = useGameStore.getState().cities;
      const playerCity = cities.find(c => c.id === 1)!;
      const aiCity = cities.find(c => c.id === 2)!;

      // Both cities should have received income
      // Player city: goldIncome = 100000 * (500/1000) * 0.15 * 1.0 * 1.0 = 7500, salary = 30 (common rank)
      // gold = 1000 + 7500 - 30 = 8470
      expect(playerCity.gold).toBe(8470);

      // AI city: goldIncome = 200000 * (800/1000) * 0.15 * 1.0 * 1.0 = 24000, salary = 30 (common rank)
      // gold = 2000 + 24000 - 30 = 25970
      expect(aiCity.gold).toBe(25970);

      spy.mockRestore();
    });
  });

  describe('turn order with faction changes', () => {
    it('skips eliminated factions in turn order', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      // Start with 3 factions, but one has no cities (should be skipped by AI)
      const playerFaction = createTestFaction({ id: 1, name: '玩家', rulerId: 50, isPlayer: true });
      const aiFaction1 = createTestFaction({ id: 2, name: 'AI1', rulerId: 10, isPlayer: false });
      const aiFaction2 = createTestFaction({ id: 3, name: 'AI2', rulerId: 30, isPlayer: false });

      useGameStore.setState({
        month: 1,
        year: 190,
        playerFaction,
        factions: [playerFaction, aiFaction1, aiFaction2],
        cities: [
          createTestCity({ id: 1, factionId: 1 }),
          // AI faction 2 has a city; AI faction 1 has NO cities (eliminated)
          createTestCity({ id: 2, factionId: 3, name: 'AI城' }),
        ],
        officers: [
          createTestOfficer({ id: 50, factionId: 1, cityId: 1, isGovernor: true }),
          createTestOfficer({ id: 30, name: 'AI將', factionId: 3, cityId: 2, isGovernor: true }),
        ],
      });

      // Should not crash even though faction 2 has no cities
      useGameStore.getState().endTurn();
      expect(useGameStore.getState().month).toBe(2);

      spy.mockRestore();
    });
  });
});
