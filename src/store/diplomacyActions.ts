import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { GameState } from './gameStore';
import { hasSkill } from '../utils/skills';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

/**
 * Execute all player hostages held by a faction.
 * Removes them from the officers array and from the faction's hostageOfficerIds.
 */
export function executeHostages(holdingFactionId: number, state: ReturnType<Get>, get: Get, set: Set): void {
  const faction = state.factions.find(f => f.id === holdingFactionId);
  if (!faction || faction.hostageOfficerIds.length === 0) return;

  const playerFactionId = state.playerFaction?.id;
  // Only execute player hostages
  const playerHostageIds = faction.hostageOfficerIds.filter(id =>
    state.officers.some(o => o.id === id && o.factionId === playerFactionId)
  );
  if (playerHostageIds.length === 0) return;

  // Log each execution
  for (const id of playerHostageIds) {
    const officer = state.officers.find(o => o.id === id);
    if (officer) {
      get().addLog(i18next.t('logs:diplomacy.hostageExecuted', {
        faction: localizedName(faction.name),
        officer: localizedName(officer.name),
      }));
    }
  }

  const hostageSet = new Set(playerHostageIds);
  set({
    officers: get().officers.filter(o => !hostageSet.has(o.id)),
    factions: get().factions.map(f =>
      f.id === holdingFactionId
        ? { ...f, hostageOfficerIds: f.hostageOfficerIds.filter(id => !hostageSet.has(id)) }
        : f
    ),
  });
}

export function createDiplomacyActions(set: Set, get: Get): Pick<GameState, 'improveRelations' | 'formAlliance' | 'requestJointAttack' | 'proposeCeasefire' | 'demandSurrender' | 'breakAlliance' | 'exchangeHostage' | 'recallHostage' | 'plantMole' | 'recallMole'> {
  return {
    improveRelations: (targetFactionId: number, officerId?: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.factionId !== state.playerFaction?.id) return;
      if (city.gold < 1000) {
        get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:diplomacy.gift_action'), required: 1000, current: city.gold }));
        return;
      }

      // Find messenger: use specified officerId, or highest politics in city
      const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (officersInCity.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? officersInCity.find(o => o.id === officerId)
        : officersInCity.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      const targetFaction = state.factions.find(f => f.id === targetFactionId);
      if (!targetFaction) return;

      // Calculate effect
      // Base reduction: Politics / 4 + 10
      const reduction = Math.floor(messenger.politics / 4) + 10;

      const updatedFactions = state.factions.map(f => {
        if (f.id === state.playerFaction?.id) {
          const currentHostility = f.relations[targetFactionId] ?? 60;
          const newHostility = Math.max(0, currentHostility - reduction);
          return { ...f, relations: { ...f.relations, [targetFactionId]: newHostility } };
        }
        if (f.id === targetFactionId) {
          const currentHostility = f.relations[state.playerFaction!.id] ?? 60;
          const newHostility = Math.max(0, currentHostility - reduction);
          return { ...f, relations: { ...f.relations, [state.playerFaction!.id]: newHostility } };
        }
        return f;
      });

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
        officers: state.officers.map(o =>
          o.id === messenger.id
            ? { ...o, acted: true }
            : o
        ),
        factions: updatedFactions,
        playerFaction: updatedFactions.find(f => f.id === state.playerFaction?.id) || state.playerFaction
      });

      get().addLog(i18next.t('logs:diplomacy.giftSuccess', { messenger: localizedName(messenger.name), faction: localizedName(targetFaction.name), reduction }));
    },

    formAlliance: (targetFactionId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.factionId !== state.playerFaction?.id) return;
      if (city.gold < 2000) {
        get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:diplomacy.alliance_action'), required: 2000, current: city.gold }));
        return;
      }

      const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (officersInCity.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? officersInCity.find(o => o.id === officerId)
        : officersInCity.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      const targetFaction = state.factions.find(f => f.id === targetFactionId);
      if (!targetFaction) return;

      if (state.playerFaction?.allies.includes(targetFactionId)) {
        get().addLog(i18next.t('logs:error.alreadyAllied', { faction: localizedName(targetFaction.name) }));
        return;
      }

      // Success Check
      // (Politics * 0.6) + (100 - Hostility) * 0.4 > 60?
      const hostility = state.playerFaction?.relations[targetFactionId] ?? 60;
      let score = (messenger.politics * 0.6) + ((100 - hostility) * 0.4);
      // Hostage bonus: if target faction holds any of our hostages, +15
      if (targetFaction.hostageOfficerIds?.some(id => state.officers.some(o => o.id === id && o.factionId === state.playerFaction?.id))) {
        score += 15;
      }
      const success = score > 50 + (Math.random() * 20); // Threshold 50-70

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 2000 } : c),
        officers: state.officers.map(o =>
          o.id === messenger.id
            ? { ...o, acted: true }
            : o
        ),
      });

      if (success) {
        const updatedFactions = state.factions.map(f => {
          if (f.id === state.playerFaction?.id) {
            return { ...f, allies: [...f.allies, targetFactionId] };
          }
          if (f.id === targetFactionId) {
            return { ...f, allies: [...f.allies, state.playerFaction!.id] };
          }
          return f;
        });
        set({
          factions: updatedFactions,
          playerFaction: updatedFactions.find(f => f.id === state.playerFaction?.id) || state.playerFaction
        });
        get().addLog(i18next.t('logs:diplomacy.allianceSuccess', { messenger: localizedName(messenger.name), faction: localizedName(targetFaction.name) }));
      } else {
        // Failure increases hostility slightly
        const updatedFactions = state.factions.map(f => {
          if (f.id === state.playerFaction?.id) {
            const h = f.relations[targetFactionId] ?? 60;
            return { ...f, relations: { ...f.relations, [targetFactionId]: Math.min(100, h + 5) } };
          }
          return f;
        });
        set({
          factions: updatedFactions,
          playerFaction: updatedFactions.find(f => f.id === state.playerFaction?.id) || state.playerFaction
        });
        get().addLog(i18next.t('logs:diplomacy.allianceRejected', { messenger: localizedName(messenger.name), faction: localizedName(targetFaction.name) }));
      }
    },

    requestJointAttack: (allyFactionId, targetCityId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.factionId !== state.playerFaction?.id) return;
      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      let successChance = 50 + messenger.politics / 5;
      if (hasSkill(messenger, 'diplomacy')) successChance += 15;
      const success = Math.random() * 100 < successChance;

      set({
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o)
      });

      const targetFaction = state.factions.find(f => f.id === allyFactionId);
      const targetCity = state.cities.find(c => c.id === targetCityId);
      if (success) {
        get().addLog(i18next.t('logs:diplomacy.jointAttackSuccess', { messenger: localizedName(messenger.name), faction: localizedName(targetFaction?.name ?? ''), city: localizedName(targetCity?.name ?? '') }));
        // Trigger ally attack
        const allyCities = state.cities.filter(c => c.factionId === allyFactionId);
        const neighborAllyCity = allyCities.find(ac => ac.adjacentCityIds.includes(targetCityId));
        if (neighborAllyCity) {
          get().aiStartBattle(neighborAllyCity.id, targetCityId);
        }
      } else {
        get().addLog(i18next.t('logs:diplomacy.jointAttackRejected', { faction: localizedName(targetFaction?.name ?? '') }));
      }
    },

    proposeCeasefire: (targetFactionId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.factionId !== state.playerFaction?.id) return;
      if (city.gold < 1000) {
        get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:diplomacy.ceasefire_action'), required: 1000, current: city.gold }));
        return;
      }
      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      const hostility = state.playerFaction?.relations[targetFactionId] ?? 60;
      const successChance = 30 + messenger.politics / 3 + (100 - hostility) / 5;
      const success = Math.random() * 100 < successChance;

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o)
      });

      const targetFaction = state.factions.find(f => f.id === targetFactionId);
      if (success) {
        const expiresYear = state.year + 1;
        const expiresMonth = state.month;
        const updatedFactions = state.factions.map(f => {
          if (f.id === state.playerFaction?.id) {
            return {
              ...f,
              relations: { ...f.relations, [targetFactionId]: 20 },
              ceasefires: [...f.ceasefires, { factionId: targetFactionId, expiresMonth, expiresYear }]
            };
          }
          if (f.id === targetFactionId) {
            return {
              ...f,
              relations: { ...f.relations, [state.playerFaction!.id]: 20 },
              ceasefires: [...f.ceasefires, { factionId: state.playerFaction!.id, expiresMonth, expiresYear }]
            };
          }
          return f;
        });
        set({
          factions: updatedFactions,
          playerFaction: updatedFactions.find(f => f.id === state.playerFaction?.id) || state.playerFaction
        });
        get().addLog(i18next.t('logs:diplomacy.ceasefireSuccess', { messenger: localizedName(messenger.name), faction: localizedName(targetFaction?.name ?? '') }));
      } else {
        get().addLog(i18next.t('logs:diplomacy.ceasefireRejected', { faction: localizedName(targetFaction?.name ?? '') }));
      }
    },

    demandSurrender: (targetFactionId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.factionId !== state.playerFaction?.id) return;
      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      // Success based on power ratio. Simplified for now.
      const targetCities = state.cities.filter(c => c.factionId === targetFactionId).length;
      const playerCities = state.cities.filter(c => c.factionId === state.playerFaction?.id).length;
      const success = targetCities === 1 && playerCities > 5 && Math.random() < 0.1;

      set({
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o)
      });

      const targetFaction = state.factions.find(f => f.id === targetFactionId);
      if (success && targetFaction) {
        // Transfer everything. 
        get().addLog(i18next.t('logs:diplomacy.surrenderAccepted', { faction: localizedName(targetFaction.name) }));
        const freshCities = get().cities;
        const freshOfficers = get().officers;
        const freshFactions = get().factions;
        set({
          cities: freshCities.map(c => c.factionId === targetFactionId ? { ...c, factionId: state.playerFaction!.id } : c),
          officers: freshOfficers.map(o => o.factionId === targetFactionId ? { ...o, factionId: state.playerFaction!.id, loyalty: 50 } : o),
          factions: freshFactions.filter(f => f.id !== targetFactionId)
        });
      } else {
        get().addLog(i18next.t('logs:diplomacy.surrenderRejected', { faction: localizedName(targetFaction?.name ?? '') }));
      }
    },

    breakAlliance: (targetFactionId) => {
      const state = get();
      if (!state.playerFaction) return;

      // Execute hostages held by the target faction (betrayal consequence)
      executeHostages(targetFactionId, state, get, set);

      set({
        factions: get().factions.map(f => {
          if (f.id === state.playerFaction?.id) {
            return {
              ...f,
              allies: f.allies.filter(id => id !== targetFactionId),
              relations: { ...f.relations, [targetFactionId]: Math.min(100, (f.relations[targetFactionId] || 60) + 40) }
            };
          }
          if (f.id === targetFactionId) {
            return {
              ...f,
              allies: f.allies.filter(id => id !== state.playerFaction?.id),
              relations: { ...f.relations, [state.playerFaction!.id]: Math.min(100, (f.relations[state.playerFaction!.id] || 60) + 40) }
            };
          }
          // Other factions also dislike betrayal
          const currentH = f.relations[state.playerFaction!.id] || 60;
          return { ...f, relations: { ...f.relations, [state.playerFaction!.id]: Math.min(100, currentH + 10) } };
        })
      });
      const targetFaction = get().factions.find(f => f.id === targetFactionId);
      get().addLog(i18next.t('logs:diplomacy.betrayAlliance', { faction: localizedName(targetFaction?.name ?? '') }));
    },

    exchangeHostage: (officerId, targetFactionId) => {
      const state = get();
      if (!state.playerFaction) return;
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId !== state.playerFaction.id) return;
      if (officer.cityId === -2) {
        get().addLog(i18next.t('logs:error.alreadyHostage', { name: localizedName(officer.name) }));
        return;
      }

      // Add hostage and reduce hostility by 15 (bidirectional)
      const updatedFactions = state.factions.map(f => {
        if (f.id === targetFactionId) {
          const currentH = f.relations[state.playerFaction!.id] ?? 60;
          return {
            ...f,
            hostageOfficerIds: [...f.hostageOfficerIds, officerId],
            relations: { ...f.relations, [state.playerFaction!.id]: Math.max(0, currentH - 15) },
          };
        }
        if (f.id === state.playerFaction!.id) {
          const currentH = f.relations[targetFactionId] ?? 60;
          return {
            ...f,
            relations: { ...f.relations, [targetFactionId]: Math.max(0, currentH - 15) },
          };
        }
        return f;
      });

      set({
        factions: updatedFactions,
        playerFaction: updatedFactions.find(f => f.id === state.playerFaction?.id) || state.playerFaction,
        officers: state.officers.map(o => o.id === officerId ? { ...o, cityId: -2 } : o) // -2 indicates hostage
      });
      const targetFaction = updatedFactions.find(f => f.id === targetFactionId);
      get().addLog(i18next.t('logs:military.hostage', { officer: localizedName(officer.name), faction: localizedName(targetFaction?.name ?? '') }));
      get().addLog(i18next.t('logs:diplomacy.hostageBoost', { faction: localizedName(targetFaction?.name ?? '') }));
    },

    recallHostage: (officerId) => {
      const state = get();
      if (!state.playerFaction) return;
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId !== state.playerFaction.id || officer.cityId !== -2) return;

      // Find which faction holds this hostage
      const holdingFaction = state.factions.find(f => f.hostageOfficerIds.includes(officerId));
      if (!holdingFaction) return;

      // Require hostility ≤ 20
      const hostility = state.playerFaction.relations[holdingFaction.id] ?? 60;
      if (hostility > 20) {
        get().addLog(i18next.t('logs:error.relationsNotGoodEnough', { faction: localizedName(holdingFaction.name) }));
        return;
      }

      // Return officer to first player-owned city
      const firstCity = state.cities.find(c => c.factionId === state.playerFaction!.id);
      if (!firstCity) return;

      set({
        officers: state.officers.map(o =>
          o.id === officerId ? { ...o, cityId: firstCity.id } : o
        ),
        factions: state.factions.map(f =>
          f.id === holdingFaction.id
            ? { ...f, hostageOfficerIds: f.hostageOfficerIds.filter(id => id !== officerId) }
            : f
        ),
      });
      get().addLog(i18next.t('logs:diplomacy.hostageRecalled', {
        officer: localizedName(officer.name),
        faction: localizedName(holdingFaction.name),
      }));
    },

    plantMole: (targetFactionId: number, officerId?: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.factionId !== state.playerFaction?.id) return;
      if (city.gold < 1000) {
        get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:diplomacy.molePlant_action'), required: 1000, current: city.gold }));
        return;
      }

      const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (officersInCity.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }

      // Find an officer with espionage skill
      const candidates = officersInCity.filter(o => hasSkill(o, 'espionage'));
      const mole = officerId
        ? candidates.find(o => o.id === officerId)
        : candidates[0];

      if (!mole) {
        get().addLog(i18next.t('logs:error.noSkillEspionage', { name: '' }));
        return;
      }

      if (mole.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(mole.name) }));
        return;
      }

      const targetFaction = state.factions.find(f => f.id === targetFactionId);
      if (!targetFaction) return;

      // Deduct gold and mark acted
      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
        officers: state.officers.map(o =>
          o.id === mole.id ? { ...o, acted: true } : o
        ),
      });

      get().addLog(i18next.t('logs:diplomacy.molePlanted', {
        officer: localizedName(mole.name),
        faction: localizedName(targetFaction.name),
      }));

      // For AI target: evaluate acceptance
      // Base 50% + war/10 + leadership/10, capped at 90%
      const acceptChance = Math.min(90, 50 + mole.war / 10 + mole.leadership / 10);
      const accepted = Math.random() * 100 < acceptChance;

      if (accepted) {
        // Officer joins target faction at their capital (ruler's city)
        const targetRuler = get().officers.find(o => o.id === targetFaction.rulerId);
        const targetCapitalId = targetRuler?.cityId ?? get().cities.find(c => c.factionId === targetFactionId)?.id;
        if (!targetCapitalId) return;

        set({
          officers: get().officers.map(o =>
            o.id === mole.id
              ? { ...o, factionId: targetFactionId, cityId: targetCapitalId, loyalty: 60, moleForFactionId: state.playerFaction!.id }
              : o
          ),
        });
        get().addLog(i18next.t('logs:diplomacy.moleAccepted', {
          officer: localizedName(mole.name),
          faction: localizedName(targetFaction.name),
        }));
      } else {
        // Declined — officer returns home (already in city, just restore faction)
        set({
          officers: get().officers.map(o =>
            o.id === mole.id
              ? { ...o, factionId: state.playerFaction!.id }
              : o
          ),
        });
        get().addLog(i18next.t('logs:diplomacy.moleDeclined', {
          officer: localizedName(mole.name),
          faction: localizedName(targetFaction.name),
        }));
      }
    },

    recallMole: (officerId: number) => {
      const state = get();
      if (!state.playerFaction) return;
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.moleForFactionId !== state.playerFaction.id) return;

      // Check that officer is still in an enemy faction
      if (officer.factionId === null || officer.factionId === state.playerFaction.id) {
        get().addLog(i18next.t('logs:diplomacy.moleRecallFailed', { officer: localizedName(officer.name) }));
        return;
      }

      // Return to ruler's city
      const ruler = state.officers.find(o => o.id === state.playerFaction!.rulerId);
      const rulerCityId = ruler?.cityId ?? state.cities.find(c => c.factionId === state.playerFaction!.id)?.id;
      if (!rulerCityId) return;

      set({
        officers: state.officers.map(o =>
          o.id === officerId
            ? { ...o, factionId: state.playerFaction!.id, cityId: rulerCityId, moleForFactionId: null }
            : o
        ),
      });
      get().addLog(i18next.t('logs:diplomacy.moleRecalled', { officer: localizedName(officer.name) }));
    },
  };
}
