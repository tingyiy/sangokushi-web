import type { Faction, City, Officer } from '../types';
import type { GameState } from '../store/gameStore';

export interface AIDecision {
  action: keyof GameState;
  params: unknown[];
  description: string;
}

export interface AIFactionContext {
  faction: Faction;
  state: GameState;
  ownedCities: City[];
  factionOfficers: Officer[];
}