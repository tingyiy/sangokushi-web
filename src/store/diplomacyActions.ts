import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { GameState } from './gameStore';
import { hasSkill } from '../utils/skills';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

export function createDiplomacyActions(set: Set, get: Get): Pick<GameState, 'improveRelations' | 'formAlliance' | 'requestJointAttack' | 'proposeCeasefire' | 'demandSurrender' | 'breakAlliance' | 'exchangeHostage'> {
  return {
    improveRelations: (targetFactionId: number, officerId?: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.gold < 1000) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:diplomacy.gift_action'), required: 1000, current: city.gold }));
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
      if (!city || city.gold < 2000) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:diplomacy.alliance_action'), required: 2000, current: city.gold }));
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
      const score = (messenger.politics * 0.6) + ((100 - hostility) * 0.4);
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
      if (!city) return;
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
      if (!city || city.gold < 1000) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:diplomacy.ceasefire_action'), required: 1000, current: city.gold }));
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
      if (!city) return;
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

      set({
        factions: state.factions.map(f => {
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
      const targetFaction = state.factions.find(f => f.id === targetFactionId);
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

      set({
        factions: state.factions.map(f => f.id === targetFactionId ? { ...f, hostageOfficerIds: [...f.hostageOfficerIds, officerId] } : f),
        officers: state.officers.map(o => o.id === officerId ? { ...o, cityId: -2 } : o) // -2 indicates hostage
      });
      const targetFaction = state.factions.find(f => f.id === targetFactionId);
      get().addLog(i18next.t('logs:military.hostage', { officer: localizedName(officer.name), faction: localizedName(targetFaction?.name ?? '') }));
    },
  };
}
