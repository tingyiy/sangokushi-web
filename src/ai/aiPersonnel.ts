import type { City, Officer } from '../types';
import type { AIDecision, AIFactionContext } from './types';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';

/**
 * AI Personnel Subsystem
 * Handles recruitment, rewarding, and searching for officers.
 */
export function evaluatePersonnel(context: AIFactionContext): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { ownedCities, factionOfficers, state } = context;

  // 1. Reward disloyal officers
  for (const officer of factionOfficers) {
    const cityOfOfficer = state.cities.find((c: City) => c.id === officer.cityId);
    if (officer.loyalty < 80 && context.faction.rulerId !== officer.id && cityOfOfficer && cityOfOfficer.gold >= 500) {
      decisions.push({
        action: 'aiRewardOfficer',
        params: [officer.id, cityOfOfficer.id, 500],
        description: i18next.t('logs:ai.rewardOfficer', { officer: localizedName(officer.name) })
      });
    }
  }

  for (const city of ownedCities) {
    const officersInCity = factionOfficers.filter((o: Officer) => o.cityId === city.id && !o.acted);
    if (officersInCity.length === 0) continue;

    // 2. Recruit unaffiliated officers
    const freeOfficers = state.officers.filter((o: Officer) => o.cityId === city.id && o.factionId === null);
    if (freeOfficers.length > 0) {
      const target = freeOfficers[0];
      decisions.push({
        action: 'aiRecruitOfficer',
        params: [city.id, target.id],
        description: i18next.t('logs:ai.recruitFree', { city: localizedName(city.name), officer: localizedName(target.name) })
      });
      continue;
    }

    // 3. Recruit POWs
    const powOfficers = state.officers.filter((o: Officer) => o.factionId === -1 && o.cityId === city.id);
    if (powOfficers.length > 0) {
        const target = powOfficers[0];
        decisions.push({
            action: 'aiRecruitPOW',
            params: [city.id, target.id],
            description: i18next.t('logs:ai.recruitPOW', { city: localizedName(city.name), officer: localizedName(target.name) })
        });
        continue;
    }

    // 4. Entice enemy officers in adjacent cities (prefer lowest loyalty)
    for (const adjId of city.adjacentCityIds) {
      const adjCity = state.cities.find((c: City) => c.id === adjId);
      if (!adjCity || adjCity.factionId === null || adjCity.factionId === context.faction.id) continue;
      const adjFaction = state.factions.find((f: { id: number; rulerId: number }) => f.id === adjCity.factionId);
      const enemies = state.officers.filter((o: Officer) =>
        o.cityId === adjId && o.factionId === adjCity.factionId &&
        !(adjFaction && adjFaction.rulerId === o.id)
      ).sort((a: Officer, b: Officer) => a.loyalty - b.loyalty);
      if (enemies.length > 0 && officersInCity.length > 0) {
        const target = enemies[0]; // lowest loyalty first
        decisions.push({
          action: 'aiEnticeOfficer',
          params: [target.id, city.id],
          description: i18next.t('logs:ai.enticeSuccess', { faction: localizedName(context.faction.name), enticer: localizedName(officersInCity[0].name), officer: localizedName(target.name) })
        });
        break; // one entice per city per turn
      }
    }

    // 5. Appoint governor
    const hasGovernor = factionOfficers.some((o: Officer) => o.cityId === city.id && o.isGovernor);
    if (!hasGovernor && officersInCity.length > 0) {
        const candidate = officersInCity.reduce((prev: Officer, curr: Officer) => prev.leadership > curr.leadership ? prev : curr);
        decisions.push({
            action: 'aiAppointGovernor',
            params: [city.id, candidate.id],
            description: i18next.t('logs:ai.appointGovernor', { city: localizedName(city.name), officer: localizedName(candidate.name) })
        });
    }
  }

  return decisions;
}
