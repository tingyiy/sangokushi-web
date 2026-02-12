import type { City } from '../types';
import type { AIDecision, AIFactionContext } from './types';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';

/**
 * AI Strategy Subsystem
 * Handles spying and rumors.
 */
export function evaluateStrategy(context: AIFactionContext): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { ownedCities, state } = context;

  for (const city of ownedCities) {
    if (city.gold < 1000) continue;

    const neighbors = city.adjacentCityIds
        .map((id: number) => state.cities.find((c: City) => c.id === id))
        .filter((n): n is City => !!n);
    const enemyNeighbors = neighbors.filter((n: City) => n.factionId !== null && n.factionId !== city.factionId);

    if (enemyNeighbors.length > 0) {
      const target = enemyNeighbors[0];
      
      // 1. Spy
      decisions.push({
        action: 'aiSpy',
        params: [city.id, target.id],
        description: i18next.t('logs:ai.spy', { city: localizedName(city.name), target: localizedName(target.name) })
      });
      
      // 2. Rumor
      if (city.gold > 3000) {
          decisions.push({
              action: 'aiRumor',
              params: [city.id, target.id],
              description: i18next.t('logs:ai.rumor', { city: localizedName(city.name), target: localizedName(target.name) })
          });
      }
    }
  }

  return decisions;
}
