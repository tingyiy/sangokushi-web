import type { City, Officer, GameEvent } from '../types';
import type { GameState } from '../store/gameStore';

/**
 * Random Events System - Phase 6.4
 * Handles natural disasters and special turn-based events.
 */
export function rollRandomEvents(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const { cities, year, month } = state;

  cities.forEach((city: City) => {
    if (city.factionId === null) return;

    const roll = Math.random() * 100;
    
    // Flood (3% chance, reduced by floodControl)
    if (roll < 3 * (1 - city.floodControl / 150)) {
      events.push({
        id: `flood-${city.id}-${year}-${month}`,
        type: 'flood',
        name: '洪水',
        description: `${city.name} 發生了大規模洪水，人口與物資受到損失。`,
        cityId: city.id,
        year,
        month
      });
    } 
    // Locusts (2% chance)
    else if (roll < 5) {
      events.push({
        id: `locusts-${city.id}-${year}-${month}`,
        type: 'locusts',
        name: '蝗災',
        description: `${city.name} 遭到蝗蟲襲擊，糧草損失慘重。`,
        cityId: city.id,
        year,
        month
      });
    }
    // Plague (1% chance)
    else if (roll < 6) {
      events.push({
        id: `plague-${city.id}-${year}-${month}`,
        type: 'plague',
        name: '瘟疫',
        description: `${city.name} 爆發了瘟疫，人口與兵力減少。`,
        cityId: city.id,
        year,
        month
      });
    }
    // Harvest (July/October, 10% chance)
    else if ((month === 7 || month === 10) && roll < 20) {
      events.push({
        id: `harvest-${city.id}-${year}-${month}`,
        type: 'harvest',
        name: '豐收',
        description: `${city.name} 今年獲得了大豐收，糧草收入增加！`,
        cityId: city.id,
        year,
        month
      });
    }
  });

  return events;
}

/**
 * Officer Visit Events - Phase 6.4.1
 */
export function rollOfficerVisits(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const { playerFaction, cities, officers, year, month } = state;
  if (!playerFaction) return [];

  const playerCities = cities.filter((c: City) => c.factionId === playerFaction.id);
  const ruler = officers.find((o: Officer) => o.id === playerFaction.rulerId);
  if (!ruler) return [];

  playerCities.forEach((city: City) => {
    // Find unaffiliated officers in this city
    const unaffiliated = officers.filter((o: Officer) => o.cityId === city.id && o.factionId === null);
    
    unaffiliated.forEach((officer: Officer) => {
      // Chance influenced by ruler charisma
      if (Math.random() < 0.05 * (ruler.charisma / 100)) {
        events.push({
          id: `visit-${officer.id}-${year}-${month}`,
          type: 'officerVisit',
          name: '武將求見',
          description: `${officer.name} 來到了 ${city.name} 求見主公，是否接見？`,
          cityId: city.id,
          officerId: officer.id,
          year,
          month
        });
      }
    });
  });

  return events;
}

/**
 * Apply event effects to the state
 */
export function applyEventEffects(event: GameEvent, cities: City[], officers: Officer[]): { cities: City[], officers: Officer[] } {
  const updatedCities = cities.map(c => {
    if (c.id !== event.cityId) return c;

    switch (event.type) {
      case 'flood':
        return {
          ...c,
          population: Math.floor(c.population * 0.95),
          gold: Math.floor(c.gold * 0.9),
          food: Math.floor(c.food * 0.85),
          defense: Math.max(0, c.defense - 10)
        };
      case 'locusts':
        return {
          ...c,
          food: Math.floor(c.food * 0.7)
        };
      case 'plague':
        return {
          ...c,
          population: Math.floor(c.population * 0.9),
          troops: Math.floor(c.troops * 0.85)
        };
      case 'harvest':
        return {
          ...c,
          food: Math.floor(c.food + 5000 + Math.random() * 5000)
        };
      default:
        return c;
    }
  });

  return { cities: updatedCities, officers };
}
