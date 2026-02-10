import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { scenarios } from '../data/scenarios';
import type { GamePhase, GameSettings, Officer, OfficerRank, Scenario } from '../types';
import type { UnitType } from '../types/battle';
import { getMovementRange, getAttackRange, type BattleTactic } from '../utils/unitTypes';
import { getMoveRange } from '../utils/pathfinding';
import { RTKScenario } from './scenario-constants';

interface Result {
  ok: boolean;
  error?: string;
  data?: unknown;
}

const POW_FACTION_ID = -1 as unknown as number;
const HOSTAGE_CITY_ID = -2 as unknown as number;

// ─── Console Logging Subsystem ──────────────────────────────
// Styled console output for every rtk command/event.
// Categories: 🏛 domestic, 👤 personnel, ⚔ military, 🤝 diplomacy,
//             🕵 strategy, 📅 lifecycle, 🏰 battle, 💾 save/load

type LogCategory = '🏛' | '👤' | '⚔' | '🤝' | '🕵' | '📅' | '🏰' | '💾';

const LOG_STYLES = {
  header: 'color: #4fc3f7; font-weight: bold',
  ok: 'color: #81c784',
  fail: 'color: #e57373',
  data: 'color: #b0bec5',
  event: 'color: #ffb74d; font-weight: bold',
  battle: 'color: #ef5350; font-weight: bold',
} as const;

/**
 * Log a command result to the console.
 * Called after every mutating API call.
 */
function logCmd(cat: LogCategory, label: string, result: Result): Result {
  if (result.ok) {
    const parts = [`%c${cat} ${label}`, LOG_STYLES.ok];
    if (result.data != null) {
      parts[0] += ' %c→ %O';
      parts.push(LOG_STYLES.data);
      parts.push(result.data as string);
    }
    console.log(...parts);
  } else {
    console.log(`%c${cat} ${label} ✗ ${result.error}`, LOG_STYLES.fail);
  }
  return result;
}

/** Log an informational event (no Result object) */
function logEvent(label: string, detail?: unknown): void {
  if (detail != null) {
    console.log(`%c⚡ ${label} %c%O`, LOG_STYLES.event, LOG_STYLES.data, detail);
  } else {
    console.log(`%c⚡ ${label}`, LOG_STYLES.event);
  }
}

/** Resolve an officer name from id (for logging) */
function officerName(id: number | undefined): string {
  if (id == null) return '?';
  const o = useGameStore.getState().officers.find(o => o.id === id);
  return o ? o.name : `#${id}`;
}

/** Resolve a city name from id */
function cityName(id: number | undefined): string {
  if (id == null) return '?';
  const c = useGameStore.getState().cities.find(c => c.id === id);
  return c ? c.name : `#${id}`;
}

/**
 * RTK Automation API implementation
 * v2.3 (2026-02-09) - Full Console Logging
 */
export const rtkApi = {
  /** Scenario constants for newGame() */
  Scenario: RTKScenario,

  // ─── Lifecycle ───────────────────────────────────────
  phase: (): GamePhase => useGameStore.getState().phase,

  newGame(scenarioId: number, factionId: number, settings?: Partial<GameSettings>): Result {
    const { selectScenario, selectFaction, setGameSettings, confirmSettings } = useGameStore.getState();
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return logCmd('📅', 'newGame', { ok: false, error: `Scenario ${scenarioId} not found` });

    selectScenario(scenario);

    const storeFactions = useGameStore.getState().factions;
    if (!storeFactions.find(f => f.id === factionId)) {
      return logCmd('📅', 'newGame', { ok: false, error: `Faction ${factionId} not found in scenario ${scenarioId}` });
    }

    selectFaction(factionId);
    if (settings) setGameSettings(settings);
    confirmSettings();

    const state = useGameStore.getState();
    const pf = state.playerFaction;
    const myCities = state.cities.filter(c => c.factionId === pf?.id);
    const myOfficers = state.officers.filter(o => o.factionId === pf?.id);
    logEvent(`New Game: ${scenario.year}年 ${scenario.name} — ${pf?.name ?? '?'}`, {
      factions: state.factions.length,
      cities: myCities.length,
      officers: myOfficers.length,
      cityNames: myCities.map(c => c.name),
    });

    return { ok: true, data: { year: scenario.year, month: 1 } };
  },

  // ─── Queries ────────────────────────────────────────
  query: {
    phase: (): GamePhase => useGameStore.getState().phase,
    date: () => ({ year: useGameStore.getState().year, month: useGameStore.getState().month }),
    playerFaction: () => useGameStore.getState().playerFaction,
    myCities: () => {
      const state = useGameStore.getState();
      return state.cities.filter(c => c.factionId === state.playerFaction?.id);
    },
    /** Alias for playerFaction() */
    myFaction: () => useGameStore.getState().playerFaction,
    /** All factions still in the game */
    factions: () => useGameStore.getState().factions,
    /** All cities */
    cities: () => useGameStore.getState().cities,
    /** Single city by id */
    city: (id: number) => useGameStore.getState().cities.find(c => c.id === id) || null,
    /** Alias for city() — used by some automation scripts */
    cityDetails: (id: number) => useGameStore.getState().cities.find(c => c.id === id) || null,
    factionCities: (factionId: number) => useGameStore.getState().cities.filter(c => c.factionId === factionId),
    myOfficers: () => {
      const state = useGameStore.getState();
      return state.officers.filter(o => o.factionId === state.playerFaction?.id);
    },
    /** All officers in the game */
    officers: () => useGameStore.getState().officers,
    officer: (id: number) => useGameStore.getState().officers.find(o => o.id === id) || null,
    /** Officers in a specific city (any faction) */
    cityOfficers: (cityId: number) => useGameStore.getState().officers.filter(o => o.cityId === cityId),
    unaffiliatedOfficers: (cityId: number) => useGameStore.getState().officers.filter(o => o.cityId === cityId && o.factionId === null),
    powOfficers: (cityId: number) => useGameStore.getState().officers.filter(o => o.cityId === cityId && o.factionId === POW_FACTION_ID),
    adjacentCities: (cityId: number) => {
      const city = useGameStore.getState().cities.find(c => c.id === cityId);
      if (!city) return [];
      return city.adjacentCityIds.map(id => useGameStore.getState().cities.find(c => c.id === id)!).filter(Boolean);
    },
    adjacentEnemyCities: (cityId: number) => {
      const state = useGameStore.getState();
      const city = state.cities.find(c => c.id === cityId);
      if (!city) return [];
      return city.adjacentCityIds
        .map(id => state.cities.find(c => c.id === id)!)
        .filter(c => c && c.factionId !== null && c.factionId !== state.playerFaction?.id);
    },
    hostility: (targetFactionId: number) => {
      const player = useGameStore.getState().playerFaction;
      return player?.relations[targetFactionId] ?? 60;
    },
    allies: () => useGameStore.getState().playerFaction?.allies || [],
    ceasefires: () => useGameStore.getState().playerFaction?.ceasefires || [],
    selectedCity: () => {
      const state = useGameStore.getState();
      return state.cities.find(c => c.id === state.selectedCityId) || null;
    },
    log: (n: number = 10) => useGameStore.getState().log.slice(-n),
    availableOfficers: (cityId: number) => {
      const state = useGameStore.getState();
      return state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.stamina >= 15);
    },
    isCityRevealed: (cityId: number) => useGameStore.getState().isCityRevealed(cityId),
    pendingEvents: () => useGameStore.getState().pendingEvents,
    duelState: () => useGameStore.getState().duelState,
    battleState: () => useBattleStore.getState(),
    saveSlots: () => useGameStore.getState().getSaveSlots(),
    checkEndCondition: () => useGameStore.getState().checkVictoryCondition(),
    gameSettings: (): GameSettings => useGameStore.getState().gameSettings,
    scenario: (): Scenario | null => useGameStore.getState().scenario,
    battleFormation: () => useGameStore.getState().battleFormation,

    /** Check if city can afford a domestic action (500 gold) */
    canAffordDomestic(cityId: number): Result {
      const city = this.city(cityId);
      if (!city) return { ok: false, error: 'City not found' };

      if (city.gold < 500) {
        return { ok: false, error: `Insufficient gold (Current: ${city.gold}, Required: 500)` };
      }

      const hasOfficer = this.availableOfficers(cityId).length > 0;
      if (!hasOfficer) {
        return { ok: false, error: 'No officers with stamina in city' };
      }

      return { ok: true, data: { gold: city.gold, canAfford: true } };
    },

    /** Check if city can draft troops */
    canDraftTroops(cityId: number, amount: number): Result {
      const state = useGameStore.getState();
      const city = state.cities.find(c => c.id === cityId);
      if (!city) return { ok: false, error: 'City not found' };

      const goldCost = amount * 2;
      const foodCost = amount * 3;
      const maxDraft = Math.floor(city.population * 0.1);

      const checks = {
        gold: city.gold >= goldCost,
        food: city.food >= foodCost,
        population: amount <= maxDraft,
        hasOfficer: this.availableOfficers(cityId).length > 0,
      };

      if (!checks.gold) {
        return { ok: false, error: `Insufficient gold (Current: ${city.gold}, Required: ${goldCost})`, data: checks };
      }
      if (!checks.food) {
        return { ok: false, error: `Insufficient food (Current: ${city.food}, Required: ${foodCost})`, data: checks };
      }
      if (!checks.population) {
        return { ok: false, error: `Amount exceeds population limit (Requested: ${amount}, Max: ${maxDraft})`, data: checks };
      }
      if (!checks.hasOfficer) {
        return { ok: false, error: 'No officers with stamina', data: checks };
      }

      return { ok: true, data: checks };
    },

    /**
     * Financial summary for a city to aid planning.
     * Shows current gold and estimated monthly expenses.
     */
    financials(cityId: number): Result {
      const state = useGameStore.getState();
      const city = state.cities.find(c => c.id === cityId);
      if (!city) return { ok: false, error: 'City not found' };

      const cityOfficers = state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id);
      const monthlyWages = cityOfficers.length * 20; // Estimated 20 gold per month per officer

      return {
        ok: true,
        data: {
          gold: city.gold,
          food: city.food,
          estimatedMonthlyWages: monthlyWages,
          nextTaxMonth: [1, 4, 7, 10].find(m => m > state.month) || 1,
        }
      };
    },

    /**
     * Provides status information about the game or a specific city.
     * If cityId is provided, returns city-specific details.
     * Otherwise, returns general game status.
     */
    status(cityId?: number): Result {
      const state = useGameStore.getState();
      if (cityId) {
        const city = state.cities.find(c => c.id === cityId);
        if (!city) return { ok: false, error: 'City not found' };
        return {
          ok: true,
          data: {
            city: {
              id: city.id,
              name: city.name,
              factionId: city.factionId,
              gold: city.gold,
              food: city.food,
              troops: city.troops,
              commerce: city.commerce,
              agriculture: city.agriculture,
              defense: city.defense,
              population: city.population,
              peopleLoyalty: city.peopleLoyalty,
              governorId: state.officers.find(o => o.cityId === cityId && o.isGovernor)?.id || null,
              officerCount: state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).length,
            },
            playerFaction: state.playerFaction ? {
              id: state.playerFaction.id,
              name: state.playerFaction.name,
              gold: state.cities.filter(c => c.factionId === state.playerFaction?.id).reduce((s, c) => s + c.gold, 0),
              food: state.cities.filter(c => c.factionId === state.playerFaction?.id).reduce((s, c) => s + c.food, 0),
            } : null,
          }
        };
      } else {
        return {
          ok: true,
          data: {
            phase: state.phase,
            year: state.year,
            month: state.month,
            playerFaction: state.playerFaction ? {
              id: state.playerFaction.id,
              name: state.playerFaction.name,
              gold: state.cities.filter(c => c.factionId === state.playerFaction?.id).reduce((s, c) => s + c.gold, 0),
              food: state.cities.filter(c => c.factionId === state.playerFaction?.id).reduce((s, c) => s + c.food, 0),
              officerCount: state.officers.filter(o => o.factionId === state.playerFaction?.id).length,
              cityCount: state.cities.filter(c => c.factionId === state.playerFaction?.id).length,
            } : null,
            selectedCityId: state.selectedCityId,
            logLength: state.log.length,
            pendingEventsCount: state.pendingEvents.length,
          }
        };
      }
    },
  },

  // ─── Commands ───────────────────────────────────────
  selectCity(cityId: number): Result {
    const state = useGameStore.getState();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('📅', `selectCity(${cityId})`, { ok: false, error: `City ${cityId} not found` });
    state.selectCity(cityId);
    return logCmd('📅', `selectCity(${city.name})`, { ok: true });
  },

  addLog(message: string): Result {
    useGameStore.getState().addLog(message);
    return { ok: true };
  },

  // Domestic
  developCommerce(cityId: number, officerId?: number | number[]): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return logCmd('🏛', `developCommerce(${cityName(cityId)})`, { ok: false, error: 'Not in playing phase' });
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('🏛', `developCommerce(${cityName(cityId)})`, { ok: false, error: 'City not found' });
    if (city.factionId !== state.playerFaction?.id) return logCmd('🏛', `developCommerce(${city.name})`, { ok: false, error: 'Not your city' });

    const actualOfficerId = Array.isArray(officerId) ? officerId[0] : officerId;

    const executor = actualOfficerId
      ? state.officers.find(o => o.id === actualOfficerId && o.cityId === cityId)
      : state.officers.find(o => o.cityId === cityId && o.isGovernor);

    if (!executor) return logCmd('🏛', `developCommerce(${city.name})`, { ok: false, error: actualOfficerId ? `Officer ${actualOfficerId} not found in city` : 'No governor in city' });
    if (executor.stamina < 20) return logCmd('🏛', `developCommerce(${city.name})`, { ok: false, error: `Executor ${executor.name} has low stamina (${executor.stamina}/20 required)` });

    if (city.gold < 500) return logCmd('🏛', `developCommerce(${city.name})`, { ok: false, error: `Insufficient gold (Current: ${city.gold}, Required: 500)` });

    const commerceBefore = city.commerce;
    state.developCommerce(cityId, actualOfficerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.commerce === commerceBefore) return logCmd('🏛', `developCommerce(${city.name})`, { ok: false, error: 'Action failed in logic' });
    return logCmd('🏛', `developCommerce(${city.name})`, { ok: true, data: { before: commerceBefore, after: after.commerce, executor: executor.name } });
  },

  developAgriculture(cityId: number, officerId?: number | number[]): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('🏛', `developAgriculture(${cn})`, { ok: false, error: 'Not in playing phase' });
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('🏛', `developAgriculture(${cn})`, { ok: false, error: 'City not found' });
    if (city.factionId !== state.playerFaction?.id) return logCmd('🏛', `developAgriculture(${city.name})`, { ok: false, error: 'Not your city' });

    const actualOfficerId = Array.isArray(officerId) ? officerId[0] : officerId;

    const executor = actualOfficerId
      ? state.officers.find(o => o.id === actualOfficerId && o.cityId === cityId)
      : state.officers.find(o => o.cityId === cityId && o.isGovernor);

    if (!executor) return logCmd('🏛', `developAgriculture(${city.name})`, { ok: false, error: actualOfficerId ? `Officer ${actualOfficerId} not found in city` : 'No governor in city' });
    if (executor.stamina < 20) return logCmd('🏛', `developAgriculture(${city.name})`, { ok: false, error: `Executor ${executor.name} has low stamina (${executor.stamina}/20 required)` });

    if (city.gold < 500) return logCmd('🏛', `developAgriculture(${city.name})`, { ok: false, error: `Insufficient gold (Current: ${city.gold}, Required: 500)` });

    const agricultureBefore = city.agriculture;
    state.developAgriculture(cityId, actualOfficerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.agriculture === agricultureBefore) return logCmd('🏛', `developAgriculture(${city.name})`, { ok: false, error: 'Action failed' });
    return logCmd('🏛', `developAgriculture(${city.name})`, { ok: true, data: { before: agricultureBefore, after: after.agriculture, executor: executor.name } });
  },

  reinforceDefense(cityId: number, officerId?: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('🏛', `reinforceDefense(${cn})`, { ok: false, error: 'Not in playing phase' });
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('🏛', `reinforceDefense(${cn})`, { ok: false, error: 'City not found' });
    const before = city.defense;
    state.reinforceDefense(cityId, officerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.defense === before) return logCmd('🏛', `reinforceDefense(${city.name})`, { ok: false, error: 'Action failed' });
    return logCmd('🏛', `reinforceDefense(${city.name})`, { ok: true, data: { before, after: after.defense } });
  },

  developFloodControl(cityId: number, officerId?: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('🏛', `developFloodControl(${cn})`, { ok: false, error: 'Not in playing phase' });
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('🏛', `developFloodControl(${cn})`, { ok: false, error: 'City not found' });
    const before = city.floodControl;
    state.developFloodControl(cityId, officerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.floodControl === before) return logCmd('🏛', `developFloodControl(${city.name})`, { ok: false, error: 'Action failed' });
    return logCmd('🏛', `developFloodControl(${city.name})`, { ok: true, data: { before, after: after.floodControl } });
  },

  developTechnology(cityId: number, officerId?: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('🏛', `developTechnology(${cn})`, { ok: false, error: 'Not in playing phase' });
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('🏛', `developTechnology(${cn})`, { ok: false, error: 'City not found' });
    const before = city.technology;
    state.developTechnology(cityId, officerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.technology === before) return logCmd('🏛', `developTechnology(${city.name})`, { ok: false, error: 'Action failed' });
    return logCmd('🏛', `developTechnology(${city.name})`, { ok: true, data: { before, after: after.technology } });
  },

  trainTroops(cityId: number, officerId?: number | number[]): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('🏛', `trainTroops(${cn})`, { ok: false, error: 'Not in playing phase' });
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('🏛', `trainTroops(${cn})`, { ok: false, error: 'City not found' });

    const actualOfficerId = Array.isArray(officerId) ? officerId[0] : officerId;

    const executor = actualOfficerId
      ? state.officers.find(o => o.id === actualOfficerId && o.cityId === cityId)
      : state.officers.find(o => o.cityId === cityId && o.isGovernor);

    if (!executor) return logCmd('🏛', `trainTroops(${city.name})`, { ok: false, error: actualOfficerId ? `Officer ${actualOfficerId} not found in city` : 'No governor in city' });
    if (executor.stamina < 20) return logCmd('🏛', `trainTroops(${city.name})`, { ok: false, error: `Executor ${executor.name} has low stamina (${executor.stamina}/20 required)` });

    if (city.training >= 100) return logCmd('🏛', `trainTroops(${city.name})`, { ok: false, error: 'Training already at maximum (100)' });
    if (city.food < 500) return logCmd('🏛', `trainTroops(${city.name})`, { ok: false, error: `Insufficient food (Current: ${city.food}, Required: 500)` });

    const before = city.training;
    state.trainTroops(cityId, actualOfficerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.training > before) return logCmd('🏛', `trainTroops(${city.name})`, { ok: true, data: { before, after: after.training, executor: executor.name } });
    return logCmd('🏛', `trainTroops(${city.name})`, { ok: false, error: 'Action failed unexpectedly in logic' });
  },

  manufacture(cityId: number, weaponType: 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults', officerId?: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('🏛', `manufacture(${cn}, ${weaponType})`, { ok: false, error: 'Not in playing phase' });
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('🏛', `manufacture(${cn}, ${weaponType})`, { ok: false, error: 'City not found' });
    const before = city[weaponType];
    state.manufacture(cityId, weaponType, officerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after[weaponType] === before) return logCmd('🏛', `manufacture(${city.name}, ${weaponType})`, { ok: false, error: 'Action failed' });
    return logCmd('🏛', `manufacture(${city.name}, ${weaponType})`, { ok: true, data: { before, after: after[weaponType] } });
  },

  disasterRelief(cityId: number, officerId?: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('🏛', `disasterRelief(${cn})`, { ok: false, error: 'Not in playing phase' });
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('🏛', `disasterRelief(${cn})`, { ok: false, error: 'City not found' });
    const before = city.peopleLoyalty;
    state.disasterRelief(cityId, officerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.peopleLoyalty === before) return logCmd('🏛', `disasterRelief(${city.name})`, { ok: false, error: 'Action failed' });
    return logCmd('🏛', `disasterRelief(${city.name})`, { ok: true, data: { before, after: after.peopleLoyalty } });
  },

  setTaxRate(cityId: number, rate: 'low' | 'medium' | 'high'): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return logCmd('🏛', `setTaxRate(${cityName(cityId)})`, { ok: false, error: 'Not in playing phase' });
    state.setTaxRate(cityId, rate);
    return logCmd('🏛', `setTaxRate(${cityName(cityId)}, ${rate})`, { ok: true });
  },

  // Personnel
  recruitOfficer(officerId: number, recruiterId?: number): Result {
    const state = useGameStore.getState();
    const on = officerName(officerId);
    if (state.phase !== 'playing') return logCmd('👤', `recruitOfficer(${on})`, { ok: false, error: 'Not in playing phase' });
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return logCmd('👤', `recruitOfficer(${on})`, { ok: false, error: 'Officer not found' });
    state.recruitOfficer(officerId, recruiterId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.factionId === state.playerFaction?.id) return logCmd('👤', `recruitOfficer(${officer.name})`, { ok: true, data: { success: true } });
    return logCmd('👤', `recruitOfficer(${officer.name})`, { ok: true, data: { success: false } });
  },

  searchOfficer(cityId: number, officerId?: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('👤', `searchOfficer(${cn})`, { ok: false, error: 'Not in playing phase' });

    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('👤', `searchOfficer(${cn})`, { ok: false, error: 'City not found' });

    const logBefore = state.log.length;
    state.searchOfficer(cityId, officerId);

    const stateAfter = useGameStore.getState();
    const newLogs = stateAfter.log.slice(logBefore);
    const lastLog = newLogs[newLogs.length - 1] || '';

    let result: { type: 'officer' | 'treasure' | 'nothing'; name?: string } = { type: 'nothing' };
    if (lastLog.includes('找到了')) {
      const match = lastLog.match(/找到了 (.+?)！/);
      result = { type: 'officer', name: match?.[1] };
    } else if (lastLog.includes('發現了寶物')) {
      result = { type: 'treasure' };
    }

    return logCmd('👤', `searchOfficer(${city.name})`, { ok: true, data: result });
  },

  recruitPOW(officerId: number, recruiterId?: number): Result {
    const state = useGameStore.getState();
    const on = officerName(officerId);
    if (state.phase !== 'playing') return logCmd('👤', `recruitPOW(${on})`, { ok: false, error: 'Not in playing phase' });
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return logCmd('👤', `recruitPOW(${on})`, { ok: false, error: 'Officer not found' });
    if (officer.factionId !== POW_FACTION_ID) return logCmd('👤', `recruitPOW(${officer.name})`, { ok: false, error: 'Not a POW' });
    state.recruitPOW(officerId, recruiterId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.factionId === state.playerFaction?.id) return logCmd('👤', `recruitPOW(${officer.name})`, { ok: true, data: { success: true } });
    return logCmd('👤', `recruitPOW(${officer.name})`, { ok: true, data: { success: false } });
  },

  rewardOfficer(officerId: number, type: 'gold' | 'treasure', amount: number = 100): Result {
    const state = useGameStore.getState();
    const on = officerName(officerId);
    if (state.phase !== 'playing') return logCmd('👤', `rewardOfficer(${on})`, { ok: false, error: 'Not in playing phase' });
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.factionId !== state.playerFaction?.id) return logCmd('👤', `rewardOfficer(${on})`, { ok: false, error: 'Not your officer' });

    const city = state.cities.find(c => c.id === officer.cityId);
    if (!city) return logCmd('👤', `rewardOfficer(${officer.name})`, { ok: false, error: 'Officer city not found' });
    if (city.gold < amount) return logCmd('👤', `rewardOfficer(${officer.name})`, { ok: false, error: `Insufficient gold in city ${city.name} (Current: ${city.gold}, Required: ${amount})` });

    const loyaltyBefore = officer.loyalty;
    state.rewardOfficer(officerId, type, amount);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.loyalty > loyaltyBefore) return logCmd('👤', `rewardOfficer(${officer.name})`, { ok: true, data: { before: loyaltyBefore, after: after.loyalty } });
    return logCmd('👤', `rewardOfficer(${officer.name})`, { ok: false, error: 'Action failed to increase loyalty (maybe already at 100?)' });
  },

  executeOfficer(officerId: number): Result {
    const state = useGameStore.getState();
    const on = officerName(officerId);
    if (state.phase !== 'playing') return logCmd('👤', `executeOfficer(${on})`, { ok: false, error: 'Not in playing phase' });
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return logCmd('👤', `executeOfficer(${on})`, { ok: false, error: 'Officer not found' });
    state.executeOfficer(officerId);
    if (!useGameStore.getState().officers.find(o => o.id === officerId)) return logCmd('👤', `executeOfficer(${officer.name})`, { ok: true });
    return logCmd('👤', `executeOfficer(${officer.name})`, { ok: false, error: 'Action failed' });
  },

  dismissOfficer(officerId: number): Result {
    const state = useGameStore.getState();
    const on = officerName(officerId);
    if (state.phase !== 'playing') return logCmd('👤', `dismissOfficer(${on})`, { ok: false, error: 'Not in playing phase' });
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.factionId !== state.playerFaction?.id) return logCmd('👤', `dismissOfficer(${on})`, { ok: false, error: 'Not your officer' });
    state.dismissOfficer(officerId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.factionId === null) return logCmd('👤', `dismissOfficer(${officer.name})`, { ok: true });
    return logCmd('👤', `dismissOfficer(${officer.name})`, { ok: false, error: 'Action failed' });
  },

  appointGovernor(cityId: number, officerId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return logCmd('👤', `appointGovernor(${cityName(cityId)}, ${officerName(officerId)})`, { ok: false, error: 'Not in playing phase' });
    state.appointGovernor(cityId, officerId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.isGovernor) return logCmd('👤', `appointGovernor(${cityName(cityId)}, ${officerName(officerId)})`, { ok: true });
    return logCmd('👤', `appointGovernor(${cityName(cityId)}, ${officerName(officerId)})`, { ok: false, error: 'Action failed' });
  },

  appointAdvisor(officerId: number): Result {
    const state = useGameStore.getState();
    const on = officerName(officerId);
    if (state.phase !== 'playing') return logCmd('👤', `appointAdvisor(${on})`, { ok: false, error: 'Not in playing phase' });
    state.appointAdvisor(officerId);
    if (useGameStore.getState().playerFaction?.advisorId === officerId) return logCmd('👤', `appointAdvisor(${on})`, { ok: true });
    return logCmd('👤', `appointAdvisor(${on})`, { ok: false, error: 'Action failed' });
  },

  promoteOfficer(officerId: number, rank: OfficerRank): Result {
    const state = useGameStore.getState();
    const on = officerName(officerId);
    if (state.phase !== 'playing') return logCmd('👤', `promoteOfficer(${on}, ${rank})`, { ok: false, error: 'Not in playing phase' });
    state.promoteOfficer(officerId, rank);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.rank === rank) return logCmd('👤', `promoteOfficer(${on}, ${rank})`, { ok: true });
    return logCmd('👤', `promoteOfficer(${on}, ${rank})`, { ok: false, error: 'Action failed' });
  },

  // Military
  draftTroops(cityId: number, amount: number, officerId?: number | number[]): Result {
    const state = useGameStore.getState();
    const cn = cityName(cityId);
    if (state.phase !== 'playing') return logCmd('⚔', `draftTroops(${cn}, ${amount})`, { ok: false, error: 'Not in playing phase' });

    const city = state.cities.find(c => c.id === cityId);
    if (!city) return logCmd('⚔', `draftTroops(${cn}, ${amount})`, { ok: false, error: 'City not found' });
    if (city.factionId !== state.playerFaction?.id) return logCmd('⚔', `draftTroops(${city.name}, ${amount})`, { ok: false, error: 'Not your city' });

    const actualOfficerId = Array.isArray(officerId) ? officerId[0] : officerId;

    const executor = actualOfficerId
      ? state.officers.find(o => o.id === actualOfficerId && o.cityId === cityId)
      : state.officers.find(o => o.cityId === cityId && o.isGovernor);

    if (!executor) return logCmd('⚔', `draftTroops(${city.name}, ${amount})`, { ok: false, error: actualOfficerId ? `Officer ${actualOfficerId} not found in city` : 'No governor in city' });
    if (executor.stamina < 10) return logCmd('⚔', `draftTroops(${city.name}, ${amount})`, { ok: false, error: `${executor.name} has insufficient stamina (Current: ${executor.stamina}, Required: 10)` });

    const goldCost = amount * 2;
    const foodCost = amount * 3;
    if (city.gold < goldCost) return logCmd('⚔', `draftTroops(${city.name}, ${amount})`, { ok: false, error: `Insufficient gold (Current: ${city.gold}, Required: ${goldCost} for ${amount} troops)` });
    if (city.food < foodCost) return logCmd('⚔', `draftTroops(${city.name}, ${amount})`, { ok: false, error: `Insufficient food (Current: ${city.food}, Required: ${foodCost} for ${amount} troops)` });

    const maxDraft = Math.floor(city.population * 0.1);
    if (amount > maxDraft) return logCmd('⚔', `draftTroops(${city.name}, ${amount})`, { ok: false, error: `Draft amount exceeds population limit (Requested: ${amount}, Max: ${maxDraft})` });

    const before = city.troops;
    state.draftTroops(cityId, amount, actualOfficerId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.troops > before) return logCmd('⚔', `draftTroops(${city.name}, ${amount})`, { ok: true, data: { before, after: after.troops, drafted: after.troops - before, executor: executor.name } });
    return logCmd('⚔', `draftTroops(${city.name}, ${amount})`, { ok: false, error: 'Draft failed unexpectedly in logic' });
  },

  transport(fromCityId: number, toCityId: number, resource: 'gold' | 'food' | 'troops', amount: number): Result {
    const state = useGameStore.getState();
    const label = `transport(${cityName(fromCityId)} → ${cityName(toCityId)}, ${resource} ${amount})`;
    if (state.phase !== 'playing') return logCmd('⚔', label, { ok: false, error: 'Not in playing phase' });
    const fromCity = state.cities.find(c => c.id === fromCityId);
    if (!fromCity) return logCmd('⚔', label, { ok: false, error: 'Origin city not found' });
    if (fromCity[resource] < amount) return logCmd('⚔', label, { ok: false, error: `Insufficient ${resource}` });
    state.transport(fromCityId, toCityId, resource, amount);
    return logCmd('⚔', label, { ok: true });
  },

  transferOfficer(officerId: number, targetCityId: number): Result {
    const state = useGameStore.getState();
    const label = `transferOfficer(${officerName(officerId)} → ${cityName(targetCityId)})`;
    if (state.phase !== 'playing') return logCmd('⚔', label, { ok: false, error: 'Not in playing phase' });
    state.transferOfficer(officerId, targetCityId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.cityId === targetCityId) return logCmd('⚔', label, { ok: true });
    return logCmd('⚔', label, { ok: false, error: 'Action failed' });
  },

  setBattleFormation(formation: { officerIds: number[]; unitTypes: UnitType[] } | null): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return logCmd('⚔', 'setBattleFormation', { ok: false, error: 'Not in playing phase' });
    state.setBattleFormation(formation);
    const names = formation?.officerIds.map(id => officerName(id)) ?? [];
    return logCmd('⚔', 'setBattleFormation', { ok: true, data: { officers: names, units: formation?.unitTypes } });
  },

  startBattle(targetCityId: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(targetCityId);
    if (state.phase !== 'playing') return logCmd('⚔', `startBattle(${cn})`, { ok: false, error: 'Not in playing phase' });
    state.startBattle(targetCityId);
    if (useGameStore.getState().phase === 'battle') {
      logEvent(`Battle started against ${cn}!`);
      return { ok: true };
    }
    // Check if auto-capture happened
    const targetNow = useGameStore.getState().cities.find(c => c.id === targetCityId);
    if (targetNow?.factionId === state.playerFaction?.id) {
      logEvent(`Auto-captured ${cn}! (undefended)`);
      return { ok: false, error: 'Battle failed to start (check requirements/stamina)' };
    }
    return logCmd('⚔', `startBattle(${cn})`, { ok: false, error: 'Battle failed to start (check requirements/stamina)' });
  },

  retreat(): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'battle') return logCmd('⚔', 'retreat', { ok: false, error: 'Not in battle phase' });
    state.retreat();
    if (useGameStore.getState().phase === 'playing') {
      logEvent('Retreated from battle');
      return { ok: true };
    }
    return logCmd('⚔', 'retreat', { ok: false, error: 'Retreat failed' });
  },

  // Duel
  startDuel(): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return logCmd('⚔', 'startDuel', { ok: false, error: 'Not in playing phase' });
    state.startDuel();
    if (useGameStore.getState().phase === 'duel') return logCmd('⚔', 'startDuel', { ok: true });
    return logCmd('⚔', 'startDuel', { ok: false, error: 'Failed to start duel (check adjacency/enemy officers)' });
  },

  duelAction(action: 'attack' | 'heavy' | 'defend' | 'flee'): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'duel') return logCmd('⚔', `duelAction(${action})`, { ok: false, error: 'Not in duel phase' });
    state.duelAction(action);
    return logCmd('⚔', `duelAction(${action})`, { ok: true });
  },

  endDuel(): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'duel') return logCmd('⚔', 'endDuel', { ok: false, error: 'Not in duel phase' });
    state.endDuel();
    return logCmd('⚔', 'endDuel', { ok: true });
  },

  // Diplomacy
  improveRelations(targetFactionId: number): Result {
    const state = useGameStore.getState();
    const tf = state.factions.find(f => f.id === targetFactionId);
    const tName = tf?.name ?? `#${targetFactionId}`;
    if (state.phase !== 'playing') return logCmd('🤝', `improveRelations(${tName})`, { ok: false, error: 'Not in playing phase' });
    const player = state.playerFaction;
    if (!player) return logCmd('🤝', `improveRelations(${tName})`, { ok: false, error: 'No player faction' });

    const myCities = state.cities.filter(c => c.factionId === player.id);
    const totalGold = myCities.reduce((s, c) => s + c.gold, 0);
    if (totalGold < 1000) return logCmd('🤝', `improveRelations(${tName})`, { ok: false, error: `Insufficient total gold across cities (Current: ${totalGold}, Required: 1000)` });

    const hostilityBefore = player.relations[targetFactionId] ?? 60;
    state.improveRelations(targetFactionId);
    const hostilityAfter = useGameStore.getState().playerFaction?.relations[targetFactionId] ?? 60;
    if (hostilityAfter < hostilityBefore) return logCmd('🤝', `improveRelations(${tName})`, { ok: true, data: { before: hostilityBefore, after: hostilityAfter } });
    return logCmd('🤝', `improveRelations(${tName})`, { ok: false, error: 'Action failed (check stamina of ruler/advisor)' });
  },

  formAlliance(targetFactionId: number): Result {
    const state = useGameStore.getState();
    const tf = state.factions.find(f => f.id === targetFactionId);
    const tName = tf?.name ?? `#${targetFactionId}`;
    if (state.phase !== 'playing') return logCmd('🤝', `formAlliance(${tName})`, { ok: false, error: 'Not in playing phase' });
    const alliesBefore = state.playerFaction?.allies || [];
    state.formAlliance(targetFactionId);
    const after = useGameStore.getState().playerFaction;
    if (after?.allies.includes(targetFactionId) && !alliesBefore.includes(targetFactionId)) return logCmd('🤝', `formAlliance(${tName})`, { ok: true, data: { success: true } });
    return logCmd('🤝', `formAlliance(${tName})`, { ok: true, data: { success: false } });
  },

  requestJointAttack(allyFactionId: number, targetCityId: number): Result {
    const state = useGameStore.getState();
    const label = `requestJointAttack(ally:#${allyFactionId}, ${cityName(targetCityId)})`;
    if (state.phase !== 'playing') return logCmd('🤝', label, { ok: false, error: 'Not in playing phase' });
    state.requestJointAttack(allyFactionId, targetCityId);
    return logCmd('🤝', label, { ok: true });
  },

  proposeCeasefire(targetFactionId: number): Result {
    const state = useGameStore.getState();
    const tf = state.factions.find(f => f.id === targetFactionId);
    const tName = tf?.name ?? `#${targetFactionId}`;
    if (state.phase !== 'playing') return logCmd('🤝', `proposeCeasefire(${tName})`, { ok: false, error: 'Not in playing phase' });
    const ceasefiresBefore = state.playerFaction?.ceasefires.length || 0;
    state.proposeCeasefire(targetFactionId);
    const after = useGameStore.getState().playerFaction;
    if ((after?.ceasefires.length || 0) > ceasefiresBefore) return logCmd('🤝', `proposeCeasefire(${tName})`, { ok: true, data: { success: true } });
    return logCmd('🤝', `proposeCeasefire(${tName})`, { ok: true, data: { success: false } });
  },

  demandSurrender(targetFactionId: number): Result {
    const state = useGameStore.getState();
    const tf = state.factions.find(f => f.id === targetFactionId);
    const tName = tf?.name ?? `#${targetFactionId}`;
    if (state.phase !== 'playing') return logCmd('🤝', `demandSurrender(${tName})`, { ok: false, error: 'Not in playing phase' });
    state.demandSurrender(targetFactionId);
    const after = useGameStore.getState().factions;
    if (!after.find(f => f.id === targetFactionId)) return logCmd('🤝', `demandSurrender(${tName})`, { ok: true, data: { success: true } });
    return logCmd('🤝', `demandSurrender(${tName})`, { ok: true, data: { success: false } });
  },

  breakAlliance(targetFactionId: number): Result {
    const state = useGameStore.getState();
    const tf = state.factions.find(f => f.id === targetFactionId);
    const tName = tf?.name ?? `#${targetFactionId}`;
    if (state.phase !== 'playing') return logCmd('🤝', `breakAlliance(${tName})`, { ok: false, error: 'Not in playing phase' });
    state.breakAlliance(targetFactionId);
    if (!useGameStore.getState().playerFaction?.allies.includes(targetFactionId)) return logCmd('🤝', `breakAlliance(${tName})`, { ok: true });
    return logCmd('🤝', `breakAlliance(${tName})`, { ok: false, error: 'Action failed' });
  },

  exchangeHostage(officerId: number, targetFactionId: number): Result {
    const state = useGameStore.getState();
    const label = `exchangeHostage(${officerName(officerId)}, faction#${targetFactionId})`;
    if (state.phase !== 'playing') return logCmd('🤝', label, { ok: false, error: 'Not in playing phase' });
    state.exchangeHostage(officerId, targetFactionId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.cityId === HOSTAGE_CITY_ID) return logCmd('🤝', label, { ok: true });
    return logCmd('🤝', label, { ok: false, error: 'Action failed' });
  },

  // Strategy
  rumor(targetCityId: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(targetCityId);
    if (state.phase !== 'playing') return logCmd('🕵', `rumor(${cn})`, { ok: false, error: 'Not in playing phase' });
    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!targetCity) return logCmd('🕵', `rumor(${cn})`, { ok: false, error: 'City not found' });
    const loyaltyBefore = targetCity.peopleLoyalty;
    state.rumor(targetCityId);
    const after = useGameStore.getState().cities.find(c => c.id === targetCityId)!;
    if (after.peopleLoyalty < loyaltyBefore) return logCmd('🕵', `rumor(${targetCity.name})`, { ok: true, data: { success: true, before: loyaltyBefore, after: after.peopleLoyalty } });
    return logCmd('🕵', `rumor(${targetCity.name})`, { ok: true, data: { success: false } });
  },

  counterEspionage(targetCityId: number, targetOfficerId: number): Result {
    const state = useGameStore.getState();
    const label = `counterEspionage(${cityName(targetCityId)}, ${officerName(targetOfficerId)})`;
    if (state.phase !== 'playing') return logCmd('🕵', label, { ok: false, error: 'Not in playing phase' });
    const officer = state.officers.find(o => o.id === targetOfficerId);
    if (!officer) return logCmd('🕵', label, { ok: false, error: 'Officer not found' });
    const loyaltyBefore = officer.loyalty;
    state.counterEspionage(targetCityId, targetOfficerId);
    const after = useGameStore.getState().officers.find(o => o.id === targetOfficerId)!;
    if (after.loyalty < loyaltyBefore) return logCmd('🕵', label, { ok: true, data: { success: true } });
    return logCmd('🕵', label, { ok: true, data: { success: false } });
  },

  inciteRebellion(targetCityId: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(targetCityId);
    if (state.phase !== 'playing') return logCmd('🕵', `inciteRebellion(${cn})`, { ok: false, error: 'Not in playing phase' });
    state.inciteRebellion(targetCityId);
    return logCmd('🕵', `inciteRebellion(${cn})`, { ok: true });
  },

  arson(targetCityId: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(targetCityId);
    if (state.phase !== 'playing') return logCmd('🕵', `arson(${cn})`, { ok: false, error: 'Not in playing phase' });
    state.arson(targetCityId);
    return logCmd('🕵', `arson(${cn})`, { ok: true });
  },

  spy(targetCityId: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(targetCityId);
    if (state.phase !== 'playing') return logCmd('🕵', `spy(${cn})`, { ok: false, error: 'Not in playing phase' });
    state.spy(targetCityId);
    if (useGameStore.getState().isCityRevealed(targetCityId)) return logCmd('🕵', `spy(${cn})`, { ok: true, data: { success: true } });
    return logCmd('🕵', `spy(${cn})`, { ok: true, data: { success: false } });
  },

  gatherIntelligence(targetCityId: number): Result {
    const state = useGameStore.getState();
    const cn = cityName(targetCityId);
    if (state.phase !== 'playing') return logCmd('🕵', `gatherIntelligence(${cn})`, { ok: false, error: 'Not in playing phase' });
    state.gatherIntelligence(targetCityId);
    if (useGameStore.getState().isCityRevealed(targetCityId)) return logCmd('🕵', `gatherIntelligence(${cn})`, { ok: true });
    return logCmd('🕵', `gatherIntelligence(${cn})`, { ok: false, error: 'Action failed' });
  },

  popEvent(): Result {
    const state = useGameStore.getState();
    const evt = state.pendingEvents[0];
    useGameStore.getState().popEvent();
    if (evt) logEvent(`popEvent: ${evt.name ?? evt.type}`, { type: evt.type, cityId: evt.cityId, officerId: evt.officerId });
    return { ok: true };
  },

  endTurn(): Result {
    const { month, year } = useGameStore.getState();
    useGameStore.getState().endTurn();
    const after = useGameStore.getState();
    const result: Result = {
      ok: true,
      data: {
        year: after.year,
        month: after.month,
        advanced: after.month !== month,
        events: after.pendingEvents.map(e => ({
          type: e.type,
          name: e.name,
          cityId: e.cityId,
          officerId: e.officerId
        })),
        eventCount: after.pendingEvents.length
      }
    };
    logEvent(`endTurn: ${year}/${month} → ${after.year}/${after.month}`, { events: after.pendingEvents.length });
    if (after.pendingEvents.length > 0) {
      for (const e of after.pendingEvents) {
        logEvent(`  event: ${e.name ?? e.type}`, { type: e.type, city: e.cityId ? cityName(e.cityId) : undefined, officer: e.officerId ? officerName(e.officerId) : undefined });
      }
    }
    return result;
  },

  // Battle sub-namespace
  battle: {
    units: () => useBattleStore.getState().units,
    factionUnits: (factionId: number) => useBattleStore.getState().units.filter(u => u.factionId === factionId),
    activeUnit: () => {
      const state = useBattleStore.getState();
      return state.units.find(u => u.id === state.activeUnitId) || null;
    },
    attackerId: () => useBattleStore.getState().attackerId,
    defenderId: () => useBattleStore.getState().defenderId,
    turn: () => useBattleStore.getState().turn,
    isSiege: () => useBattleStore.getState().isSiege,
    moveRange: (unitId: string) => {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return [];
      const battle = useBattleStore.getState();
      const unit = battle.units.find(u => u.id === unitId);
      if (!unit) return [];

      const range = getMovementRange(unit.type);
      const blocked = new Set<string>();
      battle.units.forEach(u => {
        if (u.id !== unitId && u.troops > 0) blocked.add(`${u.x},${u.y}`);
      });
      battle.gates.forEach(g => {
        if (g.hp > 0) blocked.add(`${g.q},${g.r}`);
      });

      const map = getMoveRange(
        { q: unit.x, r: unit.y },
        range,
        battle.battleMap.width,
        battle.battleMap.height,
        battle.battleMap.terrain,
        blocked
      );

      return Array.from(map.keys()).map(k => {
        const [q, r] = k.split(',').map(Number);
        return { q, r };
      });
    },
    attackTargets: (unitId: string) => {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return [];
      const battle = useBattleStore.getState();
      const unit = battle.units.find(u => u.id === unitId);
      if (!unit) return [];
      const range = getAttackRange(unit.type);

      return battle.units.filter(u => {
        if (u.factionId === unit.factionId || u.troops <= 0) return false;
        const dist = (Math.abs(unit.x - u.x) + Math.abs(unit.y - u.y) + Math.abs(unit.z - u.z)) / 2;
        return dist <= range;
      });
    },
    gateTargets: (unitId: string) => {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return [];
      const battle = useBattleStore.getState();
      const unit = battle.units.find(u => u.id === unitId);
      if (!unit) return [];
      return battle.gates.filter(g => (Math.abs(g.q - unit.x) + Math.abs(g.r - unit.y) + Math.abs(-g.q - g.r - unit.z)) / 2 <= 1);
    },
    move(unitId: string, q: number, r: number): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return logCmd('🏰', `move(${unitId})`, { ok: false, error: 'Not in battle phase' });
      const battle = useBattleStore.getState();
      const unit = battle.units.find(u => u.id === unitId);
      if (!unit) return logCmd('🏰', `move(${unitId})`, { ok: false, error: 'Unit not found' });
      const posBefore = { x: unit.x, y: unit.y };
      battle.moveUnit(unitId, q, r);
      const after = useBattleStore.getState().units.find(u => u.id === unitId)!;
      if (after.x === posBefore.x && after.y === posBefore.y) return logCmd('🏰', `move(${unit.officer.name})`, { ok: false, error: 'Move failed' });
      return logCmd('🏰', `move(${unit.officer.name})`, { ok: true, data: { from: posBefore, to: { x: after.x, y: after.y } } });
    },
    attack(attackerUnitId: string, targetUnitId: string): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return logCmd('🏰', `attack(${attackerUnitId})`, { ok: false, error: 'Not in battle phase' });
      const battle = useBattleStore.getState();
      const attacker = battle.units.find(u => u.id === attackerUnitId);
      const target = battle.units.find(u => u.id === targetUnitId);
      if (!target) return logCmd('🏰', `attack(${attacker?.officer.name ?? attackerUnitId})`, { ok: false, error: 'Target not found' });
      const troopsBefore = target.troops;
      battle.attackUnit(attackerUnitId, targetUnitId);
      const after = useBattleStore.getState().units.find(u => u.id === targetUnitId)!;
      if (after.troops < troopsBefore || after.troops === 0) {
        return logCmd('🏰', `attack(${attacker?.officer.name ?? attackerUnitId} → ${target.officer.name})`, { ok: true, data: { targetBefore: troopsBefore, targetAfter: after.troops, damage: troopsBefore - after.troops } });
      }
      return logCmd('🏰', `attack(${attacker?.officer.name ?? attackerUnitId} → ${target.officer.name})`, { ok: false, error: 'Attack failed' });
    },
    attackGate(attackerUnitId: string, gateQ: number, gateR: number): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return logCmd('🏰', 'attackGate', { ok: false, error: 'Not in battle phase' });
      const battle = useBattleStore.getState();
      const attacker = battle.units.find(u => u.id === attackerUnitId);
      const gate = battle.gates.find(g => g.q === gateQ && g.r === gateR);
      if (!gate) return logCmd('🏰', `attackGate(${attacker?.officer.name ?? attackerUnitId})`, { ok: false, error: 'Gate not found' });
      const hpBefore = gate.hp;
      battle.attackGate(attackerUnitId, gateQ, gateR);
      const after = useBattleStore.getState().gates.find(g => g.q === gateQ && g.r === gateR);
      if (!after || after.hp < hpBefore) return logCmd('🏰', `attackGate(${attacker?.officer.name ?? attackerUnitId})`, { ok: true, data: { hpBefore, hpAfter: after?.hp ?? 0 } });
      return logCmd('🏰', `attackGate(${attacker?.officer.name ?? attackerUnitId})`, { ok: false, error: 'Attack failed' });
    },
    executeTactic(unitId: string, tactic: BattleTactic, targetId?: string, targetHex?: { q: number; r: number }): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return logCmd('🏰', `executeTactic(${tactic})`, { ok: false, error: 'Not in battle phase' });
      const unit = useBattleStore.getState().units.find(u => u.id === unitId);
      useBattleStore.getState().executeTactic(unitId, tactic, targetId, targetHex);
      return logCmd('🏰', `executeTactic(${unit?.officer.name ?? unitId}, ${tactic})`, { ok: true });
    },
    initDuel(myOfficer: Officer, enemyOfficer: Officer): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return logCmd('🏰', 'initDuel', { ok: false, error: 'Not in battle phase' });
      useGameStore.getState().initMidBattleDuel(myOfficer, enemyOfficer);
      logEvent(`Duel: ${myOfficer.name} vs ${enemyOfficer.name}`);
      return { ok: true };
    },
    wait(unitId: string): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
      const unit = useBattleStore.getState().units.find(u => u.id === unitId);
      useBattleStore.getState().endUnitTurn(unitId);
      logCmd('🏰', `wait(${unit?.officer.name ?? unitId})`, { ok: true });
      return { ok: true };
    },
    terrain: () => useBattleStore.getState().battleMap,
    gates: () => useBattleStore.getState().gates,
    fireHexes: () => useBattleStore.getState().fireHexes,
    weather: () => useBattleStore.getState().weather,
    windDirection: () => useBattleStore.getState().windDirection,
    day: () => useBattleStore.getState().day,
    isFinished: () => useBattleStore.getState().isFinished,
    winner: () => useBattleStore.getState().winnerFactionId,
  },

  // Save/Load
  save(slot: number): Result {
    const success = useGameStore.getState().saveGame(slot);
    return logCmd('💾', `save(slot ${slot})`, { ok: success });
  },
  load(slot: number): Result {
    const success = useGameStore.getState().loadGame(slot);
    const state = useGameStore.getState();
    return logCmd('💾', `load(slot ${slot})`, { ok: success, data: success ? { year: state.year, month: state.month } : undefined });
  },
  deleteSave(slot: number): Result {
    useGameStore.getState().deleteSave(slot);
    return logCmd('💾', `deleteSave(slot ${slot})`, { ok: true });
  },

  // Utilities
  status(cityId?: number): Result | void {
    const state = useGameStore.getState();
    const battle = useBattleStore.getState();

    if (cityId) {
      const city = state.cities.find(c => c.id === cityId);
      if (!city) return { ok: false, error: 'City not found' };
      return { ok: true, data: city };
    }

    if (state.phase === 'battle') {
      console.log(`═══ RTK Battle ═══`);
      console.log(`Day ${battle.day} | Weather: ${battle.weather} | Wind: ${battle.windDirection}`);
      console.log(`Attacker ID: ${battle.attackerId} | Defender ID: ${battle.defenderId}`);
      const active = battle.units.find(u => u.id === battle.activeUnitId);
      if (active) console.log(`Active Unit: ${active.officer.name} (${active.id})`);
      console.log(`═══════════════════`);
      return;
    }

    console.log(`═══ RTK Status ═══`);
    console.log(`Phase: ${state.phase} | ${state.year}年 ${state.month}月`);

    if (state.playerFaction) {
      console.log(`Faction: ${state.playerFaction.name} (id=${state.playerFaction.id})`);

      const myCities = state.cities.filter(c => c.factionId === state.playerFaction?.id);
      const myOfficers = state.officers.filter(o => o.factionId === state.playerFaction?.id);
      const allCities = state.cities;

      const cityPercent = ((myCities.length / allCities.length) * 100).toFixed(1);
      console.log(`Cities: ${myCities.length}/${allCities.length} (${cityPercent}% of map)`);
      console.log(`  ${myCities.map(c => c.name).join(', ')}`);

      const totalGold = myCities.reduce((s, c) => s + c.gold, 0);
      const totalFood = myCities.reduce((s, c) => s + c.food, 0);
      const totalTroops = myCities.reduce((s, c) => s + c.troops, 0);
      console.log(`Gold: ${totalGold.toLocaleString()} | Food: ${totalFood.toLocaleString()} | Troops: ${totalTroops.toLocaleString()}`);

      const officersWithStamina = myOfficers.filter(o => o.stamina >= 15).length;
      console.log(`Officers: ${myOfficers.length} (${officersWithStamina} with stamina ≥15)`);

      const warnings: string[] = [];
      if (totalGold < 1000) warnings.push('⚠️ Low gold alert');
      if (totalFood < 5000) warnings.push('⚠️ Low food alert');
      myCities.forEach(c => {
        const hasGovernor = state.officers.some(o => o.cityId === c.id && o.factionId === state.playerFaction?.id && o.isGovernor);
        if (!hasGovernor) warnings.push(`⚠️ ${c.name} lacks a governor`);
      });
      if (state.pendingEvents.length > 0) {
        warnings.push(`⚠️ ${state.pendingEvents.length} pending event(s)`);
      }

      if (warnings.length > 0) {
        console.log('');
        warnings.forEach(w => console.log(w));
      }
    }

    console.log(`═══════════════════`);
  },

  confirmEvent: (): Result => {
    const state = useGameStore.getState();
    if (!state.pendingEvents.length) return logCmd('📅', 'confirmEvent', { ok: false, error: 'No pending events' });
    const evt = state.pendingEvents[0];
    state.popEvent();
    logEvent(`confirmEvent: ${evt.name ?? evt.type}`, { type: evt.type, cityId: evt.cityId, officerId: evt.officerId });
    return { ok: true };
  },

  rawState: () => ({ game: useGameStore.getState(), battle: useBattleStore.getState() }),

  tick: () => new Promise(resolve => setTimeout(resolve, 0)),

  onChange: (callback: (state: import('../store/gameStore').GameState) => void) => {
    return useGameStore.subscribe(callback);
  }
};
