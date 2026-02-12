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
    const officersInCity = factionOfficers.filter((o: Officer) => o.cityId === city.id && o.stamina >= 30);
    if (officersInCity.length === 0) continue;

    // 1. Draft troops if city is under-defended
    if (city.troops < 5000 && city.gold >= 1000 && city.population > 10000) {
      decisions.push({
        action: 'draftTroops',
        params: [city.id, 2000],
        description: i18next.t('logs:ai.draftTroops', { city: localizedName(city.name) })
      });
      continue;
    }

    // 2. Train troops
    if (city.troops > 2000 && (city.training < 60 || city.morale < 60) && city.food >= 1000) {
      decisions.push({
        action: 'trainTroops',
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
                action: 'transport',
                params: [city.id, targetBorderCity.id, 'troops', 5000],
                description: i18next.t('logs:ai.transport', { city: localizedName(city.name), target: localizedName(targetBorderCity.name) })
            });
        }
    }
  }

  return decisions;
}
