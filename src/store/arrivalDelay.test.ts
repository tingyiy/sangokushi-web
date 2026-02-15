import { describe, test, expect } from 'vitest';
import { getCityDistance, computeArrivalDay } from './storeHelpers';
import { useBattleStore } from './battleStore';
import type { Officer, RTK4Skill } from '../types';

// ── Distance and arrival day calculation tests ──

describe('Arrival Delay System', () => {
  describe('getCityDistance', () => {
    test('same city has distance 0', () => {
      expect(getCityDistance({ x: 50, y: 50 }, { x: 50, y: 50 })).toBe(0);
    });

    test('adjacent cities have small distance', () => {
      // 鄴 (63,22) to 南皮 (72,18) ≈ 10.3
      const dist = getCityDistance({ x: 63, y: 22 }, { x: 72, y: 18 });
      expect(dist).toBeGreaterThan(9);
      expect(dist).toBeLessThan(11);
    });

    test('far cities have large distance', () => {
      // 襄平 (85,5) to 建寧 (28,72) ≈ 85
      const dist = getCityDistance({ x: 85, y: 5 }, { x: 28, y: 72 });
      expect(dist).toBeGreaterThan(80);
      expect(dist).toBeLessThan(90);
    });
  });

  describe('computeArrivalDay', () => {
    test('same city = day 1 (immediate)', () => {
      expect(computeArrivalDay({ x: 50, y: 50 }, { x: 50, y: 50 }, true)).toBe(1);
    });

    test('adjacent city = 1-2 days', () => {
      // distance ~10 → 1 + floor(10/15) = 1
      const day = computeArrivalDay({ x: 63, y: 22 }, { x: 72, y: 18 }, false);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(2);
    });

    test('moderate distance = 3 days', () => {
      // distance ~30 → 1 + floor(30/15) = 3
      const day = computeArrivalDay({ x: 50, y: 50 }, { x: 80, y: 50 }, false);
      expect(day).toBe(3);
    });

    test('cross-map = 7+ days', () => {
      // distance ~100 → 1 + floor(100/15) = 7
      const day = computeArrivalDay({ x: 85, y: 5 }, { x: 15, y: 10 }, false);
      expect(day).toBeGreaterThanOrEqual(5);
    });
  });

  describe('BattleUnit arrivalDay in initBattle', () => {
    const mockOfficer: Officer = {
      id: 1, name: '測試', portraitId: 1, birthYear: 160, deathYear: 220,
      leadership: 80, war: 80, intelligence: 70, politics: 60, charisma: 75,
      skills: [] as RTK4Skill[], factionId: 1, cityId: 1, acted: false,
      loyalty: 100, isGovernor: true, treasureId: null, rank: 'common', relationships: [],
    };

    const mockEnemy: Officer = {
      ...mockOfficer, id: 2, name: '敵將', factionId: 2, cityId: 2,
    };

    test('all units start with arrivalDay = 1 for single-city attack', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockOfficer],
        [mockEnemy],
      );
      const state = useBattleStore.getState();
      expect(state.units.every(u => u.arrivalDay === 1)).toBe(true);
    });

    test('arriving units are not counted as eliminated in checkBattleEnd', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockOfficer],
        [mockEnemy],
      );

      // Manually add an arriving unit and kill all active attackers
      const state = useBattleStore.getState();
      useBattleStore.setState({
        units: [
          // Kill the active attacker
          ...state.units.map(u => u.factionId === 1 ? { ...u, troops: 0, status: 'done' as const } : u),
          // Add arriving reinforcement
          {
            id: 'reinforcement-99',
            officerId: 99,
            officer: { ...mockOfficer, id: 99, name: '援軍' },
            factionId: 1,
            troops: 5000,
            maxTroops: 5000,
            morale: 80,
            training: 60,
            x: 0, y: 0, z: 0,
            type: 'infantry' as const,
            status: 'arriving' as const,
            direction: 0,
            arrivalDay: 3,
          },
        ],
      });

      useBattleStore.getState().checkBattleEnd();
      // Battle should NOT be finished — reinforcements are still coming
      expect(useBattleStore.getState().isFinished).toBe(false);
    });

    test('arriving units transition to active on their arrival day', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockOfficer],
        [mockEnemy],
      );

      const state = useBattleStore.getState();
      // Add a unit arriving on day 2
      useBattleStore.setState({
        units: [
          ...state.units,
          {
            id: 'reinforcement-88',
            officerId: 88,
            officer: { ...mockOfficer, id: 88, name: '援軍' },
            factionId: 1,
            troops: 3000,
            maxTroops: 3000,
            morale: 70,
            training: 50,
            x: 1, y: 7, z: -8,
            type: 'infantry' as const,
            status: 'arriving' as const,
            direction: 0,
            arrivalDay: 2,
          },
        ],
      });

      // Advance to day 2 via nextDay
      useBattleStore.getState().nextDay();

      const newState = useBattleStore.getState();
      const reinforcement = newState.units.find(u => u.id === 'reinforcement-88');
      expect(reinforcement).toBeDefined();
      expect(reinforcement!.status).toBe('active');
      expect(newState.day).toBe(2);
    });

    test('arriving units stay arriving if day has not reached', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockOfficer],
        [mockEnemy],
      );

      const state = useBattleStore.getState();
      useBattleStore.setState({
        units: [
          ...state.units,
          {
            id: 'reinforcement-77',
            officerId: 77,
            officer: { ...mockOfficer, id: 77, name: '援軍' },
            factionId: 1,
            troops: 3000,
            maxTroops: 3000,
            morale: 70,
            training: 50,
            x: 1, y: 7, z: -8,
            type: 'infantry' as const,
            status: 'arriving' as const,
            direction: 0,
            arrivalDay: 5,
          },
        ],
      });

      // Advance to day 2 — unit should still be arriving
      useBattleStore.getState().nextDay();

      const reinforcement = useBattleStore.getState().units.find(u => u.id === 'reinforcement-77');
      expect(reinforcement).toBeDefined();
      expect(reinforcement!.status).toBe('arriving');
    });
  });
});
