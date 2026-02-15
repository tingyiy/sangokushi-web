import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBattleStore } from './battleStore';
import type { Officer, RTK4Skill } from '../types';

const mockAttacker: Officer = {
  id: 1, name: '曹操', portraitId: 20, birthYear: 155, deathYear: 220,
  leadership: 99, war: 88, intelligence: 95, politics: 94, charisma: 98,
  skills: [] as RTK4Skill[], factionId: 1, cityId: 1, acted: false,
  loyalty: 100, isGovernor: true, treasureId: null, rank: 'common', relationships: [],
};

const mockDefender: Officer = {
  ...mockAttacker, id: 2, name: '劉備', factionId: 2, cityId: 2,
  leadership: 80, war: 75, intelligence: 85, politics: 82, charisma: 99,
};

describe('Battle Food/Supply System', () => {
  beforeEach(() => {
    useBattleStore.setState({
      units: [], turn: 1, day: 1, isFinished: false, winnerFactionId: null,
      isSiege: false, gates: [], fireHexes: [], capturedOfficerIds: [], routedOfficerIds: [],
      attackerFood: 0, defenderFood: 0, attackerStarveDays: 0, defenderStarveDays: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initBattle stores food values', () => {
    test('initBattle with explicit food values stores them in state', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        60, 60, 40,
        ['infantry'], ['infantry'],
        [5000], [5000],
        1, 'west',
        50000, 30000,
      );

      const state = useBattleStore.getState();
      expect(state.attackerFood).toBe(50000);
      expect(state.defenderFood).toBe(30000);
      expect(state.attackerStarveDays).toBe(0);
      expect(state.defenderStarveDays).toBe(0);
    });

    test('initBattle with default food (0) stores zero', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
      );

      const state = useBattleStore.getState();
      expect(state.attackerFood).toBe(0);
      expect(state.defenderFood).toBe(0);
    });

    test('initBattle resets starveDays from previous battle', () => {
      // Simulate leftover state from previous battle
      useBattleStore.setState({ attackerStarveDays: 5, defenderStarveDays: 3 });

      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        60, 60, 40,
        ['infantry'], ['infantry'],
        [5000], [5000],
        1, 'west',
        50000, 30000,
      );

      const state = useBattleStore.getState();
      expect(state.attackerStarveDays).toBe(0);
      expect(state.defenderStarveDays).toBe(0);
    });
  });

  describe('Daily food consumption in nextDay', () => {
    test('food is consumed each day (1 food per living soldier)', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        60, 60, 40,
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        100000, 60000,
      );

      // Day 1 → Day 2
      useBattleStore.getState().nextDay();

      const state = useBattleStore.getState();
      expect(state.day).toBe(2);
      // 5000 troops consumed from attacker food
      expect(state.attackerFood).toBe(100000 - 5000);
      // 3000 troops consumed from defender food
      expect(state.defenderFood).toBe(60000 - 3000);
    });

    test('food does not go below zero', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        60, 60, 40,
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        1000, 500, // Very low food
      );

      useBattleStore.getState().nextDay();

      const state = useBattleStore.getState();
      expect(state.attackerFood).toBe(0); // 1000 - 5000 = 0 (clamped)
      expect(state.defenderFood).toBe(0); // 500 - 3000 = 0 (clamped)
    });

    test('food consumption is based on living troops only', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker, { ...mockAttacker, id: 3, name: '夏侯惇' }],
        [mockDefender],
        60, 60, 40,
        ['infantry', 'infantry'], ['infantry'],
        [5000, 5000], [3000],
        1, 'west',
        200000, 60000,
      );

      // Kill one attacker unit
      useBattleStore.setState(s => ({
        units: s.units.map(u =>
          u.id === 'attacker-3' ? { ...u, troops: 0 } : u
        ),
      }));

      useBattleStore.getState().nextDay();

      const state = useBattleStore.getState();
      // Only 5000 living troops consume food (not 10000)
      expect(state.attackerFood).toBe(200000 - 5000);
    });
  });

  describe('Starvation morale drain', () => {
    test('starvation applies escalating morale penalty when food hits 0', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        80, 80, 40,
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        0, 100000, // Attacker has 0 food from the start
      );

      // Day 1 → Day 2: first starvation day, -5 morale
      useBattleStore.getState().nextDay();
      let state = useBattleStore.getState();
      expect(state.attackerStarveDays).toBe(1);
      const attackerUnit1 = state.units.find(u => u.factionId === 1);
      expect(attackerUnit1!.morale).toBe(80 - 5); // -5 × 1

      // Day 2 → Day 3: second consecutive day, -10 morale
      useBattleStore.getState().nextDay();
      state = useBattleStore.getState();
      expect(state.attackerStarveDays).toBe(2);
      const attackerUnit2 = state.units.find(u => u.factionId === 1);
      expect(attackerUnit2!.morale).toBe(75 - 10); // -5 × 2

      // Day 3 → Day 4: third consecutive day, -15 morale
      useBattleStore.getState().nextDay();
      state = useBattleStore.getState();
      expect(state.attackerStarveDays).toBe(3);
      const attackerUnit3 = state.units.find(u => u.factionId === 1);
      expect(attackerUnit3!.morale).toBe(65 - 15); // -5 × 3 = 50
    });

    test('defender also suffers starvation when their food runs out', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        80, 80, 40,
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        100000, 0, // Defender has 0 food
      );

      useBattleStore.getState().nextDay();
      const state = useBattleStore.getState();
      expect(state.defenderStarveDays).toBe(1);
      const defenderUnit = state.units.find(u => u.factionId === 2);
      expect(defenderUnit!.morale).toBe(80 - 5);
    });

    test('starveDays resets when food is available', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        80, 80, 40,
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        50000, 100000,
      );

      // With 50000 food and 5000 troops, food lasts 10 days
      // Day 1 → Day 2: should have food
      useBattleStore.getState().nextDay();
      expect(useBattleStore.getState().attackerStarveDays).toBe(0);
      expect(useBattleStore.getState().attackerFood).toBe(45000);
    });

    test('units rout when starvation drops morale below 20', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        30, 80, 40, // Low attacker morale
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        0, 100000, // Attacker has 0 food
      );

      // Day 1 → Day 2: -5 morale → 25 (still above 20)
      useBattleStore.getState().nextDay();
      let attacker = useBattleStore.getState().units.find(u => u.factionId === 1);
      expect(attacker!.morale).toBe(25);
      expect(attacker!.status).not.toBe('routed');

      // Day 2 → Day 3: -10 morale → 15 (below 20, should rout)
      useBattleStore.getState().nextDay();
      attacker = useBattleStore.getState().units.find(u => u.factionId === 1);
      expect(attacker!.morale).toBe(15);
      expect(attacker!.status).toBe('routed');
    });

    test('morale does not go below 0', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        10, 80, 40,
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        0, 100000,
      );

      // Day 1 → Day 2: starveDays=1, -5 → morale = 5, rout (< 20)
      useBattleStore.getState().nextDay();
      let attacker = useBattleStore.getState().units.find(u => u.factionId === 1)!;
      expect(attacker.morale).toBe(5);

      // Day 2 → Day 3: starveDays=2, -10 → morale = max(0, 5-10) = 0
      useBattleStore.getState().nextDay();
      attacker = useBattleStore.getState().units.find(u => u.factionId === 1)!;
      // Even if routed and partially off map, morale must be >= 0
      expect(attacker.morale).toBeGreaterThanOrEqual(0);
      expect(attacker.morale).toBeLessThanOrEqual(5);
    });
  });

  describe('No starvation with ample food', () => {
    test('army with enough food never starves', () => {
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        80, 80, 40,
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        500000, 300000, // Very ample food
      );

      // Advance 5 days
      for (let i = 0; i < 5; i++) {
        useBattleStore.getState().nextDay();
      }

      const state = useBattleStore.getState();
      expect(state.attackerStarveDays).toBe(0);
      expect(state.defenderStarveDays).toBe(0);
      expect(state.attackerFood).toBe(500000 - 5000 * 5);
      expect(state.defenderFood).toBe(300000 - 3000 * 5);

      // All units should still have original morale (no penalty)
      const attacker = state.units.find(u => u.factionId === 1);
      expect(attacker!.morale).toBe(80);
    });
  });

  describe('Food depletion mid-battle', () => {
    test('food runs out mid-battle and starvation begins', () => {
      // 5000 troops, 7500 food = 1.5 days of food
      useBattleStore.getState().initBattle(
        1, 2, 1,
        [mockAttacker], [mockDefender],
        80, 80, 40,
        ['infantry'], ['infantry'],
        [5000], [3000],
        1, 'west',
        7500, 100000,
      );

      // Day 1 → Day 2: consume 5000, food = 2500, no starvation
      useBattleStore.getState().nextDay();
      expect(useBattleStore.getState().attackerFood).toBe(2500);
      expect(useBattleStore.getState().attackerStarveDays).toBe(0);

      // Day 2 → Day 3: consume 5000, food = 0, no starvation yet (food just hit 0)
      useBattleStore.getState().nextDay();
      expect(useBattleStore.getState().attackerFood).toBe(0);
      expect(useBattleStore.getState().attackerStarveDays).toBe(1);

      // Day 3 → Day 4: still 0 food, starvation day 2
      useBattleStore.getState().nextDay();
      expect(useBattleStore.getState().attackerStarveDays).toBe(2);
    });
  });
});
