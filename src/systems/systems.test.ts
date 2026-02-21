import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdvisorSuggestions } from './advisor';
import { rollRandomEvents, rollOfficerVisits, applyEventEffects } from './events';
import { checkHistoricalEvents } from '../data/historicalEvents';
import { useGameStore } from '../store/gameStore';
import type { City, GameEvent } from '../types';
import type { GameState } from '../store/gameStore';

describe('Advisor System', () => {
  const mockState = {
    playerFaction: { id: 1, name: '曹操', advisorId: 350, rulerId: 11 },
    cities: [
      { id: 1, name: '陳留', factionId: 1, gold: 500, commerce: 100, agriculture: 100, food: 1000, troops: 1000, training: 30 }
    ],
    officers: [
      { id: 350, name: '荀彧', intelligence: 95, factionId: 1, relationships: [] },
      { id: 11, name: '曹操', factionId: 1, loyalty: 100, relationships: [] },
      { id: 326, name: '夏侯惇', factionId: 1, loyalty: 40, relationships: [] }
    ]
  } as unknown as GameState;

  it('should provide suggestions when cities are weak', () => {
    const suggestions = getAdvisorSuggestions(mockState);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.includes('金錢不足'))).toBe(true);
    expect(suggestions.some(s => s.includes('兵力薄弱'))).toBe(true);
  });

  it('should suggest rewarding disloyal officers', () => {
    const loyalCityState = {
      ...mockState,
      cities: [{ id: 1, name: '陳留', factionId: 1, gold: 5000, commerce: 999, agriculture: 999, food: 10000, troops: 10000, training: 100 }]
    } as GameState;
    const suggestions = getAdvisorSuggestions(loyalCityState);
    expect(suggestions.some(s => s.includes('夏侯惇'))).toBe(true);
  });

  it('should return empty if no advisor', () => {
    const noAdvisorState = { ...mockState, playerFaction: { ...mockState.playerFaction, advisorId: null } } as GameState;
    expect(getAdvisorSuggestions(noAdvisorState)).toEqual([]);
  });
});

describe('Events System', () => {
  const mockState = {
    year: 190,
    month: 7,
    cities: [
      { id: 1, name: '陳留', factionId: 1, floodControl: 0, gold: 5000, food: 5000, population: 100000, troops: 10000, defense: 50 }
    ],
    officers: [],
    playerFaction: { id: 1, rulerId: 11 }
  } as unknown as GameState;

  it('should roll random events', () => {
    // Mock random to force an event
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const events = rollRandomEvents(mockState);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('flood');
    spy.mockRestore();
  });

  it('should apply event effects for all types', () => {
    const city = mockState.cities[0] as City;
    
    // Flood
    const floodEvent: GameEvent = { id: '1', type: 'flood', name: '洪水', description: '', cityId: 1, year: 190, month: 1 };
    const { cities: citiesFlood } = applyEventEffects(floodEvent, [city], []);
    expect(citiesFlood[0].population).toBeLessThan(city.population);
    expect(citiesFlood[0].defense).toBe(city.defense - 10);

    // Locusts
    const locustsEvent: GameEvent = { id: '2', type: 'locusts', name: '蝗災', description: '', cityId: 1, year: 190, month: 1 };
    const { cities: citiesLocusts } = applyEventEffects(locustsEvent, [city], []);
    expect(citiesLocusts[0].food).toBeLessThan(city.food);

    // Plague
    const plagueEvent: GameEvent = { id: '3', type: 'plague', name: '瘟疫', description: '', cityId: 1, year: 190, month: 1 };
    const { cities: citiesPlague } = applyEventEffects(plagueEvent, [city], []);
    expect(citiesPlague[0].troops).toBeLessThan(city.troops);

    // Harvest
    const harvestEvent: GameEvent = { id: '4', type: 'harvest', name: '豐收', description: '', cityId: 1, year: 190, month: 1 };
    const { cities: citiesHarvest } = applyEventEffects(harvestEvent, [city], []);
    expect(citiesHarvest[0].food).toBeGreaterThan(city.food);
  });

  it('should roll all random event types', () => {
    const spy = vi.spyOn(Math, 'random');
    
    // Flood
    spy.mockReturnValue(0.01);
    expect(rollRandomEvents(mockState)[0].type).toBe('flood');

    // Locusts (roll 0.04 matches roll < 5 but after flood check)
    // Actually rollRandomEvents uses if/else if.
    // roll < 3*(...) -> flood
    // else if roll < 5 -> locusts
    spy.mockReturnValue(0.04);
    expect(rollRandomEvents(mockState)[0].type).toBe('locusts');

    // Plague
    spy.mockReturnValue(0.055);
    expect(rollRandomEvents(mockState)[0].type).toBe('plague');

    // Harvest
    spy.mockReturnValue(0.1);
    expect(rollRandomEvents(mockState)[0].type).toBe('harvest');

    spy.mockRestore();
  });

  it('should roll officer visits', () => {
    const visitState = {
      ...mockState,
      officers: [
        { id: 11, name: '曹操', charisma: 100, factionId: 1, relationships: [] },
        { id: 999, name: '在野', factionId: null, cityId: 1, relationships: [] }
      ]
    } as unknown as GameState;
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001);
    const events = rollOfficerVisits(visitState);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('officerVisit');
    spy.mockRestore();
  });
});

describe('Officer Visit — recruit via EventDialog', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'playing',
      playerFaction: { id: 1, name: '劉備', rulerId: 1, advisorId: null, color: '#00ff00', isPlayer: true, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
      factions: [
        { id: 1, name: '劉備', rulerId: 1, advisorId: null, color: '#00ff00', isPlayer: true, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
      ],
      cities: [
        { id: 5, name: '下邳', factionId: 1, x: 0, y: 0, population: 100000, gold: 5000, food: 10000, commerce: 500, agriculture: 500, defense: 50, troops: 10000, adjacentCityIds: [], floodControl: 50, technology: 30, peopleLoyalty: 70, morale: 60, training: 40, crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' },
      ],
      officers: [
        { id: 1, name: '劉備', factionId: 1, cityId: 5, leadership: 80, war: 70, intelligence: 70, politics: 70, charisma: 95, skills: [], acted: false, loyalty: 100, isGovernor: true, rank: 'viceroy', relationships: [], portraitId: 1, birthYear: 161, deathYear: 223, treasureId: null },
        { id: 999, name: '嚴顏', factionId: null, cityId: 5, leadership: 70, war: 80, intelligence: 50, politics: 40, charisma: 60, skills: ['infantry'], acted: false, loyalty: 0, isGovernor: false, rank: 'common', relationships: [], portraitId: 999, birthYear: 150, deathYear: 220, treasureId: null },
      ],
      pendingEvents: [
        { id: 'visit-1', type: 'officerVisit', name: '武將求見', description: '', cityId: 5, officerId: 999, year: 189, month: 4 },
      ],
      log: [],
    } as any);
  });

  it('should assign officer to the event city and player faction when recruited', () => {
    const event = useGameStore.getState().pendingEvents[0];
    const playerFaction = useGameStore.getState().playerFaction!;

    // Simulate EventDialog handleRecruit
    useGameStore.setState(state => ({
      officers: state.officers.map(o =>
        o.id === event.officerId
          ? { ...o, factionId: playerFaction.id, cityId: event.cityId!, loyalty: 60 }
          : o
      )
    }));
    useGameStore.getState().popEvent();

    const state = useGameStore.getState();
    const officer = state.officers.find(o => o.id === 999)!;
    expect(officer.factionId).toBe(1);
    expect(officer.cityId).toBe(5);
    expect(officer.loyalty).toBe(60);
    expect(state.pendingEvents.length).toBe(0);
  });

  it('should not assign officer when declined', () => {
    useGameStore.getState().popEvent();

    const state = useGameStore.getState();
    const officer = state.officers.find(o => o.id === 999)!;
    expect(officer.factionId).toBeNull();
    expect(officer.cityId).toBe(5);
    expect(state.pendingEvents.length).toBe(0);
  });
});

describe('Historical Events', () => {
  it('should trigger historical events at correct dates', () => {
    const chibiState = {
      gameSettings: { gameMode: 'historical' },
      year: 208,
      month: 11
    } as unknown as GameState;
    const events = checkHistoricalEvents(chibiState);
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('chibi');
  });

  it('should not trigger historical events in fictional mode', () => {
    const fictionalState = {
      gameSettings: { gameMode: 'fictional' },
      year: 208,
      month: 11
    } as unknown as GameState;
    const events = checkHistoricalEvents(fictionalState);
    expect(events.length).toBe(0);
  });

  it('should apply historical event mutations', () => {
    const state = {
      gameSettings: { gameMode: 'historical' },
      year: 208,
      month: 11,
      cities: [
        { id: 1, factionId: 1, troops: 10000 }
      ],
      factions: [],
      officers: []
    } as unknown as GameState;
    
    const events = checkHistoricalEvents(state);
    expect(events[0].mutate).toBeDefined();
    
    const mutation = events[0].mutate!(state);
    expect(mutation.cities![0].troops).toBe(6000); // 10000 * 0.6
  });

  it('should apply caocao_death mutations', () => {
    const state = {
      gameSettings: { gameMode: 'historical' },
      year: 220,
      month: 1,
      factions: [{ id: 1, rulerId: 11 }],
      officers: [{ id: 17, factionId: 2, isGovernor: false, relationships: [] }],
      cities: []
    } as unknown as GameState;
    
    const events = checkHistoricalEvents(state);
    const mutation = events[0].mutate!(state);
    
    expect(mutation.factions![0].rulerId).toBe(17);
    expect(mutation.officers![0].factionId).toBe(1);
  });
});
