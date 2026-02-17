import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import type { RTK4Skill } from '../types';

describe('gameStore - New Commands Expansion (Phase 2)', () => {
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
        relations: { 2: 60 },
        allies: [],
        ceasefires: [],
        hostageOfficerIds: [],
        powOfficerIds: [],
        advisorId: null,
      },
      cities: [
        {
          id: 1, name: '許昌', x: 50, y: 50, factionId: 1, population: 100000, gold: 10000, food: 50000,
          commerce: 50, agriculture: 50, defense: 30, troops: 10000, adjacentCityIds: [2],
          floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
          crossbows: 2000, warHorses: 2000, batteringRams: 0, catapults: 0, taxRate: 'medium' as const
        },
        {
          id: 2, name: '洛陽', x: 60, y: 50, factionId: 2, population: 100000, gold: 10000, food: 50000,
          commerce: 50, agriculture: 50, defense: 30, troops: 10000, adjacentCityIds: [1],
          floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
          crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const
        }
      ],
      officers: [
        {
          id: 1, name: '荀彧', leadership: 85, war: 60, intelligence: 95, politics: 95, charisma: 90,
          skills: ['manufacture', 'talent', 'provoke', 'tigerTrap', 'arson', 'intelligence', 'diplomacy'] as RTK4Skill[],
          portraitId: 1, birthYear: 160, deathYear: 220, treasureId: null, factionId: 1, cityId: 1,
      acted: false, loyalty: 100, isGovernor: true, rank: 'common' as const, relationships: []
        },
        {
          id: 2, name: '呂布', leadership: 95, war: 100, intelligence: 20, politics: 15, charisma: 40,
          skills: [] as RTK4Skill[], portraitId: 2, birthYear: 160, deathYear: 200, treasureId: null,
          factionId: 2, cityId: 2, acted: false, loyalty: 50, isGovernor: true, rank: 'common' as const, relationships: []
        }
      ],
      factions: [
        { id: 1, name: '曹操', rulerId: 1, color: '#3b82f6', isPlayer: true, relations: { 2: 60 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
        { id: 2, name: '董卓', rulerId: 2, color: '#ff0000', isPlayer: false, relations: { 1: 60 }, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null }
      ],
      year: 190, month: 1, selectedCityId: 1, activeCommandCategory: null, log: [], duelState: null, battleFormation: null
    });
  });

  describe('Internal Affairs (內政)', () => {
    it('developFloodControl works', () => {
      useGameStore.getState().developFloodControl(1);
      const city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.floodControl).toBeGreaterThan(50);
      expect(city?.gold).toBe(9500);
      expect(useGameStore.getState().officers[0].acted).toBe(true);
    });

    it('developTechnology works', () => {
      useGameStore.getState().developTechnology(1);
      const city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.technology).toBeGreaterThan(50);
      expect(city?.gold).toBe(9200);
      expect(useGameStore.getState().officers[0].acted).toBe(true);
    });

    it('trainTroops works', () => {
      useGameStore.getState().trainTroops(1);
      const city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.training).toBeGreaterThan(60);
      expect(city?.food).toBe(49500);
    });

    it('manufacture works with skill', () => {
      useGameStore.getState().manufacture(1, 'catapults'); // tech is 50, catapults need 80. Should fail.
      let city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.catapults).toBe(0);

      // Increase tech
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, technology: 85 } : c)
      });
      useGameStore.getState().manufacture(1, 'catapults');
      city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.catapults).toBeGreaterThan(0);
    });

    it('disasterRelief works', () => {
      useGameStore.getState().disasterRelief(1);
      const city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.peopleLoyalty).toBeGreaterThan(70);
    });

    it('buyFood converts gold to food at 1:2 rate', () => {
      const cityBefore = useGameStore.getState().cities.find(c => c.id === 1)!;
      const goldBefore = cityBefore.gold;
      const foodBefore = cityBefore.food;
      useGameStore.getState().buyFood(1, 2000);
      const cityAfter = useGameStore.getState().cities.find(c => c.id === 1)!;
      expect(cityAfter.food).toBe(foodBefore + 2000);
      expect(cityAfter.gold).toBe(goldBefore - 1000); // 2000 food / 2 = 1000 gold
    });

    it('buyFood rejects when insufficient gold', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, gold: 100 } : c)
      });
      const foodBefore = useGameStore.getState().cities.find(c => c.id === 1)!.food;
      useGameStore.getState().buyFood(1, 1000); // needs 500 gold, only has 100
      const foodAfter = useGameStore.getState().cities.find(c => c.id === 1)!.food;
      expect(foodAfter).toBe(foodBefore); // no change
    });

    it('buyFood does not require officer action', () => {
      // Mark all officers as acted
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => ({ ...o, acted: true }))
      });
      const foodBefore = useGameStore.getState().cities.find(c => c.id === 1)!.food;
      useGameStore.getState().buyFood(1, 100);
      const foodAfter = useGameStore.getState().cities.find(c => c.id === 1)!.food;
      expect(foodAfter).toBe(foodBefore + 100); // still works
    });
  });

  describe('Personnel (人事)', () => {
    it('searchOfficer finds and recruits unaffiliated', () => {
      useGameStore.setState({
        officers: [...useGameStore.getState().officers, {
          id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
          skills: [], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
          factionId: null, cityId: 1, acted: false, loyalty: 0, isGovernor: false, rank: 'common' as const, relationships: []
        }]
      });
      // Mock random to succeed
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('找到了 張遼'));
      // Verify the found officer was actually recruited into the player faction
      const found = useGameStore.getState().officers.find(o => o.id === 3);
      expect(found?.factionId).toBe(1);
      expect(found?.loyalty).toBe(60);
      mockRandom.mockRestore();
    });

    it('recruitPOW works', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => o.id === 2 ? { ...o, factionId: -1 as unknown as number, cityId: 1 } : o)
      });
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      useGameStore.getState().recruitPOW(2);
      const officer = useGameStore.getState().officers.find(o => o.id === 2);
      expect(officer?.factionId).toBe(1);
      mockRandom.mockRestore();
    });

    it('rewardOfficer works', () => {
      useGameStore.getState().rewardOfficer(1, 'gold', 1000);
      const city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.gold).toBe(9000);
    });

    it('rewardOfficer increases loyalty and deducts gold', () => {
      // Add a non-ruler officer with low loyalty
      useGameStore.setState({
        officers: [...useGameStore.getState().officers, {
          id: 5, name: '典韋', leadership: 80, war: 95, intelligence: 20, politics: 15, charisma: 50,
          skills: [] as RTK4Skill[], portraitId: 5, birthYear: 160, deathYear: 200, treasureId: null,
          factionId: 1, cityId: 1, acted: false, loyalty: 60, isGovernor: false, rank: 'common' as const, relationships: []
        }]
      });
      const loyaltyBefore = useGameStore.getState().officers.find(o => o.id === 5)!.loyalty;
      useGameStore.getState().rewardOfficer(5, 'gold', 1000);
      const after = useGameStore.getState().officers.find(o => o.id === 5)!;
      expect(after.loyalty).toBeGreaterThan(loyaltyBefore);
      expect(after.loyalty).toBe(Math.min(100, loyaltyBefore + 5 + Math.floor(1000 / 500)));
    });

    it('rewardOfficer works when selectedCityId differs from officer city', () => {
      // Regression: store uses selectedCityId to deduct gold, not officer.cityId.
      // Add a second player city and an officer there.
      useGameStore.setState({
        cities: [...useGameStore.getState().cities, {
          id: 3, name: '南皮', x: 70, y: 50, factionId: 1, population: 100000, gold: 5000, food: 30000,
          commerce: 40, agriculture: 40, defense: 20, troops: 5000, adjacentCityIds: [1],
          floodControl: 40, technology: 40, peopleLoyalty: 60, morale: 50, training: 50,
          crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const
        }],
        officers: [...useGameStore.getState().officers, {
          id: 6, name: '張郃', leadership: 85, war: 88, intelligence: 60, politics: 50, charisma: 65,
          skills: [] as RTK4Skill[], portraitId: 6, birthYear: 160, deathYear: 230, treasureId: null,
          factionId: 1, cityId: 3, acted: false, loyalty: 55, isGovernor: true, rank: 'common' as const, relationships: []
        }],
        // selectedCityId points to city 1, but officer is in city 3
        selectedCityId: 1,
      });

      const loyaltyBefore = useGameStore.getState().officers.find(o => o.id === 6)!.loyalty;
      // The store reads selectedCityId (city 1), but the officer is in city 3.
      // Before the fix, this would silently fail (gold deducted from wrong city or not at all).
      // We must select the officer's city first for the store to work.
      useGameStore.getState().selectCity(3);
      useGameStore.getState().rewardOfficer(6, 'gold', 1000);

      const after = useGameStore.getState().officers.find(o => o.id === 6)!;
      expect(after.loyalty).toBeGreaterThan(loyaltyBefore);

      // Gold should be deducted from city 3 (the officer's city), not city 1
      const city3 = useGameStore.getState().cities.find(c => c.id === 3)!;
      expect(city3.gold).toBe(4000); // 5000 - 1000
    });

    it('recruitOfficer fails when recruiter is in a different city', () => {
      // Regression: store silently returns when recruiter is not in the target's city.
      // Add an unaffiliated officer in city 2 and try to recruit with officer in city 1.
      useGameStore.setState({
        officers: [...useGameStore.getState().officers, {
          id: 7, name: '徐庶', leadership: 70, war: 55, intelligence: 92, politics: 88, charisma: 80,
          skills: [] as RTK4Skill[], portraitId: 7, birthYear: 170, deathYear: 240, treasureId: null,
          factionId: null, cityId: 2, acted: false, loyalty: 0, isGovernor: false, rank: 'common' as const, relationships: []
        }]
      });

      // Officer 1 (荀彧) is in city 1, target 徐庶 is in city 2 — should fail
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      useGameStore.getState().recruitOfficer(7, 1);
      const target = useGameStore.getState().officers.find(o => o.id === 7)!;
      // Should NOT be recruited — recruiter is in the wrong city
      expect(target.factionId).toBeNull();
      // Recruiter should NOT have acted (the action was rejected, not attempted)
      expect(useGameStore.getState().officers.find(o => o.id === 1)!.acted).toBe(false);
      mockRandom.mockRestore();
    });

    it('appointGovernor and appointAdvisor work', () => {
      useGameStore.getState().appointGovernor(1, 1);
      expect(useGameStore.getState().officers[0].isGovernor).toBe(true);

      useGameStore.getState().appointAdvisor(1);
      expect(useGameStore.getState().playerFaction?.advisorId).toBe(1);
    });

    it('dismissOfficer works', () => {
      // Create a non-ruler officer to dismiss
      useGameStore.setState({
        officers: [...useGameStore.getState().officers, {
          id: 4, name: '測試', leadership: 10, war: 10, intelligence: 10, politics: 10, charisma: 10,
          skills: [], portraitId: 1, birthYear: 160, deathYear: 220, treasureId: null,
          factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
        }]
      });
      useGameStore.getState().dismissOfficer(4);
      const officer = useGameStore.getState().officers.find(o => o.id === 4);
      expect(officer?.factionId).toBeNull();
    });
  });

  describe('Military (軍事)', () => {
    it('transport works', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c)
      });
      useGameStore.getState().transport(1, 2, { gold: 2000 });
      const city1 = useGameStore.getState().cities.find(c => c.id === 1);
      const city2 = useGameStore.getState().cities.find(c => c.id === 2);
      expect(city1?.gold).toBe(8000);
      expect(city2?.gold).toBe(12000);
    });

    it('transport moves escort officer to destination city', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c)
      });
      const officerBefore = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officerBefore?.cityId).toBe(1);
      useGameStore.getState().transport(1, 2, { gold: 1000 }, 1);
      const officerAfter = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officerAfter?.cityId).toBe(2);
      expect(officerAfter?.acted).toBe(true);
    });

    it('transport abandons source city when escort is the last officer', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c)
      });
      // Officer 1 is the only officer in city 1
      useGameStore.getState().transport(1, 2, { gold: 500 }, 1);
      const city1 = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city1?.factionId).toBeNull();
    });

    it('transferOfficer works', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c),
      });
      useGameStore.getState().transferOfficer(1, 2);
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officer?.cityId).toBe(2);
      expect(officer?.acted).toBe(true);
    });

    it('transferOfficer allows last officer to leave city', () => {
      // Only officer 1 in city 1 — should be allowed (city becomes ungarrisoned)
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c),
      });
      useGameStore.getState().transferOfficer(1, 2);
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      // Officer should have moved
      expect(officer?.cityId).toBe(2);
      expect(officer?.acted).toBe(true);
    });

    it('transferOfficer abandons city when last officer leaves', () => {
      // Only officer 1 in city 1 — city should become unowned
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c),
      });
      useGameStore.getState().transferOfficer(1, 2);
      const city1 = useGameStore.getState().cities.find(c => c.id === 1);
      // City should be abandoned (factionId = null)
      expect(city1?.factionId).toBeNull();
      // Should log the abandonment
      const logs = useGameStore.getState().log;
      expect(logs.some(l => l.includes('放棄') || l.includes('abandoned'))).toBe(true);
    });

    it('transferOfficer does not abandon city when other officers remain', () => {
      // Add a second officer in city 1
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c),
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 10, name: '守城將', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
            skills: [] as RTK4Skill[], portraitId: 10, birthYear: 160, deathYear: 220, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      useGameStore.getState().transferOfficer(1, 2);
      const city1 = useGameStore.getState().cities.find(c => c.id === 1);
      // City should still be owned
      expect(city1?.factionId).toBe(1);
    });

    it('transport rejects disconnected friendly cities (Bug #47)', () => {
      // City 1 (adj:[2]) and city 3 (adj:[]) are not connected — no friendly path
      useGameStore.setState({
        cities: [
          ...useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 2 } : c), // city 2 is enemy
          {
            id: 3, name: '遠方', x: 90, y: 90, factionId: 1, population: 10000, gold: 5000, food: 5000,
            commerce: 50, agriculture: 50, defense: 30, troops: 1000, adjacentCityIds: [],
            floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
            crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
          },
        ],
      });
      const goldBefore = useGameStore.getState().cities.find(c => c.id === 1)!.gold;
      useGameStore.getState().transport(1, 3, { gold: 1000 }, 1);
      // Transport should be rejected — gold unchanged, officer not acted
      const goldAfter = useGameStore.getState().cities.find(c => c.id === 1)!.gold;
      expect(goldAfter).toBe(goldBefore);
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officer?.acted).toBe(false);
    });

    it('transferOfficer rejects disconnected friendly cities (Bug #47)', () => {
      // City 1 (adj:[2]) and city 3 (adj:[]) are not connected
      useGameStore.setState({
        cities: [
          ...useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 2 } : c),
          {
            id: 3, name: '遠方', x: 90, y: 90, factionId: 1, population: 10000, gold: 5000, food: 5000,
            commerce: 50, agriculture: 50, defense: 30, troops: 1000, adjacentCityIds: [],
            floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
            crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
          },
        ],
      });
      useGameStore.getState().transferOfficer(1, 3);
      // Transfer should be rejected — officer stays in city 1
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officer?.cityId).toBe(1);
      expect(officer?.acted).toBe(false);
    });

    it('transport allows non-adjacent cities connected through friendly territory (Bug #47)', () => {
      // City 1 (adj:[2]) -- city 2 (adj:[1,3]) -- city 3 (adj:[2]), all faction 1
      useGameStore.setState({
        cities: [
          useGameStore.getState().cities.find(c => c.id === 1)!,
          { ...useGameStore.getState().cities.find(c => c.id === 2)!, factionId: 1, adjacentCityIds: [1, 3] },
          {
            id: 3, name: '遠方', x: 90, y: 90, factionId: 1, population: 10000, gold: 5000, food: 5000,
            commerce: 50, agriculture: 50, defense: 30, troops: 1000, adjacentCityIds: [2],
            floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
            crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
          },
        ],
      });
      useGameStore.getState().transport(1, 3, { gold: 1000 }, 1);
      // Should succeed — city 2 bridges the path
      const city3 = useGameStore.getState().cities.find(c => c.id === 3)!;
      expect(city3.gold).toBe(6000);
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officer?.cityId).toBe(3);
      expect(officer?.acted).toBe(true);
    });

    it('startBattle with formation works', () => {
      // Need at least 2 officers in city so one can remain behind
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 10, name: '守城將', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
            skills: [] as RTK4Skill[], portraitId: 10, birthYear: 160, deathYear: 220, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      useGameStore.getState().setBattleFormation({
        officerIds: [1],
        unitTypes: ['cavalry']
      });
      useGameStore.getState().startBattle(2);
      const city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.warHorses).toBe(1000); // Used 1000
      expect(useGameStore.getState().phase).toBe('battle');
    });
  });

  describe('Diplomacy (外交)', () => {
    it('requestJointAttack works', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      useGameStore.getState().requestJointAttack(2, 2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('成功說服'));
      mockRandom.mockRestore();
    });

    it('proposeCeasefire works', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      useGameStore.getState().proposeCeasefire(2);
      const faction = useGameStore.getState().factions.find(f => f.id === 1);
      expect(faction?.ceasefires.length).toBe(1);
      mockRandom.mockRestore();
    });

    it('breakAlliance works', () => {
      useGameStore.setState({
        factions: useGameStore.getState().factions.map(f => ({ ...f, allies: f.id === 1 ? [2] : f.id === 2 ? [1] : [] }))
      });
      useGameStore.getState().breakAlliance(2);
      const faction = useGameStore.getState().factions.find(f => f.id === 1);
      expect(faction?.allies).not.toContain(2);
      expect(faction?.relations[2]).toBe(100);
    });

    it('exchangeHostage works', () => {
      useGameStore.getState().exchangeHostage(1, 2);
      const faction2 = useGameStore.getState().factions.find(f => f.id === 2);
      expect(faction2?.hostageOfficerIds).toContain(1);
    });
  });

  describe('Internal Affairs (內政) - Edge Cases', () => {
    it('developFloodControl fails if gold < 500', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, gold: 400 } : c)
      });
      useGameStore.getState().developFloodControl(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('金不足'));
    });

    it('developFloodControl falls back to best officer when no governor', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => ({ ...o, isGovernor: false }))
      });
      useGameStore.getState().developFloodControl(1);
      // Should succeed by falling back to the best available officer
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('治水發展'));
    });

    it('developFloodControl fails if officer already acted', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, acted: true } : o)
      });
      useGameStore.getState().developFloodControl(1);
      expect(useGameStore.getState().log.length).toBeGreaterThan(0);
    });

    it('developTechnology fails if gold < 800', () => {
      useGameStore.setState({ cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, gold: 700 } : c) });
      useGameStore.getState().developTechnology(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('金不足'));
    });

    it('trainTroops fails if food < 500 or troops == 0', () => {
      useGameStore.setState({ cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, food: 400 } : c) });
      useGameStore.getState().trainTroops(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('糧不足'));

      useGameStore.setState({ cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, food: 1000, troops: 0 } : c) });
      useGameStore.getState().trainTroops(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('城中無兵'));
    });

    it('manufacture fails if no skill or tech too low', () => {
      // Remove skill
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, skills: [] } : o)
      });
      useGameStore.getState().manufacture(1, 'crossbows');
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('不具備製造技能'));

      // Add skill but low tech
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, skills: ['manufacture'] } : o),
        cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, technology: 20 } : c)
      });
      useGameStore.getState().manufacture(1, 'crossbows');
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('技術不足'));
    });

    it('disasterRelief fails if resources insufficient', () => {
      useGameStore.setState({ cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, gold: 100 } : c) });
      useGameStore.getState().disasterRelief(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('資源不足，無法賑災'));
    });
  });

  describe('Personnel (人事) - Edge Cases', () => {
    it('searchOfficer fails if no recruiters or officer already acted', () => {
      useGameStore.setState({ officers: [] });
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('城中無人可派'));

      // Restore officer but already acted
      useGameStore.setState({
        officers: [{
          id: 1, name: '荀彧', leadership: 85, war: 60, intelligence: 95, politics: 95, charisma: 90,
          skills: ['talent'] as RTK4Skill[], portraitId: 1, birthYear: 160, deathYear: 220,
          treasureId: null, factionId: 1, cityId: 1, acted: true, loyalty: 100, isGovernor: true, rank: 'common' as const, relationships: []
        }]
      });
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log.length).toBeGreaterThan(0);
    });

    it('searchOfficer can find nothing', () => {
      // Add an unaffiliated officer so search is allowed
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 99, name: '隱士', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
            skills: [] as RTK4Skill[], portraitId: 99, birthYear: 160, deathYear: 220, treasureId: null,
            factionId: null, cityId: 1, acted: false, loyalty: 30, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.9);
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('一無所獲'));
      mockRandom.mockRestore();
    });

    it('searchOfficer rejects when no unaffiliated officers in city', () => {
      // No unaffiliated officers — should be rejected without consuming action
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('在野'));
      // Officer should NOT have acted
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officer?.acted).toBe(false);
    });

    it('recruitPOW fails if recruitment fails', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => o.id === 2 ? { ...o, factionId: -1 as unknown as number, cityId: 1, loyalty: 100 } : o)
      });
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      useGameStore.getState().recruitPOW(2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('勸降 呂布 失敗'));
      mockRandom.mockRestore();
    });
  });

  describe('Military (軍事) - Edge Cases', () => {
    it('transport fails if resources or officer already acted', () => {
      // Make city 2 player-owned so transport ownership check passes
      useGameStore.setState({ cities: useGameStore.getState().cities.map(c => {
        if (c.id === 1) return { ...c, gold: 100 };
        if (c.id === 2) return { ...c, factionId: 1 };
        return c;
      }) });
      useGameStore.getState().transport(1, 2, { gold: 1000 });
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('金不足，無法輸送'));

      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, gold: 10000 } : c),
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, acted: true } : o)
      });
      useGameStore.getState().transport(1, 2, { gold: 1000 });
      expect(useGameStore.getState().log.length).toBeGreaterThan(0);
    });

    it('transferOfficer fails if officer already acted', () => {
      useGameStore.setState({ officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, acted: true } : o) });
      useGameStore.getState().transferOfficer(1, 2);
      expect(useGameStore.getState().log.length).toBeGreaterThan(0);
    });

    it('startBattle fails if weapon insufficient', () => {
      // Need at least 2 officers so the "must leave one" check passes first
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 10, name: '守城將', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
            skills: [] as RTK4Skill[], portraitId: 10, birthYear: 160, deathYear: 220, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
        cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, warHorses: 0 } : c),
      });
      useGameStore.getState().setBattleFormation({ officerIds: [1], unitTypes: ['cavalry'] });
      useGameStore.getState().startBattle(2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('武器不足'));
    });
  });

  describe('Diplomacy (外交) - Edge Cases', () => {
    it('proposeCeasefire fails if proposal rejected', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      useGameStore.getState().proposeCeasefire(2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('拒絕了停戰協議'));
      mockRandom.mockRestore();
    });

    it('demandSurrender fails if rejected', () => {
      useGameStore.getState().demandSurrender(2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('拒絕了投降的要求'));
    });

    it('requestJointAttack fails if rejected', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      useGameStore.getState().requestJointAttack(2, 2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('拒絕了共同作戰'));
      mockRandom.mockRestore();
    });
  });

  describe('Strategy (謀略) - Edge Cases', () => {
    it('arson fails if rejected', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      useGameStore.getState().arson(2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('放火行動失敗'));
      mockRandom.mockRestore();
    });

    it('spy fails if caught', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      useGameStore.getState().spy(2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('潛入失敗'));
      mockRandom.mockRestore();
    });

    it('counterEspionage fails if rejected', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      useGameStore.getState().counterEspionage(2, 2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('反間計策失敗'));
      mockRandom.mockRestore();
    });
  });

  describe('Bug Fixes & Validations', () => {
    it('startBattle requires troops', () => {
      // Need at least 2 officers so the "must leave one" check passes first
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 10, name: '守城將', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
            skills: [] as RTK4Skill[], portraitId: 10, birthYear: 160, deathYear: 220, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
        cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, troops: 0 } : c),
      });
      // Use formation to select only 1 of 2 officers, so "must leave one" passes
      useGameStore.getState().setBattleFormation({
        officerIds: [1],
        unitTypes: ['infantry'],
      });
      useGameStore.getState().startBattle(2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('兵力不足'));
    });

    it('requestJointAttack safe against empty officer list', () => {
      // Remove all officers
      useGameStore.setState({ officers: [] });
      // Should not throw
      useGameStore.getState().requestJointAttack(2, 2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('城中無人可派'));
    });

    it('demandSurrender counts cities by factionId', () => {
      // Setup: Player has 6 cities (factionId 1), Target has 1 city (factionId 2)
      // Ensure city ID != faction ID to test the bug fix
      const cities = [
        { id: 10, factionId: 1 }, { id: 11, factionId: 1 }, { id: 12, factionId: 1 },
        { id: 13, factionId: 1 }, { id: 14, factionId: 1 }, { id: 15, factionId: 1 },
        { id: 20, factionId: 2 }
      ].map(c => ({ ...useGameStore.getState().cities[0], ...c, name: 'C' + c.id }));

      useGameStore.setState({
        cities,
        selectedCityId: 10,
        officers: useGameStore.getState().officers.map(o =>
          o.id === 1 ? { ...o, cityId: 10 } : o
        ),
      });

      // Mock random to succeed
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      useGameStore.getState().demandSurrender(2);

      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('向我軍投降'));
      mockRandom.mockRestore();
    });

    it('exchangeHostage validates constraints', () => {
      // Fail if officer not in faction
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, factionId: 2 } : o)
      });
      useGameStore.getState().exchangeHostage(1, 2);
      expect(useGameStore.getState().factions.find(f => f.id === 2)?.hostageOfficerIds).not.toContain(1);

      // Fail if already hostage
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, factionId: 1, cityId: -2 } : o)
      });
      useGameStore.getState().exchangeHostage(1, 2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('已經是人質'));
    });

    it('transferOfficer validates target ownership', () => {
      // Target city 2 is enemy (faction 2)
      useGameStore.getState().transferOfficer(1, 2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('只能移動到我方城市'));
    });

    it('rewardOfficer handles treasure stub', () => {
      useGameStore.getState().rewardOfficer(1, 'treasure');
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('尚未實裝'));
    });

    describe('startBattle must leave at least one officer in city', () => {
      it('rejects when city has only one officer (store API)', () => {
        // Default setup: city 1 has one officer (id=1). Sending that officer leaves city empty.
        useGameStore.getState().setBattleFormation({
          officerIds: [1],
          unitTypes: ['infantry'],
        });
        useGameStore.getState().startBattle(2);
        // Battle should NOT start
        expect(useGameStore.getState().phase).toBe('playing');
        expect(useGameStore.getState().log).toContainEqual(
          expect.stringContaining('至少須留一名武將守城')
        );
      });

      it('rejects when formation selects all officers in city (store API)', () => {
        // Add a second officer to city 1
        useGameStore.setState({
          officers: [
            ...useGameStore.getState().officers,
            {
              id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
              skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
              factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
            },
          ],
        });
        // Select both officers for battle — none would remain
        useGameStore.getState().setBattleFormation({
          officerIds: [1, 3],
          unitTypes: ['infantry', 'infantry'],
        });
        useGameStore.getState().startBattle(2);
        expect(useGameStore.getState().phase).toBe('playing');
        expect(useGameStore.getState().log).toContainEqual(
          expect.stringContaining('至少須留一名武將守城')
        );
      });

      it('succeeds when at least one officer remains in city (store API)', () => {
        // Add two more officers to city 1 (total: 3 officers)
        useGameStore.setState({
          officers: [
            ...useGameStore.getState().officers,
            {
              id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
              skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
              factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
            },
            {
              id: 4, name: '夏侯惇', leadership: 88, war: 90, intelligence: 50, politics: 40, charisma: 70,
              skills: [] as RTK4Skill[], portraitId: 4, birthYear: 160, deathYear: 220, treasureId: null,
              factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
            },
          ],
        });
        // Send 2 of 3 officers — one remains
        useGameStore.getState().setBattleFormation({
          officerIds: [1, 3],
          unitTypes: ['infantry', 'infantry'],
        });
        useGameStore.getState().startBattle(2);
        expect(useGameStore.getState().phase).toBe('battle');
      });

      it('counts acted officers as remaining (store API)', () => {
        // Add a second officer who has already acted — they still count as "remaining"
        useGameStore.setState({
          officers: [
            ...useGameStore.getState().officers,
            {
              id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
              skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
              factionId: 1, cityId: 1, acted: true, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
            },
          ],
        });
        // Send officer 1 (the only non-acted one), officer 3 stays (acted but still in city)
        useGameStore.getState().setBattleFormation({
          officerIds: [1],
          unitTypes: ['infantry'],
        });
        useGameStore.getState().startBattle(2);
        expect(useGameStore.getState().phase).toBe('battle');
      });

      it('aiStartBattle skips when city has only one officer', () => {
        // City 2 has only officer 2 (enemy faction)
        const logBefore = useGameStore.getState().log.length;
        useGameStore.getState().aiStartBattle(2, 1);
        // Should not start a battle — no officers sent
        expect(useGameStore.getState().phase).toBe('playing');
        // No new log about a march or battle should appear
        const logsAfter = useGameStore.getState().log;
        const battleLogs = logsAfter.slice(logBefore).filter(l =>
          l.includes('出征') || l.includes('march') || l.includes('進攻')
        );
        expect(battleLogs.length).toBe(0);
      });

      it('aiStartBattle sends at most N-1 officers when city has multiple', () => {
        // Give faction 2 three officers in city 2
        useGameStore.setState({
          officers: [
            ...useGameStore.getState().officers,
            {
              id: 5, name: '張遼AI', leadership: 88, war: 85, intelligence: 70, politics: 60, charisma: 75,
              skills: [] as RTK4Skill[], portraitId: 5, birthYear: 165, deathYear: 230, treasureId: null,
              factionId: 2, cityId: 2, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
            },
            {
              id: 6, name: '高順AI', leadership: 80, war: 80, intelligence: 60, politics: 50, charisma: 60,
              skills: [] as RTK4Skill[], portraitId: 6, birthYear: 165, deathYear: 220, treasureId: null,
              factionId: 2, cityId: 2, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
            },
          ],
        });
        // AI attacks from city 2 (3 officers) → city 1
        useGameStore.getState().aiStartBattle(2, 1);
        // After battle setup, at least one officer from city 2 should remain
        const state = useGameStore.getState();
        const faction2OfficersInCity2 = state.officers.filter(
          o => o.cityId === 2 && o.factionId === 2
        );
        expect(faction2OfficersInCity2.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Ruler & Appointment Guards', () => {
    it('promoteOfficer rejects rank change for ruler', () => {
      // Officer 1 (荀彧) is ruler in test setup (rulerId: 1)
      useGameStore.getState().promoteOfficer(1, 'advisor');
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      // Rank should remain unchanged (whatever it was)
      expect(officer!.rank).not.toBe('advisor');
    });

    it('promoteOfficer works for non-ruler officers', () => {
      // Add a non-ruler officer
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
            skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      useGameStore.getState().promoteOfficer(3, 'general');
      const officer = useGameStore.getState().officers.find(o => o.id === 3);
      expect(officer!.rank).toBe('general');
    });

    it('appointGovernor rejects appointment in ruler city (R-001)', () => {
      // Officer 1 is the ruler and already governor of city 1.
      // Trying to appoint anyone in this city should be rejected.
      useGameStore.setState({
        officers: [
          // Ruler is governor
          { ...useGameStore.getState().officers[0], isGovernor: true },
          useGameStore.getState().officers[1],
          {
            id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
            skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      useGameStore.getState().appointGovernor(1, 3);
      const ruler = useGameStore.getState().officers.find(o => o.id === 1);
      const other = useGameStore.getState().officers.find(o => o.id === 3);
      expect(ruler!.isGovernor).toBe(true);  // ruler stays governor
      expect(other!.isGovernor).toBe(false);  // appointment rejected
    });

    it('appointGovernor works in city without ruler', () => {
      // Add a non-ruler officer to city 2 (no ruler there)
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c),
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
            skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
            factionId: 1, cityId: 2, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      useGameStore.getState().appointGovernor(2, 3);
      const officer = useGameStore.getState().officers.find(o => o.id === 3);
      expect(officer!.isGovernor).toBe(true);
    });
  });

  describe('R-006: Rank Slot Limits', () => {
    it('promoteOfficer rejects governor rank (auto-assigned only)', () => {
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
            skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      useGameStore.getState().promoteOfficer(3, 'governor');
      const officer = useGameStore.getState().officers.find(o => o.id === 3);
      expect(officer!.rank).toBe('common');
    });

    it('promoteOfficer rejects advisor when slot is full', () => {
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 3, name: '郭嘉', leadership: 60, war: 45, intelligence: 96, politics: 80, charisma: 70,
            skills: [] as RTK4Skill[], portraitId: 3, birthYear: 170, deathYear: 207, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'advisor' as const, relationships: []
          },
          {
            id: 4, name: '荀攸', leadership: 65, war: 40, intelligence: 93, politics: 85, charisma: 72,
            skills: [] as RTK4Skill[], portraitId: 4, birthYear: 157, deathYear: 214, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      // 郭嘉 is already advisor. Promoting 荀攸 to advisor should fail (1 slot max).
      useGameStore.getState().promoteOfficer(4, 'advisor');
      const xunYou = useGameStore.getState().officers.find(o => o.id === 4);
      expect(xunYou!.rank).toBe('common');
    });

    it('promoteOfficer rejects when stat requirements not met', () => {
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 3, name: '文官', leadership: 40, war: 30, intelligence: 60, politics: 80, charisma: 50,
            skills: [] as RTK4Skill[], portraitId: 3, birthYear: 170, deathYear: 230, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      // Low intelligence → can't be advisor
      useGameStore.getState().promoteOfficer(3, 'advisor');
      expect(useGameStore.getState().officers.find(o => o.id === 3)!.rank).toBe('common');
      // Low leadership and war → can't be general
      useGameStore.getState().promoteOfficer(3, 'general');
      expect(useGameStore.getState().officers.find(o => o.id === 3)!.rank).toBe('common');
      // Low leadership → can't be viceroy
      useGameStore.getState().promoteOfficer(3, 'viceroy');
      expect(useGameStore.getState().officers.find(o => o.id === 3)!.rank).toBe('common');
    });

    it('promoteOfficer allows promotion when eligible and slot available', () => {
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
            skills: [] as RTK4Skill[], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
            factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: []
          },
        ],
      });
      // Leadership 90 >= 70 → eligible for general
      useGameStore.getState().promoteOfficer(3, 'general');
      expect(useGameStore.getState().officers.find(o => o.id === 3)!.rank).toBe('general');
    });
  });

  describe('Spy Guards', () => {
    it('spy rejects on empty city without consuming action or gold', () => {
      // Add an empty city (id=3) adjacent to city 1
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c =>
          c.id === 1 ? { ...c, adjacentCityIds: [...c.adjacentCityIds, 3] } : c
        ).concat([{
          id: 3, name: '空城', x: 70, y: 50, factionId: null, population: 10000, gold: 1000, food: 5000,
          commerce: 10, agriculture: 10, defense: 10, troops: 0, adjacentCityIds: [1],
          floodControl: 10, technology: 10, peopleLoyalty: 50, morale: 50, training: 50,
          crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
        }]),
      });

      const goldBefore = useGameStore.getState().cities.find(c => c.id === 1)!.gold;
      const actedBefore = useGameStore.getState().officers.find(o => o.id === 1)!.acted;

      useGameStore.getState().spy(3, 1);

      const goldAfter = useGameStore.getState().cities.find(c => c.id === 1)!.gold;
      const actedAfter = useGameStore.getState().officers.find(o => o.id === 1)!.acted;

      // Gold should NOT be deducted
      expect(goldAfter).toBe(goldBefore);
      // Officer should NOT have acted
      expect(actedAfter).toBe(actedBefore);
      // Should have a log message about empty city
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('空城'));
    });

    it('spy rejects on own city without consuming action or gold', () => {
      const goldBefore = useGameStore.getState().cities.find(c => c.id === 1)!.gold;
      const actedBefore = useGameStore.getState().officers.find(o => o.id === 1)!.acted;

      // Spy on own city (city 1 belongs to faction 1)
      useGameStore.getState().spy(1, 1);

      const goldAfter = useGameStore.getState().cities.find(c => c.id === 1)!.gold;
      const actedAfter = useGameStore.getState().officers.find(o => o.id === 1)!.acted;

      // Gold should NOT be deducted
      expect(goldAfter).toBe(goldBefore);
      // Officer should NOT have acted
      expect(actedAfter).toBe(actedBefore);
      // Should have a log message about own city
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('許昌'));
    });

    it('spy on enemy city consumes action and gold normally', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const goldBefore = useGameStore.getState().cities.find(c => c.id === 1)!.gold;

      useGameStore.getState().spy(2, 1);

      const goldAfter = useGameStore.getState().cities.find(c => c.id === 1)!.gold;
      const actedAfter = useGameStore.getState().officers.find(o => o.id === 1)!.acted;

      // Gold should be deducted by 500
      expect(goldAfter).toBe(goldBefore - 500);
      // Officer should have acted
      expect(actedAfter).toBe(true);
      mockRandom.mockRestore();
    });
  });
});
