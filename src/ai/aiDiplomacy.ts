import type { Faction } from '../types';
import type { AIDecision, AIFactionContext } from './types';

/**
 * AI Diplomacy Subsystem
 * Handles basic diplomatic relations.
 */
export function evaluateDiplomacy(context: AIFactionContext): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { faction, state, ownedCities } = context;

  // AI only does diplomacy if they have a city with enough gold
  const richCity = ownedCities.find(c => c.gold >= 2000);
  if (!richCity) return [];

  // 1. Improve relations with powerful neighbors
  const otherFactions = state.factions.filter((f: Faction) => f.id !== faction.id);
  for (const other of otherFactions) {
    const hostility = faction.relations[other.id] ?? 60;
    if (hostility > 70 && richCity.gold >= 1000) {
      decisions.push({
        action: 'aiImproveRelations',
        params: [richCity.id, other.id],
        description: `${faction.name} 派遣使者向 ${other.name} 示好。`
      });
      break; 
    }
    
    // 2. Propose alliance if relation is good
    if (hostility < 30 && !faction.allies.includes(other.id) && richCity.gold >= 2000) {
        decisions.push({
            action: 'aiFormAlliance',
            params: [richCity.id, other.id],
            description: `${faction.name} 提議與 ${other.name} 締結同盟。`
        });
        break;
    }
  }

  return decisions;
}