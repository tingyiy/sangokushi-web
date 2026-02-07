import { create } from 'zustand';
import type { BattleState, BattleUnit, BattleMap, TerrainType } from '../types/battle';
import type { Officer } from '../types';

interface BattleActions {
  initBattle: (attackerId: number, defenderId: number, defenderCityId: number, attackerOfficers: Officer[], defenderOfficers: Officer[]) => void;
  selectUnit: (unitId: string | null) => void;
  moveUnit: (unitId: string, q: number, r: number) => void;
  attackUnit: (attackerUnitId: string, targetUnitId: string) => void;
  endUnitTurn: (unitId: string) => void;
  nextDay: () => void;
  checkBattleEnd: () => void;
}

const DEFAULT_MAP_WIDTH = 15;
const DEFAULT_MAP_HEIGHT = 15;

const generateMap = (width: number, height: number): BattleMap => {
  const terrain: TerrainType[][] = [];
  for (let q = 0; q < width; q++) {
    terrain[q] = [];
    for (let r = 0; r < height; r++) {
      // Simple random terrain for now
      const rand = Math.random();
      if (rand < 0.1) terrain[q][r] = 'mountain';
      else if (rand < 0.2) terrain[q][r] = 'forest';
      else if (rand < 0.25) terrain[q][r] = 'river';
      else terrain[q][r] = 'plain';
    }
  }
  // Place a city in the middle for the defender
  terrain[Math.floor(width / 2)][Math.floor(height / 2)] = 'city';
  return { width, height, terrain };
};

export const useBattleStore = create<BattleState & BattleActions>((set, get) => ({
  units: [],
  turn: 1,
  day: 1,
  weather: 'sunny',
  activeUnitId: null,
  attackerId: 0,
  defenderId: 0,
  defenderCityId: 0,
  maxDays: 30,
  isFinished: false,
  winnerFactionId: null,
  battleMap: generateMap(DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT),

  initBattle: (attackerId, defenderId, defenderCityId, attackerOfficers, defenderOfficers) => {
    const units: BattleUnit[] = [];
    const width = DEFAULT_MAP_WIDTH;
    const height = DEFAULT_MAP_HEIGHT;
    
    // Attacker units (left side)
    attackerOfficers.forEach((off, i) => {
      units.push({
        id: `attacker-${off.id}`,
        officerId: off.id,
        officer: off,
        factionId: attackerId,
        troops: 5000, // Default for now
        maxTroops: 5000,
        morale: 80,
        x: 1,
        y: 2 + i * 2,
        z: -1 - (2 + i * 2),
        type: 'infantry',
        status: 'active',
        direction: 0
      });
    });

    // Defender units (right side/center)
    defenderOfficers.forEach((off, i) => {
      units.push({
        id: `defender-${off.id}`,
        officerId: off.id,
        officer: off,
        factionId: defenderId,
        troops: 5000,
        maxTroops: 5000,
        morale: 80,
        x: width - 2,
        y: 2 + i * 2,
        z: -(width - 2) - (2 + i * 2),
        type: 'infantry',
        status: 'active',
        direction: 3
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
      battleMap: generateMap(width, height)
    });
  },

  selectUnit: (unitId) => set({ activeUnitId: unitId }),

  moveUnit: (unitId, q, r) => {
    const state = get();
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

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

    // Basic RTK IV damage formula: (Atk * Troops) / Def
    // Simplified:
    const baseDamage = (attacker.officer.war * attacker.troops) / 1000;
    const targetDefense = (target.officer.leadership * target.troops) / 1000;
    const damage = Math.floor(Math.max(100, (baseDamage / Math.max(1, targetDefense)) * 500));
    
    // Counter attack
    const counterDamage = Math.floor(damage * 0.3);

    const newUnits = state.units.map(u => {
      if (u.id === targetUnitId) {
        return { ...u, troops: Math.max(0, u.troops - damage), morale: Math.max(0, u.morale - 5) };
      }
      if (u.id === attackerUnitId) {
        return { ...u, troops: Math.max(0, u.troops - counterDamage), status: 'done' as const };
      }
      return u;
    });

    set({ units: newUnits });
    get().checkBattleEnd();
  },

  endUnitTurn: (unitId) => {
    const state = get();
    const newUnits = state.units.map(u => 
      u.id === unitId ? { ...u, status: 'done' as const } : u
    );

    // Find next active unit
    const nextUnit = newUnits.find(u => u.status === 'active');
    
    if (nextUnit) {
      set({ units: newUnits, activeUnitId: nextUnit.id });
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

    const resetUnits = state.units.map(u => ({
      ...u,
      status: u.troops > 0 ? ('active' as const) : ('routed' as const)
    }));

    set({
      day: newDay,
      units: resetUnits,
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
