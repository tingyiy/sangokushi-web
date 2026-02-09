import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { scenarios } from '../data/scenarios';
import type { GamePhase, GameSettings, Officer, OfficerRank } from '../types';
import type { UnitType } from '../types/battle';
import { getMovementRange, type BattleTactic } from '../utils/unitTypes';

interface Result {
  ok: boolean;
  error?: string;
  data?: unknown;
}

/**
 * RTK Automation API implementation
 * v2 (2026-02-09)
 */
export const rtkApi = {
  // ─── Lifecycle ───────────────────────────────────────
  phase: (): GamePhase => useGameStore.getState().phase,

  newGame(scenarioId: number, factionId: number, settings?: Partial<GameSettings>): Result {
    const { selectScenario, selectFaction, setGameSettings, confirmSettings } = useGameStore.getState();
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return { ok: false, error: `Scenario ${scenarioId} not found` };
    
    selectScenario(scenario);
    
    // We need to find the faction in the INITIALIZED factions in store, 
    // or just pass the ID if selectFaction handles it.
    // selectFaction(factionId) in store handles find(f => f.id === factionId)
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
    powOfficers: (cityId: number) => useGameStore.getState().officers.filter(o => o.cityId === cityId && o.factionId === -1 as unknown as number),
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
  },

  // ─── Commands ───────────────────────────────────────
  selectCity(cityId: number): Result {
    const state = useGameStore.getState();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: `City ${cityId} not found` };
    state.selectCity(cityId);
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
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city.peopleLoyalty;
    state.disasterRelief(cityId);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.peopleLoyalty === before) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before, after: after.peopleLoyalty } };
  },

  setTaxRate(cityId: number, rate: 'low' | 'medium' | 'high'): Result {
    useGameStore.getState().setTaxRate(cityId, rate);
    return { ok: true };
  },

  // Personnel
  recruitOfficer(officerId: number): Result {
    const state = useGameStore.getState();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return { ok: false, error: 'Officer not found' };
    state.recruitOfficer(officerId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.factionId === state.playerFaction?.id) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  searchOfficer(cityId: number): Result {
    useGameStore.getState().searchOfficer(cityId);
    return { ok: true };
  },

  recruitPOW(officerId: number): Result {
    const state = useGameStore.getState();
    state.recruitPOW(officerId);
    const after = useGameStore.getState().officers.find(o => o.id === officerId)!;
    if (after.factionId === state.playerFaction?.id) return { ok: true, data: { success: true } };
    return { ok: true, data: { success: false } };
  },

  rewardOfficer(officerId: number, type: 'gold' | 'treasure', amount?: number): Result {
    useGameStore.getState().rewardOfficer(officerId, type, amount);
    return { ok: true };
  },

  executeOfficer(officerId: number): Result {
    useGameStore.getState().executeOfficer(officerId);
    return { ok: true };
  },

  dismissOfficer(officerId: number): Result {
    useGameStore.getState().dismissOfficer(officerId);
    return { ok: true };
  },

  appointGovernor(cityId: number, officerId: number): Result {
    useGameStore.getState().appointGovernor(cityId, officerId);
    return { ok: true };
  },

  appointAdvisor(officerId: number): Result {
    useGameStore.getState().appointAdvisor(officerId);
    return { ok: true };
  },

  promoteOfficer(officerId: number, rank: OfficerRank): Result {
    useGameStore.getState().promoteOfficer(officerId, rank);
    return { ok: true };
  },

  // Military
  draftTroops(cityId: number, amount: number): Result {
    const state = useGameStore.getState();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { ok: false, error: 'City not found' };
    const before = city.troops;
    state.draftTroops(cityId, amount);
    const after = useGameStore.getState().cities.find(c => c.id === cityId)!;
    if (after.troops === before) return { ok: false, error: 'Action failed' };
    return { ok: true, data: { before, after: after.troops } };
  },

  transport(fromCityId: number, toCityId: number, resource: 'gold' | 'food' | 'troops', amount: number): Result {
    useGameStore.getState().transport(fromCityId, toCityId, resource, amount);
    return { ok: true };
  },

  transferOfficer(officerId: number, targetCityId: number): Result {
    useGameStore.getState().transferOfficer(officerId, targetCityId);
    return { ok: true };
  },

  setBattleFormation(formation: { officerIds: number[]; unitTypes: UnitType[] } | null): Result {
    useGameStore.getState().setBattleFormation(formation);
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
    useGameStore.getState().retreat();
    return { ok: true };
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
    useGameStore.getState().duelAction(action);
    return { ok: true };
  },

  endDuel(): Result {
    useGameStore.getState().endDuel();
    return { ok: true };
  },

  // Diplomacy
  improveRelations(targetFactionId: number): Result {
    useGameStore.getState().improveRelations(targetFactionId);
    return { ok: true };
  },

  formAlliance(targetFactionId: number): Result {
    useGameStore.getState().formAlliance(targetFactionId);
    return { ok: true };
  },

  requestJointAttack(allyFactionId: number, targetCityId: number): Result {
    useGameStore.getState().requestJointAttack(allyFactionId, targetCityId);
    return { ok: true };
  },

  proposeCeasefire(targetFactionId: number): Result {
    useGameStore.getState().proposeCeasefire(targetFactionId);
    return { ok: true };
  },

  demandSurrender(targetFactionId: number): Result {
    useGameStore.getState().demandSurrender(targetFactionId);
    return { ok: true };
  },

  breakAlliance(targetFactionId: number): Result {
    useGameStore.getState().breakAlliance(targetFactionId);
    return { ok: true };
  },

  exchangeHostage(officerId: number, targetFactionId: number): Result {
    useGameStore.getState().exchangeHostage(officerId, targetFactionId);
    return { ok: true };
  },

  // Strategy
  rumor(targetCityId: number): Result {
    useGameStore.getState().rumor(targetCityId);
    return { ok: true };
  },

  counterEspionage(targetCityId: number, targetOfficerId: number): Result {
    useGameStore.getState().counterEspionage(targetCityId, targetOfficerId);
    return { ok: true };
  },

  inciteRebellion(targetCityId: number): Result {
    useGameStore.getState().inciteRebellion(targetCityId);
    return { ok: true };
  },

  arson(targetCityId: number): Result {
    useGameStore.getState().arson(targetCityId);
    return { ok: true };
  },

  spy(targetCityId: number): Result {
    useGameStore.getState().spy(targetCityId);
    return { ok: true };
  },

  gatherIntelligence(targetCityId: number): Result {
    useGameStore.getState().gatherIntelligence(targetCityId);
    return { ok: true };
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
    moveRange: (unitId: string) => {
        const battle = useBattleStore.getState();
        const unit = battle.units.find(u => u.id === unitId);
        if (!unit) return [];
        
        const range = getMovementRange(unit.type);
        const reachable: { q: number; r: number }[] = [];
        
        // Simple iteration over potential map bounds (15x15)
        for (let q = 0; q < 15; q++) {
            for (let r = 0; r < 15; r++) {
                const dist = (Math.abs(unit.x - q) + Math.abs(unit.y - r) + Math.abs(-unit.x - unit.y - (-q - r))) / 2;
                if (dist <= range) {
                    reachable.push({ q, r });
                }
            }
        }
        return reachable; 
    },
    attackTargets: (unitId: string) => {
        const battle = useBattleStore.getState();
        const unit = battle.units.find(u => u.id === unitId);
        if (!unit) return [];
        return battle.units.filter(u => u.factionId !== unit.factionId && u.troops > 0);
    },
    gateTargets: (unitId: string) => {
        const battle = useBattleStore.getState();
        const unit = battle.units.find(u => u.id === unitId);
        if (!unit) return [];
        return battle.gates.filter(g => (Math.abs(g.q - unit.x) + Math.abs(g.r - unit.y) + Math.abs(-g.q - g.r - unit.z)) / 2 <= 1);
    },
    move(unitId: string, q: number, r: number): Result {
      useBattleStore.getState().moveUnit(unitId, q, r);
      return { ok: true };
    },
    attack(attackerUnitId: string, targetUnitId: string): Result {
      useBattleStore.getState().attackUnit(attackerUnitId, targetUnitId);
      return { ok: true };
    },
    attackGate(attackerUnitId: string, gateQ: number, gateR: number): Result {
      useBattleStore.getState().attackGate(attackerUnitId, gateQ, gateR);
      return { ok: true };
    },
    executeTactic(unitId: string, tactic: BattleTactic, targetId?: string, targetHex?: { q: number; r: number }): Result {
      useBattleStore.getState().executeTactic(unitId, tactic, targetId, targetHex);
      return { ok: true };
    },
    initDuel(myOfficer: Officer, enemyOfficer: Officer): Result {
      useGameStore.getState().initMidBattleDuel(myOfficer, enemyOfficer);
      return { ok: true };
    },
    wait(unitId: string): Result {
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
