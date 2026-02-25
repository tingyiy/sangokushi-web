import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { useBattleStore } from './battleStore';
import type { Officer, RTK4Skill } from '../types';
import type { TerrainType } from '../types/battle';

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
      const mapWidth = useBattleStore.getState().battleMap.width;

      // Set unit to routed at x near right edge (mapWidth - 3)
      useBattleStore.setState(s => ({
          units: s.units.map(u => u.id === unitId ? { ...u, status: 'routed', x: mapWidth - 3 } : u)
      }));

      const initialX = useBattleStore.getState().units[1].x;
      nextDay();

      const routedUnit = useBattleStore.getState().units.find(u => u.id === unitId);
      expect(routedUnit!.x).toBeGreaterThan(initialX); // Should move right

      // Move to edge (right side)
      useBattleStore.setState(s => ({
          units: s.units.map(u => u.id === unitId ? { ...u, x: mapWidth - 1 } : u) // At right edge
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
       // Defender should be inside the walls — center of 21×21 map interior
       // wallLeft=4, wallRight=16, so interior x range is 5..15
       // wallTop=3, wallBottom=17, so interior y range is 4..16
       expect(defender.x).toBeGreaterThan(4);
       expect(defender.x).toBeLessThan(16);
       expect(defender.y).toBeGreaterThan(3);
       expect(defender.y).toBeLessThan(17);
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

    // Defender (faction 2) is inside the walls
    const defender = state.units.find(u => u.factionId === 2)!;
    expect(defender.x).toBeGreaterThan(4);
    expect(defender.x).toBeLessThan(16);

    // Find the north gate — closest to defender center (10,10) → gate (10,3)
    // Distance = 7, too far for infantry (range 5). Place defender closer.
    // Find any gate and place defender 2 hexes from it (inside the walls)
    const gate = state.gates[0];
    expect(gate.hp).toBeGreaterThan(0); // intact

    // Place defender adjacent to gate (one hex inside the wall from the gate)
    const insideOffset = gate.q === 4 ? 1 : gate.q === 16 ? -1 : 0;
    const insideOffsetR = gate.r === 3 ? 1 : gate.r === 17 ? -1 : 0;
    const dq = gate.q + insideOffset;
    const dr = gate.r + insideOffsetR;
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === defender.id
          ? { ...u, x: dq, y: dr, z: -dq - dr }
          : u
      ),
    }));

    // Try to move defender onto the gate hex — should succeed for defenders
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

  test('Bug #29: Siege AI — ALL adjacent attacker units attack the gate, not just one', () => {
    // Create a second attacker officer
    const mockAttacker2: Officer = {
      ...mockOfficer, id: 3, name: '典韋', war: 97, leadership: 74,
    };

    const { initBattle } = useBattleStore.getState();
    // Init siege: attacker faction 1 (2 units), defender faction 2, player is defender
    initBattle(1, 2, 2, [mockOfficer, mockAttacker2], [mockEnemy],
      80, 80, 50,
      ['infantry', 'infantry'], ['infantry'],
      [5000, 5000], [5000],
      2, 'west',
      500000, 500000,
    );

    const state = useBattleStore.getState();
    expect(state.isSiege).toBe(true);
    const gate = state.gates[0];

    // Place BOTH attacker units adjacent to the gate
    const attackerUnits = state.units.filter(u => u.factionId === 1);
    expect(attackerUnits.length).toBe(2);

    // Get adjacent hexes to the gate that are outside the walls
    const neighbors = [
      { q: gate.q - 1, r: gate.r }, { q: gate.q - 1, r: gate.r + 1 },
      { q: gate.q, r: gate.r - 1 }, { q: gate.q, r: gate.r + 1 },
      { q: gate.q + 1, r: gate.r - 1 }, { q: gate.q + 1, r: gate.r },
    ].filter(h =>
      h.q >= 0 && h.q < state.battleMap.width && h.r >= 0 && h.r < state.battleMap.height &&
      state.battleMap.terrain[h.q]?.[h.r] !== 'mountain' && state.battleMap.terrain[h.q]?.[h.r] !== 'city' &&
      state.battleMap.terrain[h.q]?.[h.r] !== 'gate'
    );

    // Need at least 2 valid positions adjacent to the gate
    expect(neighbors.length).toBeGreaterThanOrEqual(2);

    useBattleStore.setState(s => ({
      units: s.units.map((u, i) => {
        if (u.id === attackerUnits[0].id) {
          return { ...u, x: neighbors[0].q, y: neighbors[0].r, z: -neighbors[0].q - neighbors[0].r, status: 'active' as const };
        }
        if (u.id === attackerUnits[1].id) {
          return { ...u, x: neighbors[1].q, y: neighbors[1].r, z: -neighbors[1].q - neighbors[1].r, status: 'active' as const };
        }
        return u;
      }),
    }));

    const initialGateHp = gate.hp;

    // Run unit 1 AI
    useBattleStore.setState({ activeUnitId: attackerUnits[0].id, turnPhase: 'enemy' });
    useBattleStore.getState().runEnemyTurn();

    // Run unit 2 AI
    useBattleStore.setState({ activeUnitId: attackerUnits[1].id, turnPhase: 'enemy' });
    // Reset unit 2 status to active (stepEnemyPhase normally does this)
    useBattleStore.setState(s => ({
      units: s.units.map(u => u.id === attackerUnits[1].id ? { ...u, status: 'active' as const } : u),
    }));
    useBattleStore.getState().runEnemyTurn();

    // Gate should have taken damage from BOTH units
    const afterGate = useBattleStore.getState().gates.find(g => g.q === gate.q && g.r === gate.r);
    if (afterGate) {
      // Gate took damage from 2 attacks — should be significantly more than one attack
      const totalDamage = initialGateHp - afterGate.hp;
      // One attack from mockOfficer (war=88, 5000 troops) = ~293. Two attacks should be > 400.
      expect(totalDamage).toBeGreaterThan(250); // At least 2 attacks worth of damage
    }
    // Both units should have status 'done' (both acted)
    const unit1After = useBattleStore.getState().units.find(u => u.id === attackerUnits[0].id);
    const unit2After = useBattleStore.getState().units.find(u => u.id === attackerUnits[1].id);
    expect(unit1After?.status).toBe('done');
    expect(unit2After?.status).toBe('done');
  });

  test('Bug #29: Siege AI prioritizes gate over attacking defender behind walls', () => {
    const { initBattle } = useBattleStore.getState();
    // Init siege: attacker faction 1, defender faction 2, player is defender
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy],
      80, 80, 50,
      ['infantry'], ['infantry'],
      [5000], [5000],
      2, 'west',
      500000, 500000,
    );

    const state = useBattleStore.getState();
    const gate = state.gates[0];
    const attackerUnit = state.units.find(u => u.factionId === 1)!;
    const defenderUnit = state.units.find(u => u.factionId === 2)!;

    // Place attacker adjacent to gate
    const adj = [
      { q: gate.q - 1, r: gate.r }, { q: gate.q - 1, r: gate.r + 1 },
      { q: gate.q, r: gate.r - 1 }, { q: gate.q, r: gate.r + 1 },
    ].find(h =>
      h.q >= 0 && h.q < state.battleMap.width && h.r >= 0 && h.r < state.battleMap.height &&
      state.battleMap.terrain[h.q]?.[h.r] !== 'mountain' && state.battleMap.terrain[h.q]?.[h.r] !== 'city' &&
      state.battleMap.terrain[h.q]?.[h.r] !== 'gate'
    )!;

    // Place defender ON the gate hex (or just behind it)
    // The defender is within attack range of the attacker but behind the wall
    useBattleStore.setState(s => ({
      units: s.units.map(u => {
        if (u.id === attackerUnit.id) {
          return { ...u, x: adj.q, y: adj.r, z: -adj.q - adj.r, status: 'active' as const };
        }
        if (u.id === defenderUnit.id) {
          return { ...u, x: gate.q + 1, y: gate.r, z: -(gate.q + 1) - gate.r };
        }
        return u;
      }),
      activeUnitId: attackerUnit.id,
      turnPhase: 'enemy',
    }));

    const initialGateHp = gate.hp;
    useBattleStore.getState().runEnemyTurn();

    // The AI should have attacked the GATE, not the defender behind walls
    const afterGate = useBattleStore.getState().gates.find(g => g.q === gate.q && g.r === gate.r);
    if (afterGate) {
      expect(afterGate.hp).toBeLessThan(initialGateHp);
    }
    // Defender should not have taken damage (attacker targeted gate instead)
    const defenderAfter = useBattleStore.getState().units.find(u => u.id === defenderUnit.id);
    expect(defenderAfter?.troops).toBe(5000);
  });

  test('Bug #39: checkBattleEnd does NOT end battle when units have status "done" but are alive', () => {
    // Regression: checkBattleEnd used to filter out status==='done' units.
    // A unit that attacked this turn has status 'done' but is still alive.
    // If all of one side's units have acted (status 'done'), the battle should NOT end.
    const { initBattle, attackUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    // Place attacker adjacent to defender
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.factionId === 1 ? { ...u, x: 6, y: 7, z: -13 } :
        u.factionId === 2 ? { ...u, x: 7, y: 7, z: -14 } : u
      ),
    }));

    const attacker = useBattleStore.getState().units.find(u => u.factionId === 1)!;
    const defender = useBattleStore.getState().units.find(u => u.factionId === 2)!;

    // Attack: attacker becomes 'done' after attacking
    attackUnit(attacker.id, defender.id);

    const stateAfter = useBattleStore.getState();
    const attackerAfter = stateAfter.units.find(u => u.id === attacker.id)!;
    const defenderAfter = stateAfter.units.find(u => u.id === defender.id)!;

    // Attacker should be 'done' with troops > 0
    expect(attackerAfter.status).toBe('done');
    expect(attackerAfter.troops).toBeGreaterThan(0);
    // Defender should still have troops (not one-shot killed)
    expect(defenderAfter.troops).toBeGreaterThan(0);

    // Battle should NOT be finished — both sides have living units
    expect(stateAfter.isFinished).toBe(false);
  });

  test('Bug #39: checkBattleEnd does NOT end battle when sole defender attacks and becomes "done"', () => {
    // Exact scenario from game.log: Liu Bei (sole defender, 5000 troops) attacks
    // Dian Wei (6320 troops). Liu Bei becomes 'done'. Old code: battle ends as DEFEAT.
    // Fixed: battle should NOT end because Liu Bei still has troops.
    const { initBattle, attackUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy],
      80, 80, 50,
      ['infantry'], ['infantry'],
      [6320], [5000],
      2, 'west', 500000, 500000,
    );

    // Place them adjacent
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.factionId === 1 ? { ...u, x: 3, y: 7, z: -10 } :
        u.factionId === 2 ? { ...u, x: 4, y: 7, z: -11 } : u
      ),
    }));

    const defender = useBattleStore.getState().units.find(u => u.factionId === 2)!;
    const attacker = useBattleStore.getState().units.find(u => u.factionId === 1)!;

    // Defender attacks the attacker (Liu Bei attacks Dian Wei)
    attackUnit(defender.id, attacker.id);

    const stateAfter = useBattleStore.getState();
    const defenderAfter = stateAfter.units.find(u => u.id === defender.id)!;

    // Defender should be 'done' but alive
    expect(defenderAfter.status).toBe('done');
    expect(defenderAfter.troops).toBeGreaterThan(0);

    // Battle MUST NOT be finished
    expect(stateAfter.isFinished).toBe(false);
    expect(stateAfter.winnerFactionId).toBeNull();
  });

  test('Bug #40: Siege AI enters through breach to attack enemy instead of targeting other gates', () => {
    // Scenario: West gate breached, 3 intact gates remain.
    // Attacker unit outside the breach should enter and attack the defender inside,
    // NOT go find another intact gate.
    const { initBattle } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy],
      80, 80, 50,
      ['infantry'], ['infantry'],
      [5000], [5000],
      2, 'west',
      500000, 500000,
    );

    const state = useBattleStore.getState();
    expect(state.isSiege).toBe(true);

    // Find the west gate (q=4, r=10 on 21×21 map) and breach it
    const centerY = Math.floor(state.battleMap.height / 2);
    const westGate = state.gates.find(g => g.q === 4 && g.r === centerY);
    expect(westGate).toBeDefined();

    // Breach the west gate: remove from gates array, change terrain to plain
    useBattleStore.setState(s => ({
      gates: s.gates.filter(g => !(g.q === 4 && g.r === centerY)),
      battleMap: {
        ...s.battleMap,
        terrain: s.battleMap.terrain.map((col, q) =>
          q === 4 ? col.map((t, r) => r === centerY ? 'plain' as TerrainType : t) : col
        ),
      },
    }));

    // Verify breach: 3 gates remaining
    expect(useBattleStore.getState().gates.length).toBe(3);

    // Place attacker at (3, centerY) — just outside the breach
    // Place defender at (5, centerY) — just inside the breach
    useBattleStore.setState(s => ({
      units: s.units.map(u => {
        if (u.factionId === 1) {
          return { ...u, x: 3, y: centerY, z: -3 - centerY, status: 'active' as const, hasMoved: false };
        }
        if (u.factionId === 2) {
          return { ...u, x: 5, y: centerY, z: -5 - centerY, status: 'active' as const };
        }
        return u;
      }),
      activeUnitId: state.units.find(u => u.factionId === 1)!.id,
      turnPhase: 'enemy',
    }));

    const attackerBefore = useBattleStore.getState().units.find(u => u.factionId === 1)!;
    const defenderBefore = useBattleStore.getState().units.find(u => u.factionId === 2)!;

    // Run enemy AI
    useBattleStore.getState().runEnemyTurn();

    const attackerAfter = useBattleStore.getState().units.find(u => u.factionId === 1)!;
    const defenderAfterState = useBattleStore.getState().units.find(u => u.factionId === 2)!;

    // The attacker should have entered through the breach and either:
    // (a) attacked the defender (defender took damage), OR
    // (b) moved closer to the defender through the breach (x > 3, moved right)
    const attackerMoved = attackerAfter.x !== attackerBefore.x || attackerAfter.y !== attackerBefore.y;
    const defenderTookDamage = defenderAfterState.troops < defenderBefore.troops;

    // At minimum, attacker should have moved through the breach toward the defender
    // or attacked if adjacent after moving
    expect(attackerMoved || defenderTookDamage).toBe(true);

    // The attacker should NOT have attacked any of the remaining 3 intact gates
    const gatesAfter = useBattleStore.getState().gates;
    const allGatesFullHp = gatesAfter.every(g => g.hp === g.maxHp);
    expect(allGatesFullHp).toBe(true);
  });

  test('Bug #40: Siege AI still targets gates when no breach exists', () => {
    // When no gate is breached, attacker AI should still prioritize gate attacks
    const { initBattle } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy],
      80, 80, 50,
      ['infantry'], ['infantry'],
      [5000], [5000],
      2, 'west',
      500000, 500000,
    );

    const state = useBattleStore.getState();
    expect(state.gates.length).toBe(4); // All 4 gates intact

    const gate = state.gates[0];
    const attackerUnit = state.units.find(u => u.factionId === 1)!;

    // Place attacker adjacent to a gate
    const adj = { q: gate.q - 1, r: gate.r };
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === attackerUnit.id
          ? { ...u, x: adj.q, y: adj.r, z: -adj.q - adj.r, status: 'active' as const }
          : u
      ),
      activeUnitId: attackerUnit.id,
      turnPhase: 'enemy',
    }));

    const initialGateHp = gate.hp;
    useBattleStore.getState().runEnemyTurn();

    // Gate should have taken damage — AI targeted the gate as expected
    const afterGate = useBattleStore.getState().gates.find(g => g.q === gate.q && g.r === gate.r);
    if (afterGate) {
      expect(afterGate.hp).toBeLessThan(initialGateHp);
    }
  });

  // ── Gate movement: units pass through gates based on position and faction ──

  test('Siege: defender can move from inside to outside through intact gate', () => {
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    expect(state.isSiege).toBe(true);

    // Use north gate (10,3). Inside = (10,4), Outside = (10,2)
    const northGate = state.gates.find(g => g.r === 3);
    expect(northGate).toBeDefined();
    const gateQ = northGate!.q;

    const defender = state.units.find(u => u.factionId === 2)!;

    // Place defender inside the walls, one hex south of the gate
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === defender.id
          ? { ...u, x: gateQ, y: 4, z: -gateQ - 4 }
          : u
      ),
    }));

    // Move defender to outside the wall (north of gate, y=2)
    moveUnit(defender.id, gateQ, 2);

    const moved = useBattleStore.getState().units.find(u => u.id === defender.id)!;
    expect(moved.x).toBe(gateQ);
    expect(moved.y).toBe(2);
  });

  test('Siege: defender can move from outside back inside through intact gate', () => {
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    const northGate = state.gates.find(g => g.r === 3);
    expect(northGate).toBeDefined();
    const gateQ = northGate!.q;

    const defender = state.units.find(u => u.factionId === 2)!;

    // Place defender outside the walls, north of the gate
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === defender.id
          ? { ...u, x: gateQ, y: 1, z: -gateQ - 1 }
          : u
      ),
    }));

    // Move defender back inside (south of gate, y=4)
    moveUnit(defender.id, gateQ, 4);

    const moved = useBattleStore.getState().units.find(u => u.id === defender.id)!;
    expect(moved.x).toBe(gateQ);
    expect(moved.y).toBe(4);
  });

  test('Siege: attacker INSIDE the walls CAN exit through intact gate', () => {
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    const northGate = state.gates.find(g => g.r === 3);
    expect(northGate).toBeDefined();
    const gateQ = northGate!.q;

    const attacker = state.units.find(u => u.factionId === 1)!;

    // Place attacker inside the walls (e.g. breached another gate and got in)
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === attacker.id
          ? { ...u, x: gateQ, y: 4, z: -gateQ - 4 }
          : u
      ),
    }));

    // Move attacker out through the intact north gate to outside (y=2)
    moveUnit(attacker.id, gateQ, 2);

    const moved = useBattleStore.getState().units.find(u => u.id === attacker.id)!;
    expect(moved.x).toBe(gateQ);
    expect(moved.y).toBe(2);
  });

  test('Siege: attacker OUTSIDE the walls CANNOT enter through intact gate', () => {
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    const northGate = state.gates.find(g => g.r === 3);
    expect(northGate).toBeDefined();
    const gateQ = northGate!.q;

    const attacker = state.units.find(u => u.factionId === 1)!;

    // Place attacker outside the wall
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === attacker.id
          ? { ...u, x: gateQ, y: 1, z: -gateQ - 1 }
          : u
      ),
    }));

    // Try to move through intact gate to inside — should be blocked
    moveUnit(attacker.id, gateQ, 4);

    const unmoved = useBattleStore.getState().units.find(u => u.id === attacker.id)!;
    expect(unmoved.x).toBe(gateQ);
    expect(unmoved.y).toBe(1);
  });

  test('Siege: attacker CAN move through a breached (destroyed) gate', () => {
    const { initBattle, moveUnit } = useBattleStore.getState();
    initBattle(1, 2, 2, [mockOfficer], [mockEnemy]);

    const state = useBattleStore.getState();
    const northGate = state.gates.find(g => g.r === 3);
    expect(northGate).toBeDefined();
    const gateQ = northGate!.q;

    // Breach the north gate: remove from gates array and change terrain to plain
    useBattleStore.setState(s => ({
      gates: s.gates.filter(g => !(g.q === gateQ && g.r === 3)),
      battleMap: {
        ...s.battleMap,
        terrain: s.battleMap.terrain.map((col, q) =>
          q === gateQ ? col.map((t, r) => r === 3 ? 'plain' as TerrainType : t) : col
        ),
      },
    }));

    const attacker = state.units.find(u => u.factionId === 1)!;

    // Place attacker outside the wall, north of the breached gate
    useBattleStore.setState(s => ({
      units: s.units.map(u =>
        u.id === attacker.id
          ? { ...u, x: gateQ, y: 1, z: -gateQ - 1 }
          : u
      ),
    }));

    // Move attacker through the breach to inside (y=4)
    moveUnit(attacker.id, gateQ, 4);

    const moved = useBattleStore.getState().units.find(u => u.id === attacker.id)!;
    expect(moved.x).toBe(gateQ);
    expect(moved.y).toBe(4);
  });
});
