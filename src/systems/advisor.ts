import type { GameState } from '../store/gameStore';

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
    // low gold / high potential
    if (city.gold < 1000 && city.commerce < 500 && quality > 60) {
      suggestions.push(`${city.name} 的金錢不足，應當開發商業以增加收入。`);
    }
    // low food
    if (city.food < 3000 && city.agriculture < 500 && quality > 60) {
      suggestions.push(`${city.name} 的糧草儲備堪憂，建議加強農業開發。`);
    }
    // low troops
    if (city.troops < 3000 && quality > 50) {
      suggestions.push(`${city.name} 兵力薄弱，容易成為敵軍目標，建議徵兵。`);
    }
    // low training
    if (city.troops > 5000 && city.training < 50 && quality > 65) {
      suggestions.push(`${city.name} 的部隊缺乏訓練，戰鬥力不足，應加強訓練。`);
    }
  });

  // 2. Check for disloyal officers
  const playerOfficers = officers.filter(o => o.factionId === playerFaction.id);
  playerOfficers.forEach(officer => {
    if (officer.loyalty < 70 && officer.id !== playerFaction.rulerId) {
      if (quality > 70) {
        suggestions.push(`${officer.name} 忠誠度僅為 ${officer.loyalty}，應立即褒賞以防叛變！`);
      }
    }
  });

  // 3. Strategic advice (e.g. empty nearby cities or nearby strong enemies)
  // This could be more complex, but for now focus on basics

  // Return top 3 most relevant suggestions
  return suggestions.slice(0, 3);
}
