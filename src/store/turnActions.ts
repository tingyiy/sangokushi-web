import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { Officer } from '../types';
import type { GameState } from './gameStore';
import { hasSkill } from '../utils/skills';
import { spyingSystem } from '../game/spy/SpyingSystem';
import { runAIForFaction } from '../ai/aiEngine';
import { getAdvisorSuggestions } from '../systems/advisor';
import { rollRandomEvents, rollOfficerVisits, applyEventEffects } from '../systems/events';
import { checkHistoricalEvents } from '../data/historicalEvents';
import { autoAssignGovernorInPlace } from './storeHelpers';
import { useBattleStore } from './battleStore';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

// ── Salary table ──
const rankSalaries: Record<string, number> = {
  'governor': 100,
  'general': 80,
  'viceroy': 80,
  'advisor': 70,
  'attendant': 60,
  'common': 30,
};

/**
 * Compute the turn order for the current month: sort alive factions by ruler ID ascending.
 * Returns an array of faction IDs.
 */
function computeTurnOrder(state: GameState): number[] {
  return [...state.factions]
    .sort((a, b) => a.rulerId - b.rulerId)
    .map(f => f.id);
}

/**
 * Run economy for ALL faction cities: income, salary, population growth, loyalty drift.
 */
function processEconomy(state: GameState): GameState['cities'] {
  return state.cities.map(c => {
    if (c.factionId !== null) {
      const loyaltyMultiplier = c.peopleLoyalty / 100;
      let taxMultiplier = 1.0;
      let loyaltyChange = 0;

      // Population growth: base 2%/year ≈ 0.00165/month, tax modifies ±1%/year
      let annualGrowthRate = 0.02; // 2% / year

      if (c.taxRate === 'low') {
        taxMultiplier = 0.5;
        loyaltyChange = 2;
        annualGrowthRate = 0.03; // 3% / year
      } else if (c.taxRate === 'high') {
        taxMultiplier = 1.5;
        loyaltyChange = -2;
        annualGrowthRate = 0.01; // 1% / year
      }

      const monthlyGrowthRate = annualGrowthRate / 12;

      // Tax: population × (commerce/1000) × 0.15 × loyalty × taxRate
      const goldIncome = Math.floor(c.population * (c.commerce / 1000) * 0.15 * loyaltyMultiplier * taxMultiplier);
      // Food: population × (agriculture/1000) × 0.3 × loyalty × taxRate
      const foodIncome = Math.floor(c.population * (c.agriculture / 1000) * 0.3 * loyaltyMultiplier * taxMultiplier);

      // Salary deduction
      const cityOfficers = state.officers.filter(o => o.cityId === c.id && o.factionId === c.factionId);
      const totalSalary = cityOfficers.reduce((sum, o) => sum + (rankSalaries[o.rank] || 30), 0);

      return {
        ...c,
        gold: Math.max(0, c.gold + goldIncome - totalSalary),
        food: c.food + foodIncome,
        peopleLoyalty: Math.min(100, Math.max(0, c.peopleLoyalty + loyaltyChange)),
        population: Math.floor(c.population * (1 + monthlyGrowthRate)),
      };
    }

    // Unoccupied city: resources decay (no government → disorder and looting)
    return {
      ...c,
      gold: Math.max(0, Math.floor(c.gold * 0.9)),
      food: Math.max(0, Math.floor(c.food * 0.9)),
      troops: 0,
      peopleLoyalty: Math.max(0, c.peopleLoyalty - 3),
    };
  });
}

/**
 * Process officer lifecycle: reset acted, loyalty from relationships, aging death.
 * Returns { officers, deadOfficerIds }.
 */
function processOfficerLifecycle(state: GameState, newYear: number, newMonth: number): {
  officers: Officer[];
  deadOfficerIds: number[];
} {
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

    // Reset acted flag
    return { ...o, acted: false, loyalty: newLoyalty };
  });

  const officers = updatedOfficersPreDeath.filter(o => !deadOfficerIds.includes(o.id));
  return { officers, deadOfficerIds };
}

/**
 * Process unaffiliated officer roaming: each month, unaffiliated officers
 * have a chance to migrate to an adjacent city. This ensures they eventually
 * spread across the map so all factions have recruitment opportunities.
 */
function processOfficerRoaming(officers: Officer[], cities: GameState['cities']): Officer[] {
  const ROAM_CHANCE = 0.10; // 10% chance per month per officer

  return officers.map(o => {
    if (o.factionId !== null) return o; // only unaffiliated officers roam
    if (Math.random() >= ROAM_CHANCE) return o; // didn't roam this month

    const currentCity = cities.find(c => c.id === o.cityId);
    if (!currentCity || currentCity.adjacentCityIds.length === 0) return o;

    // Pick a random adjacent city
    const randomIdx = Math.floor(Math.random() * currentCity.adjacentCityIds.length);
    const targetCityId = currentCity.adjacentCityIds[randomIdx];

    return { ...o, cityId: targetCityId };
  });
}

/**
 * Handle ruler succession for dead officers. Returns updated factions and cities.
 */
function handleSuccession(
  deadOfficerIds: number[],
  originalOfficers: Officer[],
  updatedOfficers: Officer[],
  factions: GameState['factions'],
  cities: GameState['cities'],
  addLog: (msg: string) => void,
): { factions: GameState['factions']; cities: GameState['cities'] } {
  let updatedFactions = factions;
  let updatedCities = cities;

  deadOfficerIds.forEach(deadId => {
    const deadOfficer = originalOfficers.find(o => o.id === deadId);
    if (!deadOfficer) return;

    const faction = updatedFactions.find(f => f.rulerId === deadId);
    if (faction) {
      // Find successor
      const candidates = updatedOfficers.filter(o => o.factionId === faction.id);
      if (candidates.length > 0) {
        const successor = candidates.reduce((prev, curr) => {
          const rankOrder: Record<string, number> = { 'governor': 6, 'viceroy': 5, 'general': 4, 'advisor': 3, 'attendant': 2, 'common': 1 };
          const prevScore = (rankOrder[prev.rank] || 0) * 1000 + prev.leadership + prev.charisma;
          const currScore = (rankOrder[curr.rank] || 0) * 1000 + curr.leadership + curr.charisma;
          return currScore > prevScore ? curr : prev;
        });

        updatedFactions = updatedFactions.map(f => f.id === faction.id ? { ...f, rulerId: successor.id } : f);
        addLog(i18next.t('logs:game.succession', { dead: localizedName(deadOfficer.name), successor: localizedName(successor.name) }));
      } else {
        // Faction collapses
        updatedFactions = updatedFactions.filter(f => f.id !== faction.id);
        updatedCities = updatedCities.map(c => c.factionId === faction.id ? { ...c, factionId: null } : c);
        addLog(i18next.t('logs:game.factionCollapse', { dead: localizedName(deadOfficer.name) }));
      }
    } else {
      addLog(i18next.t('logs:game.obituary', { name: localizedName(deadOfficer.name) }));
    }
  });

  return { factions: updatedFactions, cities: updatedCities };
}

/**
 * Run AI decisions for a list of faction IDs (in order).
 * Each faction's decisions are applied immediately before the next runs.
 */
function runAIFactions(factionIds: number[], get: Get): void {
  for (const factionId of factionIds) {
    const currentState = get();
    // Skip factions that were eliminated or are the player
    const faction = currentState.factions.find(f => f.id === factionId);
    if (!faction || faction.isPlayer) continue;

    const decisions = runAIForFaction(currentState, factionId);
    if (decisions.length > 0) {
      currentState.applyAIDecisions(decisions);
    }
  }
}

// ── AI Domestic Helper ──
// Generic helper: find the best available officer in a city for an AI faction, execute an action.
function findAIExecutor(state: GameState, cityId: number, sortBy: 'politics' | 'leadership' | 'intelligence' = 'politics'): Officer | null {
  const city = state.cities.find(c => c.id === cityId);
  if (!city || city.factionId === null) return null;
  const factionId = city.factionId;
  const candidates = state.officers.filter(o => o.cityId === cityId && o.factionId === factionId && !o.acted);
  if (candidates.length === 0) return null;
  // Prefer governor, then best stat
  const governor = candidates.find(o => o.isGovernor);
  if (governor) return governor;
  return candidates.sort((a, b) => b[sortBy] - a[sortBy])[0];
}

export function createTurnActions(set: Set, get: Get): Pick<GameState, 'endTurn' | 'applyAIDecisions' | 'aiFormAlliance' | 'aiImproveRelations' | 'aiRecruitOfficer' | 'aiRecruitPOW' | 'aiEnticeOfficer' | 'aiSpy' | 'aiRumor' | 'aiDevelopCommerce' | 'aiDevelopAgriculture' | 'aiReinforceDefense' | 'aiDevelopFloodControl' | 'aiDevelopTechnology' | 'aiTrainTroops' | 'aiManufacture' | 'aiDisasterRelief' | 'aiDraftTroops' | 'aiTransport' | 'aiRewardOfficer' | 'aiAppointGovernor' | 'aiPlantMole'> {
  return {
    /**
     * End the player's turn.
     *
     * New flow (ruler-ID ordered turns):
     * 1. Run AI factions that come AFTER the player in turn order
     * 2. Process end-of-month: events, advisor, auto-governors, ceasefire expiry
     * 3. Advance calendar
     * 4. Process start-of-month: economy, officer lifecycle (acted reset, death)
     * 5. Run AI factions that come BEFORE the player in next month's turn order
     * 6. Hand control back to player
     */
    endTurn: () => {
      const state = get();

      // ── Determine current turn order and player's position ──
      const turnOrder = computeTurnOrder(state);
      const playerFactionId = state.playerFaction?.id ?? null;
      const playerIdx = playerFactionId !== null ? turnOrder.indexOf(playerFactionId) : -1;

      // ── Phase A: Run AI factions AFTER the player ──
      if (playerIdx >= 0 && playerIdx < turnOrder.length - 1) {
        const afterPlayer = turnOrder.slice(playerIdx + 1);
        runAIFactions(afterPlayer, get);
      }

      // ── Phase B: End-of-month processing ──

      // Events
      const randomEvents = rollRandomEvents(get());
      const historicalEventsTriggered = checkHistoricalEvents(get());
      const visitEvents = rollOfficerVisits(get());
      const allEvents = [...randomEvents, ...historicalEventsTriggered, ...visitEvents];

      let finalCities = get().cities;
      let finalOfficers = get().officers;
      let finalFactions = get().factions;

      allEvents.forEach(event => {
        get().addLog(i18next.t('logs:game.event', { name: event.name, description: event.description }));
        const result = applyEventEffects(event, finalCities, finalOfficers);
        finalCities = result.cities;
        finalOfficers = result.officers;

        if (event.type === 'historical' && event.mutate) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mutation: any = event.mutate(get());
          if (mutation.cities) finalCities = mutation.cities;
          if (mutation.officers) finalOfficers = mutation.officers;
          if (mutation.factions) finalFactions = mutation.factions;
        }
      });

      // Advisor suggestions
      if (state.playerFaction) {
        const suggestions = getAdvisorSuggestions({ ...get(), cities: finalCities, officers: finalOfficers, factions: finalFactions });
        suggestions.forEach(s => get().addLog(i18next.t('logs:game.advisor', { suggestion: s })));
      }

      // Expire ceasefires and commit end-of-month state
      set({
        cities: finalCities,
        officers: finalOfficers,
        factions: finalFactions.map(f => ({
          ...f,
          ceasefires: f.ceasefires.filter(c => {
            if (c.expiresYear < state.year) return false;
            if (c.expiresYear === state.year && c.expiresMonth < state.month) return false;
            return true;
          }),
        })),
        pendingEvents: allEvents,
      });

      // ── Phase C: Advance calendar ──
      let newMonth = state.month + 1;
      let newYear = state.year;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }

      // ── Phase D: Start-of-month processing ──

      // Economy for ALL factions simultaneously
      const stateForEcon = { ...get(), year: newYear, month: newMonth };
      const economyCities = processEconomy(stateForEcon);

      // Officer lifecycle: reset acted, loyalty, aging death
      const stateForLifecycle = { ...get(), cities: economyCities, year: newYear, month: newMonth };
      const { officers: lifecycleOfficers, deadOfficerIds } = processOfficerLifecycle(stateForLifecycle, newYear, newMonth);

      // Unaffiliated officer roaming: officers wander to adjacent cities over time
      const roamedOfficers = processOfficerRoaming(lifecycleOfficers, economyCities);

      // Ruler succession
      const { factions: succFactions, cities: succCities } = handleSuccession(
        deadOfficerIds,
        get().officers,
        roamedOfficers,
        get().factions,
        economyCities,
        (msg) => get().addLog(msg),
      );

      // Default to ruler's city at start of new month
      const playerRuler = state.playerFaction
        ? roamedOfficers.find(o => o.id === state.playerFaction!.rulerId)
        : null;
      const rulerCityId = playerRuler?.cityId ?? null;

      // Commit new month state
      set({
        month: newMonth,
        year: newYear,
        cities: succCities,
        officers: roamedOfficers,
        factions: succFactions,
        selectedCityId: rulerCityId,
        activeCommandCategory: null,
        pendingGovernorAssignmentCityId: null,
        rewardedOfficerIds: [],
      });

      get().addLog(i18next.t('logs:game.turnHeader', { year: newYear, month: newMonth }));

      // Auto-save at start of new month (silent)
      get().saveGame('auto');

      // Auto-assign governors for player cities
      if (state.playerFaction) {
        const postState = get();
        const playerCities = postState.cities.filter(c => c.factionId === state.playerFaction?.id);
        const mutableOfficers = [...postState.officers];
        for (const pc of playerCities) {
          autoAssignGovernorInPlace(mutableOfficers, pc.id, state.playerFaction.id, postState.factions);
        }
        set({ officers: mutableOfficers });
      }

      // ── Phase E: Run AI factions BEFORE the player in the new month ──
      const newTurnOrder = computeTurnOrder(get());
      const newPlayerIdx = playerFactionId !== null ? newTurnOrder.indexOf(playerFactionId) : -1;

      if (newPlayerIdx > 0) {
        const beforePlayer = newTurnOrder.slice(0, newPlayerIdx);
        runAIFactions(beforePlayer, get);
      }

      // ── Phase F: Resume paused battle if one exists ──
      const battleState = useBattleStore.getState();
      if (battleState.battlePaused && !battleState.isFinished) {
        // Resupply defender food from city stores (city may have received harvest during month-end)
        const defenderCity = get().cities.find(c => c.id === battleState.defenderCityId);
        const defenderFoodResupply = defenderCity?.food ?? 0;

        useBattleStore.getState().resumeBattle(defenderFoodResupply);
        set({ phase: 'battle' });
      }

      // Player now has control
    },

    applyAIDecisions: (decisions) => {
      decisions.forEach(d => {
        const currentStore = get();
        const action = currentStore[d.action as keyof GameState];
        if (typeof action === 'function') {
          try {
            (action as (...args: unknown[]) => void)(...d.params);
            // AI decision descriptions are NOT logged to the player.
            // Only battle-related logs (from the action itself) are public.
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
          if (o.id === officerId && success) return { ...o, factionId: factionId, loyalty: 60, acted: true };
          return o;
        }),
      });
      // AI recruitment success is not logged to the player (fog of war)
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
          if (o.id === officerId && success) return { ...o, factionId: factionId, loyalty: 50, cityId: city.id, acted: true };
          return o;
        })
      });
      // AI POW recruitment success is not logged to the player (fog of war)
    },

    aiEnticeOfficer: (targetOfficerId: number, fromCityId: number) => {
      const state = get();
      const fromCity = state.cities.find(c => c.id === fromCityId);
      if (!fromCity || fromCity.factionId === null) return;
      const factionId = fromCity.factionId;

      const target = state.officers.find(o => o.id === targetOfficerId);
      if (!target || target.factionId === null || target.factionId === -1 || target.factionId === factionId) return;

      // Cannot entice a ruler
      const targetFaction = state.factions.find(f => f.id === target.factionId);
      if (targetFaction && targetFaction.rulerId === target.id) return;

      const targetCity = state.cities.find(c => c.id === target.cityId);
      if (!targetCity) return;
      // Must be adjacent
      if (!fromCity.adjacentCityIds.includes(targetCity.id)) return;

      // Find enticer
      const candidates = state.officers.filter(o => o.cityId === fromCityId && o.factionId === factionId && !o.acted);
      if (candidates.length === 0) return;
      const enticer = candidates.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));

      const isGovernor = target.isGovernor;
      const hasDiplomacy = hasSkill(enticer, 'diplomacy');
      const resistance = Math.floor(target.intelligence / 5);
      let chance: number;
      if (isGovernor) {
        chance = Math.max(0, Math.min(40, enticer.charisma - target.loyalty - resistance - 20 + (hasDiplomacy ? 10 : 0)));
      } else {
        chance = Math.max(0, Math.min(60, enticer.charisma - target.loyalty - resistance + (hasDiplomacy ? 10 : 0)));
      }

      const success = Math.random() * 100 < chance;

      if (success && isGovernor) {
        const oldFactionId = targetCity.factionId;
        set({
          cities: state.cities.map(c =>
            c.id === targetCity.id ? { ...c, factionId: factionId } : c
          ),
          officers: state.officers.map(o => {
            if (o.id === enticer.id) return { ...o, acted: true };
            if (o.cityId === targetCity.id && o.factionId === oldFactionId) {
              return { ...o, factionId: factionId, loyalty: 50, acted: true };
            }
            return o;
          }),
        });

        // Log to player if their city flipped
        if (oldFactionId === state.playerFaction?.id) {
          get().addLog(i18next.t('logs:personnel.aiEnticePlayerCityFlip', { enticer: localizedName(enticer.name), city: localizedName(targetCity.name), officer: localizedName(target.name) }));
        }
      } else if (success) {
        set({
          officers: state.officers.map(o => {
            if (o.id === enticer.id) return { ...o, acted: true };
            if (o.id === targetOfficerId) {
              return { ...o, factionId: factionId, loyalty: 50, cityId: fromCityId, isGovernor: false, acted: true };
            }
            return o;
          }),
        });

        // Log to player if their officer was enticed
        if (target.factionId === state.playerFaction?.id) {
          get().addLog(i18next.t('logs:personnel.aiEnticePlayerOfficer', { enticer: localizedName(enticer.name), officer: localizedName(target.name) }));
        }
      } else {
        set({
          officers: state.officers.map(o =>
            o.id === enticer.id ? { ...o, acted: true } : o
          ),
        });
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

      if (result.success) {
        // AI espionage success is not logged to the player (fog of war)
      }
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
        // AI rumor success is not logged to the player (fog of war)
      }
    },

    // ── AI Domestic Actions ──

    aiDevelopCommerce: (cityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null || city.gold < 500) return;
      const executor = findAIExecutor(state, cityId, 'politics');
      if (!executor) return;
      const bonus = Math.floor(executor.politics / 10);
      set({
        cities: state.cities.map(c => c.id === cityId ? { ...c, commerce: Math.min(999, c.commerce + 10 + bonus), gold: c.gold - 500 } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiDevelopAgriculture: (cityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null || city.gold < 500) return;
      const executor = findAIExecutor(state, cityId, 'politics');
      if (!executor) return;
      const bonus = Math.floor(executor.politics / 10);
      set({
        cities: state.cities.map(c => c.id === cityId ? { ...c, agriculture: Math.min(999, c.agriculture + 10 + bonus), gold: c.gold - 500 } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiReinforceDefense: (cityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null || city.gold < 300) return;
      const executor = findAIExecutor(state, cityId, 'politics');
      if (!executor) return;
      set({
        cities: state.cities.map(c => c.id === cityId ? { ...c, defense: Math.min(100, c.defense + 5), gold: c.gold - 300 } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiDevelopFloodControl: (cityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null || city.gold < 500) return;
      const executor = findAIExecutor(state, cityId, 'politics');
      if (!executor) return;
      const bonus = Math.floor(executor.politics / 15);
      set({
        cities: state.cities.map(c => c.id === cityId ? { ...c, floodControl: Math.min(100, c.floodControl + 8 + bonus), gold: c.gold - 500 } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiDevelopTechnology: (cityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null || city.gold < 800) return;
      const executor = findAIExecutor(state, cityId, 'intelligence');
      if (!executor) return;
      const bonus = Math.floor(executor.intelligence / 20);
      set({
        cities: state.cities.map(c => c.id === cityId ? { ...c, technology: Math.min(100, (c.technology || 0) + 5 + bonus), gold: c.gold - 800 } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiTrainTroops: (cityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null || city.food < 500 || city.troops <= 0) return;
      const executor = findAIExecutor(state, cityId, 'leadership');
      if (!executor) return;
      const trainingBonus = Math.floor(executor.leadership / 15);
      set({
        cities: state.cities.map(c => c.id === cityId ? {
          ...c,
          training: Math.min(100, (c.training || 0) + 8 + trainingBonus),
          morale: Math.min(100, (c.morale || 0) + 3),
          food: c.food - 500,
        } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiManufacture: (cityId: number, weaponType: 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults') => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null || city.gold < 1000) return;
      const executor = findAIExecutor(state, cityId, 'politics');
      if (!executor || !hasSkill(executor, 'manufacture')) return;
      const tech = city.technology || 0;
      const gates = { crossbows: 30, warHorses: 40, batteringRams: 60, catapults: 80 };
      if (tech < gates[weaponType]) return;
      const amount = 10 + Math.floor(tech / 10);
      set({
        cities: state.cities.map(c => c.id === cityId ? { ...c, [weaponType]: (c[weaponType] || 0) + amount, gold: c.gold - 1000 } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiDisasterRelief: (cityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null || city.gold < 500 || city.food < 1000) return;
      const executor = findAIExecutor(state, cityId, 'politics');
      if (!executor) return;
      const bonus = Math.floor(executor.politics / 10);
      set({
        cities: state.cities.map(c => c.id === cityId ? {
          ...c,
          peopleLoyalty: Math.min(100, (c.peopleLoyalty || 0) + 15 + bonus),
          gold: c.gold - 500,
          food: c.food - 1000,
        } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    // ── AI Military/Personnel Actions ──

    aiDraftTroops: (cityId: number, amount: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId === null) return;
      const executor = findAIExecutor(state, cityId, 'politics');
      if (!executor) return;
      const goldCost = amount * 2;
      const foodCost = amount * 3;
      if (city.gold < goldCost || city.food < foodCost) return;
      const maxDraft = Math.floor(city.population * 0.1);
      const actual = Math.min(amount, maxDraft);
      if (actual <= 0) return;
      // Draft dilutes training/morale: new recruits have training 0 and morale 0 (RTK IV)
      const totalAfterDraft = city.troops + actual;
      const newTraining = totalAfterDraft > 0 ? Math.floor((city.training || 0) * city.troops / totalAfterDraft) : 0;
      const newMorale = totalAfterDraft > 0 ? Math.floor((city.morale || 0) * city.troops / totalAfterDraft) : 0;
      // Drafting reduces people loyalty (RTK IV) — scaled by ratio of drafted to population
      const loyaltyDrop = Math.ceil(actual / city.population * 30);
      const newLoyalty = Math.max(0, (city.peopleLoyalty || 0) - loyaltyDrop);
      set({
        cities: state.cities.map(c => c.id === cityId ? {
          ...c,
          troops: c.troops + actual,
          gold: c.gold - actual * 2,
          food: c.food - actual * 3,
          population: c.population - actual,
          training: newTraining,
          morale: newMorale,
          peopleLoyalty: newLoyalty,
        } : c),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiTransport: (fromCityId: number, toCityId: number, resources: { gold?: number; food?: number; troops?: number }) => {
      const state = get();
      const fromCity = state.cities.find(c => c.id === fromCityId);
      const toCity = state.cities.find(c => c.id === toCityId);
      if (!fromCity || !toCity) return;
      if (fromCity.factionId === null || fromCity.factionId !== toCity.factionId) return;
      const executor = findAIExecutor(state, fromCityId, 'politics');
      if (!executor) return;
      // Validate resources
      const gold = resources.gold ?? 0;
      const food = resources.food ?? 0;
      const troops = resources.troops ?? 0;
      if (gold <= 0 && food <= 0 && troops <= 0) return;
      if (fromCity.gold < gold || fromCity.food < food || fromCity.troops < troops) return;
      // Weighted-average blending of training/morale when troops are transferred (RTK IV)
      let dstTraining = toCity.training || 0;
      let dstMorale = toCity.morale || 0;
      if (troops > 0) {
        const srcTraining = fromCity.training || 0;
        const srcMorale = fromCity.morale || 0;
        const totalTroops = toCity.troops + troops;
        if (totalTroops > 0) {
          dstTraining = Math.floor((srcTraining * troops + (toCity.training || 0) * toCity.troops) / totalTroops);
          dstMorale = Math.floor((srcMorale * troops + (toCity.morale || 0) * toCity.troops) / totalTroops);
        }
      }
      set({
        cities: state.cities.map(c => {
          if (c.id === fromCityId) return { ...c, gold: c.gold - gold, food: c.food - food, troops: c.troops - troops };
          if (c.id === toCityId) return { ...c, gold: c.gold + gold, food: c.food + food, troops: c.troops + troops, training: dstTraining, morale: dstMorale };
          return c;
        }),
        officers: state.officers.map(o => o.id === executor.id ? { ...o, acted: true } : o),
      });
    },

    aiRewardOfficer: (officerId: number, cityId: number, amount: number) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId === null) return;
      if (state.rewardedOfficerIds.includes(officerId)) return;
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId !== officer.factionId || city.gold < amount) return;
      set({
        cities: state.cities.map(c => c.id === cityId ? { ...c, gold: c.gold - amount } : c),
        officers: state.officers.map(o => {
          if (o.id === officerId) return { ...o, loyalty: Math.min(100, o.loyalty + 5 + Math.floor(amount / 500)) };
          return o;
        }),
        rewardedOfficerIds: [...state.rewardedOfficerIds, officerId],
      });
    },

    aiAppointGovernor: (cityId: number, officerId: number) => {
      const state = get();
      const appointee = state.officers.find(o => o.id === officerId);
      if (!appointee || appointee.factionId === null) return;
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.factionId !== appointee.factionId) return;
      if (appointee.cityId !== cityId) return;
      // R-001: ruler IS the governor — cannot appoint another
      const faction = state.factions.find(f => f.id === appointee.factionId);
      if (faction && state.officers.some(o => o.id === faction.rulerId && o.cityId === cityId && o.factionId === faction.id)) return;
      set({
        officers: state.officers.map(o => {
          if (o.cityId === cityId && o.factionId === city.factionId) {
            if (o.id === officerId) return { ...o, isGovernor: true };
            if (o.isGovernor) return { ...o, isGovernor: false };
          }
          return o;
        }),
      });
    },

    aiPlantMole: (officerId: number, targetFactionId: number) => {
      const state = get();
      const officer = state.officers.find(o => o.id === officerId);
      if (!officer || officer.factionId === null) return;
      const aiFaction = state.factions.find(f => f.id === officer.factionId);
      if (!aiFaction) return;

      const city = state.cities.find(c => c.id === officer.cityId && c.factionId === aiFaction.id);
      if (!city || city.gold < 1000) return;
      if (officer.acted) return;

      const targetFaction = state.factions.find(f => f.id === targetFactionId);
      if (!targetFaction) return;

      // Deduct gold, mark officer acted
      set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
        officers: state.officers.map(o => o.id === officer.id ? { ...o, acted: true } : o),
      });

      // For player targets: generate 武將求見 event (player doesn't know it's a mole)
      if (targetFaction.isPlayer) {
        const playerCapital = get().cities.find(c => c.factionId === targetFactionId);
        if (!playerCapital) return;

        // Officer leaves AI faction temporarily (becomes unaffiliated for the visit event)
        set({
          officers: get().officers.map(o =>
            o.id === officer.id
              ? { ...o, factionId: null, cityId: playerCapital.id, moleForFactionId: aiFaction.id }
              : o
          ),
        });

        // Generate officer visit event
        set({
          pendingEvents: [...get().pendingEvents, {
            id: `officerVisit-mole-${officer.id}-${Date.now()}`,
            type: 'officerVisit' as const,
            name: i18next.t('logs:event.officerVisit.name'),
            description: i18next.t('logs:event.officerVisit.description', {
              officer: localizedName(officer.name),
              city: localizedName(playerCapital.name),
            }),
            cityId: playerCapital.id,
            officerId: officer.id,
            year: get().year,
            month: get().month,
          }],
        });
      } else {
        // For AI targets: evaluate acceptance
        const acceptChance = Math.min(90, 50 + officer.war / 10 + officer.leadership / 10);
        const accepted = Math.random() * 100 < acceptChance;

        if (accepted) {
          const targetRuler = get().officers.find(o => o.id === targetFaction.rulerId);
          const targetCapitalId = targetRuler?.cityId ?? get().cities.find(c => c.factionId === targetFactionId)?.id;
          if (!targetCapitalId) return;

          set({
            officers: get().officers.map(o =>
              o.id === officer.id
                ? { ...o, factionId: targetFactionId, cityId: targetCapitalId, loyalty: 60, moleForFactionId: aiFaction.id }
                : o
            ),
          });
        } else {
          // Declined — return to own faction
        }
      }
    },
  };
}
