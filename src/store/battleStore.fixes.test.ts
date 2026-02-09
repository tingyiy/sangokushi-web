import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { useBattleStore } from './battleStore';
import type { Officer, RTK4Skill } from '../types';

// Mock officers
const mockOfficer: Officer = {
  id: 1,
  name: '曹操',
  portraitId: 20,
  birthYear: 155,
  deathYear: 220,
  leadership: 99,
  war: 88,
  intelligence: 95,
  politics: 94,
  charisma: 98,
  skills: ['火計', '落石', '同討', '天變', '風變', '混亂', '連環', '落雷', '修復', '罵聲', '虛報', '鼓舞', '伏兵'] as RTK4Skill[],
  factionId: 1,
  cityId: 1,
  stamina: 100,
  loyalty: 100,
  isGovernor: true,
  treasureId: null,
};

const mockEnemy: Officer = {
  id: 2,
  name: '劉備',
  portraitId: 1,
  birthYear: 161,
  deathYear: 223,
  leadership: 80,
  war: 75,
  intelligence: 85,
  politics: 82,
  charisma: 99,
  skills: ['火計', '落石', '同討', '天變', '風變', '混亂', '連環', '落雷', '修復', '罵聲', '虛報', '鼓舞', '伏兵'] as RTK4Skill[],
  factionId: 2,
  cityId: 2,
  stamina: 100,
  loyalty: 100,
  isGovernor: true,
  treasureId: null,
};

describe('Battle Store Fixes', () => {
  beforeEach(() => {
    useBattleStore.setState({
      units: [],
      turn: 1,
      day: 1,
      isFinished: false,
      winnerFactionId: null,
      isSiege: false,
      gates: [],
      fireHexes: [],
      capturedOfficerIds: [],
      routedOfficerIds: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Bug #1: attackUnit handles out of bounds target', () => {
    const { initBattle, attackUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];

    // Force defender out of bounds
    useBattleStore.setState(s => ({
        units: s.units.map(u => u.id === defender.id ? { ...u, x: 99, y: 99 } : u)
    }));

    // Should not throw
    expect(() => attackUnit(attacker.id, defender.id)).not.toThrow();
  });

  test('Bug #5: nextDay applies fire damage to units on fire hexes', () => {
      const { initBattle, nextDay } = useBattleStore.getState();
      initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
      
      const unit = useBattleStore.getState().units[0];
      const initialTroops = unit.troops;

      // Set fire on unit position
      useBattleStore.setState({
          fireHexes: [{ q: unit.x, r: unit.y, turnsLeft: 3 }]
      });

      nextDay();

      const updatedUnit = useBattleStore.getState().units.find(u => u.id === unit.id);
      expect(updatedUnit!.troops).toBeLessThan(initialTroops);
      // 10% damage: 5000 -> 4500
      expect(updatedUnit!.troops).toBe(4500);
  });

  test('Bug #6: Routed units move and are removed', () => {
      const { initBattle, nextDay } = useBattleStore.getState();
      initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

      const unitId = useBattleStore.getState().units[1].id;
      
      // Set unit to routed at x=13
      useBattleStore.setState(s => ({
          units: s.units.map(u => u.id === unitId ? { ...u, status: 'routed', x: 13 } : u)
      }));

      const initialX = useBattleStore.getState().units[1].x;
      nextDay();

      const routedUnit = useBattleStore.getState().units.find(u => u.id === unitId);
      expect(routedUnit!.x).toBeGreaterThan(initialX); // Should move right

      // Move to edge (right side)
      useBattleStore.setState(s => ({
          units: s.units.map(u => u.id === unitId ? { ...u, x: 14 } : u) // At right edge
      }));
      
      nextDay();
      const removedUnit = useBattleStore.getState().units.find(u => u.id === unitId);
      // Logic sets troops to 0 for removal?
      expect(removedUnit!.troops).toBe(0);
      expect(removedUnit!.status).toBe('done');
  });

  test('Bug #7: Commander death causes morale drop', () => {
      const { initBattle, attackUnit } = useBattleStore.getState();
      const ally = { ...mockOfficer, id: 3 };
      initBattle(1, 2, 2, [mockOfficer, ally], [mockEnemy]);

      const commander = useBattleStore.getState().units[0]; // mockOfficer
      const subordinate = useBattleStore.getState().units[1]; // ally
      const enemy = useBattleStore.getState().units[2]; // mockEnemy

      // Setup: Commander has 1 troop
      useBattleStore.setState(s => ({
          units: s.units.map(u => u.id === commander.id ? { ...u, troops: 1 } : u)
      }));

      // Mock random for capture (avoid capture for this test to be simple, or ensure it doesn't matter)
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // No capture

      attackUnit(enemy.id, commander.id);

      const state = useBattleStore.getState();
      const deadCommander = state.units.find(u => u.id === commander.id);
      expect(deadCommander!.troops).toBe(0);

      const affectedSubordinate = state.units.find(u => u.id === subordinate.id);
      // Initial morale 60. Drop 30 -> 30.
      expect(affectedSubordinate!.morale).toBe(30);
  });

  test('Bug #8: attackGate reduces gate HP', () => {
      const { initBattle, attackGate } = useBattleStore.getState();
      initBattle(1, 2, 2, [mockOfficer], [mockEnemy]); // City 2 -> Siege

      const gate = useBattleStore.getState().gates[0];
      const attacker = useBattleStore.getState().units[0];

      expect(gate).toBeDefined();
      const initialHp = gate.hp;

      attackGate(attacker.id, gate.q, gate.r);

      const updatedGate = useBattleStore.getState().gates.find(g => g.q === gate.q && g.r === gate.r);
      expect(updatedGate!.hp).toBeLessThan(initialHp);
  });

  test('Bug #3: Defenders do not spawn on walls in siege', () => {
       const { initBattle } = useBattleStore.getState();
       // City 2 -> Siege
       initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
       
       const state = useBattleStore.getState();
       expect(state.isSiege).toBe(true);
       
       const defender = state.units[1];
       // Check collision with walls?
       // Just check they are in center (7,7) range
       // We forced (7,7) for first defender
       expect(defender.x).toBe(7);
       expect(defender.y).toBe(7);
  });
});
