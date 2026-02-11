import { create } from 'zustand';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { GamePhase, Scenario, Faction, City, Officer, CommandCategory, GameSettings } from '../types';
import type { UnitType } from '../types/battle';
import type { AIDecision } from '../ai/types';

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
  transport: (fromCityId: number, toCityId: number, resource: 'gold' | 'food' | 'troops', amount: number) => void;
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
  improveRelations: (targetFactionId: number) => void;
  formAlliance: (targetFactionId: number) => void;
  requestJointAttack: (allyFactionId: number, targetCityId: number) => void;
  proposeCeasefire: (targetFactionId: number) => void;
  demandSurrender: (targetFactionId: number) => void;
  breakAlliance: (targetFactionId: number) => void;
  exchangeHostage: (officerId: number, targetFactionId: number) => void;

  // ── Strategy Actions ──
  rumor: (targetCityId: number) => void;
  counterEspionage: (targetCityId: number, targetOfficerId: number) => void;
  inciteRebellion: (targetCityId: number) => void;
  arson: (targetCityId: number) => void;
  spy: (targetCityId: number) => void;
  gatherIntelligence: (targetCityId: number) => void;

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
    if (!state.playerFaction) return true;
    if (city.factionId === state.playerFaction.id) return true;
    const playerCities = state.cities.filter(c => c.factionId === state.playerFaction?.id);
    const isAdjacent = playerCities.some(pc => pc.adjacentCityIds.includes(cityId));
    if (isAdjacent) return true;
    const revealInfo = state.revealedCities[cityId];
    if (revealInfo) {
      if (state.year < revealInfo.untilYear) return true;
      if (state.year === revealInfo.untilYear && state.month <= revealInfo.untilMonth) return true;
    }
    return false;
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
