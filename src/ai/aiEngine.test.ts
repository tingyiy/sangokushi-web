import { describe, it, expect, vi } from 'vitest';
import { runAI } from './aiEngine';
import type { GameState } from '../store/gameStore';

describe('AI Engine', () => {
  const mockState: GameState = {
    factions: [
      { id: 1, name: 'Player Faction', isPlayer: true, rulerId: 1, advisorId: null, relations: { 2: 50 }, allies: [], color: '#ff0000', ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
      { id: 2, name: 'AI Faction', isPlayer: false, rulerId: 2, advisorId: null, relations: { 1: 50 }, allies: [], color: '#0000ff', ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    ],
    cities: [
      { id: 1, name: 'City 1', factionId: 1, population: 100000, gold: 5000, food: 10000, commerce: 500, agriculture: 500, defense: 100, troops: 10000, adjacentCityIds: [2], floodControl: 50, technology: 30, peopleLoyalty: 70, morale: 60, training: 40, crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, x: 0, y: 0 },
      { id: 2, name: 'City 2', factionId: 2, population: 100000, gold: 5000, food: 10000, commerce: 500, agriculture: 500, defense: 100, troops: 10000, adjacentCityIds: [1], floodControl: 50, technology: 30, peopleLoyalty: 70, morale: 60, training: 40, crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, x: 1, y: 1 },
    ],
    officers: [
      { id: 1, name: 'Player Ruler', factionId: 1, cityId: 1, acted: false, loyalty: 100, leadership: 80, war: 80, intelligence: 80, politics: 80, charisma: 80, skills: [], portraitId: 1, birthYear: 160, deathYear: 230, isGovernor: true, treasureId: null, relationships: [] },
      { id: 2, name: 'AI Ruler', factionId: 2, cityId: 2, acted: false, loyalty: 100, leadership: 80, war: 80, intelligence: 80, politics: 80, charisma: 80, skills: ['manufacture'], portraitId: 2, birthYear: 160, deathYear: 230, isGovernor: true, treasureId: null, relationships: [] },
    ],
    year: 190,
    month: 1,
    phase: 'playing',
    log: [],
    selectedCityId: null,
    activeCommandCategory: null,
    scenario: null,
    playerFaction: null,
    selectedFactionId: null,
    gameSettings: { battleMode: 'watch', gameMode: 'historical', customOfficers: 'all', intelligenceSensitivity: 3 },
    duelState: null,
    battleFormation: null,
    // Add methods if needed by AI
    setPhase: vi.fn(),
    selectScenario: vi.fn(),
    selectFaction: vi.fn(),
    setSelectedFactionId: vi.fn(),
    setGameSettings: vi.fn(),
    confirmSettings: vi.fn(),
    selectCity: vi.fn(),
    setActiveCommandCategory: vi.fn(),
    addLog: vi.fn(),
    endTurn: vi.fn(),
    developCommerce: vi.fn(),
    developAgriculture: vi.fn(),
    reinforceDefense: vi.fn(),
    developFloodControl: vi.fn(),
    developTechnology: vi.fn(),
    trainTroops: vi.fn(),
    manufacture: vi.fn(),
    disasterRelief: vi.fn(),
    recruitOfficer: vi.fn(),
    searchOfficer: vi.fn(),
    recruitPOW: vi.fn(),
    rewardOfficer: vi.fn(),
    executeOfficer: vi.fn(),
    dismissOfficer: vi.fn(),
    appointGovernor: vi.fn(),
    appointAdvisor: vi.fn(),
    draftTroops: vi.fn(),
    transport: vi.fn(),
    transferOfficer: vi.fn(),
    setBattleFormation: vi.fn(),
    startDuel: vi.fn(),
    initMidBattleDuel: vi.fn(),
    duelAction: vi.fn(),
    endDuel: vi.fn(),
    startBattle: vi.fn(),
    improveRelations: vi.fn(),
    formAlliance: vi.fn(),
    requestJointAttack: vi.fn(),
    proposeCeasefire: vi.fn(),
    demandSurrender: vi.fn(),
    breakAlliance: vi.fn(),
    exchangeHostage: vi.fn(),
    counterEspionage: vi.fn(),
    inciteRebellion: vi.fn(),
    arson: vi.fn(),
    spy: vi.fn(),
    gatherIntelligence: vi.fn(),
    rumor: vi.fn(),
    resolveBattle: vi.fn(),
    saveGame: vi.fn(),
    loadGame: vi.fn(),
    getSaveSlots: vi.fn(),
    deleteSave: vi.fn(),
    checkVictoryCondition: vi.fn(),
    applyAIDecisions: vi.fn(),
    aiStartBattle: vi.fn(),
    aiRecruitOfficer: vi.fn(),
    aiSearchOfficer: vi.fn(),
    aiSpy: vi.fn(),
    aiRumor: vi.fn(),
  };

  it('should generate decisions for AI factions', () => {
    const decisions = runAI(mockState);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.every(d => d.action)).toBe(true);
  });

  it('should prioritize personnel actions', () => {
    const stateWithFreeOfficer = {
      ...mockState,
      officers: [
        ...mockState.officers,
        { id: 3, name: 'Free Agent', factionId: null, cityId: 2, acted: false, loyalty: 0, leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50, skills: [], portraitId: 3, birthYear: 160, deathYear: 230, isGovernor: false, treasureId: null, relationships: [] }
      ]
    };
    const decisions = runAI(stateWithFreeOfficer);
    expect(decisions.some(d => d.action === 'aiRecruitOfficer')).toBe(true);
  });

  it('should generate military decisions when troops are low', () => {
    const lowTroopState = {
      ...mockState,
      cities: mockState.cities.map(c => c.id === 2 ? { ...c, troops: 1000 } : c)
    };
    const decisions = runAI(lowTroopState);
    expect(decisions.some(d => d.action === 'draftTroops')).toBe(true);
  });

  it('should generate offensive decisions when troop advantage is high', () => {
    const offensiveState = {
      ...mockState,
      cities: mockState.cities.map(c => 
        c.id === 2 ? { ...c, troops: 30000, training: 100, morale: 100 } : (c.id === 1 ? { ...c, troops: 5000 } : c)
      ),
      officers: [
          ...mockState.officers,
          { id: 4, name: 'General', factionId: 2, cityId: 2, acted: false, loyalty: 100, leadership: 80, war: 80, intelligence: 80, politics: 80, charisma: 80, skills: [], portraitId: 4, birthYear: 160, deathYear: 230, isGovernor: false, treasureId: null, relationships: [] }
      ]
    };
    const decisions = runAI(offensiveState);
    expect(decisions.some(d => d.action === 'aiStartBattle')).toBe(true);
  });
});
