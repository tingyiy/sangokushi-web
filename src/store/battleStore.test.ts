import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBattleStore } from './battleStore';
import type { Officer, RTK4Skill } from '../types';

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

describe('Battle Store', () => {
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

  test('initBattle sets up units correctly', () => {
    const { initBattle } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const state = useBattleStore.getState();
    expect(state.units.length).toBe(2);
    expect(state.attackerId).toBe(1);
    expect(state.defenderId).toBe(2);
    expect(state.activeUnitId).toBeDefined();
    // Default infantry
    expect(state.units[0].type).toBe('infantry');
  });

  test('initBattle accepts unit types', () => {
    const { initBattle } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy], 60, 60, 40, ['cavalry'], ['archer']);
    
    const state = useBattleStore.getState();
    expect(state.units[0].type).toBe('cavalry');
    expect(state.units[1].type).toBe('archer');
  });

  test('initBattle creates siege map for city defense', () => {
    const { initBattle } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const state = useBattleStore.getState();
    expect(state.isSiege).toBe(true);
    expect(state.gates.length).toBeGreaterThan(0);
    expect(state.units[1].direction).toBe(0); 
  });

  test('moveUnit updates unit position respecting range', () => {
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const unitId = useBattleStore.getState().units[0].id;
    // Infantry range is 5.
    // (1, 2) -> (3, 3) is dist 3. Valid.
    moveUnit(unitId, 3, 3);
    
    const unit = useBattleStore.getState().units.find(u => u.id === unitId);
    expect(unit?.x).toBe(3);
    expect(unit?.y).toBe(3);

    // Invalid move (too far)
    moveUnit(unitId, 10, 10);
    const unit2 = useBattleStore.getState().units.find(u => u.id === unitId);
    expect(unit2?.x).toBe(3); // Should not move
  });

  test('attackUnit reduces troops and morale', () => {
    const { initBattle, attackUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];
    
    attackUnit(attacker.id, defender.id);
    
    const updatedDefender = useBattleStore.getState().units.find(u => u.id === defender.id);
    expect(updatedDefender!.troops).toBeLessThan(defender.troops);
    expect(updatedDefender!.morale).toBeLessThan(defender.morale);
  });

  test('attackUnit captures officer', () => {
    const { initBattle, attackUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];

    // Mock random for capture
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    // Reduce troops to 0
    useBattleStore.setState(s => ({
        units: s.units.map(u => u.id === defender.id ? { ...u, troops: 50 } : u)
    }));

    attackUnit(attacker.id, defender.id);

    const state = useBattleStore.getState();
    // Assuming attack kills the remaining 50 troops
    // If damage is > 50. Base damage usually > 100.
    const deadDefender = state.units.find(u => u.id === defender.id);
    expect(deadDefender!.troops).toBe(0);
    expect(state.capturedOfficerIds).toContain(defender.officerId);
  });

  test('attackUnit counter attack logic (Range vs Melee)', () => {
      const { initBattle, attackUnit } = useBattleStore.getState();
      // Attacker Archer (Range 2), Defender Infantry (Range 1)
      initBattle(1, 2, 2, [mockOfficer], [mockEnemy], 60, 60, 40, ['archer'], ['infantry']);

      const attacker = useBattleStore.getState().units[0];
      const defender = useBattleStore.getState().units[1];

      // Place them 2 hexes apart
      useBattleStore.setState(s => ({
          units: s.units.map(u => 
              u.id === attacker.id ? { ...u, x: 0, y: 0, z: 0 } :
              u.id === defender.id ? { ...u, x: 0, y: 2, z: -2 } : u
          )
      }));

      // Attacker attacks Defender
      const initialAttackerTroops = attacker.troops;
      attackUnit(attacker.id, defender.id);

      // Defender (Range 1) cannot counter Attacker (Range 2) at dist 2
      const updatedAttacker = useBattleStore.getState().units.find(u => u.id === attacker.id);
      expect(updatedAttacker!.troops).toBe(initialAttackerTroops); // No counter damage
  });

  test('executeTactic applies effects (Fire, Chaos, Ambush, Betray)', () => {
    const { initBattle, executeTactic } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];

    vi.spyOn(Math, 'random').mockReturnValue(0.01); // Force success

    // Fire
    executeTactic(attacker.id, '火計', defender.id, { q: defender.x, r: defender.y });
    const state1 = useBattleStore.getState();
    expect(state1.fireHexes.length).toBe(1);
    const burntDefender = state1.units.find(u => u.id === defender.id);
    expect(burntDefender!.troops).toBeLessThan(5000);

    // Chaos
    executeTactic(attacker.id, '混亂', defender.id);
    const confusedDefender = useBattleStore.getState().units.find(u => u.id === defender.id);
    expect(confusedDefender!.status).toBe('confused');

    // Ambush
    executeTactic(attacker.id, '伏兵', defender.id);
    const ambushedDefender = useBattleStore.getState().units.find(u => u.id === defender.id);
    expect(ambushedDefender!.troops).toBeLessThan(burntDefender!.troops);
    expect(ambushedDefender!.status).toBe('confused');

    // Betray (Need 3rd unit)
    const ally = { ...mockEnemy, id: 3 };
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy, ally]);
    const defender2 = useBattleStore.getState().units[2];
    
    executeTactic(attacker.id, '同討', defender.id);
    // Logic: target attacks friend. 
    // defender attacks defender2
    const betrayedAlly = useBattleStore.getState().units.find(u => u.id === defender2.id);
    expect(betrayedAlly!.troops).toBeLessThan(5000);
  });

  test('endUnitTurn switches to next unit or next day', () => {
    const { initBattle, endUnitTurn } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const firstUnitId = useBattleStore.getState().activeUnitId!;
    endUnitTurn(firstUnitId);
    
    const state = useBattleStore.getState();
    expect(state.activeUnitId).not.toBe(firstUnitId);
    
    const secondUnitId = state.activeUnitId!;
    endUnitTurn(secondUnitId);
    
    const finalState = useBattleStore.getState();
    expect(finalState.day).toBe(2);
    expect(finalState.units[0].status).toBe('active');
  });

  test('endUnitTurn handles confused units', () => {
    const { initBattle, endUnitTurn } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const attackerId = useBattleStore.getState().units[0].id;
    const defenderId = useBattleStore.getState().units[1].id;

    // Set defender to confused
    useBattleStore.setState(s => ({
        units: s.units.map(u => u.id === defenderId ? { ...u, status: 'confused', confusedTurns: 2 } : u)
    }));

    // End attacker turn
    endUnitTurn(attackerId);

    // Should skip defender and go to next day (since only 2 units)
    const state = useBattleStore.getState();
    expect(state.day).toBe(2);
    
    // Defender confused turns should decrease
    const defender = state.units.find(u => u.id === defenderId);
    // nextDay might reset status if turns > 0
    // Actually nextDay logic: if confusedTurns > 0, status stays confused.
    // endUnitTurn logic: decrements confusedTurns if skipping.
    // If it skipped, it decremented.
    // Then nextDay happened.
    expect(defender!.confusedTurns).toBe(1); 
    expect(defender!.status).toBe('confused');
  });

  test('nextDay processes fire and status recovery', () => {
      const { initBattle, nextDay } = useBattleStore.getState();
      initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

      useBattleStore.setState({
          fireHexes: [{ q: 0, r: 0, turnsLeft: 2 }],
          day: 1
      });

      nextDay();

      const state = useBattleStore.getState();
      expect(state.day).toBe(2);
      expect(state.fireHexes[0].turnsLeft).toBe(1);

      nextDay();
      const state2 = useBattleStore.getState();
      expect(state2.fireHexes.length).toBe(0); // Expired
  });

  test('battle ends when all units of a faction are routed', () => {
    const { initBattle } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const defenderId = useBattleStore.getState().units[1].id;
    
    // Manually set defender troops to 0
    useBattleStore.setState(state => ({
      units: state.units.map(u => u.id === defenderId ? { ...u, troops: 0 } : u)
    }));
    
    useBattleStore.getState().checkBattleEnd();
    
    const state = useBattleStore.getState();
    expect(state.isFinished).toBe(true);
    expect(state.winnerFactionId).toBe(1);
  });
});
