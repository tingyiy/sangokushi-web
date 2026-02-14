/**
 * RTK IV Rule R-001: Ruler IS the Governor of Their City
 *
 * Verified: RTK IV (SFC/PC), Scenario 1 (189), playing as 曹操 in 陳留.
 * City panel shows 君主: 曹操 / 太守: 曹操.
 * 人事 → 任命 → 陳留 → 太守 → "沒有可擔任太守的武將"
 *
 * See docs/rtk4-rules.md R-001 for full description.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { scenarios } from '../data/scenarios';
import type { RTK4Skill } from '../types';

describe('R-001: Ruler IS the Governor', () => {
  // Minimal test state: officer 1 is ruler of faction 1, in city 1
  beforeEach(() => {
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
          id: 1, name: '陳留', x: 50, y: 50, factionId: 1, population: 100000,
          gold: 10000, food: 50000, commerce: 50, agriculture: 50, defense: 30,
          troops: 10000, adjacentCityIds: [2],
          floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
          crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
        },
        {
          id: 2, name: '洛陽', x: 60, y: 50, factionId: 1, population: 80000,
          gold: 8000, food: 40000, commerce: 40, agriculture: 40, defense: 20,
          troops: 5000, adjacentCityIds: [1],
          floodControl: 40, technology: 40, peopleLoyalty: 60, morale: 50, training: 50,
          crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
        },
      ],
      officers: [
        {
          id: 1, name: '曹操', leadership: 95, war: 75, intelligence: 91, politics: 94, charisma: 96,
          skills: ['diplomacy'] as RTK4Skill[], portraitId: 1, birthYear: 155, deathYear: 220,
          treasureId: null, factionId: 1, cityId: 1, acted: false, loyalty: 100,
          isGovernor: true, rank: 'viceroy' as const, relationships: [],
        },
        {
          id: 2, name: '荀彧', leadership: 85, war: 60, intelligence: 95, politics: 95, charisma: 90,
          skills: ['intelligence'] as RTK4Skill[], portraitId: 2, birthYear: 163, deathYear: 212,
          treasureId: null, factionId: 1, cityId: 1, acted: false, loyalty: 100,
          isGovernor: false, rank: 'general' as const, relationships: [],
        },
        {
          id: 3, name: '夏侯惇', leadership: 88, war: 85, intelligence: 50, politics: 55, charisma: 75,
          skills: [] as RTK4Skill[], portraitId: 3, birthYear: 157, deathYear: 220,
          treasureId: null, factionId: 1, cityId: 2, acted: false, loyalty: 100,
          isGovernor: true, rank: 'governor' as const, relationships: [],
        },
      ],
      factions: [
        {
          id: 1, name: '曹操', rulerId: 1, color: '#3b82f6', isPlayer: true,
          relations: { 2: 60 }, allies: [], ceasefires: [],
          hostageOfficerIds: [], powOfficerIds: [], advisorId: null,
        },
      ],
      year: 190, month: 1, selectedCityId: 1, activeCommandCategory: null,
      log: [], duelState: null, battleFormation: null,
    });
  });

  describe('selectScenario invariant', () => {
    it('ruler has isGovernor=true in every scenario', () => {
      for (const scenario of scenarios) {
        useGameStore.getState().selectScenario(scenario);
        const state = useGameStore.getState();
        for (const faction of state.factions) {
          const ruler = state.officers.find(o => o.id === faction.rulerId);
          if (ruler) {
            expect(ruler.isGovernor, `ruler ${ruler.name} (faction ${faction.name}) should be governor`).toBe(true);
          }
        }
      }
    });

    it('ruler has rank viceroy in every scenario', () => {
      for (const scenario of scenarios) {
        useGameStore.getState().selectScenario(scenario);
        const state = useGameStore.getState();
        for (const faction of state.factions) {
          const ruler = state.officers.find(o => o.id === faction.rulerId);
          if (ruler) {
            expect(ruler.rank, `ruler ${ruler.name} should be viceroy`).toBe('viceroy');
          }
        }
      }
    });

    it('no other officer is governor in the ruler city', () => {
      for (const scenario of scenarios) {
        useGameStore.getState().selectScenario(scenario);
        const state = useGameStore.getState();
        for (const faction of state.factions) {
          const ruler = state.officers.find(o => o.id === faction.rulerId);
          if (!ruler || ruler.cityId === null) continue;
          const othersGov = state.officers.filter(
            o => o.cityId === ruler.cityId && o.factionId === faction.id && o.id !== ruler.id && o.isGovernor
          );
          expect(othersGov.length, `no other governor in ${ruler.name}'s city`).toBe(0);
        }
      }
    });

    it('every faction city has exactly one governor', () => {
      for (const scenario of scenarios) {
        useGameStore.getState().selectScenario(scenario);
        const state = useGameStore.getState();
        for (const faction of state.factions) {
          const factionCities = state.cities.filter(c => c.factionId === faction.id);
          for (const city of factionCities) {
            const govs = state.officers.filter(
              o => o.cityId === city.id && o.factionId === faction.id && o.isGovernor
            );
            expect(govs.length, `city ${city.name} (faction ${faction.name}) should have exactly 1 governor`).toBe(1);
          }
        }
      }
    });
  });

  describe('appointGovernor respects ruler', () => {
    it('cannot appoint another officer as governor in ruler city', () => {
      // Officer 2 (荀彧) is in city 1 with ruler. Appointing should be rejected.
      useGameStore.getState().appointGovernor(1, 2);
      const ruler = useGameStore.getState().officers.find(o => o.id === 1);
      const other = useGameStore.getState().officers.find(o => o.id === 2);
      expect(ruler!.isGovernor).toBe(true);   // ruler stays governor
      expect(other!.isGovernor).toBe(false);   // other stays non-governor
    });

    it('can appoint governor in a city without ruler', () => {
      // City 2 has no ruler, add another officer there
      useGameStore.setState({
        officers: [
          ...useGameStore.getState().officers,
          {
            id: 4, name: '程昱', leadership: 60, war: 50, intelligence: 88, politics: 85, charisma: 70,
            skills: [] as RTK4Skill[], portraitId: 4, birthYear: 141, deathYear: 220,
            treasureId: null, factionId: 1, cityId: 2, acted: false, loyalty: 90,
            isGovernor: false, rank: 'common' as const, relationships: [],
          },
        ],
      });
      useGameStore.getState().appointGovernor(2, 4);
      const appointed = useGameStore.getState().officers.find(o => o.id === 4);
      expect(appointed!.isGovernor).toBe(true);
    });
  });

  describe('transferOfficer updates governor correctly', () => {
    it('ruler transferring to new city becomes governor there', () => {
      // Transfer ruler (id 1) from city 1 to city 2
      useGameStore.getState().transferOfficer(1, 2);
      const state = useGameStore.getState();
      const ruler = state.officers.find(o => o.id === 1);
      expect(ruler!.cityId).toBe(2);
      expect(ruler!.isGovernor).toBe(true);  // ruler governs new city
    });

    it('old city gets a new governor when ruler leaves', () => {
      // Transfer ruler from city 1 to city 2; officer 2 (荀彧) should become governor of city 1
      useGameStore.getState().transferOfficer(1, 2);
      const state = useGameStore.getState();
      const xunYu = state.officers.find(o => o.id === 2);
      expect(xunYu!.cityId).toBe(1);
      expect(xunYu!.isGovernor).toBe(true);
    });

    it('previous governor in destination city loses governor when ruler arrives', () => {
      // City 2 has 夏侯惇 (id 3) as governor. When ruler transfers there, 夏侯惇 loses governor.
      useGameStore.getState().transferOfficer(1, 2);
      const state = useGameStore.getState();
      const xiahou = state.officers.find(o => o.id === 3);
      expect(xiahou!.isGovernor).toBe(false);
    });
  });
});
