import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { Officer } from '../types';
import type { GameState } from './gameStore';
import { hasSkill } from '../utils/skills';
import { spyingSystem } from '../game/spy/SpyingSystem';
import { runAI } from '../ai/aiEngine';
import { getAdvisorSuggestions } from '../systems/advisor';
import { rollRandomEvents, rollOfficerVisits, applyEventEffects } from '../systems/events';
import { checkHistoricalEvents } from '../data/historicalEvents';
import { autoAssignGovernorInPlace } from './storeHelpers';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

export function createTurnActions(set: Set, get: Get): Pick<GameState, 'endTurn' | 'applyAIDecisions' | 'aiFormAlliance' | 'aiImproveRelations' | 'aiRecruitOfficer' | 'aiRecruitPOW' | 'aiSearchOfficer' | 'aiSpy' | 'aiRumor'> {
  return {
    endTurn: () => {
      const state = get();
      let newMonth = state.month + 1;
      let newYear = state.year;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }

      // Phase 6.2: Salary definition
      const rankSalaries: Record<string, number> = {
        'governor': 100,
        'general': 80,
        'viceroy': 80,
        'advisor': 70,
        'attendant': 60,
        'common': 30,
      };

      // 1. All faction income & Phase 6.7 Population/Tax
      let updatedCities = state.cities.map(c => {
        if (c.factionId !== null) {
          const loyaltyMultiplier = c.peopleLoyalty / 100;
          let taxMultiplier = 1.0;
          let loyaltyChange = 0;
          let popChangeRate = 0.005; // Base 0.5% growth

          if (c.taxRate === 'low') {
            taxMultiplier = 0.5;
            loyaltyChange = 2;
            popChangeRate = 0.01;
          } else if (c.taxRate === 'high') {
            taxMultiplier = 1.5;
            loyaltyChange = -2;
            popChangeRate = -0.005;
          }

          const goldIncome = Math.floor(c.commerce * 0.5 * loyaltyMultiplier * taxMultiplier);
          const foodIncome = Math.floor(c.agriculture * 0.8 * loyaltyMultiplier * taxMultiplier);

          // Salary deduction
          const cityOfficers = state.officers.filter(o => o.cityId === c.id && o.factionId === c.factionId);
          const totalSalary = cityOfficers.reduce((sum, o) => sum + (rankSalaries[o.rank] || 30), 0);

          return {
            ...c,
            gold: Math.max(0, c.gold + goldIncome - totalSalary),
            food: c.food + foodIncome,
            peopleLoyalty: Math.min(100, Math.max(0, c.peopleLoyalty + loyaltyChange)),
            population: Math.floor(c.population * (1 + popChangeRate))
          };
        }
        return c;
      });

      // 2. Phase 6.6: Officer Lifecycle & Phase 7.3: Relationships
      // Reset acted flag for all officers at start of new turn
      const deadOfficerIds: number[] = [];
      const updatedOfficersPreDeath = state.officers.map(o => {
        let newLoyalty = o.loyalty;

        // Rule: Related officers in same faction get +10 loyalty
        if (o.factionId !== null && o.relationships && o.relationships.length > 0) {
          const hasRelativeInFaction = o.relationships.some(r => {
            const relative = state.officers.find(of => of.id === r.targetId);
            return relative && relative.factionId === o.factionId;
          });
          if (hasRelativeInFaction) {
            newLoyalty = Math.min(100, newLoyalty + 10);
          }
        }

        if (newYear >= o.deathYear && newMonth === 1 && Math.random() < 0.3) {
          deadOfficerIds.push(o.id);
        }

        // Reset acted flag and check aging death
        return { ...o, acted: false, loyalty: newLoyalty };
      });

      const updatedOfficers = updatedOfficersPreDeath.filter(o => !deadOfficerIds.includes(o.id));

      // Handle ruler succession
      let updatedFactions = state.factions;
      deadOfficerIds.forEach(deadId => {
        const deadOfficer = state.officers.find(o => o.id === deadId);
        if (!deadOfficer) return;

        const faction = updatedFactions.find(f => f.rulerId === deadId);
        if (faction) {
          // Find successor
          const candidates = updatedOfficers.filter(o => o.factionId === faction.id);
          if (candidates.length > 0) {
            // Heuristic: highest rank, then highest leadership + charisma
            const successor = candidates.reduce((prev, curr) => {
              const rankOrder: Record<string, number> = { 'governor': 6, 'viceroy': 5, 'general': 4, 'advisor': 3, 'attendant': 2, 'common': 1 };
              const prevScore = (rankOrder[prev.rank] || 0) * 1000 + prev.leadership + prev.charisma;
              const currScore = (rankOrder[curr.rank] || 0) * 1000 + curr.leadership + curr.charisma;
              return currScore > prevScore ? curr : prev;
            });

            updatedFactions = updatedFactions.map(f => f.id === faction.id ? { ...f, rulerId: successor.id } : f);
            get().addLog(i18next.t('logs:game.succession', { dead: localizedName(deadOfficer.name), successor: localizedName(successor.name) }));
          } else {
            // Faction collapses: remove faction and make its cities neutral
            updatedFactions = updatedFactions.filter(f => f.id !== faction.id);
            updatedCities = updatedCities.map(c => c.factionId === faction.id ? { ...c, factionId: null } : c);
            get().addLog(i18next.t('logs:game.factionCollapse', { dead: localizedName(deadOfficer.name) }));
          }
        } else {
          get().addLog(i18next.t('logs:game.obituary', { name: localizedName(deadOfficer.name) }));
        }
      });

      // Update state basic info
      set({
        month: newMonth,
        year: newYear,
        cities: updatedCities,
        officers: updatedOfficers,
        factions: updatedFactions,
        selectedCityId: null,
        activeCommandCategory: null,
      });

      get().addLog(i18next.t('logs:game.turnHeader', { year: newYear, month: newMonth }));

      const postIncomeState = get();

      // 3. AI turns
      const decisions = runAI(postIncomeState);
      get().applyAIDecisions(decisions);

      // 4. Phase 6.4 & 6.5: Events
      const randomEvents = rollRandomEvents(get());
      const historicalEventsTriggered = checkHistoricalEvents(get());
      const visitEvents = rollOfficerVisits(get());

      const allEvents = [...randomEvents, ...historicalEventsTriggered, ...visitEvents];

      let finalCities = get().cities;
      let finalOfficers = get().officers;
      let finalFactions = get().factions;

      allEvents.forEach(event => {
        get().addLog(i18next.t('logs:game.event', { name: event.name, description: event.description }));

        // Apply random event effects
        const result = applyEventEffects(event, finalCities, finalOfficers);
        finalCities = result.cities;
        finalOfficers = result.officers;

        // Apply historical event mutations
        if (event.type === 'historical' && event.mutate) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mutation: any = event.mutate(get());
          if (mutation.cities) finalCities = mutation.cities;
          if (mutation.officers) finalOfficers = mutation.officers;
          if (mutation.factions) finalFactions = mutation.factions;
        }
      });

      // 5. Phase 6.1: Advisor Suggestions
      if (state.playerFaction) {
        const suggestions = getAdvisorSuggestions(get());
        suggestions.forEach(s => get().addLog(i18next.t('logs:game.advisor', { suggestion: s })));
      }

      // Phase 7.9: Auto-assign governors for all player cities missing one
      if (state.playerFaction) {
        const playerCities = finalCities.filter(c => c.factionId === state.playerFaction?.id);
        for (const pc of playerCities) {
          autoAssignGovernorInPlace(finalOfficers, pc.id, state.playerFaction.id);
        }
      }

      // Update factions (ceasefires etc)
      set({
        cities: finalCities,
        officers: finalOfficers,
        factions: finalFactions.map(f => ({
          ...f,
          ceasefires: f.ceasefires.filter(c => {
            if (c.expiresYear < newYear) return false;
            if (c.expiresYear === newYear && c.expiresMonth < newMonth) return false;
            return true;
          })
        })),
        pendingGovernorAssignmentCityId: null,
        pendingEvents: allEvents
      });
    },

    applyAIDecisions: (decisions) => {
      decisions.forEach(d => {
        const currentStore = get();
        const action = currentStore[d.action as keyof GameState];
        if (typeof action === 'function') {
          try {
            (action as (...args: unknown[]) => void)(...d.params);
            if (d.description) {
              get().addLog(d.description);
            }
          } catch (error) {
            console.error(`AI Action failed: ${String(d.action)}`, error);
          }
        }
      });
    },

    aiFormAlliance: (fromCityId: number, targetFactionId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === fromCityId);
      if (!city || city.gold < 2000) return;

      const faction = state.factions.find(f => f.id === city.factionId);
      const targetFaction = state.factions.find(f => f.id === targetFactionId);
      if (!faction || !targetFaction) return;

      const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === faction.id);
      if (officersInCity.length === 0) return;
      const messenger = officersInCity.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));
      if (messenger.acted) return;

      const chance = (messenger.politics / 2) + (100 - (faction.relations[targetFactionId] ?? 60)) / 2;
      const success = Math.random() * 100 < chance;

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 2000 } : c),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o),
        factions: state.factions.map(f => {
          if (f.id === faction.id && success) {
            return { ...f, allies: [...(f.allies || []), targetFactionId] };
          }
          if (f.id === targetFactionId && success) {
            return { ...f, allies: [...(f.allies || []), faction.id] };
          }
          return f;
        })
      });
    },

    aiImproveRelations: (fromCityId: number, targetFactionId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === fromCityId);
      if (!city || city.gold < 1000) return;

      const faction = state.factions.find(f => f.id === city.factionId);
      if (!faction) return;

      const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === faction.id);
      if (officersInCity.length === 0) return;
      const messenger = officersInCity.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));
      if (messenger.acted) return;

      const reduction = Math.floor(messenger.politics / 4) + 10;

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o),
        factions: state.factions.map(f => {
          if (f.id === faction.id) {
            const currentHostility = f.relations[targetFactionId] ?? 60;
            return { ...f, relations: { ...f.relations, [targetFactionId]: Math.max(0, currentHostility - reduction) } };
          }
          if (f.id === targetFactionId) {
            const currentHostility = f.relations[faction.id] ?? 60;
            return { ...f, relations: { ...f.relations, [faction.id]: Math.max(0, currentHostility - reduction) } };
          }
          return f;
        })
      });
    },

    aiRecruitOfficer: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      const officer = state.officers.find(o => o.id === officerId);
      if (!city || !officer || officer.factionId !== null) return;
      const factionId = city.factionId;
      if (!factionId) return;

      const recruiters = state.officers.filter(o => o.cityId === city.id && o.factionId === factionId);
      if (recruiters.length === 0) return;
      const recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));

      if (recruiter.acted) return;

      const chance = Math.min(90, 30 + recruiter.charisma - officer.politics);
      const success = Math.random() * 100 < chance;

      set({
        officers: state.officers.map(o => {
          if (o.id === recruiter.id) return { ...o, acted: true };
          if (o.id === officerId && success) return { ...o, factionId: factionId, loyalty: 60 };
          return o;
        }),
      });
      if (success) get().addLog(i18next.t('logs:ai.recruitSuccess', { faction: localizedName(state.factions.find(f => f.id === factionId)?.name ?? ''), recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }));
    },

    aiRecruitPOW: (cityId, officerId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      const officer = state.officers.find(o => o.id === officerId);
      if (!city || !officer || officer.factionId !== (-1 as unknown as number)) return;
      const factionId = city.factionId;
      if (!factionId) return;

      const recruiters = state.officers.filter(o => o.cityId === city.id && o.factionId === factionId);
      if (recruiters.length === 0) return;
      const recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));

      if (recruiter.acted) return;

      const chance = 40 + recruiter.charisma - officer.loyalty / 2;
      const success = Math.random() * 100 < chance;

      set({
        officers: state.officers.map(o => {
          if (o.id === recruiter.id) return { ...o, acted: true };
          if (o.id === officerId && success) return { ...o, factionId: factionId, loyalty: 50, cityId: city.id };
          return o;
        })
      });
      if (success) get().addLog(i18next.t('logs:ai.powRecruitSuccess', { faction: localizedName(state.factions.find(f => f.id === factionId)?.name ?? ''), officer: localizedName(officer.name) }));
    },

    aiSearchOfficer: (cityId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city) return;
      const recruiters = state.officers.filter(o => o.cityId === cityId && o.factionId === city.factionId);
      if (recruiters.length === 0) return;
      const recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));
      if (recruiter.acted) return;

      const unaffiliated = state.officers.filter(o => o.cityId === cityId && o.factionId === null);
      let found = false;
      let foundOfficer: Officer | null = null;

      for (const officer of unaffiliated) {
        let chance = 30 + recruiter.charisma / 2;
        if (hasSkill(recruiter, 'talent')) chance += 15;
        if (Math.random() * 100 < chance) {
          foundOfficer = officer;
          found = true;
          break;
        }
      }

      set({
        officers: state.officers.map(o => o.id === recruiter.id ? { ...o, acted: true } : o)
      });

      if (found && foundOfficer) {
        get().addLog(i18next.t('logs:ai.searchFound', { recruiter: localizedName(recruiter.name), city: localizedName(city.name), officer: localizedName(foundOfficer.name) }));
      }
    },

    aiSpy: (cityId, targetCityId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city) return;
      const messengers = state.officers.filter(o => o.cityId === cityId && o.factionId === city.factionId);
      if (messengers.length === 0) return;
      const messenger = messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

      if (!hasSkill(messenger, 'intelligence') && !hasSkill(messenger, 'espionage')) return;
      if (messenger.acted) return;

      const targetCity = state.cities.find(c => c.id === targetCityId);
      const result = spyingSystem.spy(
        { intelligence: messenger.intelligence, espionage: hasSkill(messenger, 'espionage') },
        targetCityId,
        city.factionId!,
        targetCity?.factionId || null
      );

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o),
        // Update revealedCities if player city is spying
        revealedCities: (city.factionId === state.playerFaction?.id && result.success)
          ? {
            ...state.revealedCities,
            [targetCityId]: {
              untilYear: state.year + Math.floor((state.month + 5) / 12),
              untilMonth: (state.month + 6 - 1) % 12 + 1
            }
          }
          : state.revealedCities
      });

      if (result.success) get().addLog(i18next.t('logs:ai.espionageAction', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity?.name ?? '') }));
    },

    aiRumor: (cityId, targetCityId) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.gold < 500) return;

      const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === city.factionId);
      if (messengers.length === 0) return;
      const messenger = messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

      if (!hasSkill(messenger, 'rumor')) return;
      if (messenger.acted) return;

      const targetCity = state.cities.find(c => c.id === targetCityId);
      if (!targetCity) return;

      const success = (Math.random() * 100) < (messenger.intelligence / 2 + 20);

      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c),
        officers: state.officers.map(o => o.id === messenger.id ? { ...o, acted: true } : o),
        // Rumor success also reveals city info briefly
        revealedCities: (city.factionId === state.playerFaction?.id && success)
          ? {
            ...state.revealedCities,
            [targetCityId]: {
              untilYear: state.year + Math.floor((state.month + 2) / 12),
              untilMonth: (state.month + 3 - 1) % 12 + 1
            }
          }
          : state.revealedCities
      });

      if (success) {
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
          )
        });
        get().addLog(i18next.t('logs:ai.rumorAction', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }));
      }
    },
  };
}
