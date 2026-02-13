import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { GameState } from './gameStore';
import { hasSkill } from '../utils/skills';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

export function createDomesticActions(set: Set, get: Get): Pick<GameState,
  'setTaxRate' | 'promoteOfficer' | 'developCommerce' | 'developAgriculture' |
  'reinforceDefense' | 'developFloodControl' | 'developTechnology' |
  'trainTroops' | 'manufacture' | 'disasterRelief'
> {
  return {
    setTaxRate: (cityId: number, rate: 'low' | 'medium' | 'high') => {
      set(state => ({
        cities: state.cities.map(c => c.id === cityId ? { ...c, taxRate: rate } : c)
      }));
      const city = get().cities.find(c => c.id === cityId);
      const rateText = i18next.t(`data:taxRate.${rate}`);
      get().addLog(i18next.t('logs:domestic.taxRateChanged', { city: localizedName(city?.name ?? ''), rate: rateText }));
    },

    promoteOfficer: (officerId: number, rank: import('../types').OfficerRank) => {
      set(state => ({
        officers: state.officers.map(o => o.id === officerId ? { ...o, rank } : o)
      }));
      const officer = get().officers.find(o => o.id === officerId);
      get().addLog(i18next.t('logs:domestic.promoted', { name: localizedName(officer?.name ?? ''), rank: i18next.t(`data:rank.${rank}`) }));
    },

    developCommerce: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.gold < 500) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:domestic.developCommerce_action'), required: 500, current: city.gold }));
        return;
      }
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
      const bonus = Math.floor(executor.politics / 10);
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? { ...c, commerce: Math.min(999, c.commerce + 10 + bonus), gold: c.gold - 500 }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.developCommerce', { city: localizedName(city.name), officer: localizedName(executor.name), bonus: 10 + bonus }));
    },

    developAgriculture: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.gold < 500) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:domestic.developAgriculture_action'), required: 500, current: city.gold }));
        return;
      }
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
      const bonus = Math.floor(executor.politics / 10);
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? { ...c, agriculture: Math.min(999, c.agriculture + 10 + bonus), gold: c.gold - 500 }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.developAgriculture', { city: localizedName(city.name), officer: localizedName(executor.name), bonus: 10 + bonus }));
    },

    reinforceDefense: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.gold < 300) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:domestic.reinforceDefense_action'), required: 300, current: city.gold }));
        return;
      }
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
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? { ...c, defense: Math.min(100, c.defense + 5), gold: c.gold - 300 }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.reinforceDefense', { city: localizedName(city.name), officer: localizedName(executor.name) }));
    },

    developFloodControl: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.gold < 500) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:domestic.developFlood_action'), required: 500, current: city.gold }));
        return;
      }
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
      const bonus = Math.floor(executor.politics / 15);
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? { ...c, floodControl: Math.min(100, c.floodControl + 8 + bonus), gold: c.gold - 500 }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.developFlood', { city: localizedName(city.name), officer: localizedName(executor.name), bonus: 8 + bonus }));
    },

    developTechnology: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.gold < 800) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:domestic.developTech_action'), required: 800, current: city.gold }));
        return;
      }
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
      const bonus = Math.floor(executor.intelligence / 20);
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? { ...c, technology: Math.min(100, (c.technology || 0) + 5 + bonus), gold: c.gold - 800 }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.developTech', { city: localizedName(city.name), officer: localizedName(executor.name), bonus: 5 + bonus }));
    },

    trainTroops: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.food < 500) {
        if (city) get().addLog(i18next.t('logs:error.foodInsufficient', { required: 500, current: city.food }));
        return;
      }
      if (city.troops <= 0) {
        get().addLog(i18next.t('logs:error.noTroops'));
        return;
      }
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
      const trainingBonus = Math.floor(executor.leadership / 15);
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? {
              ...c,
              training: Math.min(100, (c.training || 0) + 8 + trainingBonus),
              morale: Math.min(100, (c.morale || 0) + 3),
              food: c.food - 500
            }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.trainTroops', { city: localizedName(city.name), officer: localizedName(executor.name) }));
    },

    manufacture: (cityId, weaponType, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.gold < 1000) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:domestic.manufacture_action'), required: 1000, current: city.gold }));
        return;
      }
      const executor = officerId
        ? state.officers.find(o => o.id === officerId && o.cityId === cityId)
        : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor && !o.acted)
          || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && !o.acted).sort((a, b) => b.politics - a.politics)[0];

      if (!executor) {
        get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
        return;
      }
      if (!hasSkill(executor, 'manufacture')) {
        get().addLog(i18next.t('logs:error.noManufactureSkill', { name: localizedName(executor.name) }));
        return;
      }
      if (executor.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(executor.name) }));
        return;
      }

      const tech = city.technology || 0;
      const gates = { crossbows: 30, warHorses: 40, batteringRams: 60, catapults: 80 };
      if (tech < gates[weaponType]) {
        get().addLog(i18next.t('logs:error.techInsufficient', { required: gates[weaponType] }));
        return;
      }

      const amount = 10 + Math.floor(tech / 10);

      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? { ...c, [weaponType]: (c[weaponType] || 0) + amount, gold: c.gold - 1000 }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.manufacture', { city: localizedName(city.name), officer: localizedName(executor.name), amount, weapon: i18next.t(`data:weapon.${weaponType}`) }));
    },

    disasterRelief: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.gold < 500 || city.food < 1000) {
        if (city) {
          const shortages: string[] = [];
          if (city.gold < 500) shortages.push(`金 需 500（現有 ${city.gold}）`);
          if (city.food < 1000) shortages.push(`糧 需 1000（現有 ${city.food}）`);
          get().addLog(i18next.t('logs:error.resourceInsufficient', { action: i18next.t('logs:domestic.relief_action'), details: shortages.join(i18next.t('logs:common.comma')) }));
        }
        return;
      }
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

      const bonus = Math.floor(executor.politics / 10);
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? {
              ...c,
              peopleLoyalty: Math.min(100, (c.peopleLoyalty || 0) + 15 + bonus),
              gold: c.gold - 500,
              food: c.food - 1000
            }
            : c
        ),
        officers: state.officers.map(o =>
          o.id === executor.id
            ? { ...o, acted: true }
            : o
        ),
      });
      get().addLog(i18next.t('logs:domestic.relief', { city: localizedName(city.name), officer: localizedName(executor.name), bonus: 15 + bonus }));
    },
  };
}
