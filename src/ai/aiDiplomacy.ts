import type { Faction } from '../types';
import type { AIDecision, AIFactionContext } from './types';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import { hasSkill } from '../utils/skills';

/**
 * AI Diplomacy Subsystem
 * Handles basic diplomatic relations.
 */
export function evaluateDiplomacy(context: AIFactionContext): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { faction, state, ownedCities } = context;

  // AI only does diplomacy if they have a city with enough gold
  const richCity = ownedCities.find(c => c.gold >= 2000);
  if (!richCity) return [];

  // 1. Improve relations with powerful neighbors
  const otherFactions = state.factions.filter((f: Faction) => f.id !== faction.id);
  for (const other of otherFactions) {
    const hostility = faction.relations[other.id] ?? 60;
    if (hostility > 70 && richCity.gold >= 1000) {
      decisions.push({
        action: 'aiImproveRelations',
        params: [richCity.id, other.id],
        description: i18next.t('logs:ai.improveRelations', { faction: localizedName(faction.name), other: localizedName(other.name) })
      });
      break;
    }

    // 2. Propose alliance if relation is good
    if (hostility < 30 && !faction.allies.includes(other.id) && richCity.gold >= 2000) {
        decisions.push({
            action: 'aiFormAlliance',
            params: [richCity.id, other.id],
            description: i18next.t('logs:ai.formAlliance', { faction: localizedName(faction.name), other: localizedName(other.name) })
        });
        break;
    }

    // 3. Consider sending a hostage when hostility is moderate (40-60) and wants to ally but can't yet
    if (hostility >= 40 && hostility <= 60 && !faction.allies.includes(other.id)) {
      // Only send a hostage if we have a dispensable officer (not ruler, not governor)
      const dispensableOfficers = state.officers.filter(o =>
        o.factionId === faction.id && o.cityId !== -2 &&
        o.id !== faction.rulerId && !o.isGovernor
      );
      if (dispensableOfficers.length > 2) {
        // Pick lowest-stat officer
        const hostageCandidate = dispensableOfficers.reduce((prev, curr) =>
          (prev.leadership + prev.war + prev.intelligence + prev.politics) <
          (curr.leadership + curr.war + curr.intelligence + curr.politics) ? prev : curr
        );
        decisions.push({
          action: 'exchangeHostage',
          params: [hostageCandidate.id, other.id],
          description: `${localizedName(faction.name)} sends ${localizedName(hostageCandidate.name)} as hostage to ${localizedName(other.name)}`
        });
        break;
      }
    }

    // 4. Recall hostage when hostility ≤ 20 and we need the officer back
    if (hostility <= 20) {
      const ourHostages = other.hostageOfficerIds.filter(id =>
        state.officers.some(o => o.id === id && o.factionId === faction.id)
      );
      if (ourHostages.length > 0) {
        decisions.push({
          action: 'recallHostage',
          params: [ourHostages[0]],
          description: `${localizedName(faction.name)} recalls hostage from ${localizedName(other.name)}`
        });
      }
    }

    // 5. Plant mole when hostility > 50, has espionage officer, has 3+ officers
    if (hostility > 50) {
      const factionOfficers = state.officers.filter(o => o.factionId === faction.id);
      if (factionOfficers.length >= 3) {
        const espionageOfficer = factionOfficers.find(o =>
          hasSkill(o, 'espionage') && o.id !== faction.rulerId && !o.isGovernor && !o.acted &&
          !o.moleForFactionId
        );
        if (espionageOfficer && richCity.gold >= 1000) {
          decisions.push({
            action: 'aiPlantMole',
            params: [espionageOfficer.id, other.id],
            description: `${localizedName(faction.name)} plants ${localizedName(espionageOfficer.name)} as mole in ${localizedName(other.name)}`
          });
        }
      }
    }

    // 6. Recall moles when hostility < 30
    if (hostility < 30) {
      const ourMoles = state.officers.filter(o =>
        o.moleForFactionId === faction.id && o.factionId === other.id
      );
      for (const mole of ourMoles) {
        decisions.push({
          action: 'recallMole',
          params: [mole.id],
          description: `${localizedName(faction.name)} recalls mole ${localizedName(mole.name)} from ${localizedName(other.name)}`
        });
      }
    }
  }

  return decisions;
}
