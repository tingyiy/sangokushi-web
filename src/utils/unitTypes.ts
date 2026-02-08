import type { UnitType, TerrainType } from '../types/battle';

export interface UnitModifiers {
  movement: number;
  attackModifier: Partial<Record<TerrainType, number>>;
  defenseModifier: Partial<Record<TerrainType, number>>;
  attackRange: number;
}

export const UNIT_TYPE_MODIFIERS: Record<UnitType, UnitModifiers> = {
  infantry: {
    movement: 5,
    attackModifier: { 
      plain: 1.0, forest: 1.0, mountain: 0.8, river: 0.7, city: 1.0, gate: 0.5, bridge: 0.9 
    },
    defenseModifier: { 
      plain: 1.0, forest: 1.3, mountain: 1.5, river: 0.7, city: 1.5, gate: 2.0, bridge: 1.0 
    },
    attackRange: 1,
  },
  cavalry: {
    movement: 7,
    attackModifier: { 
      plain: 1.3, forest: 0.7, mountain: 0.5, river: 0.5, city: 0.8, gate: 0.3, bridge: 0.8 
    },
    defenseModifier: { 
      plain: 1.0, forest: 0.8, mountain: 0.6, river: 0.5, city: 0.8, gate: 0.5, bridge: 0.8 
    },
    attackRange: 1,
  },
  archer: {
    movement: 4,
    attackModifier: { 
      plain: 1.0, forest: 0.8, mountain: 1.2, river: 0.8, city: 1.0, gate: 0.8, bridge: 1.0 
    },
    defenseModifier: { 
      plain: 0.8, forest: 1.0, mountain: 1.3, river: 0.6, city: 1.2, gate: 1.5, bridge: 0.8 
    },
    attackRange: 2,
  },
};

export function getMovementRange(unitType: UnitType): number {
  return UNIT_TYPE_MODIFIERS[unitType].movement;
}

export function getAttackRange(unitType: UnitType): number {
  return UNIT_TYPE_MODIFIERS[unitType].attackRange;
}

const TERRAIN_DEFAULT = 1.0;

export function getAttackModifier(unitType: UnitType, terrain: TerrainType): number {
  return UNIT_TYPE_MODIFIERS[unitType].attackModifier[terrain] ?? TERRAIN_DEFAULT;
}

export function getDefenseModifier(unitType: UnitType, terrain: TerrainType): number {
  return UNIT_TYPE_MODIFIERS[unitType].defenseModifier[terrain] ?? TERRAIN_DEFAULT;
}

export const BATTLE_TACTICS = [
  '火計', '落石', '同討', '天變', '風變', '混亂', '連環', '落雷', '修復', '罵聲', '虛報', '鼓舞', '伏兵'
] as const;

export type BattleTactic = typeof BATTLE_TACTICS[number];

export interface TacticResult {
  success: boolean;
  message: string;
  damage?: number;
  moraleChange?: number;
  immobilized?: boolean;
}

export function calculateTacticSuccess(
  tactic: BattleTactic,
  officerIntelligence: number,
  targetIntelligence?: number
): number {
  const baseChance: Record<BattleTactic, number> = {
    '火計': 30,
    '落石': 25,
    '同討': 20,
    '天變': 35,
    '風變': 35,
    '混亂': 25,
    '連環': 30,
    '落雷': 15,
    '修復': 40,
    '罵聲': 45,
    '虛報': 30,
    '鼓舞': 40,
    '伏兵': 25,
  };

  let chance = baseChance[tactic] + officerIntelligence / 2;
  
  if (targetIntelligence !== undefined) {
    chance -= targetIntelligence / 4;
  }
  
  return Math.min(95, Math.max(5, chance));
}

export function getUnitTypeLabel(unitType: UnitType): string {
  switch (unitType) {
    case 'cavalry': return '騎';
    case 'archer': return '弓';
    case 'infantry': return '步';
  }
}
