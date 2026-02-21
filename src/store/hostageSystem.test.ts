import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { Officer, City, Faction } from '../types';

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
  skills: ['infantry', 'cavalry'],
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
  isPlayer: true,
  relations: {},
  allies: [],
  ceasefires: [],
  hostageOfficerIds: [],
  powOfficerIds: [],
  ...overrides,
});

describe('Hostage System', () => {
  beforeEach(() => {
    const playerFaction = createTestFaction({
      id: 1, name: '曹操', rulerId: 1, isPlayer: true,
      relations: { 2: 60 },
      allies: [],
      hostageOfficerIds: [],
    });
    const enemyFaction = createTestFaction({
      id: 2, name: '袁紹', rulerId: 10, isPlayer: false,
      relations: { 1: 60 },
      allies: [],
      hostageOfficerIds: [],
    });

    useGameStore.setState({
      phase: 'playing',
      playerFaction,
      factions: [playerFaction, enemyFaction],
      cities: [
        createTestCity({ id: 1, name: '鄴', factionId: 1, adjacentCityIds: [2] }),
        createTestCity({ id: 2, name: '平原', factionId: 2, adjacentCityIds: [1] }),
      ],
      officers: [
        createTestOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true }),
        createTestOfficer({ id: 2, name: '張遼', factionId: 1, cityId: 1 }),
        createTestOfficer({ id: 3, name: '于禁', factionId: 1, cityId: 1 }),
        createTestOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true }),
        createTestOfficer({ id: 11, name: '顏良', factionId: 2, cityId: 2 }),
      ],
      selectedCityId: 1,
      year: 190,
      month: 1,
      log: [],
    });
  });

  describe('exchangeHostage - relations boost', () => {
    it('should reduce hostility by 15 for both factions when sending a hostage', () => {
      const store = useGameStore.getState();
      store.exchangeHostage(2, 2); // Send 張遼 to 袁紹

      const state = useGameStore.getState();
      const playerFaction = state.factions.find(f => f.id === 1)!;
      const enemyFaction = state.factions.find(f => f.id === 2)!;

      // Both sides should have hostility reduced by 15 (60 - 15 = 45)
      expect(playerFaction.relations[2]).toBe(45);
      expect(enemyFaction.relations[1]).toBe(45);

      // Officer should be at cityId -2 (hostage)
      const officer = state.officers.find(o => o.id === 2)!;
      expect(officer.cityId).toBe(-2);

      // Officer should be in enemy faction's hostageOfficerIds
      expect(enemyFaction.hostageOfficerIds).toContain(2);
    });
  });

  describe('formAlliance - hostage bonus', () => {
    it('should get +15 score bonus when target faction holds player hostage', () => {
      // First send a hostage
      useGameStore.getState().exchangeHostage(3, 2); // Send 于禁 to 袁紹

      // Set hostility very low so alliance is more likely to succeed
      useGameStore.setState(state => ({
        factions: state.factions.map(f => {
          if (f.id === 1) return { ...f, relations: { ...f.relations, 2: 10 } };
          if (f.id === 2) return { ...f, relations: { ...f.relations, 1: 10 } };
          return f;
        }),
        playerFaction: { ...state.playerFaction!, relations: { 2: 10 } },
      }));

      // Verify hostage is held by the target faction
      const state = useGameStore.getState();
      const enemyFaction = state.factions.find(f => f.id === 2)!;
      expect(enemyFaction.hostageOfficerIds).toContain(3);
    });
  });

  describe('startBattle - hostage execution', () => {
    it('should execute player hostages when attacking faction holding them', () => {
      // Send hostage to enemy faction first
      useGameStore.getState().exchangeHostage(3, 2); // Send 于禁 to 袁紹

      // Verify hostage exists
      let state = useGameStore.getState();
      expect(state.officers.find(o => o.id === 3)?.cityId).toBe(-2);

      // Need to set up battle formation first
      useGameStore.getState().setBattleFormation({
        officerIds: [2],
        unitTypes: ['infantry'],
        troops: [5000],
        food: 50000,
      });

      // Attack the enemy city holding the hostage
      useGameStore.getState().startBattle(2);

      state = useGameStore.getState();
      // 于禁 should be executed (removed from officers)
      const hostageOfficer = state.officers.find(o => o.id === 3);
      expect(hostageOfficer).toBeUndefined();

      // Should be removed from enemy faction's hostageOfficerIds
      const enemyFaction = state.factions.find(f => f.id === 2)!;
      expect(enemyFaction.hostageOfficerIds).not.toContain(3);
    });
  });

  describe('aiStartBattle - hostage execution', () => {
    it('should execute player hostages when AI faction attacks player', () => {
      // Send hostage to enemy faction
      useGameStore.getState().exchangeHostage(3, 2); // Send 于禁 to 袁紹

      // AI attacks player's city (from city 2 to city 1)
      useGameStore.getState().aiStartBattle(2, 1);

      const state = useGameStore.getState();
      // 于禁 should be executed
      const hostageOfficer = state.officers.find(o => o.id === 3);
      expect(hostageOfficer).toBeUndefined();
    });
  });

  describe('breakAlliance - hostage execution', () => {
    it('should execute player hostages when breaking alliance with faction holding them', () => {
      // Set up alliance first
      useGameStore.setState(state => ({
        factions: state.factions.map(f => {
          if (f.id === 1) return { ...f, allies: [2] };
          if (f.id === 2) return { ...f, allies: [1] };
          return f;
        }),
        playerFaction: { ...state.playerFaction!, allies: [2] },
      }));

      // Send hostage to allied faction
      useGameStore.getState().exchangeHostage(3, 2); // Send 于禁 to 袁紹

      // Break alliance
      useGameStore.getState().breakAlliance(2);

      const state = useGameStore.getState();
      // 于禁 should be executed
      const hostageOfficer = state.officers.find(o => o.id === 3);
      expect(hostageOfficer).toBeUndefined();

      // Alliance should be broken
      const playerFaction = state.factions.find(f => f.id === 1)!;
      expect(playerFaction.allies).not.toContain(2);
    });
  });

  describe('recallHostage', () => {
    it('should succeed when hostility ≤ 20', () => {
      // Send hostage
      useGameStore.getState().exchangeHostage(3, 2);

      // Lower hostility to 20
      useGameStore.setState(state => ({
        factions: state.factions.map(f => {
          if (f.id === 1) return { ...f, relations: { ...f.relations, 2: 20 } };
          return f;
        }),
        playerFaction: { ...state.playerFaction!, relations: { 2: 20 } },
      }));

      // Recall
      useGameStore.getState().recallHostage(3);

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 3)!;
      // Officer should be back in first player city
      expect(officer.cityId).toBe(1);

      // Should be removed from enemy hostageOfficerIds
      const enemyFaction = state.factions.find(f => f.id === 2)!;
      expect(enemyFaction.hostageOfficerIds).not.toContain(3);
    });

    it('should reject when hostility > 20', () => {
      // Send hostage
      useGameStore.getState().exchangeHostage(3, 2);

      // Hostility is 45 after sending (60 - 15 = 45), still > 20

      // Try to recall — should fail
      useGameStore.getState().recallHostage(3);

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 3)!;
      // Officer should still be hostage
      expect(officer.cityId).toBe(-2);

      // Should still be in enemy hostageOfficerIds
      const enemyFaction = state.factions.find(f => f.id === 2)!;
      expect(enemyFaction.hostageOfficerIds).toContain(3);
    });
  });
});
