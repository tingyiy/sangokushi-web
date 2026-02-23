import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { Officer } from '../types';
import type { GameState } from './gameStore';
import { hasSkill } from '../utils/skills';
import { autoAssignGovernorInPlace, abandonCityIfEmpty, areCitiesConnected } from './storeHelpers';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

export function createPersonnelActions(set: Set, get: Get): Pick<GameState,
  'recruitOfficer' | 'enticeOfficer' | 'recruitPOW' | 'rewardOfficer' |
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
            return { ...o, factionId: playerFaction.id, loyalty: 60, acted: true };
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

    enticeOfficer: (targetOfficerId, enticerId) => {
      const state = get();
      const playerFaction = state.playerFaction;
      if (!playerFaction) return;

      const target = state.officers.find(o => o.id === targetOfficerId);
      if (!target || target.factionId === null || target.factionId === -1 || target.factionId === playerFaction.id) return;

      // Cannot entice a ruler
      const targetFaction = state.factions.find(f => f.id === target.factionId);
      if (targetFaction && targetFaction.rulerId === target.id) {
        get().addLog(i18next.t('logs:error.cannotEnticeRuler'));
        return;
      }

      // Target must be in an adjacent city to one of the player's cities
      const targetCity = state.cities.find(c => c.id === target.cityId);
      if (!targetCity) return;
      const playerCities = state.cities.filter(c => c.factionId === playerFaction.id);
      const adjacentPlayerCity = playerCities.find(pc => pc.adjacentCityIds.includes(targetCity.id));
      if (!adjacentPlayerCity) {
        get().addLog(i18next.t('logs:error.notAdjacentForEntice'));
        return;
      }

      // Find the enticer in the adjacent player city
      let enticer: Officer | undefined;
      if (enticerId) {
        enticer = state.officers.find(o => o.id === enticerId && o.cityId === adjacentPlayerCity.id && o.factionId === playerFaction.id);
      } else {
        const candidates = state.officers.filter(o => o.cityId === adjacentPlayerCity.id && o.factionId === playerFaction.id && !o.acted);
        if (candidates.length === 0) {
          get().addLog(i18next.t('logs:error.noOfficerAvailable'));
          return;
        }
        enticer = candidates.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));
      }

      if (!enticer) {
        get().addLog(enticerId ? i18next.t('logs:error.officerNotInCityOrFaction') : i18next.t('logs:error.noOfficerAvailable'));
        return;
      }

      if (enticer.acted) {
        get().addLog(i18next.t('logs:error.officerActed', { name: localizedName(enticer.name) }));
        return;
      }

      // Compute success chance: enticer charisma vs target loyalty + target intelligence as resistance
      const isGovernor = target.isGovernor;
      const hasDiplomacy = hasSkill(enticer, 'diplomacy');
      const resistance = Math.floor(target.intelligence / 5); // smart targets harder to entice (0-20)
      let chance: number;
      if (isGovernor) {
        chance = Math.max(0, Math.min(40, enticer.charisma - target.loyalty - resistance - 20 + (hasDiplomacy ? 10 : 0)));
      } else {
        chance = Math.max(0, Math.min(60, enticer.charisma - target.loyalty - resistance + (hasDiplomacy ? 10 : 0)));
      }

      const success = Math.random() * 100 < chance;

      if (success && isGovernor) {
        // Governor flip: city switches faction, all officers in city switch
        const oldFactionId = targetCity.factionId;
        set({
          cities: state.cities.map(c =>
            c.id === targetCity.id ? { ...c, factionId: playerFaction.id } : c
          ),
          officers: state.officers.map(o => {
            if (o.id === enticer!.id) return { ...o, acted: true };
            if (o.cityId === targetCity.id && o.factionId === oldFactionId) {
              return { ...o, factionId: playerFaction.id, loyalty: 50, acted: true };
            }
            return o;
          }),
        });

        get().addLog(i18next.t('logs:personnel.enticeCityFlip', { enticer: localizedName(enticer.name), city: localizedName(targetCity.name), officer: localizedName(target.name) }));

        // Check if old faction lost all cities (elimination)
        const postState = get();
        const oldFactionCities = postState.cities.filter(c => c.factionId === oldFactionId);
        if (oldFactionCities.length === 0 && oldFactionId !== null) {
          const oldFac = postState.factions.find(f => f.id === oldFactionId);
          if (oldFac) {
            get().addLog(i18next.t('logs:military.factionDestroyed', { faction: localizedName(oldFac.name) }));
          }
        }
      } else if (success) {
        // Regular officer defects: move to enticer's city
        set({
          officers: state.officers.map(o => {
            if (o.id === enticer!.id) return { ...o, acted: true };
            if (o.id === targetOfficerId) {
              return { ...o, factionId: playerFaction.id, loyalty: 50, cityId: adjacentPlayerCity.id, isGovernor: false, acted: true };
            }
            return o;
          }),
        });

        get().addLog(i18next.t('logs:personnel.enticeSuccess', { enticer: localizedName(enticer.name), officer: localizedName(target.name) }));
      } else {
        // Failure
        set({
          officers: state.officers.map(o =>
            o.id === enticer!.id ? { ...o, acted: true } : o
          ),
        });

        get().addLog(i18next.t('logs:personnel.enticeFail', { enticer: localizedName(enticer.name), officer: localizedName(target.name) }));
      }
    },

    recruitPOW: (officerId, recruiterId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId !== (-1 as unknown as number)) return;

      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city) return;

      // POW recruitment does NOT require the recruiter to be un-acted.
      // After conquering a city, all battle participants have acted but should
      // still be able to handle POWs (RTK IV behaviour).
      let recruiter: Officer | undefined;
      if (recruiterId) {
        recruiter = state.officers.find(o => o.id === recruiterId && o.cityId === city.id && o.factionId === state.playerFaction?.id);
      } else {
        const recruiters = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
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

      const chance = 40 + recruiter.charisma - officer.loyalty / 2;
      const success = Math.random() * 100 < chance;

      // Loyalty = random(40–70) + ruler charisma / 5
      const ruler = state.officers.find(o => o.id === state.playerFaction!.rulerId);
      const rulerBonus = ruler ? Math.floor(ruler.charisma / 5) : 0;
      const startLoyalty = Math.min(100, Math.floor(Math.random() * 31) + 40 + rulerBonus);

      set({
        officers: state.officers.map(o => {
          if (o.id === recruiter!.id) return { ...o, acted: true };
          // Recruited POW is NOT marked acted — can be rewarded same turn
          if (o.id === officerId && success) return { ...o, factionId: state.playerFaction!.id, loyalty: startLoyalty, cityId: city.id };
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
      const rewardTarget = state.officers.find(o => o.id === officerId);
      if (!rewardTarget || rewardTarget.factionId !== state.playerFaction?.id) return;

      // Each officer can only be rewarded once per turn
      if (state.rewardedOfficerIds.includes(officerId)) return;

      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city || city.factionId !== state.playerFaction?.id) return;

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
        }),
        rewardedOfficerIds: [...state.rewardedOfficerIds, officerId],
      });
      get().addLog(i18next.t('logs:personnel.reward', { officer: localizedName(rewardTarget.name), amount }));
    },

    executeOfficer: (officerId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId !== -1) return;

      set({
        officers: state.officers.filter(o => o.id !== officerId)
      });
      get().addLog(i18next.t('logs:personnel.execute', { name: localizedName(officer.name) }));
    },

    dismissOfficer: (officerId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId !== state.playerFaction?.id || officer.id === state.playerFaction?.rulerId) return;

      // Mole check: if this officer is a mole, return them to their original faction
      if (officer.moleForFactionId != null) {
        const moleFaction = state.factions.find(f => f.id === officer.moleForFactionId);
        if (moleFaction) {
          const moleRuler = state.officers.find(o => o.id === moleFaction.rulerId);
          const moleRulerCityId = moleRuler?.cityId ?? state.cities.find(c => c.factionId === moleFaction.id)?.id;
          if (moleRulerCityId) {
            const updatedOfficers = state.officers.map(o =>
              o.id === officerId
                ? { ...o, factionId: moleFaction.id, cityId: moleRulerCityId, isGovernor: false, moleForFactionId: null }
                : o
            );
            const dismissedCityId = officer.cityId;
            const { cities: updatedCities, abandoned } = abandonCityIfEmpty(
              state.cities, updatedOfficers, dismissedCityId!, state.playerFaction!.id
            );
            set({ officers: updatedOfficers, cities: updatedCities });

            // If mole faction is the player, generate moleExposed event
            if (moleFaction.isPlayer) {
              set({
                pendingEvents: [...get().pendingEvents, {
                  id: `moleExposed-${officerId}-${Date.now()}`,
                  type: 'moleExposed' as const,
                  name: i18next.t('logs:diplomacy.moleExposed', { officer: localizedName(officer.name), faction: localizedName(state.playerFaction!.name) }),
                  description: i18next.t('logs:diplomacy.moleExposed', { officer: localizedName(officer.name), faction: localizedName(state.playerFaction!.name) }),
                  year: state.year,
                  month: state.month,
                  officerId: officer.id,
                }],
              });
            }
            get().addLog(i18next.t('logs:personnel.banish', { name: localizedName(officer.name) }));
            if (abandoned) {
              const abandonedCity = updatedCities.find(c => c.id === dismissedCityId);
              get().addLog(i18next.t('logs:personnel.cityAbandoned', { city: localizedName(abandonedCity?.name ?? '') }));
            }
            return;
          }
        }
      }

      const dismissedCityId = officer.cityId;
      const updatedOfficers = state.officers.map(o => o.id === officerId ? { ...o, factionId: null, isGovernor: false, loyalty: 30 } : o);

      // Auto-abandon city if no officers remain (RTK IV rule)
      const { cities: updatedCities, abandoned } = abandonCityIfEmpty(
        state.cities, updatedOfficers, dismissedCityId!, state.playerFaction!.id
      );

      set({ officers: updatedOfficers, cities: updatedCities });
      get().addLog(i18next.t('logs:personnel.banish', { name: localizedName(officer.name) }));
      if (abandoned) {
        const abandonedCity = updatedCities.find(c => c.id === dismissedCityId);
        get().addLog(i18next.t('logs:personnel.cityAbandoned', { city: localizedName(abandonedCity?.name ?? '') }));
      }
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
      // RTK IV R-001: ruler IS the governor of their city — no other governor can be appointed
      const faction = state.factions.find(f => f.id === appointee.factionId);
      const rulerInCity = faction && state.officers.some(
        o => o.id === faction.rulerId && o.cityId === cityId && o.factionId === faction.id
      );
      if (rulerInCity) return;
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
      if (!advisor || advisor.factionId !== state.playerFaction.id) return;

      set({
        factions: state.factions.map(f => f.id === state.playerFaction?.id ? { ...f, advisorId: officerId } : f),
        playerFaction: { ...state.playerFaction, advisorId: officerId }
      });
      get().addLog(i18next.t('logs:personnel.appointAdvisor', { name: localizedName(advisor?.name ?? '') }));
    },

    draftTroops: (cityId, amount, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId !== state.playerFaction?.id) return;

      const executor = officerId
        ? state.officers.find(o => o.id === officerId && o.cityId === cityId && o.factionId === state.playerFaction?.id)
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
      const actual = Math.min(amount, maxDraft);
      if (actual <= 0) {
        get().addLog(i18next.t('logs:error.troopCapReached'));
        return;
      }
      // Draft dilutes training/morale: new recruits have training 0 and morale 0 (RTK IV)
      const totalAfterDraft = city.troops + actual;
      const newTraining = totalAfterDraft > 0 ? Math.floor((city.training || 0) * city.troops / totalAfterDraft) : 0;
      const newMorale = totalAfterDraft > 0 ? Math.floor((city.morale || 0) * city.troops / totalAfterDraft) : 0;
      // Drafting reduces people loyalty (RTK IV) — scaled by ratio of drafted to population
      const loyaltyDrop = Math.ceil(actual / city.population * 30);
      const newLoyalty = Math.max(0, (city.peopleLoyalty || 0) - loyaltyDrop);
      set({
        cities: state.cities.map(c =>
          c.id === cityId
            ? {
              ...c,
              troops: c.troops + actual,
              gold: c.gold - actual * 2,
              food: c.food - actual * 3,
              population: c.population - actual,
              training: newTraining,
              morale: newMorale,
              peopleLoyalty: newLoyalty,
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
      if (fromCity.factionId !== state.playerFaction?.id) return;
      if (toCity.factionId !== state.playerFaction?.id) return;

      // RTK IV: cities must be connected through a chain of friendly cities
      if (!areCitiesConnected(state.cities, fromCityId, toCityId, state.playerFaction!.id)) {
        get().addLog(i18next.t('logs:error.citiesNotConnected', {
          from: localizedName(fromCity.name),
          to: localizedName(toCity.name),
        }));
        return;
      }

      // Find the escort officer: use specified officerId, or auto-pick first available
      const playerFactionId = state.playerFaction!.id;
      const escort = officerId
        ? state.officers.find(o => o.id === officerId && o.cityId === fromCityId && o.factionId === playerFactionId)
        : state.officers.find(o => o.cityId === fromCityId && o.factionId === playerFactionId && !o.acted);
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

      // Apply transfers — officer moves with the goods (escort)
      const wasGovernor = escort.isGovernor;
      const isRuler = state.playerFaction!.rulerId === escort.id;

      let updatedOfficers = state.officers.map(o => {
        if (o.id === escort.id) {
          return { ...o, cityId: toCityId, acted: true, isGovernor: isRuler ? true : false };
        }
        // If ruler is moving in, strip governor from existing governor at destination
        if (isRuler && o.cityId === toCityId && o.factionId === state.playerFaction!.id && o.isGovernor) {
          return { ...o, isGovernor: false };
        }
        return o;
      });

      // Auto-assign governor for source city if it lost its governor
      if (wasGovernor) {
        autoAssignGovernorInPlace(updatedOfficers, fromCityId, state.playerFaction!.id, state.factions);
      }

      // Auto-abandon source city if no officers remain
      const { cities: updatedCities, abandoned } = abandonCityIfEmpty(
        state.cities.map(c => {
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
            let training = c.training || 0;
            let morale = c.morale || 0;
            for (const [res, amt] of entries) {
              if (res === 'gold') gold += amt;
              else if (res === 'food') food += amt;
              else if (res === 'troops') {
                // Weighted-average blending of training/morale (RTK IV)
                const srcTraining = fromCity.training || 0;
                const srcMorale = fromCity.morale || 0;
                const totalTroops = troops + amt;
                if (totalTroops > 0) {
                  training = Math.floor((srcTraining * amt + training * troops) / totalTroops);
                  morale = Math.floor((srcMorale * amt + morale * troops) / totalTroops);
                }
                troops += amt;
              }
            }
            return { ...c, gold, food, troops, training, morale };
          }
          return c;
        }),
        updatedOfficers, fromCityId, state.playerFaction!.id
      );

      set({ cities: updatedCities, officers: updatedOfficers });

      // Build summary log
      const parts: string[] = [];
      for (const [res, amt] of entries) {
        parts.push(`${i18next.t(`logs:common.${res}`)} ${amt}`);
      }
      get().addLog(i18next.t('logs:domestic.transportMulti', { from: localizedName(fromCity.name), to: localizedName(toCity.name), officer: localizedName(escort.name), details: parts.join(i18next.t('logs:common.comma')) }));
      if (abandoned) {
        const abandonedCity = updatedCities.find(c => c.id === fromCityId);
        get().addLog(i18next.t('logs:personnel.cityAbandoned', { city: localizedName(abandonedCity?.name ?? '') }));
      }
    },

    transferOfficer: (officerId, targetCityId) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId !== state.playerFaction?.id) {
        get().addLog(i18next.t('logs:error.officerNotFound'));
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

      // RTK IV: cities must be connected through a chain of friendly cities
      const sourceCityId = officer.cityId;
      if (sourceCityId !== null && !areCitiesConnected(state.cities, sourceCityId, targetCityId, state.playerFaction!.id)) {
        get().addLog(i18next.t('logs:error.citiesNotConnected', {
          from: localizedName(state.cities.find(c => c.id === sourceCityId)?.name ?? ''),
          to: localizedName(destCity.name),
        }));
        return;
      }

      const wasGovernor = officer.isGovernor;
      const isRuler = state.playerFaction!.rulerId === officerId;

      const updatedOfficers = state.officers.map(o => {
        if (o.id === officerId) {
          // RTK IV R-001: ruler is always governor of their city
          return { ...o, cityId: targetCityId, isGovernor: isRuler ? true : false, acted: true };
        }
        // If ruler is moving in, strip governor from existing governor at destination
        if (isRuler && o.cityId === targetCityId && o.factionId === state.playerFaction!.id && o.isGovernor) {
          return { ...o, isGovernor: false };
        }
        return o;
      });
      // Auto-assign governor for source city if it lost its governor
      if (wasGovernor && sourceCityId !== null) {
        autoAssignGovernorInPlace(updatedOfficers, sourceCityId, state.playerFaction!.id, state.factions);
      }

      // Auto-abandon source city if no officers remain (RTK IV rule)
      const { cities: updatedCities, abandoned } = abandonCityIfEmpty(
        state.cities, updatedOfficers, sourceCityId!, state.playerFaction!.id
      );

      set({ officers: updatedOfficers, cities: updatedCities });
      const finalDestCity = updatedCities.find(c => c.id === targetCityId);
      get().addLog(i18next.t('logs:personnel.moveOfficer', { name: localizedName(officer.name), city: localizedName(finalDestCity?.name ?? '') }));
      if (abandoned) {
        const abandonedCity = updatedCities.find(c => c.id === sourceCityId);
        get().addLog(i18next.t('logs:personnel.cityAbandoned', { city: localizedName(abandonedCity?.name ?? '') }));
      }
    },
  };
}
