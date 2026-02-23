import { describe, it, expect } from 'vitest';
import type { BattleTerrainType, TerrainType } from '../types/battle';
import { cityBaseStats } from '../data/cities';
import { generateSiegeMap, generateFieldBattleMap, getGatePositions } from './siegeMap';
import { getMoveRange } from './pathfinding';

const ALL_TERRAIN_TYPES: BattleTerrainType[] = ['plains', 'wetland', 'highland', 'arid'];
const MAP_W = 21;
const MAP_H = 21;

/** Terrain types that units can spawn on (passable & not slow) */
const PASSABLE_SPAWN_TERRAIN: Set<TerrainType> = new Set(['plain', 'sand', 'forest', 'bridge']);

describe('City battleTerrain coverage', () => {
  it('every city in cityBaseStats has a valid battleTerrain', () => {
    const valid = new Set<string>(ALL_TERRAIN_TYPES);
    for (const [idStr, stats] of Object.entries(cityBaseStats)) {
      expect(valid.has(stats.battleTerrain), `City ${idStr} has invalid battleTerrain: ${stats.battleTerrain}`).toBe(true);
    }
  });

  it('all 43 cities are present in cityBaseStats', () => {
    for (let id = 1; id <= 43; id++) {
      expect(cityBaseStats[id], `City ${id} missing from cityBaseStats`).toBeDefined();
    }
  });
});

describe('Siege map gate reachability', () => {
  for (const bt of ALL_TERRAIN_TYPES) {
    it(`attacker can reach at least one gate on ${bt} siege map`, () => {
      const map = generateSiegeMap(MAP_W, MAP_H, bt);
      const gates = getGatePositions(map);
      expect(gates.length).toBe(4);

      // Pick a spawn position (column 1, center row)
      const spawnQ = 1;
      const spawnR = Math.floor(MAP_H / 2);

      // BFS with high range — find all reachable hexes
      const blocked = new Set<string>();
      // Gates block attacker movement
      gates.forEach(g => blocked.add(`${g.q},${g.r}`));

      const reachable = getMoveRange(
        { q: spawnQ, r: spawnR }, 100,
        map.width, map.height,
        map.terrain, blocked,
      );

      // Check: can reach at least one hex adjacent to a gate
      const canReachGate = gates.some(g => {
        // Check all 6 hex neighbors of the gate
        const neighbors = [
          { q: g.q + 1, r: g.r }, { q: g.q - 1, r: g.r },
          { q: g.q, r: g.r + 1 }, { q: g.q, r: g.r - 1 },
          { q: g.q + 1, r: g.r - 1 }, { q: g.q - 1, r: g.r + 1 },
        ];
        return neighbors.some(n => reachable.has(`${n.q},${n.r}`));
      });

      expect(canReachGate, `No gate reachable on ${bt} siege map`).toBe(true);
    });
  }
});

describe('Spawn area terrain validity', () => {
  for (const bt of ALL_TERRAIN_TYPES) {
    it(`attacker spawn columns are passable on ${bt} field map`, () => {
      const map = generateFieldBattleMap(MAP_W, MAP_H, bt);
      for (let r = 0; r < MAP_H; r++) {
        for (let q = 0; q < 2; q++) {
          expect(
            PASSABLE_SPAWN_TERRAIN.has(map.terrain[q][r]),
            `Non-passable terrain ${map.terrain[q][r]} at attacker spawn (${q},${r}) on ${bt} field map`,
          ).toBe(true);
        }
      }
    });

    it(`defender spawn columns are passable on ${bt} field map`, () => {
      const map = generateFieldBattleMap(MAP_W, MAP_H, bt);
      for (let r = 0; r < MAP_H; r++) {
        for (let q = MAP_W - 2; q < MAP_W; q++) {
          expect(
            PASSABLE_SPAWN_TERRAIN.has(map.terrain[q][r]),
            `Non-passable terrain ${map.terrain[q][r]} at defender spawn (${q},${r}) on ${bt} field map`,
          ).toBe(true);
        }
      }
    });

    it(`attacker spawn columns are passable on ${bt} siege map`, () => {
      const map = generateSiegeMap(MAP_W, MAP_H, bt);
      for (let r = 0; r < MAP_H; r++) {
        for (let q = 0; q < 2; q++) {
          expect(
            PASSABLE_SPAWN_TERRAIN.has(map.terrain[q][r]),
            `Non-passable terrain ${map.terrain[q][r]} at attacker spawn (${q},${r}) on ${bt} siege map`,
          ).toBe(true);
        }
      }
    });
  }
});
