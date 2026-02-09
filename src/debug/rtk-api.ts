import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { scenarios } from '../data/scenarios';
import type { GamePhase, GameSettings, Officer, OfficerRank, Faction, City, Scenario } from '../types';
import type { UnitType, BattleState } from '../types/battle';
import { getMovementRange, getAttackRange, type BattleTactic } from '../utils/unitTypes';
import { getMoveRange } from '../utils/pathfinding';

interface Result {
  ok: boolean;
  error?: string;
  data?: unknown;
}

const POW_FACTION_ID = -1 as unknown as number;

/**
 * RTK Automation API implementation
 * v2.1 (2026-02-09) - Addressing Review Feedback
 */
export const rtkApi = {
  // ─── Lifecycle ───────────────────────────────────────
  phase: (): GamePhase => useGameStore.getState().phase,

  newGame(scenarioId: number, factionId: number, settings?: Partial<GameSettings>): Result {
    const { selectScenario, selectFaction, setGameSettings, confirmSettings } = useGameStore.getState();
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return { ok: false, error: `Scenario ${scenarioId} not found` };
    
    selectScenario(scenario);
    
    const storeFactions = useGameStore.getState().factions;
    if (!storeFactions.find(f => f.id === factionId)) {
        return { ok: false, error: `Faction ${factionId} not found in scenario ${scenarioId}` };
    }
    
    selectFaction(factionId);
    if (settings) setGameSettings(settings);
    confirmSettings();
    
    return { ok: true, data: { year: scenario.year, month: 1 } };
  },

  // ─── Queries ────────────────────────────────────────
  query: {
    phase: (): GamePhase => useGameStore.getState().phase,
    date: () => ({ year: useGameStore.getState().year, month: useGameStore.getState().month }),
    playerFaction: () => useGameStore.getState().playerFaction,
    factions: () => useGameStore.getState().factions,
    cities: () => useGameStore.getState().cities,
    city: (id: number) => useGameStore.getState().cities.find(c => c.id === id) || null,
    myCities: () => {
      const state = useGameStore.getState();
      return state.cities.filter(c => c.factionId === state.playerFaction?.id);
    },
    factionCities: (factionId: number) => useGameStore.getState().cities.filter(c => c.factionId === factionId),
    officers: () => useGameStore.getState().officers,
    officer: (id: number) => useGameStore.getState().officers.find(o => o.id === id) || null,
    cityOfficers: (cityId: number) => useGameStore.getState().officers.filter(o => o.cityId === cityId),
    myOfficers: () => {
      const state = useGameStore.getState();
      return state.officers.filter(o => o.factionId === state.playerFaction?.id);
    },
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
  },

  // ─── Commands ───────────────────────────────────────
  selectCity(cityId: number): Result {
    const state = useGameStore.getState();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: `City ${cityId} not found` };
    state.selectCity(cityId);
    return { ok: true };
  },

  addLog(message: string): Result {
    useGameStore.getState().addLog(message);
    return { ok: true };
  },

  // Domestic
  developCommerce(cityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    if (city.factionId !== state.playerFaction?.id) return { ok: false, error: 'Not your city' };
    const commerceBefore = city.commerce;
    state.developCommerce(cityId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.commerce === commerceBefore) return { ok: false, error: 'Action failed (check gold/governor/stamina)' };
    return { ok: true, data: { before: commerceBefore, after: after.commerce } };
  },

  developAgriculture(cityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    if (city.factionId !== state.playerFaction?.id) return { ok: false, error: 'Not your city' };
    const agricultureBefore = city.agriculture;
    state.developAgriculture(cityId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.agriculture === agricultureBefore) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before: agricultureBefore, after: after.agriculture } };
  },

  reinforceDefense(cityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city.defense;
    state.reinforceDefense(cityId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.defense === before) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before, after: after.defense } };
  },

  developFloodControl(cityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city.floodControl;
    state.developFloodControl(cityId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.floodControl === before) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before, after: after.floodControl } };
  },

  developTechnology(cityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city.technology;
    state.developTechnology(cityId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.technology === before) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before, after: after.technology } };
  },

  trainTroops(cityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city.training;
    state.trainTroops(cityId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.training === before) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before, after: after.training } };
  },

  manufacture(cityId: number, weaponType: 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults'): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city[weaponType];
    state.manufacture(cityId, weaponType);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after[weaponType] === before) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before, after: after[weaponType] } };
  },

  disasterRelief(cityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city.peopleLoyalty;
    state.disasterRelief(cityId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.peopleLoyalty === before) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before, after: after.peopleLoyalty } };
  },

  setTaxRate(cityId: number, rate: 'low' | 'medium' | 'high'): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.setTaxRate(cityId, rate);
    return { ok: true };
  },

  // Personnel
  recruitOfficer(officerId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return { ok: false, error: 'Officer not found' };
    state.recruitOfficer(officerId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.factionId === state.playerFaction?.id) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  searchOfficer(cityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.searchOfficer(cityId);
    return { ok: true };
  },

  recruitPOW(officerId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return { ok: false, error: 'Officer not found' };
    if (officer.factionId !== POW_FACTION_ID) return { ok: false, error: 'Not a POW' };
    state.recruitPOW(officerId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.factionId === state.playerFaction?.id) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  rewardOfficer(officerId: number, type: 'gold' | 'treasure', amount?: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.factionId !== state.playerFaction?.id) return { ok: false, error: 'Not your officer' };
    const loyaltyBefore = officer.loyalty;
    state.rewardOfficer(officerId, type, amount);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.loyalty > loyaltyBefore) return { ok: true, data: { before: loyaltyBefore, after: after.loyalty } };
    return { ok: false, error: 'Action failed (check gold/treasure)' };
  },

  executeOfficer(officerId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return { ok: false, error: 'Officer not found' };
    state.executeOfficer(officerId);
    if (!useGameStore.getState().officers.find(o => o.id === officerId)) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  dismissOfficer(officerId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.factionId !== state.playerFaction?.id) return { ok: false, error: 'Not your officer' };
    state.dismissOfficer(officerId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.factionId === null) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  appointGovernor(cityId: number, officerId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.appointGovernor(cityId, officerId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.isGovernor) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  appointAdvisor(officerId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.appointAdvisor(officerId);
    if (useGameStore.getState().playerFaction?.advisorId === officerId) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  promoteOfficer(officerId: number, rank: OfficerRank): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.promoteOfficer(officerId, rank);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.rank === rank) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  // Military
  draftTroops(cityId: number, amount: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city.troops;
    state.draftTroops(cityId, amount);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.troops > before) return { ok: true, data: { before, after: after.troops } };
    return { ok: false, error: 'Action failed (check gold/population/stamina)' };
  },

  transport(fromCityId: number, toCityId: number, resource: 'gold' | 'food' | 'troops', amount: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const fromCity = state.cities.find(c => c.id === fromCityId);
    if (!fromCity) return { ok: false, error: 'Origin city not found' };
    if (fromCity[resource] < amount) return { ok: false, error: `Insufficient ${resource}` };
    state.transport(fromCityId, toCityId, resource, amount);
    return { ok: true };
  },

  transferOfficer(officerId: number, targetCityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.transferOfficer(officerId, targetCityId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.cityId === targetCityId) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  setBattleFormation(formation: { officerIds: number[]; unitTypes: UnitType[] } | null): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.setBattleFormation(formation);
    return { ok: true };
  },

  startBattle(targetCityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.startBattle(targetCityId);
    if (useGameStore.getState().phase === 'battle') return { ok: true };
    return { ok: false, error: 'Battle failed to start (check requirements/stamina)' };
  },

  retreat(): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
    state.retreat();
    if (useGameStore.getState().phase === 'playing') return { ok: true };
    return { ok: false, error: 'Retreat failed' };
  },

  // Duel
  startDuel(): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.startDuel();
    if (useGameStore.getState().phase === 'duel') return { ok: true };
    return { ok: false, error: 'Failed to start duel (check adjacency/enemy officers)' };
  },

  duelAction(action: 'attack' | 'heavy' | 'defend' | 'flee'): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'duel') return { ok: false, error: 'Not in duel phase' };
    state.duelAction(action);
    return { ok: true };
  },

  endDuel(): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'duel') return { ok: false, error: 'Not in duel phase' };
    state.endDuel();
    return { ok: true };
  },

  // Diplomacy
  improveRelations(targetFactionId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const player = state.playerFaction;
    if (!player) return { ok: false, error: 'No player faction' };
    const hostilityBefore = player.relations[targetFactionId] ?? 60;
    state.improveRelations(targetFactionId);
    const hostilityAfter = useGameStore.getState().playerFaction?.relations[targetFactionId] ?? 60;
    if (hostilityAfter < hostilityBefore) return { ok: true, data: { before: hostilityBefore, after: hostilityAfter } };
    return { ok: false, error: 'Action failed (check gold/stamina)' };
  },

  formAlliance(targetFactionId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const alliesBefore = state.playerFaction?.allies || [];
    state.formAlliance(targetFactionId);
    const after = useGameStore.getState().playerFaction;
    if (after?.allies.includes(targetFactionId) && !alliesBefore.includes(targetFactionId)) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  requestJointAttack(allyFactionId: number, targetCityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.requestJointAttack(allyFactionId, targetCityId);
    return { ok: true };
  },

  proposeCeasefire(targetFactionId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const ceasefiresBefore = state.playerFaction?.ceasefires.length || 0;
    state.proposeCeasefire(targetFactionId);
    const after = useGameStore.getState().playerFaction;
    if ((after?.ceasefires.length || 0) > ceasefiresBefore) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  demandSurrender(targetFactionId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.demandSurrender(targetFactionId);
    const after = useGameStore.getState().factions;
    if (!after.find(f => f.id === targetFactionId)) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  breakAlliance(targetFactionId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.breakAlliance(targetFactionId);
    if (!useGameStore.getState().playerFaction?.allies.includes(targetFactionId)) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  exchangeHostage(officerId: number, targetFactionId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.exchangeHostage(officerId, targetFactionId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.cityId === -2) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  // Strategy
  rumor(targetCityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!targetCity) return { ok: false, error: 'City not found' };
    const loyaltyBefore = targetCity.peopleLoyalty;
    state.rumor(targetCityId);
    const after = useGameStore.getState().cities.find(c => c.id === targetCityId)!;
    if (after.peopleLoyalty < loyaltyBefore) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  counterEspionage(targetCityId: number, targetOfficerId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    const officer = state.officers.find(o => o.id === targetOfficerId);
    if (!officer) return { ok: false, error: 'Officer not found' };
    const loyaltyBefore = officer.loyalty;
    state.counterEspionage(targetCityId, targetOfficerId);
    const after = useGameStore.getState().officers.find(o => o.id === targetOfficerId)!;
    if (after.loyalty < loyaltyBefore) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  inciteRebellion(targetCityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.inciteRebellion(targetCityId);
    return { ok: true };
  },

  arson(targetCityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.arson(targetCityId);
    return { ok: true };
  },

  spy(targetCityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.spy(targetCityId);
    if (useGameStore.getState().isCityRevealed(targetCityId)) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  gatherIntelligence(targetCityId: number): Result {
    const state = useGameStore.getState();
    if (state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    state.gatherIntelligence(targetCityId);
    if (useGameStore.getState().isCityRevealed(targetCityId)) return { ok: true };
    return { ok: false, error: 'Action failed' };
  },

  popEvent(): Result {
    useGameStore.getState().popEvent();
    return { ok: true };
  },

  endTurn(): Result {
    const { month } = useGameStore.getState();
    useGameStore.getState().endTurn();
    const after = useGameStore.getState();
    return { ok: true, data: { year: after.year, month: after.month, advanced: after.month !== month } };
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
      if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
      const battle = useBattleStore.getState();
      const unit = battle.units.find(u => u.id === unitId);
      if (!unit) return { ok: false, error: 'Unit not found' };
      const posBefore = { x: unit.x, y: unit.y };
      battle.moveUnit(unitId, q, r);
      const after = useBattleStore.getState().units.find(u => u.id === unitId)!;
      if (after.x === posBefore.x && after.y === posBefore.y) return { ok: false, error: 'Move failed' };
      return { ok: true };
    },
    attack(attackerUnitId: string, targetUnitId: string): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
      const battle = useBattleStore.getState();
      const target = battle.units.find(u => u.id === targetUnitId);
      if (!target) return { ok: false, error: 'Target not found' };
      const troopsBefore = target.troops;
      battle.attackUnit(attackerUnitId, targetUnitId);
      const after = useBattleStore.getState().units.find(u => u.id === targetUnitId)!;
      if (after.troops < troopsBefore || after.troops === 0) return { ok: true };
      return { ok: false, error: 'Attack failed' };
    },
    attackGate(attackerUnitId: string, gateQ: number, gateR: number): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
      const battle = useBattleStore.getState();
      const gate = battle.gates.find(g => g.q === gateQ && g.r === gateR);
      if (!gate) return { ok: false, error: 'Gate not found' };
      const hpBefore = gate.hp;
      battle.attackGate(attackerUnitId, gateQ, gateR);
      const after = useBattleStore.getState().gates.find(g => g.q === gateQ && g.r === gateR);
      if (!after || after.hp < hpBefore) return { ok: true };
      return { ok: false, error: 'Attack failed' };
    },
    executeTactic(unitId: string, tactic: BattleTactic, targetId?: string, targetHex?: { q: number; r: number }): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
      useBattleStore.getState().executeTactic(unitId, tactic, targetId, targetHex);
      return { ok: true };
    },
    initDuel(myOfficer: Officer, enemyOfficer: Officer): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
      useGameStore.getState().initMidBattleDuel(myOfficer, enemyOfficer);
      return { ok: true };
    },
    wait(unitId: string): Result {
      const state = useGameStore.getState();
      if (state.phase !== 'battle') return { ok: false, error: 'Not in battle phase' };
      useBattleStore.getState().endUnitTurn(unitId);
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
    return { ok: success };
  },
  load(slot: number): Result {
    const success = useGameStore.getState().loadGame(slot);
    return { ok: success };
  },
  deleteSave(slot: number): Result {
    useGameStore.getState().deleteSave(slot);
    return { ok: true };
  },

  // Utilities
  status(): void {
    const state = useGameStore.getState();
    const battle = useBattleStore.getState();
    
    console.log(`═══ RTK Status ═══`);
    console.log(`Phase: ${state.phase} | ${state.year}年 ${state.month}月`);
    if (state.playerFaction) {
        console.log(`Faction: ${state.playerFaction.name} (id=${state.playerFaction.id})`);
        const myCities = state.cities.filter(c => c.factionId === state.playerFaction?.id);
        const myOfficers = state.officers.filter(o => o.factionId === state.playerFaction?.id);
        console.log(`Cities (${myCities.length}): ${myCities.map(c => c.name).join(', ')}`);
        console.log(`Gold: ${myCities.reduce((s, c) => s + c.gold, 0).toLocaleString()} | Food: ${myCities.reduce((s, c) => s + c.food, 0).toLocaleString()} | Troops: ${myCities.reduce((s, c) => s + c.troops, 0).toLocaleString()}`);
        console.log(`Officers: ${myOfficers.length}`);
    }
    
    if (state.phase === 'battle') {
        console.log(`═══ RTK Battle ═══`);
        console.log(`Day ${battle.day} | Weather: ${battle.weather} | Wind: ${battle.windDirection}`);
        console.log(`Attacker ID: ${battle.attackerId} | Defender ID: ${battle.defenderId}`);
        const active = battle.units.find(u => u.id === battle.activeUnitId);
        if (active) console.log(`Active Unit: ${active.officer.name} (${active.id})`);
    }
    console.log(`═══════════════════`);
  },

  rawState: () => ({ game: useGameStore.getState(), battle: useBattleStore.getState() }),
  
  tick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  onChange: (callback: (state: import('../store/gameStore').GameState) => void) => {
    return useGameStore.subscribe(callback);
  }
};
