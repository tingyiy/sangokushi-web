import type { Officer } from './index';

export type TerrainType = 'plain' | 'forest' | 'mountain' | 'river' | 'city' | 'gate' | 'bridge';

export type UnitType = 'infantry' | 'cavalry' | 'archer';

export type UnitStatus = 'active' | 'done' | 'routed';

export interface BattleUnit {
  id: string;
  officerId: number;
  officer: Officer;
  factionId: number;
  troops: number;
  morale: number;
  maxTroops: number;
  x: number;
  y: number;
  z: number; // Cube coordinates: x + y + z = 0
  type: UnitType;
  status: UnitStatus;
  direction: number; // 0-5 for hex directions
}

export interface BattleMap {
  width: number;
  height: number;
  terrain: TerrainType[][]; // Store as [q][r] or [x][y] offset
}

export interface BattleState {
  units: BattleUnit[];
  turn: number;
  day: number;
  weather: 'sunny' | 'rain' | 'cloudy';
  activeUnitId: string | null;
  attackerId: number;
  defenderId: number;
  defenderCityId: number;
  maxDays: number;
  isFinished: boolean;
  winnerFactionId: number | null;
  battleMap: BattleMap;
}
