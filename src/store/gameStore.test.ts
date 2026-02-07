import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { Officer, City, Faction } from '../types';

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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
        skills: [],
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
  });
});
