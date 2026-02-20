import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { useBattleStore } from './battleStore';
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

describe('Mole System (埋伏之計)', () => {
  beforeEach(() => {
    const playerFaction = createTestFaction({
      id: 1, name: '曹操', rulerId: 1, isPlayer: true,
      relations: { 2: 60 },
    });
    const enemyFaction = createTestFaction({
      id: 2, name: '袁紹', rulerId: 10, isPlayer: false,
      relations: { 1: 60 },
    });

    useGameStore.setState({
      phase: 'playing',
      playerFaction,
      factions: [playerFaction, enemyFaction],
      cities: [
        createTestCity({ id: 1, name: '鄴', factionId: 1, gold: 5000, adjacentCityIds: [2] }),
        createTestCity({ id: 2, name: '平原', factionId: 2, gold: 5000, adjacentCityIds: [1] }),
      ],
      officers: [
        createTestOfficer({ id: 1, name: '曹操', factionId: 1, cityId: 1, isGovernor: true, skills: ['infantry'] }),
        createTestOfficer({ id: 2, name: '張遼', factionId: 1, cityId: 1, skills: ['espionage', 'cavalry'], war: 90, leadership: 85 }),
        createTestOfficer({ id: 3, name: '于禁', factionId: 1, cityId: 1, skills: ['infantry'] }),
        createTestOfficer({ id: 10, name: '袁紹', factionId: 2, cityId: 2, isGovernor: true, skills: ['infantry'] }),
        createTestOfficer({ id: 11, name: '顏良', factionId: 2, cityId: 2, skills: ['cavalry'] }),
      ],
      selectedCityId: 1,
      year: 190,
      month: 1,
      log: [],
      pendingEvents: [],
    });
  });

  describe('plantMole', () => {
    it('officer leaves faction, gets moleForFactionId, gold deducted', () => {
      // Use high stats to ensure acceptance (90 war + 85 leadership → 67.5% + 50% base)
      // Mock random to ensure acceptance
      const origRandom = Math.random;
      Math.random = () => 0.1; // Always accept (10% < ~67.5%)

      useGameStore.getState().plantMole(2, 2); // Plant 張遼 in 袁紹

      Math.random = origRandom;

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 2)!;

      // Officer should now belong to enemy faction
      expect(officer.factionId).toBe(2);
      // Should have moleForFactionId set
      expect(officer.moleForFactionId).toBe(1);
      // Gold should be deducted
      const city = state.cities.find(c => c.id === 1)!;
      expect(city.gold).toBe(4000); // 5000 - 1000
      // Officer should be marked acted
      expect(officer.acted).toBe(true);
    });

    it('rejects officer without espionage skill', () => {
      const beforeGold = useGameStore.getState().cities.find(c => c.id === 1)!.gold;
      useGameStore.getState().plantMole(2, 3); // 于禁 has no espionage skill

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 3)!;
      // Officer should still be in player faction
      expect(officer.factionId).toBe(1);
      // Gold should not be deducted
      expect(state.cities.find(c => c.id === 1)!.gold).toBe(beforeGold);
    });

    it('AI acceptance: high-stat officer accepted by AI target', () => {
      const origRandom = Math.random;
      Math.random = () => 0.01; // Very low → always accept

      useGameStore.getState().plantMole(2, 2);

      Math.random = origRandom;

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 2)!;
      expect(officer.factionId).toBe(2);
      expect(officer.moleForFactionId).toBe(1);
      // Officer should be at enemy capital (city 2)
      expect(officer.cityId).toBe(2);
    });

    it('AI decline: officer returns to player faction', () => {
      const origRandom = Math.random;
      Math.random = () => 0.99; // Very high → always decline

      useGameStore.getState().plantMole(2, 2);

      Math.random = origRandom;

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 2)!;
      // Officer should be back in player faction
      expect(officer.factionId).toBe(1);
      // moleForFactionId should not be set
      expect(officer.moleForFactionId).toBeFalsy();
      // Gold should still be deducted (cost of attempt)
      expect(state.cities.find(c => c.id === 1)!.gold).toBe(4000);
    });
  });

  describe('recallMole', () => {
    it('officer returns to ruler city, moleForFactionId cleared', () => {
      // Set up a planted mole directly
      useGameStore.setState(state => ({
        officers: state.officers.map(o =>
          o.id === 2 ? { ...o, factionId: 2, cityId: 2, moleForFactionId: 1 } : o
        ),
      }));

      useGameStore.getState().recallMole(2);

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 2)!;
      expect(officer.factionId).toBe(1);
      expect(officer.cityId).toBe(1); // Ruler's city
      expect(officer.moleForFactionId).toBeNull();
    });
  });

  describe('Fog of war', () => {
    it('mole city is revealed to planting faction', () => {
      // Set up a planted mole
      useGameStore.setState(state => ({
        officers: state.officers.map(o =>
          o.id === 2 ? { ...o, factionId: 2, cityId: 2, moleForFactionId: 1 } : o
        ),
      }));

      // City 2 should be revealed (mole is there)
      expect(useGameStore.getState().isCityRevealed(2)).toBe(true);
    });

    it('city without mole is not revealed', () => {
      // City 2 is enemy, no mole → should NOT be revealed
      expect(useGameStore.getState().isCityRevealed(2)).toBe(false);
    });
  });

  describe('Battle betrayal', () => {
    it('mole unit switches factionId, defender morale drops 15', () => {
      // Set up a mole in the defender's ranks
      useGameStore.setState(state => ({
        officers: state.officers.map(o =>
          o.id === 11 ? { ...o, moleForFactionId: 1 } : o
        ),
      }));

      const state = useGameStore.getState();
      const attackerOfficers = state.officers.filter(o => o.id === 2); // 張遼
      const defenderOfficers = state.officers.filter(o => o.factionId === 2); // 袁紹 + 顏良(mole)

      // Init battle
      useBattleStore.getState().initBattle(
        1, 2, 2,
        attackerOfficers, defenderOfficers,
        80, 80, 40,
        ['infantry'], ['infantry', 'infantry'],
        [5000], [5000, 3000],
        1, 'east', 50000, 50000,
      );

      const battleState = useBattleStore.getState();
      // Should detect 顏良 as a mole
      expect(battleState.moleOfficerIds).toContain(11);

      // Find 顏良's unit
      const moleUnit = battleState.units.find(u => u.officerId === 11)!;
      expect(moleUnit.factionId).toBe(2); // Initially defender

      // Trigger betrayal
      useBattleStore.getState().triggerBetrayal(moleUnit.id);

      const afterBattle = useBattleStore.getState();
      const betrayedUnit = afterBattle.units.find(u => u.officerId === 11)!;
      // Unit should now be attacker
      expect(betrayedUnit.factionId).toBe(1);

      // Other defender units should have lost morale
      const defenderUnits = afterBattle.units.filter(u => u.factionId === 2 && u.officerId !== 11);
      for (const u of defenderUnits) {
        expect(u.morale).toBeLessThanOrEqual(65); // 80 - 15
      }

      // Mole should be removed from moleOfficerIds
      expect(afterBattle.moleOfficerIds).not.toContain(11);

      // Game store officer should have moleForFactionId cleared
      const gsOfficer = useGameStore.getState().officers.find(o => o.id === 11)!;
      expect(gsOfficer.moleForFactionId).toBeNull();
    });
  });

  describe('Dismiss mole', () => {
    it('officer auto-returns to original faction ruler city, moleExposed event generated', () => {
      // Set up: enemy faction has a mole that belongs to player
      // The mole is an enemy officer whose moleForFactionId = player faction
      // But in this scenario, the player dismisses the mole — they are the host
      // Actually: the plan says when TARGET faction dismisses, mole returns to planting faction
      // So: player has an officer who is secretly a mole for faction 2
      // And player dismisses them → they return to faction 2

      // Let's set up: player accepted an enemy mole (officer 11, moleForFactionId = 2)
      useGameStore.setState(state => ({
        officers: state.officers.map(o =>
          o.id === 11 ? { ...o, factionId: 1, cityId: 1, moleForFactionId: 2 } : o
        ),
      }));

      useGameStore.getState().dismissOfficer(11);

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 11)!;
      // Officer should return to faction 2 (the mole's original faction)
      expect(officer.factionId).toBe(2);
      // Should be at faction 2's ruler city (city 2)
      expect(officer.cityId).toBe(2);
      // moleForFactionId should be cleared
      expect(officer.moleForFactionId).toBeNull();
    });
  });

  describe('AI mole against player', () => {
    it('generates officerVisit event with moleForFactionId set', () => {
      useGameStore.getState().aiPlantMole(11, 1); // 顏良 infiltrates player faction

      const state = useGameStore.getState();
      const officer = state.officers.find(o => o.id === 11)!;
      // Officer should be unaffiliated (awaiting player accept/decline)
      expect(officer.factionId).toBeNull();
      // Should have moleForFactionId set
      expect(officer.moleForFactionId).toBe(2);
      // Should have a pending officerVisit event
      expect(state.pendingEvents.length).toBeGreaterThan(0);
      expect(state.pendingEvents.some(e => e.type === 'officerVisit' && e.officerId === 11)).toBe(true);
    });
  });
});
