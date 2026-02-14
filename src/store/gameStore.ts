import { create } from 'zustand';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { GamePhase, Scenario, Faction, City, Officer, CommandCategory, GameSettings } from '../types';
import type { UnitType } from '../types/battle';
import type { AIDecision } from '../ai/types';

// ── Fog-of-War View Types ──
// These are the shapes returned by store query functions.
// Null fields mean "hidden by fog of war."

/** Fog-gated city view. Null numeric fields = unrevealed. */
export interface CityView {
  id: number;
  name: string;
  factionId: number | null;
  factionName: string | null;
  factionColor: string | null;
  isOwn: boolean;
  isRevealed: boolean;
  /** Null when unrevealed */
  population: number | null;
  troops: number | null;
  gold: number | null;
  food: number | null;
  commerce: number | null;
  agriculture: number | null;
  defense: number | null;
  floodControl: number | null;
  technology: number | null;
  peopleLoyalty: number | null;
  morale: number | null;
  training: number | null;
  taxRate: string | null;
  /** Weapons: only for own cities */
  crossbows: number | null;
  warHorses: number | null;
  batteringRams: number | null;
  catapults: number | null;
  /** Affiliated officers (empty array if unrevealed) */
  officers: OfficerView[];
  /** Unaffiliated officers: only for own cities */
  unaffiliated: OfficerView[];
  /** POWs: only for own cities */
  pows: OfficerView[];
}

/** Fog-gated officer view. Null fields = hidden by fog of war. */
export interface OfficerView {
  id: number;
  name: string;
  portraitId: number;
  /** Base stats: always visible (encyclopedia / public knowledge) */
  leadership: number;
  war: number;
  intelligence: number;
  politics: number;
  charisma: number;
  /** Skills: always visible */
  skills: string[];
  /** Age: always visible */
  age: number;
  /** Relationships: always visible */
  relationships: Officer['relationships'];
  /** Birth year: always visible */
  birthYear: number;
  /** Governor flag: visible if own or revealed */
  isGovernor: boolean | null;
  /** Rank: visible if own or in a revealed city */
  rank: string | null;
  /** City name: visible if own or in a revealed city */
  cityName: string | null;
  /** City id: visible if own or in a revealed city */
  cityId: number | null;
  /** Faction affiliation description: visible if own or in a revealed city */
  affiliation: string | null;
  /** Acted this turn: visible if own or in a revealed city */
  acted: boolean | null;
  /** Loyalty: only for own faction officers */
  loyalty: number | null;
  /** Treasure: visible if own or in a revealed city */
  treasureId: number | null;
}

/** Fog-gated neighbor summary. */
export interface NeighborSummaryEntry {
  cityId: number;
  cityName: string;
  factionId: number | null;
  factionName: string | null;
  /** Troops: null if not revealed */
  troops: number | null;
  /** Officer count: null if not revealed */
  officerCount: number | null;
}

/** Fog-gated faction summary. */
export interface FactionSummary {
  id: number;
  name: string;
  rulerName: string | null;
  color: string;
  cityNames: string[];
  /** Officer count: only from own + revealed cities; null if none revealed */
  officerCount: number | null;
  /** Total troops: only from own + revealed cities; null if none revealed */
  totalTroops: number | null;
  /** Hostility toward player: always visible */
  hostility: number | null;
  /** Alliance with player */
  isAlly: boolean;
}

// Domain action slices
import { createDomesticActions } from './domesticActions';
import { createPersonnelActions } from './personnelActions';
import { createMilitaryActions } from './militaryActions';
import { createDiplomacyActions } from './diplomacyActions';
import { createStrategyActions } from './strategyActions';
import { createTurnActions } from './turnActions';
import { createSaveLoadActions } from './saveLoadActions';

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

  // ── Core Actions ──
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
  isCityRevealed: (cityId: number) => boolean;
  /** Returns a fog-gated view of a city. Unrevealed cities have numeric fields set to null. */
  getCityView: (cityId: number) => CityView | null;
  /** Returns a fog-gated view of an officer. Hidden fields are null. */
  getOfficerView: (officerId: number) => OfficerView | null;
  /** Returns fog-gated neighbor summaries for a city's adjacent cities. */
  getNeighborSummary: (cityId: number) => NeighborSummaryEntry[];
  /** Returns fog-gated faction overviews (only aggregating from own + revealed cities). */
  getFactionSummaries: () => FactionSummary[];
  checkVictoryCondition: () => { type: 'victory' | 'defeat' | 'ongoing'; message: string } | null;

  // ── Domestic Actions ──
  setTaxRate: (cityId: number, rate: 'low' | 'medium' | 'high') => void;
  promoteOfficer: (officerId: number, rank: import('../types').OfficerRank) => void;
  developCommerce: (cityId: number, officerId?: number) => void;
  developAgriculture: (cityId: number, officerId?: number) => void;
  reinforceDefense: (cityId: number, officerId?: number) => void;
  developFloodControl: (cityId: number, officerId?: number) => void;
  developTechnology: (cityId: number, officerId?: number) => void;
  trainTroops: (cityId: number, officerId?: number) => void;
  manufacture: (cityId: number, weaponType: 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults', officerId?: number) => void;
  disasterRelief: (cityId: number, officerId?: number) => void;

  // ── Personnel Actions ──
  recruitOfficer: (officerId: number, recruiterId?: number) => void;
  searchOfficer: (cityId: number, officerId?: number) => void;
  recruitPOW: (officerId: number, recruiterId?: number) => void;
  rewardOfficer: (officerId: number, type: 'gold' | 'treasure', amount?: number) => void;
  executeOfficer: (officerId: number) => void;
  dismissOfficer: (officerId: number) => void;
  appointGovernor: (cityId: number, officerId: number) => void;
  appointAdvisor: (officerId: number) => void;
  draftTroops: (cityId: number, amount: number, officerId?: number) => void;
  transport: (fromCityId: number, toCityId: number, resources: { gold?: number; food?: number; troops?: number }, officerId?: number) => void;
  transferOfficer: (officerId: number, targetCityId: number) => void;

  // ── Military Actions ──
  setBattleFormation: (formation: { officerIds: number[]; unitTypes: UnitType[]; troops?: number[] } | null) => void;
  startDuel: () => void;
  initMidBattleDuel: (p1: Officer, p2: Officer) => void;
  duelAction: (action: 'attack' | 'heavy' | 'defend' | 'flee') => void;
  endDuel: () => void;
  startBattle: (targetCityId: number) => void;
  aiStartBattle: (fromCityId: number, targetCityId: number) => void;
  retreat: () => void;
  resolveBattle: (winnerFactionId: number, loserFactionId: number, cityId: number, battleUnits: { officerId: number; troops: number; factionId: number; status: string }[], capturedOfficerIds?: number[], routedOfficerIds?: number[]) => void;

  // ── Diplomacy Actions ──
  improveRelations: (targetFactionId: number, officerId?: number) => void;
  formAlliance: (targetFactionId: number, officerId?: number) => void;
  requestJointAttack: (allyFactionId: number, targetCityId: number, officerId?: number) => void;
  proposeCeasefire: (targetFactionId: number, officerId?: number) => void;
  demandSurrender: (targetFactionId: number, officerId?: number) => void;
  breakAlliance: (targetFactionId: number) => void;
  exchangeHostage: (officerId: number, targetFactionId: number) => void;

  // ── Strategy Actions ──
  rumor: (targetCityId: number, officerId?: number) => void;
  counterEspionage: (targetCityId: number, targetOfficerId: number, officerId?: number) => void;
  inciteRebellion: (targetCityId: number, officerId?: number) => void;
  arson: (targetCityId: number, officerId?: number) => void;
  spy: (targetCityId: number, officerId?: number) => void;
  gatherIntelligence: (targetCityId: number, officerId?: number) => void;

  // ── Turn/AI Actions ──
  endTurn: () => void;
  applyAIDecisions: (decisions: AIDecision[]) => void;
  aiFormAlliance: (fromCityId: number, targetFactionId: number) => void;
  aiImproveRelations: (fromCityId: number, targetFactionId: number) => void;
  aiRecruitOfficer: (cityId: number, officerId: number) => void;
  aiRecruitPOW: (cityId: number, officerId: number) => void;
  aiSearchOfficer: (cityId: number) => void;
  aiSpy: (cityId: number, targetCityId: number) => void;
  aiRumor: (cityId: number, targetCityId: number) => void;

  // ── Save/Load Actions ──
  saveGame: (slot: number) => boolean;
  loadGame: (slot: number) => boolean;
  getSaveSlots: () => { slot: number; date: string | null; version: string | null }[];
  deleteSave: (slot: number) => boolean;
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
  // ── Initial State ──
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

  // ── Core Actions ──
  setPhase: (phase) => set({ phase }),

  selectScenario: (scenario) => {
    const initializedFactions = scenario.factions.map(f => ({
      ...f,
      relations: f.relations || scenario.factions.reduce((acc, other) => {
        if (other.id !== f.id) acc[other.id] = 60;
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

  isCityRevealed: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return false;
    if (!state.playerFaction) return true; // Spectator mode: show all
    // Rule 1: Own cities are always revealed
    if (city.factionId === state.playerFaction.id) return true;
    // Rule 2: Spied/Revealed cities (with TTL)
    const revealInfo = state.revealedCities[cityId];
    if (revealInfo) {
      if (state.year < revealInfo.untilYear) return true;
      if (state.year === revealInfo.untilYear && state.month <= revealInfo.untilMonth) return true;
    }
    // RTK IV: adjacent cities are NOT revealed without spying
    return false;
  },

  getOfficerView: (officerId) => {
    const state = get();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return null;
    const playerFactionId = state.playerFaction?.id ?? null;
    const isOwn = officer.factionId === playerFactionId;
    const city = state.cities.find(c => c.id === officer.cityId);
    const cityRevealed = city ? state.isCityRevealed(city.id) : false;
    const locationVisible = isOwn || cityRevealed;
    const faction = officer.factionId !== null && officer.factionId !== -1
      ? state.factions.find(f => f.id === officer.factionId) : null;
    const affiliation = officer.factionId === -1 ? 'POW'
      : officer.factionId === null ? '在野'
        : faction?.name ?? '?';

    return {
      id: officer.id,
      name: officer.name,
      portraitId: officer.portraitId,
      leadership: officer.leadership,
      war: officer.war,
      intelligence: officer.intelligence,
      politics: officer.politics,
      charisma: officer.charisma,
      skills: [...officer.skills],
      age: state.year - officer.birthYear,
      relationships: [...officer.relationships],
      birthYear: officer.birthYear,
      isGovernor: locationVisible ? officer.isGovernor : null,
      rank: locationVisible ? officer.rank : null,
      cityName: locationVisible ? (city?.name ?? null) : null,
      cityId: locationVisible ? officer.cityId : null,
      affiliation: locationVisible ? affiliation : null,
      acted: locationVisible ? officer.acted : null,
      loyalty: isOwn ? officer.loyalty : null,
      treasureId: locationVisible ? (officer.treasureId ?? null) : null,
    };
  },

  getCityView: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return null;
    const playerFactionId = state.playerFaction?.id ?? null;
    const isOwn = city.factionId !== null && city.factionId === playerFactionId;
    const isRevealed = state.isCityRevealed(cityId);
    const faction = city.factionId !== null
      ? state.factions.find(f => f.id === city.factionId) : null;

    // Officers visible in this city
    const cityOfficers = state.officers.filter(o => o.cityId === city.id);
    const affiliated = cityOfficers.filter(o => o.factionId === city.factionId);
    const unaffiliated = cityOfficers.filter(o => o.factionId === null);
    const pows = cityOfficers.filter(o => o.factionId === -1);

    return {
      id: city.id,
      name: city.name,
      factionId: city.factionId,
      factionName: faction?.name ?? null,
      factionColor: faction?.color ?? null,
      isOwn,
      isRevealed,
      // Stats: shown if revealed, null otherwise
      population: isRevealed ? city.population : null,
      troops: isRevealed ? city.troops : null,
      gold: isRevealed ? city.gold : null,
      food: isRevealed ? city.food : null,
      commerce: isRevealed ? city.commerce : null,
      agriculture: isRevealed ? city.agriculture : null,
      defense: isRevealed ? city.defense : null,
      floodControl: isRevealed ? city.floodControl : null,
      technology: isRevealed ? city.technology : null,
      peopleLoyalty: isRevealed ? city.peopleLoyalty : null,
      morale: isRevealed ? city.morale : null,
      training: isRevealed ? city.training : null,
      taxRate: isRevealed ? city.taxRate : null,
      // Weapons: own cities only
      crossbows: isOwn ? city.crossbows : null,
      warHorses: isOwn ? city.warHorses : null,
      batteringRams: isOwn ? city.batteringRams : null,
      catapults: isOwn ? city.catapults : null,
      // Officers: affiliated visible if revealed, others only if own
      officers: isRevealed
        ? affiliated.map(o => state.getOfficerView(o.id)!).filter(Boolean)
        : [],
      unaffiliated: isOwn
        ? unaffiliated.map(o => state.getOfficerView(o.id)!).filter(Boolean)
        : [],
      pows: isOwn
        ? pows.map(o => state.getOfficerView(o.id)!).filter(Boolean)
        : [],
    };
  },

  getNeighborSummary: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return [];
    return city.adjacentCityIds.map(adjId => {
      const neighbor = state.cities.find(c => c.id === adjId);
      if (!neighbor) return null;
      const nFaction = neighbor.factionId !== null
        ? state.factions.find(f => f.id === neighbor.factionId) : null;
      const nRevealed = state.isCityRevealed(adjId);
      const nOfficerCount = nRevealed
        ? state.officers.filter(o => o.cityId === adjId && o.factionId === neighbor.factionId).length
        : null;
      return {
        cityId: adjId,
        cityName: neighbor.name,
        factionId: neighbor.factionId,
        factionName: nFaction?.name ?? null,
        troops: nRevealed ? neighbor.troops : null,
        officerCount: nRevealed ? nOfficerCount : null,
      };
    }).filter(Boolean) as NeighborSummaryEntry[];
  },

  getFactionSummaries: () => {
    const state = get();
    const playerFactionId = state.playerFaction?.id ?? null;
    return state.factions.map(f => {
      const factionCities = state.cities.filter(c => c.factionId === f.id);
      const ruler = state.officers.find(o => o.id === f.rulerId);
      // Only aggregate from own + revealed cities
      const revealedCities = factionCities.filter(c => state.isCityRevealed(c.id));
      const hasRevealedData = revealedCities.length > 0;
      const totalTroops = hasRevealedData
        ? revealedCities.reduce((s, c) => s + c.troops, 0) : null;
      const officerCount = hasRevealedData
        ? state.officers.filter(o => o.factionId === f.id && revealedCities.some(c => c.id === o.cityId)).length
        : null;
      const hostility = (playerFactionId !== null && f.id !== playerFactionId)
        ? (f.relations[playerFactionId] ?? 60) : null;
      const isAlly = playerFactionId !== null
        ? (f.allies?.includes(playerFactionId) ?? false) : false;
      return {
        id: f.id,
        name: f.name,
        rulerName: ruler?.name ?? null,
        color: f.color,
        cityNames: factionCities.map(c => c.name),
        officerCount,
        totalTroops,
        hostility,
        isAlly,
      };
    });
  },

  checkVictoryCondition: () => {
    const state = get();
    if (!state.playerFaction) return null;
    const factionCityCounts = new Map<number, number>();
    state.cities.forEach(city => {
      if (city.factionId !== null) {
        const count = factionCityCounts.get(city.factionId) || 0;
        factionCityCounts.set(city.factionId, count + 1);
      }
    });
    const totalCities = state.cities.length;
    const playerCityCount = factionCityCounts.get(state.playerFaction.id) || 0;
    if (playerCityCount === 0) {
      return { type: 'defeat' as const, message: '勢力覆滅！所有城池皆已失陷...' };
    }
    if (playerCityCount === totalCities) {
      return { type: 'victory' as const, message: `天下統一！${state.playerFaction.name} 一統江山！` };
    }
    for (const [factionId, count] of factionCityCounts.entries()) {
      if (count === totalCities && factionId !== state.playerFaction.id) {
        return { type: 'defeat' as const, message: `${state.factions.find(f => f.id === factionId)?.name || '敵軍'} 已統一天下...` };
      }
    }
    return null;
  },

  // ── Domain Action Slices ──
  ...createDomesticActions(set, get),
  ...createPersonnelActions(set, get),
  ...createMilitaryActions(set, get),
  ...createDiplomacyActions(set, get),
  ...createStrategyActions(set, get),
  ...createTurnActions(set, get),
  ...createSaveLoadActions(set, get),
}));
