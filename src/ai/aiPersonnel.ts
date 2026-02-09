import type { City, Officer } from '../types';
import type { AIDecision, AIFactionContext } from './types';

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
        action: 'rewardOfficer',
        params: [officer.id, 'gold', 500],
        description: `主公賜予 ${officer.name} 獎金以安撫其心。`
      });
    }
  }

  for (const city of ownedCities) {
    const officersInCity = factionOfficers.filter((o: Officer) => o.cityId === city.id && o.stamina >= 30);
    if (officersInCity.length === 0) continue;

    // 2. Recruit unaffiliated officers
    const freeOfficers = state.officers.filter((o: Officer) => o.cityId === city.id && o.factionId === null);
    if (freeOfficers.length > 0) {
      const target = freeOfficers[0];
      decisions.push({
        action: 'aiRecruitOfficer',
        params: [city.id, target.id],
        description: `${city.name}：嘗試登庸在野武將 ${target.name}。`
      });
      continue;
    }

    // 3. Recruit POWs
    const powOfficers = state.officers.filter((o: Officer) => o.factionId === -1 && o.cityId === city.id);
    if (powOfficers.length > 0) {
        const target = powOfficers[0];
        decisions.push({
            action: 'recruitPOW',
            params: [target.id],
            description: `${city.name}：嘗試登庸戰俘 ${target.name}。`
        });
        continue;
    }

    // 4. Search for officers
    if (officersInCity.length < 3 && city.gold >= 500) {
      decisions.push({
        action: 'aiSearchOfficer',
        params: [city.id],
        description: `${city.name}：派遣武將在城內搜索人才。`
      });
      continue;
    }
    
    // 5. Appoint governor
    const hasGovernor = factionOfficers.some((o: Officer) => o.cityId === city.id && o.isGovernor);
    if (!hasGovernor && officersInCity.length > 0) {
        const candidate = officersInCity.reduce((prev: Officer, curr: Officer) => prev.leadership > curr.leadership ? prev : curr);
        decisions.push({
            action: 'appointGovernor',
            params: [city.id, candidate.id],
            description: `${city.name}：任命 ${candidate.name} 為太守。`
        });
    }
  }

  return decisions;
}