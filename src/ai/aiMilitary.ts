import type { City, Officer } from '../types';
import type { AIDecision, AIFactionContext } from './types';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';

/**
 * AI Military Subsystem
 * Handles troop drafting, training, and offensive decisions.
 */
export function evaluateMilitary(context: AIFactionContext): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { ownedCities, factionOfficers } = context;

  for (const city of ownedCities) {
    const officersInCity = factionOfficers.filter((o: Officer) => o.cityId === city.id && !o.acted);
    if (officersInCity.length === 0) continue;

    // 1. Draft troops if city garrison is below 30% of its population-based troop cap
    const troopCap = Math.floor(city.population * 0.12);
    const draftThreshold = Math.floor(troopCap * 0.3);
    if (city.troops < draftThreshold && city.gold >= 1000 && city.population > 10000) {
      // Draft up to 10% of population, constrained by gold/food
      const maxByPop = Math.floor(city.population * 0.1);
      const maxByGold = Math.floor(city.gold / 2);
      const maxByFood = Math.floor(city.food / 3);
      const room = Math.max(0, troopCap - city.troops);
      const draftAmount = Math.min(maxByPop, maxByGold, maxByFood, room);
      if (draftAmount > 0) {
        decisions.push({
          action: 'aiDraftTroops',
          params: [city.id, draftAmount],
          description: i18next.t('logs:ai.draftTroops', { city: localizedName(city.name) })
        });
        continue;
      }
    }

    // 2. Train troops
    if (city.troops > 2000 && (city.training < 60 || city.morale < 60) && city.food >= 1000) {
      decisions.push({
        action: 'aiTrainTroops',
        params: [city.id],
        description: i18next.t('logs:ai.trainTroops', { city: localizedName(city.name) })
      });
      continue;
    }

    // 3. Offensive actions
    const neighbors = city.adjacentCityIds
        .map((id: number) => context.state.cities.find((c: City) => c.id === id))
        .filter((n): n is City => !!n);
    const targetCity = neighbors.find((n: City) => {
      if (n.factionId === city.factionId) return false;
      const troopAdvantage = city.troops > n.troops * 2;
      const staffAdvantage = officersInCity.length >= 2;
      return troopAdvantage && staffAdvantage && city.troops > 10000;
    });

    if (targetCity) {
      decisions.push({
        action: 'aiStartBattle',
        params: [city.id, targetCity.id],
        description: i18next.t('logs:ai.attack', { city: localizedName(city.name), target: localizedName(targetCity.name) })
      });
      continue;
    }
    
    // 4. Transport
    const isBorderCity = city.adjacentCityIds.some((adjId: number) => {
        const adjCity = context.state.cities.find((c: City) => c.id === adjId);
        return adjCity && adjCity.factionId !== city.factionId;
    });
    
    if (!isBorderCity && city.troops > 10000) {
        const targetBorderCity = neighbors.find((n: City) => {
            if (n.factionId !== city.factionId) return false;
            return n.adjacentCityIds.some((adjId: number) => {
                const adjCity = context.state.cities.find((c: City) => c.id === adjId);
                return adjCity && adjCity.factionId !== city.factionId;
            });
        });
        
        if (targetBorderCity) {
            decisions.push({
                action: 'aiTransport',
                params: [city.id, targetBorderCity.id, { troops: 5000 }],
                description: i18next.t('logs:ai.transport', { city: localizedName(city.name), target: localizedName(targetBorderCity.name) })
            });
        }
    }
  }

  return decisions;
}
