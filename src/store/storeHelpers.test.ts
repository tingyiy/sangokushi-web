import { describe, it, expect } from 'vitest';
import type { City } from '../types';
import { areCitiesConnected } from './storeHelpers';

/** Minimal city factory for connectivity tests */
function makeCity(id: number, factionId: number | null, adjacentCityIds: number[]): City {
  return {
    id, name: `City${id}`, x: id * 10, y: 10, factionId,
    population: 10000, gold: 1000, food: 5000, commerce: 50, agriculture: 50,
    defense: 30, troops: 1000, adjacentCityIds, floodControl: 50, technology: 50,
    peopleLoyalty: 70, morale: 60, training: 60, crossbows: 0, warHorses: 0,
    batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
  };
}

describe('areCitiesConnected', () => {
  // Layout: 1 -- 2 -- 3 -- 4    5 (disconnected)
  const cities: City[] = [
    makeCity(1, 1, [2]),
    makeCity(2, 1, [1, 3]),
    makeCity(3, 1, [2, 4]),
    makeCity(4, 1, [3, 5]),
    makeCity(5, 1, [4]),       // friendly but only adjacent to 4
  ];

  it('same city is always connected', () => {
    expect(areCitiesConnected(cities, 1, 1, 1)).toBe(true);
  });

  it('adjacent friendly cities are connected', () => {
    expect(areCitiesConnected(cities, 1, 2, 1)).toBe(true);
    expect(areCitiesConnected(cities, 2, 1, 1)).toBe(true);
  });

  it('non-adjacent but friendly-path-connected cities are connected', () => {
    expect(areCitiesConnected(cities, 1, 4, 1)).toBe(true);
    expect(areCitiesConnected(cities, 1, 5, 1)).toBe(true);
  });

  it('returns false when intermediate city belongs to another faction', () => {
    // Break the chain: city 3 belongs to faction 2
    const split = cities.map(c => c.id === 3 ? { ...c, factionId: 2 } : c);
    // 1--2 connected, but 1--4 not (city 3 is enemy)
    expect(areCitiesConnected(split, 1, 2, 1)).toBe(true);
    expect(areCitiesConnected(split, 1, 4, 1)).toBe(false);
    expect(areCitiesConnected(split, 4, 5, 1)).toBe(true);
  });

  it('returns false when intermediate city is unowned (null)', () => {
    const split = cities.map(c => c.id === 3 ? { ...c, factionId: null } : c);
    expect(areCitiesConnected(split, 1, 4, 1)).toBe(false);
  });

  it('returns false if source city is not owned by faction', () => {
    const modified = cities.map(c => c.id === 1 ? { ...c, factionId: 2 } : c);
    expect(areCitiesConnected(modified, 1, 5, 1)).toBe(false);
  });

  it('returns false if destination city is not owned by faction', () => {
    const modified = cities.map(c => c.id === 5 ? { ...c, factionId: null } : c);
    expect(areCitiesConnected(modified, 1, 5, 1)).toBe(false);
  });
});
