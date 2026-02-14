import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { Officer } from '../types';
import type { GameState } from './gameStore';
import { hasSkill } from '../utils/skills';
import { autoAssignGovernorInPlace } from './storeHelpers';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

export function createPersonnelActions(set: Set, get: Get): Pick<GameState,
  'recruitOfficer' | 'searchOfficer' | 'recruitPOW' | 'rewardOfficer' |
  'executeOfficer' | 'dismissOfficer' | 'appointGovernor' | 'appointAdvisor' |
  'draftTroops' | 'transport' | 'transferOfficer'
> {
  return {
    recruitOfficer: (officerId, recruiterId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId !== null) return;
      const playerFaction = state.playerFaction;
      if (!playerFaction) return;

      const city = state.cities.find(c => c.id === officer.cityId);
      if (!city) return;

      let recruiter: Officer | undefined;
      if (recruiterId) {
        recruiter = state.officers.find(o => o.id === recruiterId && o.cityId === city.id && o.factionId === playerFaction.id);
      } else {
        const recruiters = state.officers.filter(o => o.cityId === city.id && o.factionId === playerFaction.id && !o.acted);
        if (recruiters.length === 0) {
          get().addLog(i18next.t('logs:error.noOfficerAvailable'));
          return;
        }
        recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));
      }

      if (!recruiter) {
        get().addLog(recruiterId ? i18next.t('logs:error.officerNotInCityOrFaction') : i18next.t('logs:error.noOfficerAvailable'));
        return;
      }

      if (recruiter.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(recruiter.name) }));
        return;
      }

      const chance = Math.min(90, 30 + recruiter.charisma - officer.politics);
      const success = Math.random() * 100 < chance;

      set({
        officers: state.officers.map(o => {
          if (o.id === recruiter!.id) {
            return { ...o, acted: true };
          }
          if (o.id === officerId && success) {
            return { ...o, factionId: playerFaction.id, loyalty: 60 };
          }
          return o;
        }),
      });

      if (success) {
        get().addLog(i18next.t('logs:personnel.recruitSuccess', { recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }));
      } else {
        get().addLog(i18next.t('logs:personnel.recruitFail', { recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }));
      }
    },

    searchOfficer: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city) return;

      let recruiter: Officer | undefined;
      if (officerId) {
        recruiter = state.officers.find(o => o.id === officerId && o.cityId === cityId && o.factionId === state.playerFaction?.id);
      } else {
        const recruiters = state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && !o.acted);
        if (recruiters.length === 0) {
          get().addLog(i18next.t('logs:error.noOfficerAvailable'));
          return;
        }
        recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));
      }

      if (!recruiter) {
        get().addLog(officerId ? i18next.t('logs:error.officerNotInCityOrFaction') : i18next.t('logs:error.noOfficerAvailable'));
        return;
      }

      if (recruiter.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(recruiter.name) }));
        return;
      }

      const unaffiliated = state.officers.filter(o => o.cityId === cityId && o.factionId === null);
      let found = false;
      let foundOfficer: Officer | null = null;

      for (const off of unaffiliated) {
        let chance = 30 + recruiter.charisma / 2;
        if (hasSkill(recruiter, 'talent')) chance += 15;
        if (Math.random() * 100 < chance) {
          foundOfficer = off;
          found = true;
          break;
        }
      }

      set({
        officers: state.officers.map(o => o.id === recruiter!.id ? { ...o, acted: true } : o)
      });

      if (found && foundOfficer) {
        get().addLog(i18next.t('logs:personnel.searchFoundOfficer', { recruiter: localizedName(recruiter.name), city: localizedName(city.name), officer: localizedName(foundOfficer.name) }));
      } else {
        if (Math.random() < 0.15) {
          get().addLog(i18next.t('logs:personnel.searchFoundTreasure', { recruiter: localizedName(recruiter.name), city: localizedName(city.name) }));
        } else {
          get().addLog(i18next.t('logs:personnel.searchNothing', { recruiter: localizedName(recruiter.name), city: localizedName(city.name) }));
        }
      }
    },

    recruitPOW: (officerId, recruiterId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId !== (-1 as unknown as number)) return;

      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city) return;

      let recruiter: Officer | undefined;
      if (recruiterId) {
        recruiter = state.officers.find(o => o.id === recruiterId && o.cityId === city.id && o.factionId === state.playerFaction?.id);
      } else {
        const recruiters = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id && !o.acted);
        if (recruiters.length === 0) {
          get().addLog(i18next.t('logs:error.noOfficerForSurrender'));
          return;
        }
        recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));
      }

      if (!recruiter) {
        get().addLog(recruiterId ? i18next.t('logs:error.officerNotInCityOrFaction') : i18next.t('logs:error.noOfficerForSurrender'));
        return;
      }

      if (recruiter.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(recruiter.name) }));
        return;
      }

      const chance = 40 + recruiter.charisma - officer.loyalty / 2;
      const success = Math.random() * 100 < chance;

      set({
        officers: state.officers.map(o => {
          if (o.id === recruiter!.id) return { ...o, acted: true };
          if (o.id === officerId && success) return { ...o, factionId: state.playerFaction!.id, loyalty: 50, cityId: city.id };
          return o;
        })
      });

      if (success) {
        get().addLog(i18next.t('logs:personnel.surrenderSuccess', { recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }));
      } else {
        get().addLog(i18next.t('logs:personnel.surrenderFail', { recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }));
      }
    },

    rewardOfficer: (officerId, type, amount = 1000) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);

      if (type === 'treasure') {
        get().addLog(i18next.t('logs:error.treasureRewardNotImplemented'));
        return;
      }

      if (!city || city.gold < amount) {
        if (city) get().addLog(i18next.t('logs:error.rewardGoldInsufficient', { amount, current: city.gold }));
        return;
      }

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - amount } : c),
        officers: state.officers.map(o => {
          if (o.id === officerId) {
            return { ...o, loyalty: Math.min(100, o.loyalty + 5 + Math.floor(amount / 500)) };
          }
          return o;
        })
      });
      const officer = state.officers.find(o => o.id === officerId);
      get().addLog(i18next.t('logs:personnel.reward', { officer: localizedName(officer?.name ?? ''), amount }));
    },

    executeOfficer: (officerId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer) return;

      set({
        officers: state.officers.filter(o => o.id !== officerId)
      });
      get().addLog(i18next.t('logs:personnel.execute', { name: localizedName(officer.name) }));
    },

    dismissOfficer: (officerId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.id === state.playerFaction?.rulerId) return;

      set({
        officers: state.officers.map(o => o.id === officerId ? { ...o, factionId: null, isGovernor: false, loyalty: 30 } : o)
      });
      get().addLog(i18next.t('logs:personnel.banish', { name: localizedName(officer.name) }));
    },

    appointGovernor: (cityId, officerId) => {
      const state = get();
      const appointee = state.officers.find(o => o.id === officerId);
      if (!appointee) {
        get().addLog(i18next.t('logs:error.officerNotFound'));
        return;
      }
      if (appointee.factionId !== state.playerFaction?.id) {
        get().addLog(i18next.t('logs:error.notOurFaction', { name: localizedName(appointee.name) }));
        return;
      }
      if (appointee.cityId !== cityId) {
        const targetCity = state.cities.find(c => c.id === cityId);
        get().addLog(i18next.t('logs:error.notInTargetCity', { name: localizedName(appointee.name), city: localizedName(targetCity?.name || '') }));
        return;
      }
      set({
        officers: state.officers.map(o => {
          if (o.cityId === cityId) {
            if (o.id === officerId) return { ...o, isGovernor: true };
            if (o.isGovernor) return { ...o, isGovernor: false };
          }
          return o;
        })
      });
      const finalOfficer = state.officers.find(o => o.id === officerId);
      get().addLog(i18next.t('logs:personnel.appointGovernor', { name: localizedName(finalOfficer?.name ?? '') }));
    },

    appointAdvisor: (officerId) => {
      const state = get();
      if (!state.playerFaction) return;
      const advisor = state.officers.find(o => o.id === officerId);

      set({
        factions: state.factions.map(f => f.id === state.playerFaction?.id ? { ...f, advisorId: officerId } : f),
        playerFaction: { ...state.playerFaction, advisorId: officerId }
      });
      get().addLog(i18next.t('logs:personnel.appointAdvisor', { name: localizedName(advisor?.name ?? '') }));
    },

    draftTroops: (cityId, amount, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city) return;

      const executor = officerId
        ? state.officers.find(o => o.id === officerId && o.cityId === cityId)
        : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor && !o.acted)
          || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && !o.acted).sort((a, b) => b.politics - a.politics)[0];

      if (!executor) {
        get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
        return;
      }
      if (executor.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(executor.name) }));
        return;
      }

      const goldCost = amount * 2;
      const foodCost = amount * 3;
      if (city.gold < goldCost || city.food < foodCost) {
        const shortages: string[] = [];
        if (city.gold < goldCost) shortages.push(`金 ${goldCost}（現有 ${city.gold}）`);
        if (city.food < foodCost) shortages.push(`糧 ${foodCost}（現有 ${city.food}）`);
        get().addLog(i18next.t('logs:error.resourceInsufficient', { action: i18next.t('logs:domestic.conscript_action'), details: shortages.join(i18next.t('logs:common.comma')) }));
        return;
      }
      const maxDraft = Math.floor(city.population * 0.1);
      const troopCap = Math.floor(city.population * 0.12);
      const roomForTroops = Math.max(0, troopCap - city.troops);
      const actual = Math.min(amount, maxDraft, roomForTroops);
      if (actual <= 0) {
        get().addLog(i18next.t('logs:error.troopCapReached'));
        return;
      }
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? {
              ...c,
              troops: c.troops + actual,
              gold: c.gold - actual * 2,
              food: c.food - actual * 3,
              population: c.population - actual,
            }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.conscript', { city: localizedName(city.name), officer: localizedName(executor.name), amount: actual }));
    },

    transport: (fromCityId, toCityId, resources, officerId) => {
      const state = get();
      const fromCity = state.cities.find(c => c.id === fromCityId);
      const toCity = state.cities.find(c => c.id === toCityId);
      if (!fromCity || !toCity) return;

      // Find the escort officer: use specified officerId, or auto-pick first available
      const factionId = fromCity.factionId ?? state.playerFaction?.id;
      const escort = officerId
        ? state.officers.find(o => o.id === officerId && o.cityId === fromCityId && o.factionId === factionId)
        : state.officers.find(o => o.cityId === fromCityId && o.factionId === factionId && !o.acted);
      if (!escort) {
        get().addLog(i18next.t('logs:error.transportNoOfficer'));
        return;
      }
      if (escort.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(escort.name) }));
        return;
      }

      // Validate all requested resources
      const entries = Object.entries(resources).filter(([, amt]) => amt !== undefined && amt > 0) as [string, number][];
      if (entries.length === 0) return;

      const shortages: string[] = [];
      for (const [res, amt] of entries) {
        const available = fromCity[res as keyof typeof fromCity] as number;
        if (available < amt) {
          const label = res === 'gold' ? '金' : res === 'food' ? '糧' : '兵';
          shortages.push(i18next.t('logs:error.transportInsufficient', { label, amount: amt, current: available }));
        }
      }
      if (shortages.length > 0) {
        shortages.forEach(s => get().addLog(s));
        return;
      }

      // Apply transfers
      set({
        cities: state.cities.map(c => {
          if (c.id === fromCityId) {
            let gold = c.gold;
            let food = c.food;
            let troops = c.troops;
            for (const [res, amt] of entries) {
              if (res === 'gold') gold -= amt;
              else if (res === 'food') food -= amt;
              else if (res === 'troops') troops -= amt;
            }
            return { ...c, gold, food, troops };
          }
          if (c.id === toCityId) {
            let gold = c.gold;
            let food = c.food;
            let troops = c.troops;
            for (const [res, amt] of entries) {
              if (res === 'gold') gold += amt;
              else if (res === 'food') food += amt;
              else if (res === 'troops') troops += amt;
            }
            return { ...c, gold, food, troops };
          }
          return c;
        }),
        officers: state.officers.map(o => o.id === escort.id ? { ...o, acted: true } : o)
      });

      // Build summary log
      const parts: string[] = [];
      for (const [res, amt] of entries) {
        parts.push(`${i18next.t(`logs:common.${res}`)} ${amt}`);
      }
      get().addLog(i18next.t('logs:domestic.transportMulti', { from: localizedName(fromCity.name), to: localizedName(toCity.name), officer: localizedName(escort.name), details: parts.join(i18next.t('logs:common.comma')) }));
    },

    transferOfficer: (officerId, targetCityId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer) {
        get().addLog(i18next.t('logs:error.moveOfficerStamina', { name: '' }));
        return;
      }
      if (officer.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(officer.name) }));
        return;
      }
      const destCity = state.cities.find(c => c.id === targetCityId);
      if (!destCity || destCity.factionId !== state.playerFaction?.id) {
        get().addLog(i18next.t('logs:error.moveOnlyFriendly'));
        return;
      }

      const wasGovernor = officer.isGovernor;
      const sourceCityId = officer.cityId;
      const updatedOfficers = state.officers.map(o => o.id === officerId ? { ...o, cityId: targetCityId, isGovernor: false, acted: true } : o);
      if (wasGovernor && sourceCityId !== null) {
        autoAssignGovernorInPlace(updatedOfficers, sourceCityId, state.playerFaction!.id);
      }
      set({ officers: updatedOfficers });
      const finalDestCity = state.cities.find(c => c.id === targetCityId);
      get().addLog(i18next.t('logs:personnel.moveOfficer', { name: localizedName(officer.name), city: localizedName(finalDestCity?.name ?? '') }));
    },
  };
}
