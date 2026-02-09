import { describe, it, expect } from 'vitest';
import { evaluateDevelopment } from './aiDevelopment';
import { evaluateMilitary } from './aiMilitary';
import { evaluatePersonnel } from './aiPersonnel';
import { evaluateDiplomacy } from './aiDiplomacy';
import { evaluateStrategy } from './aiStrategy';
import type { AIFactionContext } from './types';
import type { GameState } from '../types';

describe('AI Subsystems', () => {
  const mockState = {
    cities: [
      { id: 1, name: 'City 1', factionId: 1, gold: 10000, food: 10000, troops: 10000, adjacentCityIds: [2], peopleLoyalty: 100, floodControl: 100, defense: 100, technology: 50, agriculture: 500, commerce: 500, morale: 100, training: 100, x: 0, y: 0, population: 100000 },
      { id: 2, name: 'City 2', factionId: 2, gold: 10000, food: 10000, troops: 10000, adjacentCityIds: [1], peopleLoyalty: 100, floodControl: 100, defense: 100, x: 1, y: 1 },
    ],
    officers: [
      { id: 1, name: 'Off 1', factionId: 1, cityId: 1, stamina: 100, loyalty: 100, leadership: 80, war: 80, intelligence: 80, politics: 80, charisma: 80, skills: ['製造'], isGovernor: true },
    ],
    factions: [
      { id: 1, name: 'F1', relations: { 2: 50 }, allies: [] },
      { id: 2, name: 'F2', relations: { 1: 50 }, allies: [] },
    ],
  } as unknown as GameState;

  const context: AIFactionContext = {
    faction: mockState.factions[0],
    state: mockState,
    ownedCities: [mockState.cities[0]],
    factionOfficers: [mockState.officers[0]],
  };

  describe('Development', () => {
    it('should disaster relief if loyalty is low', () => {
      const lowLoyaltyContext = {
        ...context,
        ownedCities: [{ ...context.ownedCities[0], peopleLoyalty: 30 }]
      };
      const decisions = evaluateDevelopment(lowLoyaltyContext);
      expect(decisions.some(d => d.action === 'disasterRelief')).toBe(true);
    });

    it('should develop flood control if low', () => {
      const lowFloodContext = {
        ...context,
        ownedCities: [{ ...context.ownedCities[0], floodControl: 30 }]
      };
      const decisions = evaluateDevelopment(lowFloodContext);
      expect(decisions.some(d => d.action === 'developFloodControl')).toBe(true);
    });

    it('should reinforce defense if border city', () => {
      const lowDefenseContext = {
        ...context,
        ownedCities: [{ ...context.ownedCities[0], defense: 50 }]
      };
      const decisions = evaluateDevelopment(lowDefenseContext);
      expect(decisions.some(d => d.action === 'reinforceDefense')).toBe(true);
    });

    it('should develop technology if wealthy and tech is low', () => {
        const techContext = {
            ...context,
            ownedCities: [{ ...context.ownedCities[0], gold: 5000, technology: 20, commerce: 999, agriculture: 999, defense: 200, peopleLoyalty: 100, floodControl: 100 }]
        };
        const decisions = evaluateDevelopment(techContext);
        expect(decisions.some(d => d.action === 'developTechnology')).toBe(true);
    });

    it('should manufacture if has skill and tech and others maxed', () => {
        const manufactureContext = {
            ...context,
            ownedCities: [{ ...context.ownedCities[0], gold: 5000, technology: 100, commerce: 999, agriculture: 999, defense: 200, peopleLoyalty: 100, floodControl: 100 }]
        };
        const decisions = evaluateDevelopment(manufactureContext);
        expect(decisions.some(d => d.action === 'manufacture')).toBe(true);
    });
  });

  describe('Military', () => {
    it('should train troops if morale is low', () => {
      const lowMoraleContext = {
        ...context,
        ownedCities: [{ ...context.ownedCities[0], morale: 30 }]
      };
      const decisions = evaluateMilitary(lowMoraleContext);
      expect(decisions.some(d => d.action === 'trainTroops')).toBe(true);
    });

    it('should transport troops to border', () => {
        // Interior city
        const interiorCity = { ...mockState.cities[0], id: 3, adjacentCityIds: [1], factionId: 1, troops: 20000 };
        const borderCity = { ...mockState.cities[0], id: 1, adjacentCityIds: [2, 3], factionId: 1 };
        const interiorContext = {
            ...context,
            ownedCities: [interiorCity, borderCity],
            factionOfficers: [...context.factionOfficers, { ...context.factionOfficers[0], id: 10, cityId: 3 }],
            state: {
                ...mockState,
                cities: [borderCity, mockState.cities[1], interiorCity]
            }
        };
        const decisions = evaluateMilitary(interiorContext);
        // Interior city should match transport because it's not border and has many troops
        expect(decisions.some(d => d.action === 'transport')).toBe(true);
    });
  });

  describe('Personnel', () => {
    it('should reward disloyal officers', () => {
      const disloyalContext = {
        ...context,
        factionOfficers: [{ ...context.factionOfficers[0], loyalty: 50 }]
      };
      const decisions = evaluatePersonnel(disloyalContext);
      expect(decisions.some(d => d.action === 'rewardOfficer')).toBe(true);
    });

    it('should recruit POW if any', () => {
        const powContext = {
            ...context,
            state: {
                ...mockState,
                officers: [
                    ...mockState.officers,
                    { id: 20, name: 'POW', factionId: -1, cityId: 1, stamina: 100, loyalty: 0, leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50, skills: [], portraitId: 20, birthYear: 160, deathYear: 230, isGovernor: false, treasureId: null }
                ] as Officer[]
            } as unknown as GameState
        };
        const decisions = evaluatePersonnel(powContext as unknown as AIFactionContext);
        expect(decisions.some(d => d.action === 'recruitPOW')).toBe(true);
    });

    it('should appoint governor if missing', () => {
        const noGovernorContext = {
            ...context,
            ownedCities: [{ ...context.ownedCities[0], id: 1 }],
            factionOfficers: [{ ...context.factionOfficers[0], cityId: 1, isGovernor: false, leadership: 100 }, { ...context.factionOfficers[0], id: 2, cityId: 1, isGovernor: false, leadership: 50 }],
            state: {
                ...mockState,
                officers: [
                    { ...mockState.officers[0], isGovernor: false },
                    { ...mockState.officers[0], id: 2, isGovernor: false }
                ]
            }
        };
        noGovernorContext.factionOfficers.push({ ...mockState.officers[0], id: 3, cityId: 1, isGovernor: false });
        
        const decisions = evaluatePersonnel(noGovernorContext);
        expect(decisions.some(d => d.action === 'appointGovernor')).toBe(true);
    });
  });

  describe('Diplomacy', () => {
    it('should improve relations if hostile', () => {
      const hostileContext = {
        ...context,
        faction: { ...context.faction, relations: { 2: 90 } }
      };
      const decisions = evaluateDiplomacy(hostileContext);
      expect(decisions.some(d => d.action === 'improveRelations')).toBe(true);
    });

    it('should propose alliance if relations are good', () => {
        const friendlyContext = {
            ...context,
            faction: { ...context.faction, relations: { 2: 20 }, allies: [] }
        };
        const decisions = evaluateDiplomacy(friendlyContext);
        expect(decisions.some(d => d.action === 'formAlliance')).toBe(true);
    });
  });

  describe('Strategy', () => {
    it('should spy on enemy neighbors', () => {
      const decisions = evaluateStrategy(context);
      expect(decisions.some(d => d.action === 'spy')).toBe(true);
    });
  });
});