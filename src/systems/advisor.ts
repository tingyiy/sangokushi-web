import type { GameState } from '../store/gameStore';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';

/**
 * Advisor System - Phase 6.1
 * Provides strategic suggestions based on the current game state and the advisor's intelligence.
 */
export function getAdvisorSuggestions(state: GameState): string[] {
  const { playerFaction, cities, officers } = state;
  if (!playerFaction || !playerFaction.advisorId) return [];

  const advisor = officers.find(o => o.id === playerFaction.advisorId);
  if (!advisor) return [];

  const suggestions: string[] = [];
  const quality = advisor.intelligence;

  // 1. Check for weak city development
  const playerCities = cities.filter(c => c.factionId === playerFaction.id);
  playerCities.forEach(city => {
    const cityName = localizedName(city.name);
    // low gold / high potential
    if (city.gold < 1000 && city.commerce < 500 && quality > 60) {
      suggestions.push(i18next.t('logs:advisor.lowGold', { city: cityName }));
    }
    // low food
    if (city.food < 3000 && city.agriculture < 500 && quality > 60) {
      suggestions.push(i18next.t('logs:advisor.lowFood', { city: cityName }));
    }
    // low troops
    if (city.troops < 3000 && quality > 50) {
      suggestions.push(i18next.t('logs:advisor.lowTroops', { city: cityName }));
    }
    // low training
    if (city.troops > 5000 && city.training < 50 && quality > 65) {
      suggestions.push(i18next.t('logs:advisor.lowTraining', { city: cityName }));
    }
  });

  // 2. Check for disloyal officers
  const playerOfficers = officers.filter(o => o.factionId === playerFaction.id);
  playerOfficers.forEach(officer => {
    if (officer.loyalty < 70 && officer.id !== playerFaction.rulerId) {
      if (quality > 70) {
        suggestions.push(i18next.t('logs:advisor.lowLoyalty', { officer: localizedName(officer.name), loyalty: officer.loyalty }));
      }
    }
  });

  // 3. Strategic advice (e.g. empty nearby cities or nearby strong enemies)
  // This could be more complex, but for now focus on basics

  // Return top 3 most relevant suggestions
  return suggestions.slice(0, 3);
}
