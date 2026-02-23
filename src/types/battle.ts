import type { Officer } from './index';

export type TerrainType = 'plain' | 'forest' | 'mountain' | 'river' | 'city' | 'gate' | 'bridge' | 'swamp' | 'sand';

/** Battle terrain theme — controls map generation style based on city geography */
export type BattleTerrainType = 'plains' | 'wetland' | 'highland' | 'arid';

export type UnitType = 'infantry' | 'cavalry' | 'archer';

export type UnitStatus = 'active' | 'done' | 'routed' | 'confused' | 'arriving';

/** Player interaction mode during their turn */
export type BattleMode = 'idle' | 'move' | 'attack' | 'tactic';

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
  /** Whether the unit has moved this turn (can still attack after moving) */
  hasMoved?: boolean;
  /** Day on which this unit arrives on the battlefield (1 = immediate) */
  arrivalDay: number;
  /** City this unit is marching from (for spawn position calculation on arrival) */
  sourceCityId?: number;
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

/** Whose phase it is: player acts freely, then enemy AI acts */
export type TurnPhase = 'player' | 'enemy';

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
  isFinished: boolean;
  /** Battle paused at end of month (day 30) — waiting for month transition before resuming */
  battlePaused: boolean;
  winnerFactionId: number | null;
  battleMap: BattleMap;
  isSiege: boolean;
  gates: GateState[];
  fireHexes: FireHex[];
  /** Current interaction mode */
  mode: BattleMode;
  /** Selected tactic name when mode === 'tactic' */
  selectedTactic: string | null;
  capturedOfficerIds: number[];
  routedOfficerIds: number[];
  /** Battle log messages for combat feedback */
  battleLog: string[];
  /** Unit or hex being inspected (not the active unit) */
  inspectedUnitId: string | null;
  /** Whose phase: player picks units freely, then enemy AI acts */
  turnPhase: TurnPhase;
  /** Which faction the human player controls in this battle */
  playerFactionId: number;
  /** City terrain defense coefficient (0.90-1.35) — defenders take reduced damage */
  defenseCoefficient: number;
  /** Food supply for the attacker side (consumed daily: 1 food per soldier) */
  attackerFood: number;
  /** Food supply for the defender side (replenished from city, but finite) */
  defenderFood: number;
  /** Consecutive days the attacker has had 0 food (for escalating morale drain) */
  attackerStarveDays: number;
  /** Consecutive days the defender has had 0 food (for escalating morale drain) */
  defenderStarveDays: number;
  /** Officer IDs of moles among defender units that the attacker can trigger betrayal on */
  moleOfficerIds: number[];
}
