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
  skills: ['firePlot', 'rockfall', 'jointAttack', 'weatherChange', 'windChange', 'confusion', 'chainLink', 'lightning', 'repair', 'taunt', 'falseReport', 'inspire', 'ambush'] as RTK4Skill[],
  factionId: 1,
  cityId: 1,
  acted: false,
  loyalty: 100,
  isGovernor: true,
  treasureId: null,
  rank: 'common',
  relationships: [],
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
  rank: 'common',
  relationships: [],
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

  test('Bug #7: Commander death causes morale drop and ends battle (RTK IV)', () => {
      const { initBattle, attackUnit } = useBattleStore.getState();
      const ally = { ...mockOfficer, id: 3 };
      initBattle(1, 2, 2, [mockOfficer, ally], [mockEnemy]);

      const commander = useBattleStore.getState().units[0]; // mockOfficer
      const subordinate = useBattleStore.getState().units[1]; // ally
      const enemy = useBattleStore.getState().units[2]; // mockEnemy

      // Place enemy adjacent to commander, and set commander to 1 troop
      useBattleStore.setState(s => ({
          units: s.units.map(u =>
            u.id === commander.id ? { ...u, troops: 1, x: 5, y: 5, z: -10 } :
            u.id === enemy.id ? { ...u, x: 6, y: 5, z: -11 } : u
          )
      }));

      vi.spyOn(Math, 'random').mockReturnValue(0.99); // No capture

      attackUnit(enemy.id, commander.id);

      const state = useBattleStore.getState();
      const deadCommander = state.units.find(u => u.id === commander.id);
      expect(deadCommander!.troops).toBe(0);

      const affectedSubordinate = state.units.find(u => u.id === subordinate.id);
      // Initial morale 60. Drop 30 -> 30.
      expect(affectedSubordinate!.morale).toBe(30);

      // RTK IV: Commander defeat ends battle immediately
      expect(state.isFinished).toBe(true);
      expect(state.winnerFactionId).toBe(2); // Enemy wins
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

  test('Bug #9: nextDay calls checkBattleEnd after routed units leave the map', () => {
    // Regression: routed units leaving the map set troops=0, but checkBattleEnd
    // was not called, causing the battle to continue indefinitely (defender stuck
    // attacking own gates after all attackers were eliminated by starvation/rout).
    const { initBattle } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    // Place attacker at map edge (routed, about to leave)
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.factionId === 1
          ? { ...u, status: 'routed' as const, x: 0, y: 7, z: -7 }
          : u
      ),
    }));

    // nextDay should: move routed unit off edge → troops=0 → checkBattleEnd → defender wins
    useBattleStore.getState().nextDay();

    const state = useBattleStore.getState();
    expect(state.isFinished).toBe(true);
    expect(state.winnerFactionId).toBe(2); // Defender wins
  });

  test('Bug #10: starvation-routed units leaving map ends battle via checkBattleEnd', () => {
    // Regression: army starves, units rout, move to edge, leave map.
    // Without checkBattleEnd in nextDay, battle never ends.
    const { initBattle } = useBattleStore.getState();
    initBattle(
      1, 2, 2,
      [mockOfficer], [mockEnemy],
      15, 80, 40, // attacker morale 15 (will rout on first starvation)
      ['infantry'], ['infantry'],
      [5000], [5000],
      2, 'west', // player is defender
      0, 100000, // attacker has 0 food
    );

    // Place attacker near edge so rout → edge → removal happens fast
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.factionId === 1
          ? { ...u, x: 1, y: 7, z: -8 }
          : u
      ),
    }));

    // Advance days until battle ends
    let maxIter = 20;
    while (!useBattleStore.getState().isFinished && maxIter-- > 0) {
      useBattleStore.getState().nextDay();
    }

    const state = useBattleStore.getState();
    expect(state.isFinished).toBe(true);
    expect(state.winnerFactionId).toBe(2); // Defender wins
  });

  test('Siege: defender can move through own intact gate', () => {
    // initBattle with city 2 as defender → creates siege map with gates
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    expect(state.isSiege).toBe(true);
    expect(state.gates.length).toBeGreaterThan(0);

    // Defender (faction 2) is inside the walls at (7,7)
    const defender = state.units.find(u => u.factionId === 2)!;
    expect(defender.x).toBe(7);
    expect(defender.y).toBe(7);

    // Find a gate position
    const gate = state.gates[0];
    expect(gate.hp).toBeGreaterThan(0); // intact

    // Try to move defender onto the gate hex — should succeed for defenders
    // Defender needs to be adjacent to the gate for this to work
    // Gates are at wall midpoints: (4,7), (10,7), (7,3), (7,11)
    // Defender at (7,7) can reach (7,3) if movement range allows (infantry = 5)
    // Distance from (7,7) to (7,3) = 4 hexes — within infantry range of 5
    moveUnit(defender.id, gate.q, gate.r);

    const movedDefender = useBattleStore.getState().units.find(u => u.id === defender.id)!;
    // Defender should have moved to the gate position
    expect(movedDefender.x).toBe(gate.q);
    expect(movedDefender.y).toBe(gate.r);
  });

  test('Siege: attacker CANNOT move through intact gate', () => {
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    const attacker = state.units.find(u => u.factionId === 1)!;
    const gate = state.gates[0];

    // Try to move attacker onto an intact gate hex — should be blocked
    moveUnit(attacker.id, gate.q, gate.r);

    const unmoved = useBattleStore.getState().units.find(u => u.id === attacker.id)!;
    // Attacker should NOT have moved to the gate position
    expect(unmoved.x).toBe(attacker.x);
    expect(unmoved.y).toBe(attacker.y);
  });

  test('Siege: gate breach drops defender morale by 15', () => {
    const { initBattle, attackGate } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    const attacker = state.units.find(u => u.factionId === 1)!;
    const defender = state.units.find(u => u.factionId === 2)!;
    const initialMorale = defender.morale;

    const gate = state.gates[0];

    // Reduce gate HP to almost 0 so next attack breaks it
    useBattleStore.setState(s => ({
      gates: s.gates.map(g =>
        g.q === gate.q && g.r === gate.r ? { ...g, hp: 1 } : g
      ),
      // Place attacker adjacent to gate
      units: s.units.map(u =>
        u.id === attacker.id ? { ...u, x: gate.q - 1, y: gate.r, z: -(gate.q - 1) - gate.r } : u
      ),
    }));

    attackGate(attacker.id, gate.q, gate.r);

    const afterState = useBattleStore.getState();
    // Gate should be broken
    expect(afterState.gates.find(g => g.q === gate.q && g.r === gate.r)).toBeUndefined();

    // Defender morale should have dropped by 15
    const updatedDefender = afterState.units.find(u => u.id === defender.id)!;
    expect(updatedDefender.morale).toBe(initialMorale - 15);
  });

  test('Siege AI: attacker runEnemyTurn targets gates when enemies are behind walls', () => {
    const { initBattle } = useBattleStore.getState();
    // Init siege: attacker faction 1, defender faction 2, player is defender (2)
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy],
      80, 80, 50,
      ['infantry'], ['infantry'],
      [5000], [5000],
      2, 'west', // player is defender
      500000, 500000,
    );

    const state = useBattleStore.getState();
    expect(state.isSiege).toBe(true);
    expect(state.gates.length).toBeGreaterThan(0);

    const gate = state.gates[0];
    const initialGateHp = gate.hp;

    // Place attacker adjacent to gate (so it can attack immediately)
    const attackerUnit = state.units.find(u => u.factionId === 1)!;
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === attackerUnit.id
          ? { ...u, x: gate.q - 1, y: gate.r, z: -(gate.q - 1) - gate.r, status: 'active' as const }
          : u
      ),
      activeUnitId: attackerUnit.id,
      turnPhase: 'enemy',
    }));

    // Run enemy AI turn
    useBattleStore.getState().runEnemyTurn();

    // Gate should have taken damage (AI attacked it)
    const afterGate = useBattleStore.getState().gates.find(g => g.q === gate.q && g.r === gate.r);
    if (afterGate) {
      expect(afterGate.hp).toBeLessThan(initialGateHp);
    } else {
      // Gate was completely destroyed (unlikely with one attack, but possible)
      expect(useBattleStore.getState().gates.find(g => g.q === gate.q && g.r === gate.r)).toBeUndefined();
    }
  });
});
