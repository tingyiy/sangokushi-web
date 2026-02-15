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

function initTestBattle(opts?: { attackerFood?: number; defenderFood?: number }) {
  useBattleStore.getState().initBattle(
    1, 2, 10,
    [mockAttacker], [mockDefender],
    80, 80, 50,
    ['infantry'], ['infantry'],
    [5000], [5000],
    1, 'west',
    opts?.attackerFood ?? 500000,
    opts?.defenderFood ?? 500000,
  );
}

describe('Multi-Month Battle System (R-008)', () => {
  beforeEach(() => {
    useBattleStore.setState({
      units: [], turn: 1, day: 1, isFinished: false, battlePaused: false,
      winnerFactionId: null, isSiege: false, gates: [], fireHexes: [],
      capturedOfficerIds: [], routedOfficerIds: [],
      attackerFood: 0, defenderFood: 0, attackerStarveDays: 0, defenderStarveDays: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Battle pauses at day 30', () => {
    test('nextDay pauses battle when day exceeds 30', () => {
      initTestBattle();

      // Advance to day 30
      useBattleStore.setState({ day: 30 });

      // Suppress random Math.random for fire/etc
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      useBattleStore.getState().nextDay();

      const state = useBattleStore.getState();
      expect(state.battlePaused).toBe(true);
      // Day should NOT advance past 30 — the pause stops it
      expect(state.day).toBe(30);
      expect(state.isFinished).toBe(false);
    });

    test('nextDay at day 29 advances normally to day 30', () => {
      initTestBattle();
      useBattleStore.setState({ day: 29 });
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      useBattleStore.getState().nextDay();

      const state = useBattleStore.getState();
      expect(state.battlePaused).toBe(false);
      expect(state.day).toBe(30);
    });

    test('battle log records month end message when paused', () => {
      initTestBattle();
      useBattleStore.setState({ day: 30 });
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      useBattleStore.getState().nextDay();

      const state = useBattleStore.getState();
      const logEntry = state.battleLog[state.battleLog.length - 1];
      // The i18n key logs:battle.monthEnd should resolve to a non-empty string
      expect(logEntry).toBeTruthy();
      expect(typeof logEntry).toBe('string');
    });
  });

  describe('resumeBattle()', () => {
    test('resumeBattle resets day to 1 and clears pause flag', () => {
      initTestBattle();
      useBattleStore.setState({ day: 30, battlePaused: true });

      useBattleStore.getState().resumeBattle(0);

      const state = useBattleStore.getState();
      expect(state.day).toBe(1);
      expect(state.battlePaused).toBe(false);
    });

    test('resumeBattle resupplies defender food', () => {
      initTestBattle({ defenderFood: 1000 });
      // After 30 days, defender may have some food left
      useBattleStore.setState({ day: 30, battlePaused: true, defenderFood: 200 });

      useBattleStore.getState().resumeBattle(5000);

      const state = useBattleStore.getState();
      // Defender food = remaining (200) + resupply (5000)
      expect(state.defenderFood).toBe(5200);
    });

    test('resumeBattle resets starvation counters', () => {
      initTestBattle();
      useBattleStore.setState({
        day: 30, battlePaused: true,
        attackerStarveDays: 3, defenderStarveDays: 2,
      });

      useBattleStore.getState().resumeBattle(0);

      const state = useBattleStore.getState();
      expect(state.attackerStarveDays).toBe(0);
      expect(state.defenderStarveDays).toBe(0);
    });

    test('resumeBattle reactivates living non-routed units', () => {
      initTestBattle();
      // Mark units as 'done' (end of previous day)
      useBattleStore.setState({
        day: 30, battlePaused: true,
        units: useBattleStore.getState().units.map(u => ({ ...u, status: 'done' as const, hasMoved: true })),
      });

      useBattleStore.getState().resumeBattle(0);

      const state = useBattleStore.getState();
      const liveUnits = state.units.filter(u => u.troops > 0);
      for (const u of liveUnits) {
        expect(u.status).toBe('active');
        expect(u.hasMoved).toBe(false);
      }
    });

    test('resumeBattle does not reactivate routed units', () => {
      initTestBattle();
      // Set one unit as routed
      const units = useBattleStore.getState().units;
      const routedUnits = units.map((u, i) =>
        i === 0 ? { ...u, status: 'routed' as const, morale: 10 } : { ...u, status: 'done' as const },
      );
      useBattleStore.setState({ day: 30, battlePaused: true, units: routedUnits });

      useBattleStore.getState().resumeBattle(0);

      const state = useBattleStore.getState();
      const routed = state.units.find(u => u.morale === 10);
      expect(routed?.status).toBe('routed');
    });

    test('resumeBattle is no-op when battle is not paused', () => {
      initTestBattle();
      useBattleStore.setState({ day: 15, battlePaused: false });

      useBattleStore.getState().resumeBattle(9999);

      const state = useBattleStore.getState();
      // Day should not change since battle was not paused
      expect(state.day).toBe(15);
    });

    test('resumeBattle sets turnPhase to player and selects first player unit', () => {
      initTestBattle();
      useBattleStore.setState({ day: 30, battlePaused: true, turnPhase: 'enemy' });

      useBattleStore.getState().resumeBattle(0);

      const state = useBattleStore.getState();
      expect(state.turnPhase).toBe('player');
      expect(state.activeUnitId).toBeTruthy();
      // Active unit should be a player faction unit
      const activeUnit = state.units.find(u => u.id === state.activeUnitId);
      expect(activeUnit?.factionId).toBe(state.playerFactionId);
    });
  });

  describe('initBattle resets battlePaused', () => {
    test('initBattle clears stale battlePaused from previous battle', () => {
      // Simulate leftover paused state from a previous battle
      useBattleStore.setState({ battlePaused: true });

      initTestBattle();

      const state = useBattleStore.getState();
      expect(state.battlePaused).toBe(false);
    });
  });
});
