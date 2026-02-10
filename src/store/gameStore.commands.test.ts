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
          skills: ['製造', '人才', '做敵', '驅虎', '燒討', '情報', '外交'] as RTK4Skill[],
          portraitId: 1, birthYear: 160, deathYear: 220, treasureId: null, factionId: 1, cityId: 1,
          stamina: 100, loyalty: 100, isGovernor: true, rank: '一般' as const, relationships: []
        },
        {
          id: 2, name: '呂布', leadership: 95, war: 100, intelligence: 20, politics: 15, charisma: 40,
          skills: [] as RTK4Skill[], portraitId: 2, birthYear: 160, deathYear: 200, treasureId: null,
          factionId: 2, cityId: 2, stamina: 100, loyalty: 50, isGovernor: true, rank: '一般' as const, relationships: []
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
      expect(useGameStore.getState().officers[0].stamina).toBe(80);
    });

    it('developTechnology works', () => {
      useGameStore.getState().developTechnology(1);
      const city = useGameStore.getState().cities.find(c => c.id === 1);
      expect(city?.technology).toBeGreaterThan(50);
      expect(city?.gold).toBe(9200);
      expect(useGameStore.getState().officers[0].stamina).toBe(75);
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
  });

  describe('Personnel (人事)', () => {
    it('searchOfficer finds unaffiliated', () => {
      useGameStore.setState({
        officers: [...useGameStore.getState().officers, {
          id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 80, politics: 75, charisma: 85,
          skills: [], portraitId: 3, birthYear: 160, deathYear: 230, treasureId: null,
          factionId: null, cityId: 1, stamina: 100, loyalty: 0, isGovernor: false, rank: '一般' as const, relationships: []
        }]
      });
      // Mock random to succeed
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('找到了 張遼'));
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
          factionId: 1, cityId: 1, stamina: 100, loyalty: 100, isGovernor: false, rank: '一般' as const, relationships: []
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
      useGameStore.getState().transport(1, 2, 'gold', 2000);
      const city1 = useGameStore.getState().cities.find(c => c.id === 1);
      const city2 = useGameStore.getState().cities.find(c => c.id === 2);
      expect(city1?.gold).toBe(8000);
      expect(city2?.gold).toBe(12000);
    });

    it('transferOfficer works', () => {
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 2 ? { ...c, factionId: 1 } : c)
      });
      useGameStore.getState().transferOfficer(1, 2);
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officer?.cityId).toBe(2);
      expect(officer?.stamina).toBe(90);
    });

    it('startBattle with formation works', () => {
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

    it('developFloodControl fails if no governor', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => ({ ...o, isGovernor: false }))
      });
      useGameStore.getState().developFloodControl(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('城中無太守'));
    });

    it('developFloodControl fails if stamina < 20', () => {
      useGameStore.setState({
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, stamina: 10 } : o)
      });
      useGameStore.getState().developFloodControl(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
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
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, skills: ['製造'] } : o),
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
    it('searchOfficer fails if no recruiters or stamina low', () => {
      useGameStore.setState({ officers: [] });
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('城中無人可派'));

      // Restore officer but low stamina
      useGameStore.setState({
        officers: [{
          id: 1, name: '荀彧', leadership: 85, war: 60, intelligence: 95, politics: 95, charisma: 90,
          skills: ['人才'] as RTK4Skill[], portraitId: 1, birthYear: 160, deathYear: 220,
          treasureId: null, factionId: 1, cityId: 1, stamina: 5, loyalty: 100, isGovernor: true, rank: '一般' as const, relationships: []
        }]
      });
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });

    it('searchOfficer can find nothing', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.9);
      useGameStore.getState().searchOfficer(1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('一無所獲'));
      mockRandom.mockRestore();
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
    it('transport fails if resources or stamina insufficient', () => {
      useGameStore.setState({ cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, gold: 100 } : c) });
      useGameStore.getState().transport(1, 2, 'gold', 1000);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('金不足，無法輸送'));

      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, gold: 10000 } : c),
        officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, stamina: 5 } : o)
      });
      useGameStore.getState().transport(1, 2, 'gold', 1000);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });

    it('transferOfficer fails if stamina low', () => {
      useGameStore.setState({ officers: useGameStore.getState().officers.map(o => o.id === 1 ? { ...o, stamina: 5 } : o) });
      useGameStore.getState().transferOfficer(1, 2);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('體力不足'));
    });

    it('startBattle fails if weapon insufficient', () => {
      useGameStore.setState({ cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, warHorses: 0 } : c) });
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
      useGameStore.setState({ cities: useGameStore.getState().cities.map(c => c.id === 1 ? { ...c, troops: 0 } : c) });
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
  });
});
