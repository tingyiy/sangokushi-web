import type { City, Officer, GameEvent } from '../types';
import type { GameState } from '../store/gameStore';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';

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
        name: i18next.t('logs:event.flood.name'),
        description: i18next.t('logs:event.flood.description', { city: localizedName(city.name) }),
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
        name: i18next.t('logs:event.locusts.name'),
        description: i18next.t('logs:event.locusts.description', { city: localizedName(city.name) }),
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
        name: i18next.t('logs:event.plague.name'),
        description: i18next.t('logs:event.plague.description', { city: localizedName(city.name) }),
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
        name: i18next.t('logs:event.harvest.name'),
        description: i18next.t('logs:event.harvest.description', { city: localizedName(city.name) }),
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
          name: i18next.t('logs:event.officerVisit.name'),
          description: i18next.t('logs:event.officerVisit.description', { officer: localizedName(officer.name), city: localizedName(city.name) }),
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
