import type { City, Officer } from '../types';
import type { AIDecision, AIFactionContext } from './types';
import { hasSkill } from '../utils/skills';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';

/**
 * AI Development Subsystem
 * Handles domestic development decisions for AI factions.
 */
export function evaluateDevelopment(context: AIFactionContext): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { ownedCities, factionOfficers } = context;

  for (const city of ownedCities) {
    const officersInCity = factionOfficers.filter((o: Officer) => o.cityId === city.id && !o.acted);
    if (officersInCity.length === 0) continue;

    const governor = officersInCity.find((o: Officer) => o.isGovernor) || officersInCity[0];
    if (governor.acted) continue;

    // Priority 1: Disaster relief if people loyalty is low
    if (city.peopleLoyalty < 50 && city.gold >= 500) {
      decisions.push({
        action: 'disasterRelief',
        params: [city.id],
        description: i18next.t('logs:ai.disasterRelief', { city: localizedName(city.name) })
      });
      continue;
    }

    // Priority 2: Flood control if low
    if (city.floodControl < 60 && city.gold >= 500) {
      decisions.push({
        action: 'developFloodControl',
        params: [city.id],
        description: i18next.t('logs:ai.developFlood', { city: localizedName(city.name) })
      });
      continue;
    }

    // Priority 3: Defense for border cities
    const isBorderCity = city.adjacentCityIds.some((adjId: number) => {
      const adjCity = context.state.cities.find((c: City) => c.id === adjId);
      return adjCity && adjCity.factionId !== city.factionId;
    });

    if (isBorderCity && city.defense < 150 && city.gold >= 500) {
      decisions.push({
        action: 'reinforceDefense',
        params: [city.id],
        description: i18next.t('logs:ai.reinforceDefense', { city: localizedName(city.name) })
      });
      continue;
    }

    // Priority 4: Commerce and Agriculture
    if (city.gold >= 500) {
      if (city.commerce < 999 || city.agriculture < 999) {
        if (city.commerce < city.agriculture) {
          decisions.push({
            action: 'developCommerce',
            params: [city.id],
            description: i18next.t('logs:ai.developCommerce', { city: localizedName(city.name) })
          });
        } else {
          decisions.push({
            action: 'developAgriculture',
            params: [city.id],
            description: i18next.t('logs:ai.developAgriculture', { city: localizedName(city.name) })
          });
        }
        continue;
      }
    }

    // Priority 5: Technology
    if (city.gold >= 2000 && city.technology < 100) {
      decisions.push({
        action: 'developTechnology',
        params: [city.id],
        description: i18next.t('logs:ai.developTech', { city: localizedName(city.name) })
      });
      continue;
    }
    
    // Priority 6: Manufacture
    if (city.gold >= 1500 && city.technology >= 50 && hasSkill(governor, 'manufacture')) {
        const weapon = Math.random() > 0.5 ? 'crossbows' : 'warHorses';
        const weaponLabel = weapon === 'crossbows'
          ? i18next.t('logs:ai.weaponCrossbows')
          : i18next.t('logs:ai.weaponWarHorses');
        decisions.push({
            action: 'manufacture',
            params: [city.id, weapon],
            description: i18next.t('logs:ai.manufacture', { city: localizedName(city.name), weapon: weaponLabel })
        });
        continue;
    }
  }

  return decisions;
}
