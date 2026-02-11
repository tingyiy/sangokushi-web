import { create } from 'zustand';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { GamePhase, Scenario, Faction, City, Officer, CommandCategory, GameSettings } from '../types';
import type { UnitType } from '../types/battle';
import { useBattleStore } from './battleStore';
import { hasSkill } from '../utils/skills';
import { spyingSystem } from '../game/spy/SpyingSystem';
import { runAI } from '../ai/aiEngine';
import type { AIDecision } from '../ai/types';
import { getAdvisorSuggestions } from '../systems/advisor';
import { rollRandomEvents, rollOfficerVisits, applyEventEffects } from '../systems/events';
import { checkHistoricalEvents } from '../data/historicalEvents';

/**
 * Auto-assign the best available officer as governor for a city that has none.
 * Mutates the officers array in-place and returns the promoted officer (or null).
 */
function autoAssignGovernorInPlace(officers: Officer[], cityId: number, factionId: number): Officer | null {
  const hasGov = officers.some(o => o.cityId === cityId && o.factionId === factionId && o.isGovernor);
  if (hasGov) return null;
  const candidates = officers
    .filter(o => o.cityId === cityId && o.factionId === factionId)
    .sort((a, b) => (b.politics + b.leadership) - (a.politics + a.leadership));
  if (candidates.length === 0) return null;
  const idx = officers.findIndex(o => o.id === candidates[0].id);
  officers[idx] = { ...officers[idx], isGovernor: true };
  return officers[idx];
}

/** Compute which map edge the attacker approaches from based on city coordinates */
function getAttackDirection(fromCity: City, toCity: City): 'north' | 'south' | 'east' | 'west' {
  const dx = fromCity.x - toCity.x; // positive = attacker is east of target
  const dy = fromCity.y - toCity.y; // positive = attacker is south of target (y increases downward)
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'east' : 'west';
  } else {
    return dy > 0 ? 'south' : 'north';
  }
}

interface DuelState {
  p1: Officer;
  p2: Officer;
  p1Hp: number;
  p2Hp: number;
  round: number;
  turn: 0 | 1;
  logs: string[];
  result: 'win' | 'lose' | 'draw' | 'flee' | null;
  isBattleDuel?: boolean;
}

export interface GameState {
  phase: GamePhase;
  /** Current scenario data */
  scenario: Scenario | null;
  /** Currently selected player faction */
  playerFaction: Faction | null;
  /** Live game cities (mutable copy from scenario) */
  cities: City[];
  /** Live game officers */
  officers: Officer[];
  /** Live game factions */
  factions: Faction[];
  /** Currently selected faction (for pre-confirm selection) - Phase 0.5 */
  selectedFactionId: number | null;
  /** Game settings - Phase 0.5 */
  gameSettings: GameSettings;
  /** Current game year / month */
  year: number;
  month: number;
  /** Currently selected city (for commands) */
  selectedCityId: number | null;
  /** Current command menu category */
  activeCommandCategory: CommandCategory | null;
  /** Game log messages */
  log: string[];
  /** Duel State */
  duelState: DuelState | null;
  /** Revealed cities info (Fog of War) - Phase 6.3 */
  revealedCities: Record<number, { untilYear: number; untilMonth: number }>;
  /** Pending governor assignment (Phase 7.9) */
  pendingGovernorAssignmentCityId: number | null;
  /** Pre-battle formation - Phase 2.2 */
  battleFormation: {
    officerIds: number[];
    unitTypes: UnitType[];
    troops?: number[];
  } | null;
  /** Pending events to show in dialog - Phase 6.4 */
  pendingEvents: import('../types').GameEvent[];
  /** Guard for double-resolution - Phase 3.9 */
  battleResolved: boolean;

  // Actions
  setPhase: (phase: GamePhase) => void;
  selectScenario: (scenario: Scenario) => void;
  selectFaction: (factionId: number) => void;
  setSelectedFactionId: (factionId: number | null) => void;
  setGameSettings: (settings: Partial<GameSettings>) => void;
  confirmSettings: () => void;
  selectCity: (cityId: number | null) => void;
  setActiveCommandCategory: (cat: CommandCategory | null) => void;
  addLog: (message: string) => void;
  popEvent: () => void;
  retreat: () => void;
  endTurn: () => void;
  aiFormAlliance: (fromCityId: number, targetFactionId: number) => void;
  aiImproveRelations: (fromCityId: number, targetFactionId: number) => void;
  setTaxRate: (cityId: number, rate: 'low' | 'medium' | 'high') => void;
  promoteOfficer: (officerId: number, rank: import('../types').OfficerRank) => void;
  /** Domestic: develop commerce */
  developCommerce: (cityId: number, officerId?: number) => void;
  /** Domestic: develop agriculture */
  developAgriculture: (cityId: number, officerId?: number) => void;
  /** Domestic: reinforce defense */
  reinforceDefense: (cityId: number, officerId?: number) => void;
  /** Domestic: flood control */
  developFloodControl: (cityId: number, officerId?: number) => void;
  /** Domestic: technology */
  developTechnology: (cityId: number, officerId?: number) => void;
  /** Domestic: train troops */
  trainTroops: (cityId: number, officerId?: number) => void;
  /** Domestic: manufacture weapons */
  manufacture: (cityId: number, weaponType: 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults', officerId?: number) => void;
  /** Domestic: disaster relief */
  disasterRelief: (cityId: number, officerId?: number) => void;
  /** Personnel: recruit unaffiliated officers in city */
  recruitOfficer: (officerId: number, recruiterId?: number) => void;
  /** Personnel: search for officers/treasures */
  searchOfficer: (cityId: number, officerId?: number) => void;
  /** Personnel: recruit POW */
  recruitPOW: (officerId: number, recruiterId?: number) => void;
  /** Personnel: reward officer */
  rewardOfficer: (officerId: number, type: 'gold' | 'treasure', amount?: number) => void;
  /** Personnel: execute POW */
  executeOfficer: (officerId: number) => void;
  /** Personnel: dismiss officer */
  dismissOfficer: (officerId: number) => void;
  /** Personnel: appoint governor */
  appointGovernor: (cityId: number, officerId: number) => void;
  /** Personnel: appoint advisor */
  appointAdvisor: (officerId: number) => void;
  /** Military: draft troops */
  draftTroops: (cityId: number, amount: number, officerId?: number) => void;
  /** Military: transport resources */
  transport: (fromCityId: number, toCityId: number, resource: 'gold' | 'food' | 'troops', amount: number) => void;
  /** Military/Personnel: transfer officer */
  transferOfficer: (officerId: number, targetCityId: number) => void;
  /** Military: set battle formation (troops[] is optional — auto-allocated if omitted) */
  setBattleFormation: (formation: { officerIds: number[]; unitTypes: UnitType[]; troops?: number[] } | null) => void;
  /** Military: Duel */
  startDuel: () => void;
  initMidBattleDuel: (p1: Officer, p2: Officer) => void;
  duelAction: (action: 'attack' | 'heavy' | 'defend' | 'flee') => void;
  endDuel: () => void;
  /** Military: Battle */
  startBattle: (targetCityId: number) => void;
  aiStartBattle: (fromCityId: number, targetCityId: number) => void;
  /** Diplomacy: Improve relations (Gift) */
  improveRelations: (targetFactionId: number) => void;
  /** Diplomacy: Form Alliance */
  formAlliance: (targetFactionId: number) => void;
  /** Diplomacy: Joint attack */
  requestJointAttack: (allyFactionId: number, targetCityId: number) => void;
  /** Diplomacy: Ceasefire */
  proposeCeasefire: (targetFactionId: number) => void;
  /** Diplomacy: Demand surrender */
  demandSurrender: (targetFactionId: number) => void;
  /** Diplomacy: Break alliance */
  breakAlliance: (targetFactionId: number) => void;
  /** Diplomacy: Exchange hostage */
  exchangeHostage: (officerId: number, targetFactionId: number) => void;
  /** Strategy: Counter-espionage */
  counterEspionage: (targetCityId: number, targetOfficerId: number) => void;
  /** Strategy: Incite rebellion */
  inciteRebellion: (targetCityId: number) => void;
  /** Strategy: Arson */
  arson: (targetCityId: number) => void;
  /** Strategy: Espionage (Spy) */
  spy: (targetCityId: number) => void;
  /** Strategy: Intelligence gathering */
  gatherIntelligence: (targetCityId: number) => void;
  /** 謀略: 流言 (Rumor) - Decrease city loyalty and population */
  rumor: (targetCityId: number) => void;
  /** AI Actions: Context-aware versions for AI use */
  aiRecruitOfficer: (cityId: number, officerId: number) => void;
  aiRecruitPOW: (cityId: number, officerId: number) => void;
  aiSearchOfficer: (cityId: number) => void;
  aiSpy: (cityId: number, targetCityId: number) => void;
  aiRumor: (cityId: number, targetCityId: number) => void;
  /** Battle: Resolve battle consequences - transfer city, capture officers, redistribute troops */
  resolveBattle: (winnerFactionId: number, loserFactionId: number, cityId: number, battleUnits: { officerId: number; troops: number; factionId: number; status: string }[], capturedOfficerIds?: number[], routedOfficerIds?: number[]) => void;
  /** Save/Load: Save game to localStorage slot */
  saveGame: (slot: number) => boolean;
  /** Save/Load: Load game from localStorage slot */
  loadGame: (slot: number) => boolean;
  /** Save/Load: Get list of available save slots */
  getSaveSlots: () => { slot: number; date: string | null; version: string | null }[];
  /** Save/Load: Delete save slot */
  deleteSave: (slot: number) => boolean;
  /** Victory: Check victory/defeat conditions */
  checkVictoryCondition: () => { type: 'victory' | 'defeat' | 'ongoing'; message: string } | null;
  /** AI: Apply decisions made by AI engine */
  applyAIDecisions: (decisions: AIDecision[]) => void;
  /** Fog of War: check if city is revealed */
  isCityRevealed: (cityId: number) => boolean;
}
const SETTINGS_KEY = 'rtk4_settings';

const DEFAULT_SETTINGS: GameSettings = {
  battleMode: 'watch',
  gameMode: 'historical',
  customOfficers: 'all',
  intelligenceSensitivity: 3,
  musicEnabled: true,
};

const loadSettings = (): GameSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch (e) {
    console.error('Failed to load settings:', e);
    return DEFAULT_SETTINGS;
  }
};

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',
  scenario: null,
  playerFaction: null,
  cities: [],
  officers: [],
  factions: [],
  selectedFactionId: null,
  gameSettings: loadSettings(),
  year: 190,
  month: 1,
  selectedCityId: null,
  activeCommandCategory: null,
  log: [],
  duelState: null,
  revealedCities: {},
  pendingGovernorAssignmentCityId: null,
  battleFormation: null,
  pendingEvents: [],
  battleResolved: false,

  setPhase: (phase) => set({ phase }),

  selectScenario: (scenario) => {
    // Initialize relations and allies for factions if missing
    const initializedFactions = scenario.factions.map(f => ({
      ...f,
      relations: f.relations || scenario.factions.reduce((acc, other) => {
        if (other.id !== f.id) acc[other.id] = 60; // Default hostility
        return acc;
      }, {} as Record<number, number>),
      allies: f.allies || [],
    }));

    set({
      scenario,
      cities: scenario.cities.map(c => ({ ...c })),
      officers: scenario.officers.map(o => ({ ...o })),
      factions: initializedFactions,
      year: scenario.year,
      month: 1,
      phase: 'faction',
    });
  },

  selectFaction: (factionId) => {
    const state = get();
    const faction = state.factions.find(f => f.id === factionId);
    if (!faction) return;
    set({
      factions: state.factions.map(f => ({
        ...f,
        isPlayer: f.id === factionId,
      })),
      playerFaction: { ...faction, isPlayer: true },
      phase: 'settings',
      log: [i18next.t('logs:game.factionChosen', { faction: localizedName(faction.name), year: state.year, month: state.month })],
    });
  },

  setSelectedFactionId: (factionId) => set({ selectedFactionId: factionId }),

  setGameSettings: (settings) => set(state => {
    const newSettings = { ...state.gameSettings, ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
    return { gameSettings: newSettings };
  }),

  confirmSettings: () => {
    set({ phase: 'playing' });
    get().addLog(i18next.t('logs:game.settingsConfirm'));
  },

  selectCity: (cityId) => set({ selectedCityId: cityId, activeCommandCategory: null }),

  setActiveCommandCategory: (cat) => set({ activeCommandCategory: cat }),

  addLog: (message) => set(state => ({
    log: [...state.log.slice(-49), message],
  })),
  popEvent: () => set(state => {
    if (!state.pendingEvents || state.pendingEvents.length === 0) return {};
    return { pendingEvents: state.pendingEvents.slice(1) };
  }),


  retreat: () => {
    const state = get();
    if (state.phase !== 'battle') return;

    const battle = useBattleStore.getState();
    // The player is retreating, so the OTHER faction wins
    const loserFactionId = battle.playerFactionId;
    const winnerFactionId = loserFactionId === battle.attackerId ? battle.defenderId : battle.attackerId;

    get().addLog(i18next.t('logs:game.retreat'));

    get().resolveBattle(
      winnerFactionId,
      loserFactionId,
      battle.defenderCityId,
      battle.units.map(u => ({
        officerId: u.officerId,
        troops: u.troops,
        factionId: u.factionId,
        status: 'routed'
      }))
    );

    set({ phase: 'playing' });
  },

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
    const deadOfficerIds: number[] = [];
    const updatedOfficersPreDeath = state.officers.map(o => {
      const age = newYear - o.birthYear;
      let newStamina = Math.min(100, o.stamina + 20);
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

      if (age > 50 && Math.random() < (age - 50) * 0.01) {
        newStamina = Math.max(0, newStamina - 30);
      }

      if (newYear >= o.deathYear && newMonth === 1 && Math.random() < 0.3) {
        deadOfficerIds.push(o.id);
      }

      return { ...o, stamina: newStamina, loyalty: newLoyalty };
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

  isCityRevealed: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return false;
    if (!state.playerFaction) return true; // Show all if no player (e.g. spectator)

    // Rule 1: Own cities are always revealed
    if (city.factionId === state.playerFaction.id) return true;

    // Rule 2: Adjacent cities are revealed
    const playerCities = state.cities.filter(c => c.factionId === state.playerFaction?.id);
    const isAdjacent = playerCities.some(pc => pc.adjacentCityIds.includes(cityId));
    if (isAdjacent) return true;

    // Rule 3: Spied/Revealed cities
    const revealInfo = state.revealedCities[cityId];
    if (revealInfo) {
      if (state.year < revealInfo.untilYear) return true;
      if (state.year === revealInfo.untilYear && state.month <= revealInfo.untilMonth) return true;
    }

    return false;
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
    if (messenger.stamina < 20) return;

    const chance = (messenger.politics / 2) + (100 - (faction.relations[targetFactionId] ?? 60)) / 2;
    const success = Math.random() * 100 < chance;

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 2000 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o),
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
    if (messenger.stamina < 15) return;

    const reduction = Math.floor(messenger.politics / 4) + 10;

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 15 } : o),
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (executor.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 20 }));
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
          ? { ...o, stamina: o.stamina - 20 }
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (executor.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 20 }));
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
          ? { ...o, stamina: o.stamina - 20 }
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (executor.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 20 }));
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
          ? { ...o, stamina: o.stamina - 20 }
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (executor.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 20 }));
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
          ? { ...o, stamina: o.stamina - 20 }
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (executor.stamina < 25) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 25 }));
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
          ? { ...o, stamina: o.stamina - 25 }
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (executor.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 20 }));
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
          ? { ...o, stamina: o.stamina - 20 }
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (!hasSkill(executor, 'manufacture')) {
      get().addLog(i18next.t('logs:error.noManufactureSkill', { name: localizedName(executor.name) }));
      return;
    }
    if (executor.stamina < 30) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 30 }));
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
          ? { ...o, stamina: o.stamina - 30 }
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (executor.stamina < 15) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 15 }));
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
          ? { ...o, stamina: o.stamina - 15 }
          : o
      ),
    });
    get().addLog(i18next.t('logs:domestic.relief', { city: localizedName(city.name), officer: localizedName(executor.name), bonus: 15 + bonus }));
  },

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
      const recruiters = state.officers.filter(o => o.cityId === city.id && o.factionId === playerFaction.id);
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

    if (recruiter.stamina < 15) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(recruiter.name), required: 15 }));
      return;
    }

    // Charisma check: recruiter charisma vs officer politics
    const chance = Math.min(90, 30 + recruiter.charisma - officer.politics);
    const success = Math.random() * 100 < chance;

    set({
      officers: state.officers.map(o => {
        if (o.id === recruiter!.id) {
          return { ...o, stamina: o.stamina - 15 };
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
      const recruiters = state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id);
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

    if (recruiter.stamina < 15) {
      get().addLog(i18next.t('logs:error.staminaInsufficientShort', { name: localizedName(recruiter.name), required: 15 }));
      return;
    }

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
      officers: state.officers.map(o => o.id === recruiter!.id ? { ...o, stamina: o.stamina - 15 } : o)
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

    if (recruiter.stamina < 15) {
      get().addLog(i18next.t('logs:error.staminaInsufficientShort', { name: localizedName(recruiter.name), required: 15 }));
      return;
    }

    const chance = 40 + recruiter.charisma - officer.loyalty / 2;
    const success = Math.random() * 100 < chance;

    set({
      officers: state.officers.map(o => {
        if (o.id === recruiter!.id) return { ...o, stamina: o.stamina - 15 };
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
      : state.officers.find(o => o.cityId === cityId && o.factionId === state.playerFaction?.id && o.isGovernor)
        || state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id).sort((a, b) => b.politics - a.politics)[0];

    if (!executor) {
      get().addLog(officerId ? i18next.t('logs:error.officerNotInCity') : i18next.t('logs:error.noOfficerInCity'));
      return;
    }
    if (executor.stamina < 10) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(executor.name), required: 10 }));
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
          ? { ...o, stamina: o.stamina - 10 }
          : o
      ),
    });
    get().addLog(i18next.t('logs:domestic.conscript', { city: localizedName(city.name), officer: localizedName(executor.name), amount: actual }));
  },

  transport: (fromCityId, toCityId, resource, amount) => {
    const state = get();
    const fromCity = state.cities.find(c => c.id === fromCityId);
    const toCity = state.cities.find(c => c.id === toCityId);
    if (!fromCity || !toCity) return;

    const governor = state.officers.find(o => o.cityId === fromCityId && o.isGovernor);
    if (!governor || governor.stamina < 20) {
      get().addLog(i18next.t('logs:error.transportStamina'));
      return;
    }

    if (fromCity[resource] < amount) {
      const label = resource === 'gold' ? '金' : resource === 'food' ? '糧' : '兵';
      get().addLog(i18next.t('logs:error.transportInsufficient', { label, amount, current: fromCity[resource] }));
      return;
    }

    set({
      cities: state.cities.map(c => {
        if (c.id === fromCityId) return { ...c, [resource]: c[resource] - amount };
        if (c.id === toCityId) return { ...c, [resource]: c[resource] + amount };
        return c;
      }),
      officers: state.officers.map(o => o.id === governor.id ? { ...o, stamina: o.stamina - 20 } : o)
    });
    get().addLog(i18next.t('logs:domestic.transport', { from: localizedName(fromCity.name), to: localizedName(toCity.name), amount, resource: i18next.t(`logs:common.${resource}`) }));
  },

  transferOfficer: (officerId, targetCityId) => {
    const state = get();
    const officer = state.officers.find(o => o.id === officerId);
    const destCity = state.cities.find(c => c.id === targetCityId);
    if (!officer || officer.stamina < 10) {
      get().addLog(i18next.t('logs:error.moveOfficerStamina', { name: localizedName(officer?.name ?? '') }));
      return;
    }
    if (!destCity || destCity.factionId !== state.playerFaction?.id) {
      get().addLog(i18next.t('logs:error.moveOnlyFriendly'));
      return;
    }

    const wasGovernor = officer.isGovernor;
    const sourceCityId = officer.cityId;
    const updatedOfficers = state.officers.map(o => o.id === officerId ? { ...o, cityId: targetCityId, isGovernor: false, stamina: o.stamina - 10 } : o);
    // If the transferred officer was the governor, auto-assign a new one for the source city
    if (wasGovernor && sourceCityId !== null) {
      autoAssignGovernorInPlace(updatedOfficers, sourceCityId, state.playerFaction!.id);
    }
    set({ officers: updatedOfficers });
    const finalDestCity = state.cities.find(c => c.id === targetCityId);
    get().addLog(i18next.t('logs:personnel.moveOfficer', { name: localizedName(officer.name), city: localizedName(finalDestCity?.name ?? '') }));
  },

  setBattleFormation: (formation) => set({ battleFormation: formation }),

  startDuel: () => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city) return;

    // Find best player officer in city
    const pOfficers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    if (pOfficers.length === 0) {
      get().addLog(i18next.t('logs:error.noCityOfficers'));
      return;
    }
    const p1 = pOfficers.reduce((prev, current) => (prev.war > current.war ? prev : current));

    // Find random enemy in adjacent cities
    const enemyCityIds = city.adjacentCityIds.filter(id => {
      const neighbor = state.cities.find(c => c.id === id);
      return neighbor && neighbor.factionId && neighbor.factionId !== state.playerFaction?.id;
    });

    if (enemyCityIds.length === 0) {
      get().addLog(i18next.t('logs:error.noEnemyNearby'));
      return;
    }

    const targetCityId = enemyCityIds[Math.floor(Math.random() * enemyCityIds.length)];
    const duelCity = state.cities.find(c => c.id === targetCityId)!;

    const eOfficers = state.officers.filter(o => o.cityId === targetCityId && o.factionId === duelCity.factionId);
    if (eOfficers.length === 0) {
      get().addLog(i18next.t('logs:error.emptyCityDuel', { city: localizedName(duelCity.name) }));
      return;
    }
    const p2 = eOfficers[Math.floor(Math.random() * eOfficers.length)];

    set({
      phase: 'duel',
      duelState: {
        p1,
        p2,
        p1Hp: 100,
        p2Hp: 100,
        round: 1,
        turn: 0,
        logs: [`${p1.name} 向 ${duelCity.name} 的 ${p2.name} 發起了挑戰！`, '戰鬥開始！'],
        result: null,
      }
    });
  },

  initMidBattleDuel: (p1, p2) => {
    set({
      phase: 'duel',
      duelState: {
        p1,
        p2,
        p1Hp: 100,
        p2Hp: 100,
        round: 1,
        turn: 0,
        logs: [`${p1.name} 與 ${p2.name} 展開了生死決鬥！`],
        result: null,
        isBattleDuel: true
      }
    });
  },

  duelAction: (action) => {
    const state = get();
    const ds = state.duelState;
    if (!ds || ds.result) return;

    let p1Dmg = 0;
    let p2Dmg = 0;
    let logMsg = '';
    const logs = [...ds.logs];

    // Player Phase
    if (action === 'flee') {
      set({ duelState: { ...ds, logs: [...logs, `${ds.p1.name} 逃跑了！`], result: 'flee' } });
      return;
    }

    // Hit calculation
    // Base damage = War / 10 + Random(1-10)

    let hitChance = 80 + (ds.p1.war - ds.p2.war);
    let damageMult = 1;

    if (action === 'heavy') {
      hitChance -= 20;
      damageMult = 1.5;
    } else if (action === 'defend') {
      damageMult = 0; // Don't attack
    }

    if (action !== 'defend') {
      const roll = Math.random() * 100;
      if (roll < hitChance) {
        const base = Math.max(1, ds.p1.war / 5);
        const dmg = Math.floor((base + Math.random() * 10) * damageMult);
        p2Dmg = dmg;
        logMsg = `${ds.p1.name} 使用 ${action === 'heavy' ? '大喝' : '攻擊'}，造成了 ${dmg} 點傷害！`;
      } else {
        logMsg = `${ds.p1.name} 的攻擊落空了！`;
      }
    } else {
      logMsg = `${ds.p1.name} 採取了防禦姿態。`;
    }
    logs.push(logMsg);

    const newP2Hp = Math.max(0, ds.p2Hp - p2Dmg);

    if (newP2Hp === 0) {
      set({ duelState: { ...ds, p2Hp: 0, logs: [...logs, `${ds.p2.name} 被擊敗了！`], result: 'win' } });
      return;
    }

    // AI Phase
    const aiAction = ds.p2Hp < 30 ? 'heavy' : 'attack';
    let aiHitChance = 80 + (ds.p2.war - ds.p1.war);
    let aiDamageMult = 1;

    if (aiAction === 'heavy') {
      aiHitChance -= 20;
      aiDamageMult = 1.5;
    }

    // Player defense bonus
    if (action === 'defend') {
      aiDamageMult *= 0.5;
      logs.push(`(防禦生效！傷害減半)`);
    }

    const aiRoll = Math.random() * 100;
    if (aiRoll < aiHitChance) {
      const base = Math.max(1, ds.p2.war / 5);
      const dmg = Math.floor((base + Math.random() * 10) * aiDamageMult);
      p1Dmg = dmg;
      logs.push(`${ds.p2.name} 還擊！造成了 ${dmg} 點傷害！`);
    } else {
      logs.push(`${ds.p2.name} 的攻擊被閃避了！`);
    }

    const newP1Hp = Math.max(0, ds.p1Hp - p1Dmg);

    if (newP1Hp === 0) {
      set({ duelState: { ...ds, p1Hp: 0, p2Hp: newP2Hp, logs: [...logs, `${ds.p1.name} 落馬了...`], result: 'lose' } });
      return;
    }

    set({
      duelState: {
        ...ds,
        p1Hp: newP1Hp,
        p2Hp: newP2Hp,
        logs: logs,
        round: ds.round + 1,
      }
    });
  },

  endDuel: () => {
    const state = get();
    const ds = state.duelState;
    if (ds && ds.isBattleDuel) {
      if (ds.result === 'win') {
        useBattleStore.getState().applyDuelResults(ds.p1.id, ds.p2.id);
      } else if (ds.result === 'lose') {
        useBattleStore.getState().applyDuelResults(ds.p2.id, ds.p1.id);
      }
      set({ phase: 'battle', duelState: null });
    } else {
      set({ phase: 'playing', duelState: null });
    }
  },

  startBattle: (targetCityId: number) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!city || !targetCity || !state.playerFaction) return;

    let attackerOfficers: Officer[] = [];
    let attackerUnitTypes: UnitType[] = [];

    if (state.battleFormation) {
      attackerOfficers = state.battleFormation.officerIds.map(id => state.officers.find(o => o.id === id)!).filter(Boolean);
      attackerUnitTypes = state.battleFormation.unitTypes || attackerOfficers.map(() => 'infantry' as UnitType);
    } else {
      // Default fallback if no formation set (infantry)
      attackerOfficers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id).slice(0, 5);
      attackerUnitTypes = attackerOfficers.map(() => 'infantry' as UnitType);
    }

    if (attackerOfficers.length === 0) {
      get().addLog(i18next.t('logs:error.noCommanders'));
      return;
    }

    // Calculate actual troop allocation per officer (based on city garrison, capped by leadership)
    // If the player specified troops in the formation, use those (still capped by leadership)
    const playerTroops = state.battleFormation?.troops;
    const troopsPerOfficer = attackerOfficers.map((off, i) => {
      const maxForOfficer = off.leadership * 100; // RTK IV: leadership determines max troops
      if (playerTroops && playerTroops[i] !== undefined) {
        return Math.min(playerTroops[i], maxForOfficer, city.troops);
      }
      const equalShare = Math.floor(city.troops / attackerOfficers.length);
      return Math.min(equalShare, maxForOfficer);
    });
    const totalTroopsToDeploy = troopsPerOfficer.reduce((sum, t) => sum + t, 0);
    if (totalTroopsToDeploy <= 0) {
      get().addLog(i18next.t('logs:error.insufficientTroopsBasic', { troops: city.troops }));
      return;
    }
    if (totalTroopsToDeploy > city.troops) {
      get().addLog(i18next.t('logs:error.insufficientTroopsRequired', { required: totalTroopsToDeploy, troops: city.troops }));
      return;
    }

    // Check commander stamina (highest leadership officer)
    const commander = attackerOfficers.reduce((prev, curr) => (prev.leadership > curr.leadership ? prev : curr));
    if (commander.stamina < 30) {
      get().addLog(i18next.t('logs:error.commanderStamina', { name: localizedName(commander.name) }));
      return;
    }

    // Deduct weapons from city based on formation
    let crossbowsUsed = 0;
    let warHorsesUsed = 0;
    attackerUnitTypes.forEach(type => {
      if (type === 'archer') crossbowsUsed += 1000; // Assume 1000 per unit for now
      if (type === 'cavalry') warHorsesUsed += 1000;
    });

    if (city.crossbows < crossbowsUsed || city.warHorses < warHorsesUsed) {
      const shortages: string[] = [];
      if (city.crossbows < crossbowsUsed) shortages.push(`弩 需 ${crossbowsUsed}（現有 ${city.crossbows}）`);
      if (city.warHorses < warHorsesUsed) shortages.push(`軍馬 需 ${warHorsesUsed}（現有 ${city.warHorses}）`);
      get().addLog(i18next.t('logs:error.weaponShortage', { details: shortages.join(i18next.t('logs:common.comma')) }));
      return;
    }

    const defenderOfficers = state.officers.filter(o => o.cityId === targetCityId && o.factionId === targetCity.factionId).slice(0, 5);

    // ── Auto-capture undefended city ──
    // If the target city has NO defending officers, skip the battle and capture it directly.
    if (defenderOfficers.length === 0) {
      set({
        cities: state.cities.map(c => {
          if (c.id === city.id) return {
            ...c,
            troops: c.troops - totalTroopsToDeploy,
            crossbows: c.crossbows - crossbowsUsed,
            warHorses: c.warHorses - warHorsesUsed
          };
          if (c.id === targetCityId) return {
            ...c,
            factionId: state.playerFaction!.id,
            troops: totalTroopsToDeploy, // Garrison the conquering army
          };
          return c;
        }),
        officers: state.officers.map(o =>
          attackerOfficers.some(ao => ao.id === o.id)
            ? { ...o, stamina: Math.max(0, o.stamina - 10), cityId: targetCityId, isGovernor: false }
            : o
        ),
        battleFormation: null,
      });
      // Make the first attacker officer the new governor
      set(s => ({
        officers: s.officers.map(o =>
          o.id === attackerOfficers[0].id ? { ...o, isGovernor: true } : o
        )
      }));
      // Auto-assign governor for the source city if the governor left
      {
        const officers = get().officers.slice();
        const promoted = autoAssignGovernorInPlace(officers, city.id, state.playerFaction!.id);
        if (promoted) set({ officers });
      }
      get().addLog(i18next.t('logs:military.captureEmptyCity', { city: localizedName(targetCity.name), commander: localizedName(commander.name) }));
      // Check if the losing faction has no more cities
      const loserFactionId = targetCity.factionId || 0;
      const remainingCities = get().cities.filter(c => c.factionId === loserFactionId);
      if (remainingCities.length === 0) {
        const loserFaction = state.factions.find(f => f.id === loserFactionId);
        get().addLog(i18next.t('logs:military.factionDestroyed', { faction: localizedName(loserFaction?.name ?? '') }));
      }
      return;
    }

    const defenderTroopsPerOfficer = defenderOfficers.map(off => {
      const maxForOfficer = off.leadership * 100;
      const equalShare = Math.floor(targetCity.troops / Math.max(1, defenderOfficers.length));
      return Math.min(equalShare, maxForOfficer);
    });
    const defenderTroopsDeployed = defenderTroopsPerOfficer.reduce((sum, t) => sum + t, 0);

    set({
      cities: state.cities.map(c => {
        if (c.id === city.id) return {
          ...c,
          troops: c.troops - totalTroopsToDeploy,
          crossbows: c.crossbows - crossbowsUsed,
          warHorses: c.warHorses - warHorsesUsed
        };
        if (c.id === targetCityId) return { ...c, troops: Math.max(0, c.troops - defenderTroopsDeployed) };
        return c;
      }),
      officers: state.officers.map(o =>
        attackerOfficers.some(ao => ao.id === o.id)
          ? { ...o, stamina: Math.max(0, o.stamina - 30) }
          : o
      ),
      battleFormation: null, // Clear after use
      battleResolved: false,
    });

    // Phase 1.2: Pass city morale and training to battle
    useBattleStore.getState().initBattle(
      state.playerFaction.id,
      targetCity.factionId || 0,
      targetCityId,
      attackerOfficers,
      defenderOfficers,
      city.morale,
      targetCity.morale,
      city.training,
      attackerUnitTypes,
      undefined, // defenderUnitTypes (auto-picked)
      troopsPerOfficer,
      defenderTroopsPerOfficer,
      undefined, // playerFactionId (defaults to attackerId)
      getAttackDirection(city, targetCity)
    );

    set({ phase: 'battle' });
    get().addLog(i18next.t('logs:military.marchToCity', { city: localizedName(targetCity.name) }));
  },

  aiStartBattle: (fromCityId: number, targetCityId: number) => {
    const state = get();
    const city = state.cities.find(c => c.id === fromCityId);
    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!city || !targetCity) return;

    const availableOfficers = state.officers.filter(o => o.cityId === city.id && o.factionId === city.factionId).sort((a, b) => b.leadership - a.leadership);
    if (availableOfficers.length === 0) return;

    const attackerOfficers = availableOfficers.slice(0, 5);

    // Select unit types based on officer skills and available resources
    let crossbowsAvailable = city.crossbows;
    let warHorsesAvailable = city.warHorses;
    const attackerUnitTypes: UnitType[] = attackerOfficers.map(o => {
      if (hasSkill(o, 'cavalry') && warHorsesAvailable >= 1000) {
        warHorsesAvailable -= 1000;
        return 'cavalry';
      }
      if (hasSkill(o, 'archery') && crossbowsAvailable >= 1000) {
        crossbowsAvailable -= 1000;
        return 'archer';
      }
      return 'infantry';
    });
    const crossbowsUsed = city.crossbows - crossbowsAvailable;
    const warHorsesUsed = city.warHorses - warHorsesAvailable;

    // Calculate actual troop allocation per officer
    const troopsPerOfficer = attackerOfficers.map(off => {
      const maxForOfficer = off.leadership * 100;
      const equalShare = Math.floor(city.troops / attackerOfficers.length);
      return Math.min(equalShare, maxForOfficer);
    });
    const totalTroopsToDeploy = troopsPerOfficer.reduce((sum, t) => sum + t, 0);
    const defenderOfficers = state.officers.filter(o => o.cityId === targetCityId && o.factionId === targetCity.factionId).slice(0, 5);
    const defenderTroopsPerOfficer = defenderOfficers.map(off => {
      const maxForOfficer = off.leadership * 100;
      const equalShare = Math.floor(targetCity.troops / Math.max(1, defenderOfficers.length));
      return Math.min(equalShare, maxForOfficer);
    });
    const defenderTroopsDeployed = defenderTroopsPerOfficer.reduce((sum, t) => sum + t, 0);

    set({
      cities: state.cities.map(c => {
        if (c.id === city.id) return {
          ...c,
          troops: Math.max(0, c.troops - totalTroopsToDeploy),
          crossbows: c.crossbows - crossbowsUsed,
          warHorses: c.warHorses - warHorsesUsed
        };
        if (c.id === targetCityId) return { ...c, troops: Math.max(0, c.troops - defenderTroopsDeployed) };
        return c;
      }),
      officers: state.officers.map(o =>
        attackerOfficers.some(ao => ao.id === o.id)
          ? { ...o, stamina: Math.max(0, o.stamina - 30) }
          : o
      ),
      battleResolved: false,
    });

    // AI vs AI: Auto-resolve to avoid state corruption during endTurn (C1)
    if (targetCity.factionId !== state.playerFaction?.id) {
      const attackerPower = attackerOfficers.reduce((s, o) => s + o.leadership + o.war, 0) + (totalTroopsToDeploy / 100);
      const defenderPower = defenderOfficers.reduce((s, o) => s + o.leadership + o.war, 0) + (defenderTroopsDeployed / 100);

      const winnerFactionId = attackerPower > defenderPower ? (city.factionId || 0) : (targetCity.factionId || 0);
      const loserFactionId = winnerFactionId === (city.factionId || 0) ? (targetCity.factionId || 0) : (city.factionId || 0);

      get().addLog(attackerPower > defenderPower ? i18next.t('logs:military.aiBattleWin', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }) : i18next.t('logs:military.aiBattleLose', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }));

      get().resolveBattle(
        winnerFactionId,
        loserFactionId,
        targetCityId,
        [
          ...attackerOfficers.map(o => ({ officerId: o.id, troops: attackerPower > defenderPower ? 2000 : 0, factionId: city.factionId || 0, status: 'active' })),
          ...defenderOfficers.map(o => ({ officerId: o.id, troops: attackerPower > defenderPower ? 0 : 2000, factionId: targetCity.factionId || 0, status: 'active' }))
        ]
      );
      return;
    }

    // AI vs Player: Switch to battle phase
    if (state.phase === 'battle') {
      get().addLog(i18next.t('logs:military.aiBattleFull', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }));
      return;
    }

    useBattleStore.getState().initBattle(
      city.factionId || 0,
      targetCity.factionId || 0,
      targetCityId,
      attackerOfficers,
      defenderOfficers,
      city.morale,
      targetCity.morale,
      city.training,
      attackerUnitTypes,
      undefined, // defenderUnitTypes
      troopsPerOfficer,
      defenderTroopsPerOfficer,
      state.playerFaction?.id ?? targetCity.factionId ?? 0,
      getAttackDirection(city, targetCity)
    );

    set({ phase: 'battle' });
    get().addLog(i18next.t('logs:military.aiMarch', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), from: localizedName(city.name), to: localizedName(targetCity.name) }));
  },

  improveRelations: (targetFactionId: number) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 1000) {
      if (city) get().addLog(i18next.t('logs:error.goldInsufficient', { action: i18next.t('logs:diplomacy.gift_action'), required: 1000, current: city.gold }));
      return;
    }

    // Find messenger (highest politics in city)
    const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    if (officersInCity.length === 0) {
      get().addLog(i18next.t('logs:error.noOfficerAvailable'));
      return;
    }
    const messenger = officersInCity.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

    if (messenger.stamina < 15) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(messenger.name), required: 15 }));
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
          ? { ...o, stamina: o.stamina - 15 }
          : o
      ),
      factions: updatedFactions,
      playerFaction: updatedFactions.find(f => f.id === state.playerFaction?.id) || state.playerFaction
    });

    get().addLog(i18next.t('logs:diplomacy.giftSuccess', { messenger: localizedName(messenger.name), faction: localizedName(targetFaction.name), reduction }));
  },

  formAlliance: (targetFactionId) => {
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
    const messenger = officersInCity.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

    if (messenger.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(messenger.name), required: 20 }));
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
          ? { ...o, stamina: o.stamina - 20 }
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

  requestJointAttack: (allyFactionId, targetCityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city) return;
    const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    if (messengers.length === 0) {
      get().addLog(i18next.t('logs:error.noOfficerAvailable'));
      return;
    }
    const messenger = messengers.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

    if (messenger.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficientGeneric'));
      return;
    }

    let successChance = 50 + messenger.politics / 5;
    if (hasSkill(messenger, 'diplomacy')) successChance += 15;
    const success = Math.random() * 100 < successChance;

    set({
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o)
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

  proposeCeasefire: (targetFactionId) => {
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
    const messenger = messengers.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

    if (messenger.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficientGeneric'));
      return;
    }

    const hostility = state.playerFaction?.relations[targetFactionId] ?? 60;
    const successChance = 30 + messenger.politics / 3 + (100 - hostility) / 5;
    const success = Math.random() * 100 < successChance;

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o)
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

  demandSurrender: (targetFactionId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city) return;
    const messengers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    if (messengers.length === 0) {
      get().addLog(i18next.t('logs:error.noOfficerAvailable'));
      return;
    }
    const messenger = messengers.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));

    if (messenger.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficientGeneric'));
      return;
    }

    // Success based on power ratio. Simplified for now.
    const targetCities = state.cities.filter(c => c.factionId === targetFactionId).length;
    const playerCities = state.cities.filter(c => c.factionId === state.playerFaction?.id).length;
    const success = targetCities === 1 && playerCities > 5 && Math.random() < 0.1;

    set({
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o)
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


  rumor: (targetCityId: number) => {
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
    const messenger = messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

    // Phase 1.1: Check for 流言 skill
    if (!hasSkill(messenger, 'rumor')) {
      get().addLog(i18next.t('logs:error.noSkillRumor', { name: localizedName(messenger.name) }));
      return;
    }

    if (messenger.stamina < 15) {
      get().addLog(i18next.t('logs:error.staminaInsufficient', { name: localizedName(messenger.name), required: 15 }));
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
          ? { ...o, stamina: o.stamina - 15 }
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

  counterEspionage: (_targetCityId, targetOfficerId) => {
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
    const messenger = messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

    if (!hasSkill(messenger, 'provoke')) {
      get().addLog(i18next.t('logs:error.noSkillProvoke', { name: localizedName(messenger.name) }));
      return;
    }
    if (messenger.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficientGeneric'));
      return;
    }

    const targetOfficer = state.officers.find(o => o.id === targetOfficerId);
    if (!targetOfficer) return;

    const successChance = 30 + messenger.intelligence / 3 - targetOfficer.loyalty / 4;
    const success = Math.random() * 100 < successChance;

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 800 } : c),
      officers: state.officers.map(o => {
        if (o.id === messenger.id) return { ...o, stamina: o.stamina - 20 };
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

  inciteRebellion: (targetCityId) => {
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
    const messenger = messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

    if (!hasSkill(messenger, 'tigerTrap')) {
      get().addLog(i18next.t('logs:error.noSkillTigerTrap', { name: localizedName(messenger.name) }));
      return;
    }
    if (messenger.stamina < 25) {
      get().addLog(i18next.t('logs:error.staminaInsufficientGeneric'));
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
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 25 } : o)
    });

    get().addLog(i18next.t('logs:strategy.tigerTrapSuccess', { messenger: localizedName(messenger.name), city: localizedName(targetCity.name) }));
  },

  arson: (targetCityId) => {
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
    const messenger = messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

    if (!hasSkill(messenger, 'arson')) {
      get().addLog(i18next.t('logs:error.noSkillArson', { name: localizedName(messenger.name) }));
      return;
    }
    if (messenger.stamina < 20) {
      get().addLog(i18next.t('logs:error.staminaInsufficientGeneric'));
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
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o)
    });

    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (success) {
      get().addLog(i18next.t('logs:strategy.arsonSuccess', { messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }));
    } else {
      get().addLog(i18next.t('logs:strategy.arsonFail', { messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }));
    }
  },

  spy: (targetCityId) => {
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
    const messenger = messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

    if (!hasSkill(messenger, 'intelligence') && !hasSkill(messenger, 'espionage')) {
      get().addLog(i18next.t('logs:error.noSkillEspionage', { name: localizedName(messenger.name) }));
      return;
    }
    if (messenger.stamina < 15) {
      get().addLog(i18next.t('logs:error.staminaInsufficientGeneric'));
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
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 15 } : o),
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

  gatherIntelligence: (targetCityId) => {
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
    const messenger = messengers.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));

    if (!hasSkill(messenger, 'intelligence')) {
      get().addLog(i18next.t('logs:error.noSkillIntelligence', { name: localizedName(messenger.name) }));
      return;
    }
    if (messenger.stamina < 15) {
      get().addLog(i18next.t('logs:error.staminaInsufficientGeneric'));
      return;
    }

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 300 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 15 } : o),
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

  /**
   * Phase 0.1: Battle Consequences
   * Resolve battle outcomes: transfer city ownership, capture/defeat officers,
   * redistribute surviving troops, and update faction relations.
   * @param winnerFactionId - The faction that won the battle
   * @param loserFactionId - The faction that lost the battle
   * @param cityId - The city being fought over
   * @param battleUnits - Array of battle units with final state
   */
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

    if (recruiter.stamina < 15) return;

    const chance = Math.min(90, 30 + recruiter.charisma - officer.politics);
    const success = Math.random() * 100 < chance;

    set({
      officers: state.officers.map(o => {
        if (o.id === recruiter.id) return { ...o, stamina: o.stamina - 15 };
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

    if (recruiter.stamina < 15) return;

    const chance = 40 + recruiter.charisma - officer.loyalty / 2;
    const success = Math.random() * 100 < chance;

    set({
      officers: state.officers.map(o => {
        if (o.id === recruiter.id) return { ...o, stamina: o.stamina - 15 };
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
    if (recruiter.stamina < 15) return;

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
      officers: state.officers.map(o => o.id === recruiter.id ? { ...o, stamina: o.stamina - 15 } : o)
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
    if (messenger.stamina < 15) return;

    const targetCity = state.cities.find(c => c.id === targetCityId);
    const result = spyingSystem.spy(
      { intelligence: messenger.intelligence, espionage: hasSkill(messenger, 'espionage') },
      targetCityId,
      city.factionId!,
      targetCity?.factionId || null
    );

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 15 } : o),
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
    if (messenger.stamina < 15) return;

    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!targetCity) return;

    const success = (Math.random() * 100) < (messenger.intelligence / 2 + 20);

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 15 } : o),
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

  resolveBattle: (winnerFactionId, loserFactionId, cityId, battleUnits, capturedOfficerIds = []) => {
    const state = get();
    // Guard against double-firing (H8)
    if (state.battleResolved) return;

    const city = state.cities.find(c => c.id === cityId);
    if (!city) return;

    // Get surviving units for winner
    const winnerUnits = battleUnits.filter(u => u.factionId === winnerFactionId && u.troops > 0 && u.status !== 'routed');

    // Calculate surviving troops
    const totalSurvivingTroops = winnerUnits.reduce((sum, u) => sum + u.troops, 0);

    // Get participating officer IDs from battle
    const participatingOfficerIds = new Set(battleUnits.map(u => u.officerId));
    const capturedSet = new Set(capturedOfficerIds);

    // ── RTK IV Flee Logic ──
    // Determine the flee destination for the losing faction ONCE (all officers go to the same city).
    // Priority: adjacent friendly > adjacent unoccupied (claim) > nowhere (captured)
    // RTK IV only allows flee to directly connected (adjacent) cities.
    const adjacentFriendly = state.cities.filter(
      c => c.factionId === loserFactionId && c.id !== cityId && city.adjacentCityIds.includes(c.id)
    );
    const adjacentUnoccupied = state.cities.filter(
      c => c.factionId === null && city.adjacentCityIds.includes(c.id)
    );

    let fleeCity: typeof city | null = null;
    let claimingUnoccupied = false;

    if (adjacentFriendly.length > 0) {
      fleeCity = adjacentFriendly[Math.floor(Math.random() * adjacentFriendly.length)];
    } else if (adjacentUnoccupied.length > 0) {
      fleeCity = adjacentUnoccupied[Math.floor(Math.random() * adjacentUnoccupied.length)];
      claimingUnoccupied = true;
    }
    // If fleeCity is still null, nowhere to flee → all non-captured officers are captured

    // Process officer outcomes
    const winnerOfficerIds = new Set(
      battleUnits.filter(u => u.factionId === winnerFactionId).map(u => u.officerId)
    );

    const updatedOfficers = state.officers.map(o => {
      // If officer was captured during battle (in battleStore) AND belongs to the losing faction
      if (capturedSet.has(o.id) && o.factionId === loserFactionId) {
        get().addLog(i18next.t('logs:postBattle.captured', { name: localizedName(o.name) }));
        // Hold as POW at the battle city (will be processed by winner)
        return { ...o, factionId: -1 as unknown as number, cityId: cityId, isGovernor: false };
      }

      // If officer belongs to the losing faction and was in the battle city
      if (o.cityId === cityId && o.factionId === loserFactionId) {
        if (participatingOfficerIds.has(o.id)) {
          const unit = battleUnits.find(u => u.officerId === o.id);
          if (unit && (unit.troops <= 0 || unit.status === 'routed')) {
            // Officer's unit was destroyed or routed — try to flee
            if (fleeCity) {
              get().addLog(i18next.t('logs:postBattle.fleeToCity', { name: localizedName(o.name), city: localizedName(fleeCity.name) }));
              return { ...o, cityId: fleeCity.id, isGovernor: false };
            } else {
              // Nowhere to flee — captured
              get().addLog(i18next.t('logs:postBattle.nowhereToFlee', { name: localizedName(o.name) }));
              return { ...o, factionId: -1 as unknown as number, cityId: cityId, isGovernor: false };
            }
          }
        } else {
          // Officer was in city but didn't participate in battle
          if (Math.random() < 0.3) {
            // 30% chance to escape
            if (fleeCity) {
              get().addLog(i18next.t('logs:postBattle.abandonCity', { name: localizedName(o.name), city: localizedName(fleeCity.name) }));
              return { ...o, cityId: fleeCity.id, isGovernor: false };
            } else {
              get().addLog(i18next.t('logs:postBattle.abandonNoFlee', { name: localizedName(o.name) }));
              return { ...o, factionId: -1 as unknown as number, cityId: cityId, isGovernor: false };
            }
          } else {
            get().addLog(i18next.t('logs:postBattle.capturedSimple', { name: localizedName(o.name) }));
            return { ...o, factionId: -1 as unknown as number, cityId: cityId, isGovernor: false };
          }
        }
      }

      // Winning attacker officers: relocate to the conquered city
      if (winnerOfficerIds.has(o.id) && city.factionId !== winnerFactionId) {
        return { ...o, cityId: cityId, isGovernor: false };
      }

      return o;
    });

    // Make the first winning officer the governor of the conquered city
    if (city.factionId !== winnerFactionId) {
      const firstWinnerOfficerId = battleUnits.find(u => u.factionId === winnerFactionId)?.officerId;
      if (firstWinnerOfficerId) {
        const idx = updatedOfficers.findIndex(o => o.id === firstWinnerOfficerId);
        if (idx >= 0) {
          updatedOfficers[idx] = { ...updatedOfficers[idx], isGovernor: true };
        }
      }
    }

    // Transfer city ownership or update garrison
    const updatedCities = state.cities.map(c => {
      if (c.id === cityId) {
        if (c.factionId === winnerFactionId) {
          // Defender won - add surviving defending units back to garrison
          const defenderSurviving = battleUnits.filter(u => u.factionId === winnerFactionId && u.troops > 0).reduce((s, u) => s + u.troops, 0);
          return {
            ...c,
            troops: c.troops + Math.floor(defenderSurviving * 0.9),
          };
        } else {
          // Attacker won - replace garrison with winning surviving troops
          return {
            ...c,
            factionId: winnerFactionId,
            troops: Math.floor(totalSurvivingTroops * 0.8),
          };
        }
      }
      // Claim unoccupied city for the fleeing faction
      if (claimingUnoccupied && fleeCity && c.id === fleeCity.id) {
        return { ...c, factionId: loserFactionId };
      }
      return c;
    });

    // Update faction relations - increase hostility significantly
    let updatedFactions = state.factions.map(f => {
      if (f.id === winnerFactionId) {
        const currentHostility = f.relations[loserFactionId] ?? 60;
        return {
          ...f,
          relations: { ...f.relations, [loserFactionId]: Math.min(100, currentHostility + 20) }
        };
      }
      if (f.id === loserFactionId) {
        const currentHostility = f.relations[winnerFactionId] ?? 60;
        return {
          ...f,
          relations: { ...f.relations, [winnerFactionId]: Math.min(100, currentHostility + 20) }
        };
      }
      return f;
    });

    // ── Ruler Succession ──
    // If the losing faction's ruler was captured, the faction needs a new ruler.
    // If no officers remain in the faction, the faction is destroyed.
    const loserFaction = updatedFactions.find(f => f.id === loserFactionId);
    if (loserFaction) {
      const rulerCaptured = updatedOfficers.find(o => o.id === loserFaction.rulerId && o.factionId === -1);
      if (rulerCaptured) {
        const remainingOfficers = updatedOfficers.filter(o => o.factionId === loserFactionId);
        if (remainingOfficers.length > 0) {
          // Pick successor: highest rank, then highest leadership + charisma
          const rankOrder: Record<string, number> = { 'governor': 6, 'viceroy': 5, 'general': 4, 'advisor': 3, 'attendant': 2, 'common': 1 };
          const successor = remainingOfficers.reduce((prev, curr) => {
            const prevScore = (rankOrder[prev.rank] || 0) * 1000 + prev.leadership + prev.charisma;
            const currScore = (rankOrder[curr.rank] || 0) * 1000 + curr.leadership + curr.charisma;
            return currScore > prevScore ? curr : prev;
          });
          updatedFactions = updatedFactions.map(f =>
            f.id === loserFactionId ? { ...f, rulerId: successor.id } : f
          );
          get().addLog(i18next.t('logs:postBattle.rulerCaptured', { ruler: localizedName(rulerCaptured.name), successor: localizedName(successor.name) }));
        } else {
          // No officers left — faction is destroyed
          updatedFactions = updatedFactions.filter(f => f.id !== loserFactionId);
          get().addLog(i18next.t('logs:postBattle.factionDestroyed', { faction: localizedName(loserFaction.name) }));
        }
      }
    }

    // Auto-assign governors for any cities left without one (both factions)
    const affectedFactionIds = new Set([winnerFactionId, loserFactionId]);
    for (const fid of affectedFactionIds) {
      const factionCities = updatedCities.filter(c => c.factionId === fid);
      for (const fc of factionCities) {
        autoAssignGovernorInPlace(updatedOfficers, fc.id, fid);
      }
    }

    set({ cities: updatedCities, officers: updatedOfficers, factions: updatedFactions, battleResolved: true });

    const winnerFaction = state.factions.find(f => f.id === winnerFactionId);
    get().addLog(i18next.t('logs:postBattle.cityFallen', { city: localizedName(city.name), faction: localizedName(winnerFaction?.name ?? ''), troops: Math.floor(totalSurvivingTroops * 0.8) }));
  },

  /**
   * Phase 0.2: Save Game
   * Serialize current game state to localStorage with version tracking.
   * @param slot - Save slot number (1-3, matching RTK IV)
   * @returns boolean indicating success
   */
  saveGame: (slot) => {
    try {
      const state = get();
      const saveData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        phase: state.phase,
        scenario: state.scenario,
        playerFactionId: state.playerFaction?.id,
        cities: state.cities,
        officers: state.officers,
        factions: state.factions,
        year: state.year,
        month: state.month,
        selectedCityId: state.selectedCityId,
        log: state.log,
      };

      localStorage.setItem(`rtk4_save_${slot}`, JSON.stringify(saveData));
      get().addLog(i18next.t('logs:game.savedToSlot', { slot }));
      return true;
    } catch (e) {
      console.error('Save game failed:', e);
      get().addLog(i18next.t('logs:game.saveFailed'));
      return false;
    }
  },

  /**
   * Phase 0.2: Load Game
   * Deserialize game state from localStorage.
   * @param slot - Save slot number (1-3)
   * @returns boolean indicating success
   */
  loadGame: (slot) => {
    try {
      const saveDataStr = localStorage.getItem(`rtk4_save_${slot}`);
      if (!saveDataStr) {
        get().addLog(i18next.t('logs:game.slotNotFound', { slot }));
        return false;
      }

      const saveData = JSON.parse(saveDataStr);

      // Version check for future migrations
      if (!saveData.version) {
        console.warn('Save file has no version');
      }

      // Restore player faction reference
      const playerFaction = saveData.factions.find((f: Faction) => f.id === saveData.playerFactionId);

      set({
        phase: saveData.phase,
        scenario: saveData.scenario,
        playerFaction: playerFaction || null,
        cities: saveData.cities,
        officers: saveData.officers,
        factions: saveData.factions,
        year: saveData.year,
        month: saveData.month,
        selectedCityId: saveData.selectedCityId,
        log: [...saveData.log, `遊戲已從存檔 ${slot} 載入。`],
        activeCommandCategory: null,
        duelState: null,
      });

      return true;
    } catch (e) {
      console.error('Load game failed:', e);
      get().addLog(i18next.t('logs:game.loadFailed'));
      return false;
    }
  },

  /**
   * Phase 0.2: Get Save Slots
   * Retrieve metadata for all save slots.
   * @returns Array of save slot metadata
   */
  getSaveSlots: () => {
    const slots = [];
    for (let i = 1; i <= 3; i++) {
      const saveDataStr = localStorage.getItem(`rtk4_save_${i}`);
      if (saveDataStr) {
        try {
          const saveData = JSON.parse(saveDataStr);
          slots.push({
            slot: i,
            date: saveData.timestamp,
            version: saveData.version || 'unknown',
          });
        } catch {
          slots.push({ slot: i, date: null, version: null });
        }
      } else {
        slots.push({ slot: i, date: null, version: null });
      }
    }
    return slots;
  },

  /**
   * Phase 0.2: Delete Save
   * Remove a save slot from localStorage.
   * @param slot - Save slot number (1-3)
   * @returns boolean indicating success
   */
  deleteSave: (slot) => {
    try {
      localStorage.removeItem(`rtk4_save_${slot}`);
      get().addLog(i18next.t('logs:game.slotDeleted', { slot }));
      return true;
    } catch (e) {
      console.error('Delete save failed:', e);
      return false;
    }
  },

  /**
   * Phase 0.3: Check Victory/Defeat Conditions
   * Determines if the game has reached a victory or defeat state.
   * Checks:
   * - Victory: One faction controls all cities
   * - Defeat: Player's faction has no cities
   * @returns Victory/defeat info or null if game continues
   */
  checkVictoryCondition: () => {
    const state = get();
    if (!state.playerFaction) return null;

    // Count cities per faction
    const factionCityCounts = new Map<number, number>();
    state.cities.forEach(city => {
      if (city.factionId !== null) {
        const count = factionCityCounts.get(city.factionId) || 0;
        factionCityCounts.set(city.factionId, count + 1);
      }
    });

    const totalCities = state.cities.length;
    const playerCityCount = factionCityCounts.get(state.playerFaction.id) || 0;

    // Check player defeat (no cities)
    if (playerCityCount === 0) {
      return {
        type: 'defeat' as const,
        message: '勢力覆滅！所有城池皆已失陷...',
      };
    }

    // Check victory (player controls all cities)
    if (playerCityCount === totalCities) {
      return {
        type: 'victory' as const,
        message: `天下統一！${state.playerFaction.name} 一統江山！`,
      };
    }

    // Check if any AI faction has won (for informational purposes)
    for (const [factionId, count] of factionCityCounts.entries()) {
      if (count === totalCities && factionId !== state.playerFaction.id) {
        return {
          type: 'defeat' as const,
          message: `${state.factions.find(f => f.id === factionId)?.name || '敵軍'} 已統一天下...`,
        };
      }
    }

    return null;
  },
}));