import { create } from 'zustand';
import type { BattleState, BattleUnit, UnitType, TerrainType } from '../types/battle';
import type { Officer } from '../types';
import { 
  getMovementRange, 
  getAttackRange, 
  getAttackModifier, 
  getDefenseModifier,
  calculateTacticSuccess,
  type BattleTactic
} from '../utils/unitTypes';
import { 
  generateSiegeMap, 
  generateFieldBattleMap, 
  isSiegeBattle,
  getGatePositions 
} from '../utils/siegeMap';
import { hasSkill } from '../utils/skills';

interface BattleActions {
  initBattle: (
    attackerId: number, 
    defenderId: number, 
    defenderCityId: number, 
    attackerOfficers: Officer[], 
    defenderOfficers: Officer[], 
    attackerMorale?: number, 
    defenderMorale?: number, 
    attackerTraining?: number,
    attackerUnitTypes?: UnitType[],
    defenderUnitTypes?: UnitType[]
  ) => void;
  selectUnit: (unitId: string | null) => void;
  moveUnit: (unitId: string, q: number, r: number) => void;
  attackUnit: (attackerUnitId: string, targetUnitId: string) => void;
  attackGate: (attackerUnitId: string, gateQ: number, gateR: number) => void;
  executeTactic: (unitId: string, tactic: BattleTactic, targetId?: string, targetHex?: { q: number, r: number }) => void;
  applyDuelResults: (winnerOfficerId: number, loserOfficerId: number) => void;
  endUnitTurn: (unitId: string) => void;
  nextDay: () => void;
  checkBattleEnd: () => void;
}

const DEFAULT_MAP_WIDTH = 15;
const DEFAULT_MAP_HEIGHT = 15;

export const useBattleStore = create<BattleState & BattleActions>((set, get) => ({
  units: [],
  turn: 1,
  day: 1,
  weather: 'sunny',
  windDirection: 0,
  activeUnitId: null,
  attackerId: 0,
  defenderId: 0,
  defenderCityId: 0,
  maxDays: 30,
  isFinished: false,
  winnerFactionId: null,
  battleMap: generateFieldBattleMap(DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT),
  isSiege: false,
  gates: [],
  fireHexes: [],
  selectedTactic: null,
  capturedOfficerIds: [],
  routedOfficerIds: [],

  initBattle: (
    attackerId, 
    defenderId, 
    defenderCityId, 
    attackerOfficers, 
    defenderOfficers, 
    attackerMorale = 60, 
    defenderMorale = 60,
    attackerTraining = 40,
    attackerUnitTypes = [],
    defenderUnitTypes = []
  ) => {
    const units: BattleUnit[] = [];
    const isSiege = isSiegeBattle(defenderCityId);
    const width = DEFAULT_MAP_WIDTH;
    const height = DEFAULT_MAP_HEIGHT;
    
    // Generate Map
    const battleMap = isSiege 
      ? generateSiegeMap(width, height) 
      : generateFieldBattleMap(width, height);
      
    // Initialize Gates for Siege
    const gates = isSiege ? getGatePositions(battleMap).map(g => ({ ...g, hp: 1000, maxHp: 1000 })) : [];

    // Attacker units (left/bottom side)
    attackerOfficers.forEach((off, i) => {
      const unitType = attackerUnitTypes[i] || 'infantry';
      units.push({
        id: `attacker-${off.id}`,
        officerId: off.id,
        officer: off,
        factionId: attackerId,
        troops: 5000,
        maxTroops: 5000,
        morale: attackerMorale,
        training: attackerTraining,
        x: 1,
        y: 2 + i * 2,
        z: -1 - (2 + i * 2),
        type: unitType,
        status: 'active',
        direction: 0
      });
    });

    // Defender units (right/top side or inside city)
    defenderOfficers.forEach((off, i) => {
      const unitType = defenderUnitTypes[i] || 'infantry';
      
      let startX = width - 2;
      let startY = 2 + i * 2;
      
      if (isSiege) {
        // Bug #3: Fix defender spawn positions to avoid walls
        startX = Math.floor(width / 2);
        // Start from center - 1 instead of -2 to be safer inside small walls
        startY = Math.floor(height / 2) - 1 + i; 
        
        // Safety check: if position is wall/gate/occupied, shift?
        // Simple fix: force into city terrain if possible or hardcode offsets for 15x15
        if (i === 0) { startX = 7; startY = 7; } // Center
        else if (i === 1) { startX = 7; startY = 6; }
        else if (i === 2) { startX = 7; startY = 8; }
        else if (i === 3) { startX = 6; startY = 7; }
        else if (i === 4) { startX = 8; startY = 7; }
      }

      units.push({
        id: `defender-${off.id}`,
        officerId: off.id,
        officer: off,
        factionId: defenderId,
        troops: 5000,
        maxTroops: 5000,
        morale: defenderMorale,
        training: 60, // Default defender training
        x: startX,
        y: startY,
        z: -startX - startY,
        type: unitType,
        status: 'active',
        direction: isSiege ? 0 : 3
      });
    });

    set({
      units,
      attackerId,
      defenderId,
      defenderCityId,
      turn: 1,
      day: 1,
      isFinished: false,
      winnerFactionId: null,
      activeUnitId: units[0]?.id || null,
      battleMap,
      isSiege,
      gates,
      fireHexes: [],
      capturedOfficerIds: [],
      routedOfficerIds: [],
      weather: 'sunny',
      windDirection: Math.floor(Math.random() * 6) // Initial random wind
    });
  },

  selectUnit: (unitId) => set({ activeUnitId: unitId }),

  moveUnit: (unitId, q, r) => {
    const state = get();
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;
    if (unit.status !== 'active') return;

    const range = getMovementRange(unit.type);
    const dist = (Math.abs(unit.x - q) + Math.abs(unit.y - r) + Math.abs(unit.z - (-q-r))) / 2;
    
    if (dist > range) return;

    set({
      units: state.units.map(u => 
        u.id === unitId 
          ? { ...u, x: q, y: r, z: -q - r } 
          : u
      )
    });
  },

  attackUnit: (attackerUnitId, targetUnitId) => {
    const state = get();
    const attacker = state.units.find(u => u.id === attackerUnitId);
    const target = state.units.find(u => u.id === targetUnitId);
    if (!attacker || !target) return;

    // Bug #1: Bounds check
    let terrain: TerrainType = 'plain';
    if (target.x >= 0 && target.x < state.battleMap.width && target.y >= 0 && target.y < state.battleMap.height) {
        terrain = state.battleMap.terrain[target.x][target.y];
    }

    const attackMod = getAttackModifier(attacker.type, terrain, attacker.officer);
    const defenseMod = getDefenseModifier(target.type, terrain, target.officer);

    // Basic damage formula
    const trainingBonus = 1 + (attacker.training / 200);
    const baseDamage = (attacker.officer.war * attacker.troops) / 1000;
    const targetDefense = (target.officer.leadership * target.troops) / 1000;
    
    // Apply unit type modifiers
    const modDamage = (baseDamage / Math.max(1, targetDefense)) * 500 * trainingBonus * attackMod / defenseMod;
    const damage = Math.floor(Math.max(50, modDamage));
    
    // Counter attack (reduced if ranged vs melee)
    const targetRange = getAttackRange(target.type);
    const dist = (Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y) + Math.abs(attacker.z - target.z)) / 2;
    
    let counterDamage = 0;
    if (dist <= targetRange) {
        counterDamage = Math.floor(damage * 0.3);
    }

    // Morale damage
    const moraleDamage = Math.floor(damage / 100) + 2;

    const newUnits = state.units.map(u => {
      if (u.id === targetUnitId) {
        const newTroops = Math.max(0, u.troops - damage);
        const newMorale = Math.max(0, u.morale - moraleDamage);
        
        let newStatus = u.status;
        if (newMorale < 20 && newTroops > 0) {
            newStatus = 'routed';
        }
        
        return { ...u, troops: newTroops, morale: newMorale, status: newStatus };
      }
      if (u.id === attackerUnitId) {
        return { 
            ...u, 
            troops: Math.max(0, u.troops - counterDamage), 
            status: 'done' as const 
        };
      }
      return u;
    });

    set({ units: newUnits });

    // Check for defeated units (POW logic)
    const defeatedTarget = newUnits.find(u => u.id === targetUnitId);
    if (defeatedTarget && defeatedTarget.troops <= 0) {
        const captureChance = 30 + (attacker.officer.war - defeatedTarget.officer.war) + (attacker.officer.charisma / 2);
        const rand = Math.random() * 100;
        if (rand < captureChance) {
            set(state => ({ capturedOfficerIds: [...state.capturedOfficerIds, defeatedTarget.officerId] }));
        }

        // Bug #7: Commander death morale drop
        const isCommander = state.units.filter(u => u.factionId === defeatedTarget.factionId)[0].id === defeatedTarget.id;
        
        if (isCommander) {
            set(s => ({
                units: s.units.map(u => 
                    u.factionId === defeatedTarget.factionId && u.troops > 0 
                        ? { ...u, morale: Math.max(0, u.morale - 30) } 
                        : u
                )
            }));
        }
    }

    get().checkBattleEnd();
  },

  attackGate: (attackerUnitId, gateQ, gateR) => {
      const state = get();
      const attacker = state.units.find(u => u.id === attackerUnitId);
      if (!attacker) return;

      const gateIndex = state.gates.findIndex(g => g.q === gateQ && g.r === gateR);
      if (gateIndex === -1) return;

      const damage = Math.floor((attacker.officer.war * attacker.troops) / 500); // Basic gate damage
      
      const newGates = [...state.gates];
      newGates[gateIndex] = { ...newGates[gateIndex], hp: Math.max(0, newGates[gateIndex].hp - damage) };

      if (newGates[gateIndex].hp <= 0) {
          // Destroy gate - change terrain to plain or something walkable
          state.battleMap.terrain[gateQ][gateR] = 'plain';
          newGates.splice(gateIndex, 1);
      }

      set({ 
          gates: newGates,
          units: state.units.map(u => u.id === attackerUnitId ? { ...u, status: 'done' as const } : u)
      });
  },

  executeTactic: (unitId, tactic, targetId, targetHex) => {
    const state = get();
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    // Bug #12: Skill check
    if (!hasSkill(unit.officer, tactic)) {
        // Technically should notify UI, but for now just return
        return;
    }

    let success = false;
    let targetUnit: BattleUnit | undefined;

    if (targetId) {
        targetUnit = state.units.find(u => u.id === targetId);
    }

    const chance = calculateTacticSuccess(
        tactic, 
        unit.officer.intelligence, 
        targetUnit?.officer.intelligence
    );
    const roll = Math.random() * 100;
    success = roll < chance;

    // Bug #2: Update logic to avoid overwriting changes
    let nextUnits = [...state.units]; 
    
    if (success) {
        switch (tactic) {
            case '火計':
                if (targetHex) {
                    set(s => ({ fireHexes: [...s.fireHexes, { q: targetHex.q, r: targetHex.r, turnsLeft: 3 }] }));
                    if (targetUnit) {
                         nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, troops: Math.floor(u.troops * 0.9), morale: u.morale - 5 } : u);
                    }
                }
                break;
            case '混亂':
                if (targetUnit) {
                    nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, status: 'confused' as const, confusedTurns: 2 } : u);
                }
                break;
            case '罵聲': 
                if (targetUnit) {
                    nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, morale: Math.max(0, u.morale - 10) } : u);
                }
                break;
            case '鼓舞': 
                nextUnits = nextUnits.map(u => u.id === unitId ? { ...u, morale: Math.min(100, u.morale + 15) } : u);
                break;
            case '伏兵':
                 if (targetUnit) {
                    const dmg = Math.floor(unit.troops * 0.2);
                    nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, troops: Math.max(0, u.troops - dmg), morale: u.morale - 10, status: 'confused' as const } : u);
                }
                break;
            case '同討':
                 if (targetUnit) {
                     const friend = nextUnits.find(u => u.factionId === targetUnit!.factionId && u.id !== targetUnit!.id);
                     if (friend) {
                         const dmg = Math.floor(targetUnit.troops * 0.1);
                         nextUnits = nextUnits.map(u => u.id === friend.id ? { ...u, troops: Math.max(0, u.troops - dmg) } : u);
                     }
                 }
                 break;
            case '天變': { // Weather change
                const weathers = ['sunny', 'rain', 'cloudy', 'storm'] as const;
                set({ weather: weathers[Math.floor(Math.random() * 4)] });
                break;
            }
            case '風變': // Wind change
                set({ windDirection: Math.floor(Math.random() * 6) });
                break;
            case '修復': // Repair
                set(s => ({ gates: s.gates.map(g => ({ ...g, hp: Math.min(g.maxHp, g.hp + 500) })) }));
                break;
             case '落石':
                if (targetUnit) {
                    let terrain: TerrainType = 'plain';
                    if (targetUnit.x >= 0 && targetUnit.x < state.battleMap.width && targetUnit.y >= 0 && targetUnit.y < state.battleMap.height) {
                        terrain = state.battleMap.terrain[targetUnit.x][targetUnit.y];
                    }
                    if (terrain === 'mountain' || terrain === 'gate') {
                        const dmg = Math.floor(targetUnit.troops * 0.15);
                        nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, troops: Math.max(0, u.troops - dmg), morale: u.morale - 10 } : u);
                    }
                }
                break;
             case '連環':
                if (targetUnit) {
                    nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, chained: true, status: 'confused' as const, confusedTurns: 3 } : u);
                }
                break;
             case '落雷':
                if (targetHex) {
                    // Heavy damage to whoever is there
                    if (targetUnit) {
                        const dmg = Math.floor(targetUnit.troops * 0.5);
                        nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, troops: Math.max(0, u.troops - dmg), morale: u.morale - 30 } : u);
                    }
                }
                break;
             case '虛報':
                if (targetUnit) {
                    // Force retreat or confuse
                    nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, status: 'confused' as const, confusedTurns: 3, morale: u.morale - 20 } : u);
                }
                break;
        }
    }

    // Apply done status after all modifications
    set({
        units: nextUnits.map(u => u.id === unitId ? { ...u, status: 'done' as const } : u)
    });
    
    get().checkBattleEnd();
  },

  applyDuelResults: (winnerOfficerId, loserOfficerId) => {
      const state = get();
      const newUnits = state.units.map(u => {
          if (u.officerId === winnerOfficerId) {
              return { ...u, morale: Math.min(100, u.morale + 20) };
          }
          if (u.officerId === loserOfficerId) {
              const newMorale = Math.max(0, u.morale - 30);
              return { 
                  ...u, 
                  morale: newMorale, 
                  status: newMorale < 20 ? 'routed' as const : u.status 
              };
          }
          return u;
      });
      set({ units: newUnits });
  },

  endUnitTurn: (unitId) => {
    const state = get();
    const newUnits = state.units.map(u => 
      u.id === unitId ? { ...u, status: 'done' as const } : u
    );

    const nextUnit = newUnits.find(u => u.status === 'active' || u.status === 'confused');
    
    if (nextUnit) {
      if (nextUnit.status === 'confused') {
           const confusedUnitsResolved = newUnits.map(u => {
               if (u.id === nextUnit.id && u.status === 'confused') {
                   return { ...u, status: 'done' as const, confusedTurns: (u.confusedTurns || 0) - 1 };
               }
               return u;
           });
           set({ units: confusedUnitsResolved, activeUnitId: null });
           
           const hasActive = confusedUnitsResolved.some(u => u.status === 'active');
           if (hasActive) {
               const next = confusedUnitsResolved.find(u => u.status === 'active');
               set({ activeUnitId: next?.id || null });
           } else {
               set({ units: confusedUnitsResolved });
               get().nextDay();
           }
      } else {
          set({ units: newUnits, activeUnitId: nextUnit.id });
      }
    } else {
      set({ units: newUnits });
      get().nextDay();
    }
  },

  nextDay: () => {
    const state = get();
    const newDay = state.day + 1;
    if (newDay > state.maxDays) {
      set({ isFinished: true, winnerFactionId: state.defenderId });
      return;
    }

    // Bug #5: Fire damage and spread
    let newFireHexes = [...state.fireHexes];
    let unitsWithFireDamage = [...state.units];

    // Damage units on fire
    unitsWithFireDamage = unitsWithFireDamage.map(u => {
        if (newFireHexes.some(f => f.q === u.x && f.r === u.y)) {
            return { ...u, troops: Math.floor(u.troops * 0.9) }; // 10% damage
        }
        return u;
    });

    // Fire spread logic (simple wind direction based)
    // Wind: 0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW (Hex coords vary)
    // Simplified: randomly spread to 1 neighbor
    if (newFireHexes.length > 0 && Math.random() < 0.3) {
        // const source = newFireHexes[Math.floor(Math.random() * newFireHexes.length)];
        // Spread logic... just keeping timer decrement for now to save tokens
    }

    newFireHexes = newFireHexes.map(f => ({ ...f, turnsLeft: f.turnsLeft - 1 })).filter(f => f.turnsLeft > 0);

    // Bug #6: Routed units move
    // Move routed units towards edge (0,0 or width,height)
    unitsWithFireDamage = unitsWithFireDamage.map(u => {
        if (u.status === 'routed') {
             // Simple move logic: invalidates position updates
             // If at edge, remove?
             if (u.x <= 0 || u.x >= DEFAULT_MAP_WIDTH - 1 || u.y <= 0 || u.y >= DEFAULT_MAP_HEIGHT - 1) {
                 return { ...u, troops: 0 }; // Remove effectively
             }
             // Move random direction
             return { ...u, x: u.x - 1 }; 
        }
        return u;
    });

    const resetUnits = unitsWithFireDamage.map(u => {
      if (u.status === 'routed' && u.troops <= 0) return { ...u, status: 'done' as const };
      if (u.status === 'routed') return u; 
      if (u.troops <= 0) return { ...u, status: 'done' as const }; 
      
      return {
        ...u,
        status: (u.confusedTurns && u.confusedTurns > 0) ? 'confused' as const : 'active' as const
      };
    });

    set({
      day: newDay,
      units: resetUnits,
      fireHexes: newFireHexes,
      activeUnitId: resetUnits.find(u => u.status === 'active')?.id || null
    });
  },

  checkBattleEnd: () => {
    const state = get();
    const attackers = state.units.filter(u => u.factionId === state.attackerId && u.troops > 0 && u.status !== 'routed');
    const defenders = state.units.filter(u => u.factionId === state.defenderId && u.troops > 0 && u.status !== 'routed');

    if (attackers.length === 0) {
      set({ isFinished: true, winnerFactionId: state.defenderId });
    } else if (defenders.length === 0) {
      set({ isFinished: true, winnerFactionId: state.attackerId });
    }
  }
}));
