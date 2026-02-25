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
  skills: ['firePlot', 'rockfall', 'jointAttack', 'weatherChange', 'windChange', 'confusion', 'chainLink', 'lightning', 'repair', 'taunt', 'falseReport', 'inspire', 'ambush'] as RTK4Skill[],
  factionId: 1,
  cityId: 1,
  acted: false,
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
  skills: ['firePlot', 'rockfall', 'jointAttack', 'weatherChange', 'windChange', 'confusion', 'chainLink', 'lightning', 'repair', 'taunt', 'falseReport', 'inspire', 'ambush'] as RTK4Skill[],
  factionId: 2,
  cityId: 2,
  acted: false,
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
      attackerFood: 0,
      defenderFood: 0,
      attackerStarveDays: 0,
      defenderStarveDays: 0,
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
    const startUnit = useBattleStore.getState().units.find(u => u.id === unitId)!;
    // Infantry range is 5.
    // Move a small distance from spawn — should be valid.
    const targetQ = startUnit.x + 2;
    const targetR = startUnit.y;
    moveUnit(unitId, targetQ, targetR);

    const unit = useBattleStore.getState().units.find(u => u.id === unitId);
    expect(unit?.x).toBe(targetQ);
    expect(unit?.y).toBe(targetR);

    // Invalid move (too far from current position)
    moveUnit(unitId, targetQ + 10, targetR + 10);
    const unit2 = useBattleStore.getState().units.find(u => u.id === unitId);
    expect(unit2?.x).toBe(targetQ); // Should not move
  });

  test('attackUnit reduces troops and morale', () => {
    const { initBattle, attackUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];

    // Place units adjacent so attack range check passes
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === attacker.id ? { ...u, x: 5, y: 5, z: -10 } :
        u.id === defender.id ? { ...u, x: 6, y: 5, z: -11 } : u
      )
    }));
    
    attackUnit(attacker.id, defender.id);
    
    const updatedDefender = useBattleStore.getState().units.find(u => u.id === defender.id);
    expect(updatedDefender!.troops).toBeLessThan(defender.troops);
    expect(updatedDefender!.morale).toBeLessThan(defender.morale);
  });

  test('morale damage scales with troop loss ratio — large army takes negligible morale hit', () => {
    const { initBattle, attackUnit } = useBattleStore.getState();
    // Weak attacker vs large defender army
    const weakAttacker = { ...mockOfficer, id: 10, war: 10, leadership: 10 };
    initBattle(1, 2, 2, [weakAttacker], [mockEnemy], 60, 60, 40, [], [], [1000], [100000]);

    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];

    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === attacker.id ? { ...u, x: 5, y: 5, z: -10 } :
        u.id === defender.id ? { ...u, x: 6, y: 5, z: -11 } : u
      )
    }));

    attackUnit(attacker.id, defender.id);

    const updatedDefender = useBattleStore.getState().units.find(u => u.id === defender.id)!;
    // Tiny damage against 100k troops → morale should barely drop (0 or 1)
    expect(updatedDefender.morale).toBeGreaterThanOrEqual(defender.morale - 1);
  });

  test('morale damage scales with troop loss ratio — small army takes heavy morale hit', () => {
    const { initBattle, attackUnit } = useBattleStore.getState();
    // Strong attacker vs tiny defender army
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy], 60, 60, 40, [], [], [50000], [500]);

    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];

    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === attacker.id ? { ...u, x: 5, y: 5, z: -10 } :
        u.id === defender.id ? { ...u, x: 6, y: 5, z: -11 } : u
      )
    }));

    attackUnit(attacker.id, defender.id);

    const updatedDefender = useBattleStore.getState().units.find(u => u.id === defender.id)!;
    // Massive damage against 500 troops → morale should plummet or unit routed
    expect(updatedDefender.morale).toBeLessThan(30);
  });

  test('attackUnit captures officer', () => {
    const { initBattle, attackUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];

    // Mock random for capture
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    // Place adjacent and reduce troops to 50
    useBattleStore.setState(s => ({
        units: s.units.map(u =>
          u.id === attacker.id ? { ...u, x: 5, y: 5, z: -10 } :
          u.id === defender.id ? { ...u, x: 6, y: 5, z: -11, troops: 50 } : u
        )
    }));

    attackUnit(attacker.id, defender.id);

    const state = useBattleStore.getState();
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
    executeTactic(attacker.id, 'firePlot', defender.id, { q: defender.x, r: defender.y });
    const state1 = useBattleStore.getState();
    expect(state1.fireHexes.length).toBe(1);
    const burntDefender = state1.units.find(u => u.id === defender.id);
    expect(burntDefender!.troops).toBeLessThan(5000);

    // Chaos
    executeTactic(attacker.id, 'confusion', defender.id);
    const confusedDefender = useBattleStore.getState().units.find(u => u.id === defender.id);
    expect(confusedDefender!.status).toBe('confused');

    // Ambush
    executeTactic(attacker.id, 'ambush', defender.id);
    const ambushedDefender = useBattleStore.getState().units.find(u => u.id === defender.id);
    expect(ambushedDefender!.troops).toBeLessThan(burntDefender!.troops);
    expect(ambushedDefender!.status).toBe('confused');

    // Betray (Need 3rd unit)
    const ally = { ...mockEnemy, id: 3 };
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy, ally]);
    const defender2 = useBattleStore.getState().units[2];
    
    executeTactic(attacker.id, 'jointAttack', defender.id);
    // Logic: target attacks friend. 
    // defender attacks defender2
    const betrayedAlly = useBattleStore.getState().units.find(u => u.id === defender2.id);
    expect(betrayedAlly!.troops).toBeLessThan(5000);
  });

  test('endUnitTurn marks unit done and deselects', () => {
    const { initBattle, endUnitTurn } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const firstUnitId = useBattleStore.getState().activeUnitId!;
    endUnitTurn(firstUnitId);
    
    const state = useBattleStore.getState();
    expect(state.activeUnitId).toBeNull();
    const unit = state.units.find(u => u.id === firstUnitId);
    expect(unit!.status).toBe('done');
  });

  test('endPlayerPhase runs enemy AI and advances to next day', () => {
    const { initBattle, endPlayerPhase } = useBattleStore.getState();
    // Give attacker many more troops so defender sortie doesn't end the battle
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy], 60, 60, 40,
      ['infantry'], ['infantry'], [20000], [5000]);
    
    endPlayerPhase();
    // endPlayerPhase only sets turnPhase to 'enemy'; step through enemy units
    while (useBattleStore.getState().stepEnemyPhase()) { /* process each enemy */ }
    
    const state = useBattleStore.getState();
    expect(state.day).toBe(2);
    expect(state.turnPhase).toBe('player');
    expect(state.units[0].status).toBe('active');
  });

  test('endPlayerPhase handles confused enemy units', () => {
    const { initBattle, endPlayerPhase } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const defenderId = useBattleStore.getState().units[1].id;

    // Set defender to confused
    useBattleStore.setState(s => ({
        units: s.units.map(u => u.id === defenderId ? { ...u, status: 'confused' as const, confusedTurns: 2 } : u)
    }));

    endPlayerPhase();
    while (useBattleStore.getState().stepEnemyPhase()) { /* process each enemy */ }

    const state = useBattleStore.getState();
    expect(state.day).toBe(2);
    
    // Defender confused turns should decrease
    const defender = state.units.find(u => u.id === defenderId);
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

      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99); // No spread

      nextDay();

      const state = useBattleStore.getState();
      expect(state.day).toBe(2);
      expect(state.fireHexes[0].turnsLeft).toBe(1);

      nextDay();
      const state2 = useBattleStore.getState();
      expect(state2.fireHexes.length).toBe(0); // Expired
      
      spy.mockRestore();
  });

  test('AI commander retreats instead of charging toward enemies', () => {
    const { initBattle } = useBattleStore.getState();
    const subordinate = { ...mockEnemy, id: 3 };
    // Enemy has commander (mockEnemy id:2) + subordinate (id:3)
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy, subordinate]);

    const state = useBattleStore.getState();
    // Commander is the first unit of the defender faction (index 0 among defenders)
    const commanderUnit = state.units.find(u => u.factionId === 2 && u.officerId === mockEnemy.id)!;
    const enemyUnit = state.units.find(u => u.factionId === 1)!;

    // Place commander close (but not adjacent) to enemy — 3 hexes away
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === commanderUnit.id ? { ...u, x: 5, y: 5, z: -10, status: 'active' as const } :
        u.id === enemyUnit.id ? { ...u, x: 5, y: 2, z: -7 } : u
      ),
      activeUnitId: commanderUnit.id,
    }));

    const startX = 5, startY = 5;
    useBattleStore.getState().runEnemyTurn();

    // Commander should NOT have moved closer to the enemy (y=2)
    const updatedCommander = useBattleStore.getState().units.find(u => u.id === commanderUnit.id)!;
    const distBefore = Math.abs(startY - 2); // 3
    const distAfter = Math.abs(updatedCommander.y - 2);
    expect(distAfter).toBeGreaterThanOrEqual(distBefore); // Should move away or stay
    expect(updatedCommander.status).toBe('done');
  });

  test('AI commander fights normally when last unit standing', () => {
    const { initBattle } = useBattleStore.getState();
    // Enemy has only commander (1 unit)
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    const commanderUnit = state.units.find(u => u.factionId === 2)!;
    const enemyUnit = state.units.find(u => u.factionId === 1)!;

    // Place commander away from enemy — should advance (no allies to hide behind)
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === commanderUnit.id ? { ...u, x: 8, y: 8, z: -16, status: 'active' as const } :
        u.id === enemyUnit.id ? { ...u, x: 2, y: 2, z: -4 } : u
      ),
      activeUnitId: commanderUnit.id,
    }));

    useBattleStore.getState().runEnemyTurn();

    const updatedCommander = useBattleStore.getState().units.find(u => u.id === commanderUnit.id)!;
    // Should have moved closer to the enemy (fighting normally)
    const distBefore = Math.abs(8 - 2) + Math.abs(8 - 2); // rough
    const distAfter = Math.abs(updatedCommander.x - 2) + Math.abs(updatedCommander.y - 2);
    expect(distAfter).toBeLessThan(distBefore);
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
