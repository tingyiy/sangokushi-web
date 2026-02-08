import type { Officer } from './index';

export type TerrainType = 'plain' | 'forest' | 'mountain' | 'river' | 'city' | 'gate' | 'bridge';

export type UnitType = 'infantry' | 'cavalry' | 'archer';

export type UnitStatus = 'active' | 'done' | 'routed' | 'confused';

export interface BattleUnit {
  id: string;
  officerId: number;
  officer: Officer;
  factionId: number;
  troops: number;
  morale: number;
  training: number;
  maxTroops: number;
  x: number;
  y: number;
  z: number;
  type: UnitType;
  status: UnitStatus;
  direction: number;
  confusedTurns?: number;
  chained?: boolean;
}

export interface BattleMap {
  width: number;
  height: number;
  terrain: TerrainType[][];
}

export interface FireHex {
  q: number;
  r: number;
  turnsLeft: number;
}

export interface GateState {
  q: number;
  r: number;
  hp: number;
  maxHp: number;
}

export type BattleWeather = 'sunny' | 'rain' | 'cloudy' | 'storm';

export interface BattleState {
  units: BattleUnit[];
  turn: number;
  day: number;
  weather: BattleWeather;
  windDirection: number;
  activeUnitId: string | null;
  attackerId: number;
  defenderId: number;
  defenderCityId: number;
  maxDays: number;
  isFinished: boolean;
  winnerFactionId: number | null;
  battleMap: BattleMap;
  isSiege: boolean;
  gates: GateState[];
  fireHexes: FireHex[];
  selectedTactic: string | null;
  capturedOfficerIds: number[];
  routedOfficerIds: number[];
}
