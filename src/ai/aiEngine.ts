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
export function runAI(state: GameState): AIDecision[] {
  const allDecisions: AIDecision[] = [];
  
  // Only run for non-player factions
  const aiFactions = state.factions.filter((f: Faction) => !f.isPlayer);
  
  for (const faction of aiFactions) {
    const ownedCities = state.cities.filter((c: City) => c.factionId === faction.id);
    const factionOfficers = state.officers.filter((o: Officer) => o.factionId === faction.id);
    
    if (ownedCities.length === 0) continue;

    const context: AIFactionContext = {
      faction,
      state,
      ownedCities,
      factionOfficers
    };

    // Evaluate each subsystem
    const personnel = evaluatePersonnel(context);
    const development = evaluateDevelopment(context);
    const military = evaluateMilitary(context);
    const strategy = evaluateStrategy(context);
    const diplomacy = evaluateDiplomacy(context);

    // Limit AI to a few actions per turn
    const factionDecisions = [
      ...personnel.slice(0, 2),
      ...development.slice(0, 2),
      ...military.slice(0, 1),
      ...strategy.slice(0, 1),
      ...diplomacy.slice(0, 1)
    ];

    allDecisions.push(...factionDecisions);
  }
  
  return allDecisions;
}