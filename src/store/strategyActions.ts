import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { GameState } from './gameStore';
import { hasSkill } from '../utils/skills';
import { spyingSystem } from '../game/spy/SpyingSystem';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

export function createStrategyActions(set: Set, get: Get): Pick<GameState, 'rumor' | 'counterEspionage' | 'inciteRebellion' | 'arson' | 'spy' | 'gatherIntelligence'> {
  return {
    rumor: (targetCityId: number, officerId?: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.gold < 500) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:strategy.rumor_action'), required: 500, current: city.gold }));
        return;
      }

      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      // Phase 1.1: Check for 流言 skill
      if (!hasSkill(messenger, 'rumor')) {
        get().addLog(i18next.t('logs:error.noSkillRumor', { name: localizedName(messenger.name) }));
        return;
      }

      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      const targetCity = state.cities.find(c => c.id === targetCityId);
      if (!targetCity || targetCity.factionId === state.playerFaction?.id) return;

      // Success Check
      // Success chance: Intelligence / 2 + 20
      const success = (Math.random() * 100) < (messenger.intelligence / 2 + 20);

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c),
        officers: state.officers.map(o =>
          o.id === messenger.id
            ? { ...o, acted: true }
            : o
        ),
      });

      if (success) {
        // Impact: decrease loyalty of officers in target city, decrease population slightly
        const loyaltyImpact = Math.floor(messenger.intelligence / 10) + 5;
        const popImpact = Math.floor(targetCity.population * 0.02);

        set({
          officers: get().officers.map(o =>
            (o.cityId === targetCityId && o.factionId === targetCity.factionId && !o.isGovernor)
              ? { ...o, loyalty: Math.max(0, o.loyalty - loyaltyImpact) }
              : o
          ),
          cities: get().cities.map(c =>
            c.id === targetCityId
              ? { ...c, population: Math.max(0, c.population - popImpact), peopleLoyalty: Math.max(0, c.peopleLoyalty - 5) }
              : c
          ),
          // Rumor reveals info (3 months)
          revealedCities: {
            ...state.revealedCities,
            [targetCityId]: {
              untilYear: state.year + Math.floor((state.month + 2) / 12),
              untilMonth: (state.month + 3 - 1) % 12 + 1
            }
          }
        });
        get().addLog(i18next.t('logs:strategy.rumorSuccess', { messenger: localizedName(messenger.name), city: localizedName(targetCity.name) }));
      } else {
        get().addLog(i18next.t('logs:strategy.rumorFail', { messenger: localizedName(messenger.name) }));
      }
    },

    counterEspionage: (_targetCityId, targetOfficerId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.gold < 800) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:strategy.provoke_action'), required: 800, current: city.gold }));
        return;
      }
      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (!hasSkill(messenger, 'provoke')) {
        get().addLog(i18next.t('logs:error.noSkillProvoke', { name: localizedName(messenger.name) }));
        return;
      }
      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      const targetOfficer = state.officers.find(o => o.id === targetOfficerId);
      if (!targetOfficer) return;

      const successChance = 30 + messenger.intelligence / 3 - targetOfficer.loyalty / 4;
      const success = Math.random() * 100 < successChance;

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 800 } : c),
        officers: state.officers.map(o => {
          if (o.id === messenger.id) return { ...o, acted: true };
          if (o.id === targetOfficerId && success) return { ...o, loyalty: Math.max(0, o.loyalty - (10 + Math.floor(messenger.intelligence / 10))) };
          return o;
        })
      });

      if (success) {
        get().addLog(i18next.t('logs:strategy.provokeSuccess', { messenger: localizedName(messenger.name), officer: localizedName(targetOfficer.name) }));
      } else {
        get().addLog(i18next.t('logs:strategy.provokeFail', { messenger: localizedName(messenger.name) }));
      }
    },

    inciteRebellion: (targetCityId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.gold < 1000) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:strategy.tigerTrap_action'), required: 1000, current: city.gold }));
        return;
      }
      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (!hasSkill(messenger, 'tigerTrap')) {
        get().addLog(i18next.t('logs:error.noSkillTigerTrap', { name: localizedName(messenger.name) }));
        return;
      }
      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      const impact = 10 + Math.floor(messenger.intelligence / 8);
      const targetCity = state.cities.find(c => c.id === targetCityId);
      if (!targetCity) return;

      set({
        cities: state.cities.map(c => {
          if (c.id === city.id) return { ...c, gold: c.gold - 1000 };
          if (c.id === targetCityId) {
            const newPeopleLoyalty = Math.max(0, (c.peopleLoyalty || 0) - impact);
            let newTroops = c.troops;
            if (newPeopleLoyalty < 30) newTroops = Math.floor(newTroops * 0.95);
            return { ...c, peopleLoyalty: newPeopleLoyalty, troops: newTroops };
          }
          return c;
        }),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o)
      });

      get().addLog(i18next.t('logs:strategy.tigerTrapSuccess', { messenger: localizedName(messenger.name), city: localizedName(targetCity.name) }));
    },

    arson: (targetCityId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.gold < 500) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:strategy.arson_action'), required: 500, current: city.gold }));
        return;
      }
      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (!hasSkill(messenger, 'arson')) {
        get().addLog(i18next.t('logs:error.noSkillArson', { name: localizedName(messenger.name) }));
        return;
      }
      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      const successChance = 25 + messenger.intelligence / 3;
      const success = Math.random() * 100 < successChance;

      set({
        cities: state.cities.map(c => {
          if (c.id === city.id) return { ...c, gold: c.gold - 500 };
          if (c.id === targetCityId && success) {
            const goldLoss = Math.floor(c.gold * (0.1 + Math.random() * 0.1));
            const foodLoss = Math.floor(c.food * (0.1 + Math.random() * 0.1));
            return { ...c, gold: Math.max(0, c.gold - goldLoss), food: Math.max(0, c.food - foodLoss) };
          }
          return c;
        }),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o)
      });

      const targetCity = state.cities.find(c => c.id === targetCityId);
      if (success) {
        get().addLog(i18next.t('logs:strategy.arsonSuccess', { messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }));
      } else {
        get().addLog(i18next.t('logs:strategy.arsonFail', { messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }));
      }
    },

    spy: (targetCityId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.gold < 500) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:strategy.espionage_action'), required: 500, current: city.gold }));
        return;
      }
      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (!hasSkill(messenger, 'intelligence') && !hasSkill(messenger, 'espionage')) {
        get().addLog(i18next.t('logs:error.noSkillEspionage', { name: localizedName(messenger.name) }));
        return;
      }
      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      const targetCity = state.cities.find(c => c.id === targetCityId);
      const result = spyingSystem.spy(
        { intelligence: messenger.intelligence, espionage: hasSkill(messenger, 'espionage') },
        targetCityId,
        state.playerFaction!.id,
        targetCity?.factionId || null
      );

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o),
        revealedCities: result.success
          ? {
            ...state.revealedCities,
            [targetCityId]: {
              untilYear: state.year + Math.floor((state.month + 5) / 12),
              untilMonth: (state.month + 6 - 1) % 12 + 1
            }
          }
          : state.revealedCities
      });

      if (result.success) {
        get().addLog(i18next.t('logs:strategy.espionageSuccess', { messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }));
      } else {
        get().addLog(i18next.t('logs:strategy.espionageFail', { messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }));
        if (result.loyaltyPenalty && targetCityId) {
          // Simplified loyalty penalty impact
          const currentState = get();
          set({
            cities: currentState.cities.map(c => c.id === targetCityId ? { ...c, peopleLoyalty: Math.max(0, (c.peopleLoyalty || 0) - result.loyaltyPenalty!) } : c)
          });
        }
      }
    },

    gatherIntelligence: (targetCityId, officerId?) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.gold < 300) {
        if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:strategy.intelligence_action'), required: 300, current: city.gold }));
        return;
      }
      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (messengers.length === 0) {
        get().addLog(i18next.t('logs:error.noOfficerAvailable'));
        return;
      }
      const messenger = officerId
        ? messengers.find(o => o.id === officerId)
        : messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

      if (!messenger) {
        get().addLog(i18next.t('logs:error.officerNotInCity'));
        return;
      }

      if (!hasSkill(messenger, 'intelligence')) {
        get().addLog(i18next.t('logs:error.noSkillIntelligence', { name: localizedName(messenger.name) }));
        return;
      }
      if (messenger.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(messenger.name) }));
        return;
      }

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 300 } : c),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o),
        revealedCities: {
          ...state.revealedCities,
          [targetCityId]: {
            untilYear: state.year + Math.floor((state.month + 2) / 12),
            untilMonth: (state.month + 3 - 1) % 12 + 1
          }
        }
      });

      const targetCity = state.cities.find(c => c.id === targetCityId);
      get().addLog(i18next.t('logs:strategy.intelligenceSuccess', { messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }));
    },
  };
}
