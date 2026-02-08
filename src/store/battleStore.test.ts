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
  skills: [] as RTK4Skill[],
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
  skills: [] as RTK4Skill[],
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
      winnerFactionId: null
    });
  });

  test('initBattle sets up units correctly', () => {
    const { initBattle } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const state = useBattleStore.getState();
    expect(state.units.length).toBe(2);
    expect(state.attackerId).toBe(1);
    expect(state.defenderId).toBe(2);
    expect(state.activeUnitId).toBeDefined();
  });

  test('initBattle uses city morale for unit morale', () => {
    const { initBattle } = useBattleStore.getState();
    const attackerMorale = 75;
    const defenderMorale = 60;
    
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy], attackerMorale, defenderMorale);
    
    const state = useBattleStore.getState();
    const attacker = state.units.find(u => u.factionId === 1);
    const defender = state.units.find(u => u.factionId === 2);
    
    expect(attacker?.morale).toBe(attackerMorale);
    expect(defender?.morale).toBe(defenderMorale);
  });

  test('moveUnit updates unit position', () => {
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const unitId = useBattleStore.getState().units[0].id;
    moveUnit(unitId, 5, 5);
    
    const unit = useBattleStore.getState().units.find(u => u.id === unitId);
    expect(unit?.x).toBe(5);
    expect(unit?.y).toBe(5);
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

  test('attackUnit applies training bonus', () => {
    const { initBattle, attackUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);
    
    const attacker = useBattleStore.getState().units[0];
    const defender = useBattleStore.getState().units[1];
    const initialDefenderTroops = defender.troops;
    
    // Attack with high training (50)
    attackUnit(attacker.id, defender.id, 50);
    
    const updatedDefender = useBattleStore.getState().units.find(u => u.id === defender.id);
    const damage = initialDefenderTroops - updatedDefender!.troops;
    
    // High training should result in more damage
    expect(damage).toBeGreaterThan(0);
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
