import type { City } from '../types';
import type { AIDecision, AIFactionContext } from './types';

/**
 * AI Strategy Subsystem
 * Handles spying and rumors.
 */
export function evaluateStrategy(context: AIFactionContext): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { ownedCities, state } = context;

  for (const city of ownedCities) {
    if (city.gold < 1000) continue;

    const neighbors = city.adjacentCityIds.map((id: number) => state.cities.find((c: City) => c.id === id)!);
    const enemyNeighbors = neighbors.filter((n: City) => n.factionId !== null && n.factionId !== city.factionId);

    if (enemyNeighbors.length > 0) {
      const target = enemyNeighbors[0];
      
      // 1. Spy
      decisions.push({
        action: 'spy',
        params: [target.id],
        description: `${city.name}：派人潛入 ${target.name} 刺探情報。`
      });
      
      // 2. Rumor
      if (city.gold > 3000) {
          decisions.push({
              action: 'rumor',
              params: [target.id],
              description: `${city.name}：在 ${target.name} 散布流言以動搖民心。`
          });
      }
    }
  }

  return decisions;
}