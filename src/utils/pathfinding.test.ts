import { findPath, getMoveRange } from './pathfinding';
import type { TerrainType } from '../types/battle';

describe('Pathfinding Utilities', () => {
  const width = 10;
  const height = 10;
  const terrain: TerrainType[][] = Array(width).fill(null).map(() => Array(height).fill('plain'));

  test('findPath finds simple path', () => {
    const start = { q: 0, r: 0 };
    const end = { q: 2, r: 0 };
    const blocked = new Set<string>();
    const path = findPath(start, end, width, height, terrain, blocked);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(3); // [0,0], [1,0], [2,0]
    expect(path![0]).toEqual(start);
    expect(path![2]).toEqual(end);
  });

  test('findPath respects blocked hexes', () => {
    const start = { q: 0, r: 0 };
    const end = { q: 2, r: 0 };
    const blocked = new Set<string>(['1,0', '1,-1']);
    const path = findPath(start, end, width, height, terrain, blocked);
    expect(path).not.toBeNull();
    // Should go around
    expect(path!.map(h => `${h.q},${h.r}`)).not.toContain('1,0');
  });

  test('getMoveRange calculates reachable hexes', () => {
    const start = { q: 0, r: 0 };
    const range = 2;
    const blocked = new Set<string>();
    const reachable = getMoveRange(start, range, width, height, terrain, blocked);
    
    // In plain terrain (cost 1), range 2 should reach distance 2
    expect(reachable.has('0,0')).toBe(true);
    expect(reachable.has('1,0')).toBe(true);
    expect(reachable.has('2,0')).toBe(true);
    expect(reachable.has('3,0')).toBe(false);
  });

  test('getMoveRange respects terrain costs', () => {
    const start = { q: 0, r: 0 };
    const range = 2;
    const forestTerrain: TerrainType[][] = Array(width).fill(null).map(() => Array(height).fill('forest')); // cost 2
    const blocked = new Set<string>();
    
    const reachable = getMoveRange(start, range, width, height, forestTerrain, blocked);
    
    expect(reachable.has('0,0')).toBe(true);
    expect(reachable.has('1,0')).toBe(true); // cost 2
    expect(reachable.has('2,0')).toBe(false); // cost 4 > range 2
  });
});
