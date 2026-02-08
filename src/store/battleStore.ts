import { create } from 'zustand';
import type { BattleState, BattleUnit, UnitType } from '../types/battle';
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
  executeTactic: (unitId: string, tactic: BattleTactic, targetId?: string, targetHex?: { q: number, r: number }) => void;
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
      // If siege, defenders are inside walls (center)
      // If field, defenders are on right
      let startX = width - 2;
      let startY = 2 + i * 2;
      
      if (isSiege) {
        startX = Math.floor(width / 2);
        startY = Math.floor(height / 2) - 2 + i; // Cluster in center
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
      weather: 'sunny' 
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

    const terrain = state.battleMap.terrain[target.x][target.y];
    const attackMod = getAttackModifier(attacker.type, terrain);
    const defenseMod = getDefenseModifier(target.type, terrain);

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
        
        // Routing check
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
        // Capture logic
        const captureChance = 30 + (attacker.officer.war - defeatedTarget.officer.war) + (attacker.officer.charisma / 2);
        const rand = Math.random() * 100;
        if (rand < captureChance) {
            set(state => ({ capturedOfficerIds: [...state.capturedOfficerIds, defeatedTarget.officerId] }));
        }
    }

    get().checkBattleEnd();
  },

  executeTactic: (unitId, tactic, targetId, targetHex) => {
    const state = get();
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    let success = false;
    let targetUnit: BattleUnit | undefined;

    if (targetId) {
        targetUnit = state.units.find(u => u.id === targetId);
    }

    // Calculate success chance
    const chance = calculateTacticSuccess(
        tactic, 
        unit.officer.intelligence, 
        targetUnit?.officer.intelligence
    );
    const roll = Math.random() * 100;
    success = roll < chance;

    if (success) {
        let newUnits = [...state.units];
        
        switch (tactic) {
            case '火計':
                if (targetHex) {
                    set(s => ({ fireHexes: [...s.fireHexes, { q: targetHex.q, r: targetHex.r, turnsLeft: 3 }] }));
                    // If unit there, damage it
                    if (targetUnit) {
                         newUnits = newUnits.map(u => u.id === targetId ? { ...u, troops: Math.floor(u.troops * 0.9), morale: u.morale - 5 } : u);
                    }
                }
                break;
            case '混亂':
                if (targetUnit) {
                    newUnits = newUnits.map(u => u.id === targetId ? { ...u, status: 'confused' as const, confusedTurns: 2 } : u);
                }
                break;
            case '罵聲': // Taunt - reduce morale
                if (targetUnit) {
                    newUnits = newUnits.map(u => u.id === targetId ? { ...u, morale: Math.max(0, u.morale - 10) } : u);
                }
                break;
            case '鼓舞': // Rally - increase own morale
                newUnits = newUnits.map(u => u.id === unitId ? { ...u, morale: Math.min(100, u.morale + 15) } : u);
                break;
            case '伏兵': // Ambush - heavy damage if successful
                 if (targetUnit) {
                    const dmg = Math.floor(unit.troops * 0.2);
                    newUnits = newUnits.map(u => u.id === targetId ? { ...u, troops: Math.max(0, u.troops - dmg), morale: u.morale - 10, status: 'confused' as const } : u);
                }
                break;
            case '修復': // Repair gate
                // TODO: Find nearest gate and repair
                break;
            case '同討': // Betray - unit attacks friend
                 if (targetUnit) {
                     // Find a friend of target
                     const friend = state.units.find(u => u.factionId === targetUnit!.factionId && u.id !== targetUnit!.id);
                     if (friend) {
                         // Target attacks friend
                         const dmg = Math.floor(targetUnit.troops * 0.1);
                         newUnits = newUnits.map(u => u.id === friend.id ? { ...u, troops: Math.max(0, u.troops - dmg) } : u);
                     }
                 }
                 break;
            // Other tactics implementation simplified for now
        }
        set({ units: newUnits });
    }

    // End turn
    set(state => ({
        units: state.units.map(u => u.id === unitId ? { ...u, status: 'done' as const } : u)
    }));
    get().checkBattleEnd();
  },

  endUnitTurn: (unitId) => {
    const state = get();
    const newUnits = state.units.map(u => 
      u.id === unitId ? { ...u, status: 'done' as const } : u
    );

    // Find next active unit
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
      // All units done, next day
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

    // Recover logic, fire spread, etc.
    let newFireHexes = [...state.fireHexes];
    // Spread fire? Decrease turns
    newFireHexes = newFireHexes.map(f => ({ ...f, turnsLeft: f.turnsLeft - 1 })).filter(f => f.turnsLeft > 0);

    const resetUnits = state.units.map(u => {
      // Recover some status?
      if (u.status === 'routed') return u; // Stay routed
      if (u.troops <= 0) return { ...u, status: 'done' as const }; // Stay dead
      
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
    const attackers = state.units.filter(u => u.factionId === state.attackerId && u.troops > 0);
    const defenders = state.units.filter(u => u.factionId === state.defenderId && u.troops > 0);

    if (attackers.length === 0) {
      set({ isFinished: true, winnerFactionId: state.defenderId });
    } else if (defenders.length === 0) {
      set({ isFinished: true, winnerFactionId: state.attackerId });
    }
  }
}));
