import { describe, test, expect } from 'vitest';
import { generateNavalMap, generateSiegeMap, getGatePositions, isSiegeBattle } from './siegeMap';
import { getUnitTypeLabel, getMovementRange, getAttackRange, getAttackModifier, getDefenseModifier, calculateTacticSuccess } from './unitTypes';
import type { Officer } from '../types';

const mockOfficer = { skills: [] } as unknown as Officer;

describe('Siege Map Utils', () => {
  test('generateNavalMap creates mostly river terrain', () => {
    const map = generateNavalMap(10, 10);
    let riverCount = 0;
    
    for (let q = 0; q < 10; q++) {
      for (let r = 0; r < 10; r++) {
        if (map.terrain[q][r] === 'river') riverCount++;
      }
    }
    
    // Expect roughly 80% rivers
    expect(riverCount).toBeGreaterThan(60); 
  });

  test('generateSiegeMap creates gates and walls', () => {
    const map = generateSiegeMap(15, 15);
    const gates = getGatePositions(map);
    expect(gates.length).toBe(4); // 4 cardinal gates
    
    // Center should be plain (inside the walls)
    expect(map.terrain[7][7]).toBe('plain');
    
    // Walls should exist as 'city' terrain
    const hasCityTerrain = map.terrain.some(col => col.some(t => t === 'city'));
    expect(hasCityTerrain).toBe(true);
  });

  test('isSiegeBattle returns correct boolean', () => {
    expect(isSiegeBattle(1)).toBe(true);
    expect(isSiegeBattle(0)).toBe(false);
  });
});

describe('Unit Type Utils', () => {
  test('getUnitTypeLabel returns correct labels', () => {
    expect(getUnitTypeLabel('infantry')).toBe('步');
    expect(getUnitTypeLabel('cavalry')).toBe('騎');
    expect(getUnitTypeLabel('archer')).toBe('弓');
  });

  test('modifiers are retrievable', () => {
    expect(getMovementRange('cavalry')).toBe(7);
    expect(getAttackRange('archer')).toBe(2);
    expect(getAttackModifier('cavalry', 'plain', mockOfficer)).toBe(1.3);
    expect(getDefenseModifier('infantry', 'mountain', mockOfficer)).toBe(1.5);
    // Default
    expect(getAttackModifier('infantry', 'plain', mockOfficer)).toBe(1.0);
  });

  test('calculateTacticSuccess returns probability', () => {
    // Base 30 + 90/2 = 75
    expect(calculateTacticSuccess('火計', 90)).toBeGreaterThan(50);
    // Base 30 + 10/2 = 35
    expect(calculateTacticSuccess('火計', 10)).toBeLessThan(50);
    
    // With target int: Base 30 + 90/2 - 90/4 = 30 + 45 - 22.5 = 52.5
    expect(calculateTacticSuccess('火計', 90, 90)).toBeCloseTo(52.5);
  });
});