import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../i18n';
import { rollRandomEvents } from './events';
import type { GameState } from '../store/gameStore';
import type { City } from '../types';

function makeCity(overrides: Partial<City> = {}): City {
  return {
    id: 1, name: '陳留', x: 0, y: 0,
    factionId: 1,
    population: 100000, gold: 10000, food: 50000,
    commerce: 50, agriculture: 50, defense: 50, troops: 10000,
    adjacentCityIds: [2],
    floodControl: 0, technology: 50, peopleLoyalty: 80,
    morale: 80, training: 80,
    crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0,
    ...overrides,
  } as City;
}

function makeState(cities: City[]): GameState {
  return { cities, year: 200, month: 3 } as unknown as GameState;
}

describe('rollRandomEvents – flood vs floodControl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('never produces a flood when floodControl is 100', () => {
    const city = makeCity({ floodControl: 100 });
    const state = makeState([city]);

    // Run many iterations — none should produce a flood
    for (let i = 0; i < 500; i++) {
      const events = rollRandomEvents(state);
      const floods = events.filter(e => e.type === 'flood');
      expect(floods).toHaveLength(0);
    }
  });

  it('can produce a flood when floodControl is 0 (given a low roll)', () => {
    const city = makeCity({ floodControl: 0 });
    const state = makeState([city]);

    // Force Math.random to return 0 → roll = 0, which is < 3
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const events = rollRandomEvents(state);
    expect(events.some(e => e.type === 'flood')).toBe(true);
  });

  it('flood chance scales with floodControl (50 → threshold 1.5)', () => {
    const city = makeCity({ floodControl: 50 });
    const state = makeState([city]);

    // roll = 1.0 should trigger flood (1.0 < 1.5)
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // 0.01 * 100 = 1.0
    expect(rollRandomEvents(state).some(e => e.type === 'flood')).toBe(true);

    // roll = 2.0 should NOT trigger flood (2.0 >= 1.5)
    vi.spyOn(Math, 'random').mockReturnValue(0.02); // 0.02 * 100 = 2.0
    expect(rollRandomEvents(state).some(e => e.type === 'flood')).toBe(false);
  });

  it('skips unoccupied cities (factionId === null)', () => {
    const city = makeCity({ factionId: null, floodControl: 0 });
    const state = makeState([city]);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollRandomEvents(state)).toHaveLength(0);
  });
});
