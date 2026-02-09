import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import type { Officer, City, Faction, Scenario, RTK4Skill } from '../types';

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
  skills: ['步兵', '騎兵'],
  factionId: null,
  cityId: 1,
  stamina: 100,
  loyalty: 80,
  isGovernor: false,
  rank: '一般',
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
  color: '#ff0000',
  isPlayer: true,
  relations: {},
  allies: [],
  ceasefires: [],
  hostageOfficerIds: [],
  powOfficerIds: [],
  ...overrides,
});

/**
 * Test suite for stamina consumption system (Phase 1.7 of PLAN.md)
 * 
 * Tests ensure that:
 * 1. Each command action costs stamina as specified
 * 2. Officers with 0 stamina cannot perform actions
 * 3. Stamina recovery works correctly on turn end
 */

describe('gameStore - Stamina Consumption System', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameStore.setState({
      phase: 'playing',
      scenario: null,
      playerFaction: {
        id: 1,
        name: '曹操',
        rulerId: 1,
        color: '#3b82f6',
        isPlayer: true,
        relations: {},
        allies: [],
      },
      cities: [],
      officers: [],
      factions: [],
      year: 190,
      month: 1,
      selectedCityId: null,
      activeCommandCategory: null,
      log: [],
      duelState: null,
    });
  });

  describe('developCommerce', () => {
    it('costs 20 stamina for governor', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const testOfficer: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [testOfficer],
      });

      useGameStore.getState().developCommerce(1);

      const updatedOfficer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedOfficer?.stamina).toBe(80);
    });

    it('prevents action when governor stamina < 20', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const testOfficer: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 15,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [testOfficer],
      });

      const initialCommerce = testCity.commerce;
      useGameStore.getState().developCommerce(1);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.commerce).toBe(initialCommerce);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });

    it('prevents action when no governor exists', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [],
      });

      const initialCommerce = testCity.commerce;
      useGameStore.getState().developCommerce(1);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.commerce).toBe(initialCommerce);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('城中無太守'));
    });
  });

  describe('developAgriculture', () => {
    it('costs 20 stamina for governor', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const testOfficer: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [testOfficer],
      });

      useGameStore.getState().developAgriculture(1);

      const updatedOfficer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedOfficer?.stamina).toBe(80);
    });

    it('prevents action when governor stamina < 20', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const testOfficer: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 10,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [testOfficer],
      });

      const initialAgriculture = testCity.agriculture;
      useGameStore.getState().developAgriculture(1);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.agriculture).toBe(initialAgriculture);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });
  });

  describe('reinforceDefense', () => {
    it('costs 20 stamina for governor', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const testOfficer: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [testOfficer],
      });

      useGameStore.getState().reinforceDefense(1);

      const updatedOfficer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedOfficer?.stamina).toBe(80);
    });

    it('prevents action when governor stamina < 20', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const testOfficer: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 5,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [testOfficer],
      });

      const initialDefense = testCity.defense;
      useGameStore.getState().reinforceDefense(1);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.defense).toBe(initialDefense);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });
  });

  describe('recruitOfficer', () => {
    it('costs 15 stamina for recruiter', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const recruiter: Officer = {
        id: 1,
        name: '曹操',
        leadership: 90,
        war: 85,
        intelligence: 85,
        politics: 80,
        charisma: 95,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 100,
        isGovernor: true,
      };

      const target: Officer = {
        id: 2,
        name: '典韋',
        leadership: 70,
        war: 95,
        intelligence: 30,
        politics: 20,
        charisma: 50,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: null,
        cityId: 1,
        stamina: 100,
        loyalty: 0,
        isGovernor: false,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [recruiter, target],
        selectedCityId: 1,
      });

      useGameStore.getState().recruitOfficer(2);

      const updatedRecruiter = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedRecruiter?.stamina).toBe(85);
    });

    it('prevents recruitment when recruiter stamina < 15', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const recruiter: Officer = {
        id: 1,
        name: '曹操',
        leadership: 90,
        war: 85,
        intelligence: 85,
        politics: 80,
        charisma: 95,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 10,
        loyalty: 100,
        isGovernor: true,
      };

      const target: Officer = {
        id: 2,
        name: '典韋',
        leadership: 70,
        war: 95,
        intelligence: 30,
        politics: 20,
        charisma: 50,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: null,
        cityId: 1,
        stamina: 100,
        loyalty: 0,
        isGovernor: false,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [recruiter, target],
        selectedCityId: 1,
      });

      useGameStore.getState().recruitOfficer(2);

      const updatedTarget = useGameStore.getState().officers.find(o => o.id === 2);
      expect(updatedTarget?.factionId).toBeNull();
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });
  });

  describe('draftTroops', () => {
    it('costs 10 stamina for governor', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const testOfficer: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [testOfficer],
      });

      useGameStore.getState().draftTroops(1, 1000);

      const updatedOfficer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedOfficer?.stamina).toBe(90);
    });

    it('prevents drafting when governor stamina < 10', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const testOfficer: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 5,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [testOfficer],
      });

      const initialTroops = testCity.troops;
      useGameStore.getState().draftTroops(1, 1000);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.troops).toBe(initialTroops);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });
  });

  describe('improveRelations', () => {
    it('costs 15 stamina for messenger', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const messenger: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 100,
        isGovernor: true,
      };

      const targetFaction: Faction = {
        id: 2,
        name: '劉備',
        rulerId: 10,
        color: '#10b981',
        isPlayer: false,
        relations: { 1: 60 },
        allies: [],
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [messenger],
        factions: [targetFaction],
        selectedCityId: 1,
        playerFaction: {
          id: 1,
          name: '曹操',
          rulerId: 1,
          color: '#3b82f6',
          isPlayer: true,
          relations: { 2: 60 },
          allies: [],
        },
      });

      useGameStore.getState().improveRelations(2);

      const updatedMessenger = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedMessenger?.stamina).toBe(85);
    });

    it('prevents action when messenger stamina < 15', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const messenger: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 10,
        loyalty: 100,
        isGovernor: true,
      };

      const targetFaction: Faction = {
        id: 2,
        name: '劉備',
        rulerId: 10,
        color: '#10b981',
        isPlayer: false,
        relations: { 1: 60 },
        allies: [],
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [messenger],
        factions: [targetFaction],
        selectedCityId: 1,
        playerFaction: {
          id: 1,
          name: '曹操',
          rulerId: 1,
          color: '#3b82f6',
          isPlayer: true,
          relations: { 2: 60 },
          allies: [],
        },
      });

      const initialGold = testCity.gold;
      useGameStore.getState().improveRelations(2);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.gold).toBe(initialGold);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });
  });

  describe('formAlliance', () => {
    it('costs 20 stamina for messenger', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const messenger: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 100,
        isGovernor: true,
      };

      const targetFaction: Faction = {
        id: 2,
        name: '劉備',
        rulerId: 10,
        color: '#10b981',
        isPlayer: false,
        relations: { 1: 20 },
        allies: [],
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [messenger],
        factions: [targetFaction],
        selectedCityId: 1,
        playerFaction: {
          id: 1,
          name: '曹操',
          rulerId: 1,
          color: '#3b82f6',
          isPlayer: true,
          relations: { 2: 20 },
          allies: [],
        },
      });

      useGameStore.getState().formAlliance(2);

      const updatedMessenger = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedMessenger?.stamina).toBe(80);
    });

    it('prevents action when messenger stamina < 20', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [],
      };

      const messenger: Officer = {
        id: 1,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 15,
        loyalty: 100,
        isGovernor: true,
      };

      const targetFaction: Faction = {
        id: 2,
        name: '劉備',
        rulerId: 10,
        color: '#10b981',
        isPlayer: false,
        relations: { 1: 20 },
        allies: [],
      };

      useGameStore.setState({
        cities: [testCity],
        officers: [messenger],
        factions: [targetFaction],
        selectedCityId: 1,
        playerFaction: {
          id: 1,
          name: '曹操',
          rulerId: 1,
          color: '#3b82f6',
          isPlayer: true,
          relations: { 2: 20 },
          allies: [],
        },
      });

      const initialGold = testCity.gold;
      useGameStore.getState().formAlliance(2);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.gold).toBe(initialGold);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });
  });

  describe('rumor', () => {
    it('costs 15 stamina for messenger', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [2],
      };

      const targetCity: City = {
        id: 2,
        name: '洛陽',
        x: 60,
        y: 50,
        factionId: 2,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [1],
      };

      const messenger: Officer = {
        id: 1,
        name: '郭嘉',
        leadership: 75,
        war: 40,
        intelligence: 95,
        politics: 70,
        charisma: 70,
        skills: ['流言'] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity, targetCity],
        officers: [messenger],
        selectedCityId: 1,
        playerFaction: {
          id: 1,
          name: '曹操',
          rulerId: 1,
          color: '#3b82f6',
          isPlayer: true,
          relations: { 2: 60 },
          allies: [],
        },
      });

      useGameStore.getState().rumor(2);

      const updatedMessenger = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedMessenger?.stamina).toBe(85);
    });

    it('prevents action when messenger stamina < 15', () => {
      const testCity: City = {
        id: 1,
        name: '許昌',
        x: 50,
        y: 50,
        factionId: 1,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [2],
      };

      const targetCity: City = {
        id: 2,
        name: '洛陽',
        x: 60,
        y: 50,
        factionId: 2,
        population: 100000,
        gold: 10000,
        food: 50000,
        commerce: 50,
        agriculture: 50,
        defense: 30,
        troops: 10000,
        adjacentCityIds: [1],
      };

      const messenger: Officer = {
        id: 1,
        name: '郭嘉',
        leadership: 75,
        war: 40,
        intelligence: 95,
        politics: 70,
        charisma: 70,
        skills: ['流言'] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 10,
        loyalty: 100,
        isGovernor: true,
      };

      useGameStore.setState({
        cities: [testCity, targetCity],
        officers: [messenger],
        selectedCityId: 1,
        playerFaction: {
          id: 1,
          name: '曹操',
          rulerId: 1,
          color: '#3b82f6',
          isPlayer: true,
          relations: { 2: 60 },
          allies: [],
        },
      });

      const initialGold = testCity.gold;
      useGameStore.getState().rumor(2);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.gold).toBe(initialGold);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });
  });

  describe('stamina recovery on turn end', () => {
    it('recovers 20 stamina per turn, capped at 100', () => {
      const officer1: Officer = {
        id: 1,
        name: '曹操',
        leadership: 90,
        war: 85,
        intelligence: 85,
        politics: 80,
        charisma: 95,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 50,
        loyalty: 100,
        isGovernor: true,
      };

      const officer2: Officer = {
        id: 2,
        name: '荀彧',
        leadership: 85,
        war: 60,
        intelligence: 95,
        politics: 90,
        charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 90,
        loyalty: 100,
        isGovernor: false,
      };

      useGameStore.setState({
        officers: [officer1, officer2],
        cities: [],
      });

      useGameStore.getState().endTurn();

      const updatedOfficer1 = useGameStore.getState().officers.find(o => o.id === 1);
      const updatedOfficer2 = useGameStore.getState().officers.find(o => o.id === 2);

      expect(updatedOfficer1?.stamina).toBe(70);
      expect(updatedOfficer2?.stamina).toBe(100); // Capped at 100
    });

    it('recovers stamina from 0', () => {
      const officer: Officer = {
        id: 1,
        name: '典韋',
        leadership: 70,
        war: 95,
        intelligence: 30,
        politics: 20,
        charisma: 50,
        skills: [] as RTK4Skill[],
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
        factionId: 1,
        cityId: 1,
        stamina: 0,
        loyalty: 100,
        isGovernor: false,
      };

      useGameStore.setState({
        officers: [officer],
        cities: [],
      });

      useGameStore.getState().endTurn();

      const updatedOfficer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(updatedOfficer?.stamina).toBe(20);
    });

    it('applies tax system effects', () => {
      const city = createTestCity({
        id: 1,
        factionId: 1,
        gold: 1000,
        commerce: 500,
        peopleLoyalty: 50,
        taxRate: 'low',
        population: 100000
      });

      useGameStore.setState({
        cities: [city],
        officers: [],
        factions: [createTestFaction({ id: 1 })],
        month: 1,
        year: 190
      });

      useGameStore.getState().endTurn();

      const updatedCity = useGameStore.getState().cities[0];
      // goldIncome = 500 * 0.5 * (50/100) * 0.5 = 62.5 -> 62
      // gold = 1000 + 62 = 1062
      expect(updatedCity.gold).toBe(1062);
      // loyaltyChange = +2
      expect(updatedCity.peopleLoyalty).toBe(52);
      // popChangeRate = 0.01
      expect(updatedCity.population).toBe(101000);
    });

    it('processes officer life cycle (aging/death)', () => {
      const oldOfficer = createTestOfficer({
        id: 1,
        birthYear: 100,
        deathYear: 190,
        factionId: 1
      });

      useGameStore.setState({
        month: 12,
        year: 190,
        officers: [oldOfficer],
        cities: [],
        factions: [createTestFaction({ id: 1 })]
      });

      // Mock random to force death
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      
      useGameStore.getState().endTurn();

      // Should be year 191, month 1
      const state = useGameStore.getState();
      expect(state.year).toBe(191);
      expect(state.month).toBe(1);
      
      // Officer should be dead (filtered out)
      expect(state.officers.length).toBe(0);
      
      spy.mockRestore();
    });
  });
});

/**
 * Additional Test Suites for Phase 0 Features
 * - Battle Consequences
 * - Save/Load System
 * - Victory Conditions
 */

describe('Battle Consequences - resolveBattle', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      scenario: null,
      playerFaction: {
        id: 1,
        name: '曹操',
        rulerId: 1,
        color: '#3b82f6',
        isPlayer: true,
        relations: {},
        allies: [],
      },
      cities: [],
      officers: [],
      factions: [],
      year: 190,
      month: 1,
      selectedCityId: null,
      activeCommandCategory: null,
      log: [],
      duelState: null,
    });
    localStorage.clear();
  });

  const createTestCity = (overrides: Partial<City> = {}): City => ({
    id: 1,
    name: '測試城',
    x: 50,
    y: 50,
    factionId: 2,
    population: 100000,
    gold: 5000,
    food: 10000,
    commerce: 500,
    agriculture: 500,
    defense: 50,
    troops: 20000,
    adjacentCityIds: [2, 3],
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
    skills: ['步兵', '騎兵'],
    factionId: 2,
    cityId: 1,
    stamina: 100,
    loyalty: 80,
    isGovernor: true,
    rank: '一般',
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
    color: '#ff0000',
    isPlayer: true,
    relations: {},
    allies: [],
    ...overrides,
  });

  describe('City Transfer', () => {
    it('should transfer city ownership to winner faction', () => {
      const city = createTestCity({ factionId: 2 });
      const officer = createTestOfficer({ factionId: 2 });
      const faction1 = createTestFaction({ id: 1, name: '攻方' });
      const faction2 = createTestFaction({ id: 2, name: '守方' });

      useGameStore.setState({
        cities: [city],
        officers: [officer],
        factions: [faction1, faction2],
      });

      const battleUnits = [
        { officerId: 10, troops: 3000, factionId: 1, status: 'active' },
        { officerId: 20, troops: 0, factionId: 2, status: 'routed' },
      ];

      useGameStore.getState().resolveBattle(1, 2, 1, battleUnits);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      expect(updatedCity?.factionId).toBe(1);
    });

    it('should redistribute surviving troops to winning city', () => {
      const city = createTestCity({ troops: 20000 });
      const officer = createTestOfficer();
      const faction1 = createTestFaction({ id: 1 });
      const faction2 = createTestFaction({ id: 2 });

      useGameStore.setState({
        cities: [city],
        officers: [officer],
        factions: [faction1, faction2],
      });

      const battleUnits = [
        { officerId: 10, troops: 5000, factionId: 1, status: 'active' },
        { officerId: 20, troops: 0, factionId: 2, status: 'routed' },
      ];

      useGameStore.getState().resolveBattle(1, 2, 1, battleUnits);

      const updatedCity = useGameStore.getState().cities.find(c => c.id === 1);
      // 5000 troops * 0.8 (20% attrition) = 4000
      expect(updatedCity?.troops).toBe(4000);
    });
  });

  describe('Officer Capture', () => {
    it('should capture defeated officers with base probability', () => {
      const city = createTestCity();
      const defeatedOfficer = createTestOfficer({ id: 20, factionId: 2 });
      const faction1 = createTestFaction({ id: 1 });
      const faction2 = createTestFaction({ id: 2 });

      useGameStore.setState({
        cities: [city],
        officers: [defeatedOfficer],
        factions: [faction1, faction2],
      });

      // Mock Math.random to always return capture
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.2);

      const battleUnits = [
        { officerId: 20, troops: 0, factionId: 2, status: 'routed' },
      ];

      // Pass capturedOfficerIds
      useGameStore.getState().resolveBattle(1, 2, 1, battleUnits, [20]);

      const updatedOfficer = useGameStore.getState().officers.find(o => o.id === 20);
      // Captured officers get factionId -1
      expect(updatedOfficer?.factionId).toBe(-1);

      mockRandom.mockRestore();
    });

    it('should allow defeated officers to flee to adjacent cities', () => {
      const city = createTestCity({ adjacentCityIds: [2, 3] });
      const defeatedOfficer = createTestOfficer({ id: 20, factionId: 2 });
      const faction1 = createTestFaction({ id: 1 });
      const faction2 = createTestFaction({ id: 2 });

      useGameStore.setState({
        cities: [city, { ...city, id: 2, name: '鄰城' }],
        officers: [defeatedOfficer],
        factions: [faction1, faction2],
      });

      // Mock Math.random to always return flee (capture fails)
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.9);

      const battleUnits = [
        { officerId: 20, troops: 0, factionId: 2, status: 'active' },
      ];

      useGameStore.getState().resolveBattle(1, 2, 1, battleUnits);

      const updatedOfficer = useGameStore.getState().officers.find(o => o.id === 20);
      // Fled officers become unaffiliated (factionId: null)
      expect(updatedOfficer?.factionId).toBeNull();
      // Should have moved to an adjacent city
      expect([2, 3]).toContain(updatedOfficer?.cityId);

      mockRandom.mockRestore();
    });
  });

  describe('Faction Relations', () => {
    it('should increase hostility between winner and loser factions', () => {
      const city = createTestCity();
      const officer = createTestOfficer();
      const faction1 = createTestFaction({
        id: 1,
        relations: { 2: 50 },
      });
      const faction2 = createTestFaction({
        id: 2,
        relations: { 1: 50 },
      });

      useGameStore.setState({
        cities: [city],
        officers: [officer],
        factions: [faction1, faction2],
      });

      const battleUnits = [
        { officerId: 10, troops: 3000, factionId: 1, status: 'active' },
      ];

      useGameStore.getState().resolveBattle(1, 2, 1, battleUnits);

      const updatedFactions = useGameStore.getState().factions;
      const updatedFaction1 = updatedFactions.find(f => f.id === 1);
      const updatedFaction2 = updatedFactions.find(f => f.id === 2);

      // Hostility should increase by 20
      expect(updatedFaction1?.relations[2]).toBe(70);
      expect(updatedFaction2?.relations[1]).toBe(70);
    });
  });
});

describe('Save/Load System', () => {
  const createTestScenario = (): Scenario => ({
    id: 1,
    name: '測試劇本',
    subtitle: '子標題',
    year: 190,
    description: '測試用劇本',
    factions: [
      { id: 1, name: '測試勢力', rulerId: 1, color: '#ff0000', isPlayer: true, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    ],
    cities: [
      {
        id: 1,
        name: '測試城',
        x: 50,
        y: 50,
        factionId: 1,
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
        taxRate: 'medium',
        crossbows: 0,
        warHorses: 0,
        batteringRams: 0,
        catapults: 0,
      },
    ],
    officers: [
      {
        id: 1,
        name: '測試將領',
        leadership: 80,
        war: 85,
        intelligence: 70,
        politics: 60,
        charisma: 75,
        skills: ['步兵'],
        factionId: 1,
        cityId: 1,
        stamina: 100,
        loyalty: 80,
        isGovernor: true,
        rank: '一般',
        portraitId: 1,
        birthYear: 160,
        deathYear: 220,
        treasureId: null,
      },
    ],
  });

  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      scenario: null,
      playerFaction: {
        id: 1,
        name: '曹操',
        rulerId: 1,
        color: '#3b82f6',
        isPlayer: true,
        relations: {},
        allies: [],
      },
      cities: [],
      officers: [],
      factions: [],
      year: 190,
      month: 1,
      selectedCityId: null,
      activeCommandCategory: null,
      log: [],
      duelState: null,
    });
    localStorage.clear();
  });

  describe('saveGame', () => {
    it('should save game state to localStorage', () => {
      const scenario = createTestScenario();
      useGameStore.setState({
        scenario,
        playerFaction: scenario.factions[0],
        cities: scenario.cities,
        officers: scenario.officers,
        factions: scenario.factions,
        year: 200,
        month: 6,
      });

      const result = useGameStore.getState().saveGame(1);

      expect(result).toBe(true);
      expect(localStorage.getItem('rtk4_save_1')).not.toBeNull();

      const saveData = JSON.parse(localStorage.getItem('rtk4_save_1')!);
      expect(saveData.year).toBe(200);
      expect(saveData.month).toBe(6);
      expect(saveData.version).toBe('1.0.0');
    });

    it('should support multiple save slots', () => {
      const scenario = createTestScenario();
      useGameStore.setState({
        scenario,
        playerFaction: scenario.factions[0],
        cities: scenario.cities,
        officers: scenario.officers,
        factions: scenario.factions,
        year: 200,
        month: 6,
      });

      useGameStore.getState().saveGame(1);
      useGameStore.getState().saveGame(2);
      useGameStore.getState().saveGame(3);

      expect(localStorage.getItem('rtk4_save_1')).not.toBeNull();
      expect(localStorage.getItem('rtk4_save_2')).not.toBeNull();
      expect(localStorage.getItem('rtk4_save_3')).not.toBeNull();
    });
  });

  describe('loadGame', () => {
    it('should load game state from localStorage', () => {
      const scenario = createTestScenario();
      const saveData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        phase: 'playing',
        scenario,
        playerFactionId: 1,
        cities: scenario.cities,
        officers: scenario.officers,
        factions: scenario.factions,
        year: 210,
        month: 12,
        selectedCityId: 1,
        log: ['測試日誌'],
      };

      localStorage.setItem('rtk4_save_1', JSON.stringify(saveData));

      const result = useGameStore.getState().loadGame(1);

      expect(result).toBe(true);
      expect(useGameStore.getState().year).toBe(210);
      expect(useGameStore.getState().month).toBe(12);
    });

    it('should return false for non-existent save slot', () => {
      const result = useGameStore.getState().loadGame(99);
      expect(result).toBe(false);
    });
  });

  describe('getSaveSlots', () => {
    it('should return metadata for all save slots', () => {
      const scenario = createTestScenario();
      const saveData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        phase: 'playing',
        scenario,
        playerFactionId: 1,
        cities: scenario.cities,
        officers: scenario.officers,
        factions: scenario.factions,
        year: 190,
        month: 1,
        selectedCityId: null,
        log: [],
      };

      localStorage.setItem('rtk4_save_1', JSON.stringify(saveData));

      const slots = useGameStore.getState().getSaveSlots();

      expect(slots).toHaveLength(3);
      expect(slots[0].slot).toBe(1);
      expect(slots[0].date).toBe('2024-01-01T00:00:00.000Z');
      expect(slots[0].version).toBe('1.0.0');
      expect(slots[1].date).toBeNull();
      expect(slots[2].date).toBeNull();
    });
  });

  describe('deleteSave', () => {
    it('should remove save slot from localStorage', () => {
      const scenario = createTestScenario();
      useGameStore.setState({
        scenario,
        playerFaction: scenario.factions[0],
        cities: scenario.cities,
        officers: scenario.officers,
        factions: scenario.factions,
      });

      useGameStore.getState().saveGame(1);
      expect(localStorage.getItem('rtk4_save_1')).not.toBeNull();

      const result = useGameStore.getState().deleteSave(1);
      expect(result).toBe(true);
      expect(localStorage.getItem('rtk4_save_1')).toBeNull();
    });
  });
});

describe('Victory Condition', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      scenario: null,
      playerFaction: {
        id: 1,
        name: '曹操',
        rulerId: 1,
        color: '#3b82f6',
        isPlayer: true,
        relations: {},
        allies: [],
      },
      cities: [],
      officers: [],
      factions: [],
      year: 190,
      month: 1,
      selectedCityId: null,
      activeCommandCategory: null,
      log: [],
      duelState: null,
    });
  });

  const createTestCity = (id: number, factionId: number | null): City => ({
    id,
    name: `城${id}`,
    x: 50,
    y: 50,
    factionId,
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
    taxRate: 'medium',
    crossbows: 0,
    warHorses: 0,
    batteringRams: 0,
    catapults: 0,
  });

  const createTestFaction = (id: number, isPlayer: boolean): Faction => ({
    id,
    name: `勢力${id}`,
    rulerId: id,
    color: '#ff0000',
    isPlayer,
    relations: {},
    allies: [],
    ceasefires: [],
    hostageOfficerIds: [],
    powOfficerIds: [],
  });

  it('should detect victory when player controls all cities', () => {
    const cities = [
      createTestCity(1, 1),
      createTestCity(2, 1),
      createTestCity(3, 1),
    ];
    const factions = [createTestFaction(1, true)];

    useGameStore.setState({
      cities,
      factions,
      playerFaction: factions[0],
    });

    const result = useGameStore.getState().checkVictoryCondition();

    expect(result).not.toBeNull();
    expect(result?.type).toBe('victory');
  });

  it('should detect defeat when player has no cities', () => {
    const cities = [
      createTestCity(1, 2),
      createTestCity(2, 2),
    ];
    const factions = [
      createTestFaction(1, true),
      createTestFaction(2, false),
    ];

    useGameStore.setState({
      cities,
      factions,
      playerFaction: factions[0],
    });

    const result = useGameStore.getState().checkVictoryCondition();

    expect(result).not.toBeNull();
    expect(result?.type).toBe('defeat');
  });

  it('should return null when game is ongoing', () => {
    const cities = [
      createTestCity(1, 1),
      createTestCity(2, 2),
    ];
    const factions = [
      createTestFaction(1, true),
      createTestFaction(2, false),
    ];

    useGameStore.setState({
      cities,
      factions,
      playerFaction: factions[0],
    });

    const result = useGameStore.getState().checkVictoryCondition();

    expect(result).toBeNull();
  });

  it('should detect defeat when AI faction controls all cities', () => {
    const cities = [
      createTestCity(1, 2),
      createTestCity(2, 2),
    ];
    const factions = [
      createTestFaction(1, true),
      createTestFaction(2, false),
    ];

    useGameStore.setState({
      cities,
      factions,
      playerFaction: factions[0],
    });

    const result = useGameStore.getState().checkVictoryCondition();

    expect(result).not.toBeNull();
    expect(result?.type).toBe('defeat');
    expect(result?.message).toContain('勢力覆滅');
  });
});
