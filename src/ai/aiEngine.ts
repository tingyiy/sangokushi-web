import type { GameState } from '../store/gameStore';
import type { Faction, City, Officer } from '../types';
import type { AIDecision, AIFactionContext } from './types';
import { evaluateDevelopment } from './aiDevelopment';
import { evaluateMilitary } from './aiMilitary';
import { evaluatePersonnel } from './aiPersonnel';
import { evaluateDiplomacy } from './aiDiplomacy';
import { evaluateStrategy } from './aiStrategy';

/**
 * AI Engine
 * Core logic for coordinating AI faction turns.
 */

/**
 * Run AI decisions for a single faction.
 */
export function runAIForFaction(state: GameState, factionId: number): AIDecision[] {
  const faction = state.factions.find((f: Faction) => f.id === factionId);
  if (!faction || faction.isPlayer) return [];

  const ownedCities = state.cities.filter((c: City) => c.factionId === faction.id);
  const factionOfficers = state.officers.filter((o: Officer) => o.factionId === faction.id);

  if (ownedCities.length === 0) return [];

  const context: AIFactionContext = {
    faction,
    state,
    ownedCities,
    factionOfficers,
  };

  // Evaluate each subsystem
  const personnel = evaluatePersonnel(context);
  const development = evaluateDevelopment(context);
  const military = evaluateMilitary(context);
  const strategy = evaluateStrategy(context);
  const diplomacy = evaluateDiplomacy(context);

  // Limit AI to a few actions per turn
  return [
    ...personnel.slice(0, 2),
    ...development.slice(0, 2),
    ...military.slice(0, 1),
    ...strategy.slice(0, 1),
    ...diplomacy.slice(0, 1),
  ];
}

/**
 * Run AI for all non-player factions (legacy — used by tests and batched flow).
 */
export function runAI(state: GameState): AIDecision[] {
  const allDecisions: AIDecision[] = [];
  const aiFactions = state.factions.filter((f: Faction) => !f.isPlayer);

  for (const faction of aiFactions) {
    allDecisions.push(...runAIForFaction(state, faction.id));
  }

  return allDecisions;
}