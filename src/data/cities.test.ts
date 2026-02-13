import { describe, it, expect } from 'vitest';
import { baseCities } from './cities';

/**
 * City data coherence tests.
 *
 * These tests validate structural integrity of the city graph:
 * - Unique IDs, contiguous range, valid coordinates
 * - Bidirectional adjacency (if A→B then B→A)
 * - No self-references, no duplicate adjacencies
 * - All adjacency references point to existing cities
 * - Connected graph (no isolated subgraphs)
 * - Adjacent cities are geographically reasonable (not too far apart)
 * - No "skip" connections that bypass intermediate cities
 */
describe('City Data Coherence', () => {
  const cityMap = new Map(baseCities.map(c => [c.id, c]));

  it('should have exactly 43 cities', () => {
    expect(baseCities.length).toBe(43);
  });

  it('should have unique IDs', () => {
    const ids = baseCities.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have contiguous IDs from 1 to 43', () => {
    const ids = baseCities.map(c => c.id).sort((a, b) => a - b);
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(43);
    for (let i = 1; i <= 43; i++) {
      expect(ids).toContain(i);
    }
  });

  it('should have valid coordinates within map bounds (0-100)', () => {
    baseCities.forEach(city => {
      expect(city.x).toBeGreaterThanOrEqual(0);
      expect(city.x).toBeLessThanOrEqual(100);
      expect(city.y).toBeGreaterThanOrEqual(0);
      expect(city.y).toBeLessThanOrEqual(100);
    });
  });

  it('should have no duplicate city names', () => {
    const names = baseCities.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should have all adjacency references point to existing cities', () => {
    baseCities.forEach(city => {
      city.adjacentCityIds.forEach(adjId => {
        expect(cityMap.has(adjId)).toBe(true);
      });
    });
  });

  it('should have no self-references in adjacency lists', () => {
    baseCities.forEach(city => {
      expect(city.adjacentCityIds).not.toContain(city.id);
    });
  });

  it('should have no duplicate entries in adjacency lists', () => {
    baseCities.forEach(city => {
      const unique = new Set(city.adjacentCityIds);
      expect(unique.size).toBe(city.adjacentCityIds.length);
    });
  });

  it('should have bidirectional adjacency (if A→B then B→A)', () => {
    const errors: string[] = [];
    baseCities.forEach(city => {
      city.adjacentCityIds.forEach(adjId => {
        const adj = cityMap.get(adjId)!;
        if (!adj.adjacentCityIds.includes(city.id)) {
          errors.push(`${city.name}(${city.id})→${adj.name}(${adj.id}) but not reverse`);
        }
      });
    });
    expect(errors).toEqual([]);
  });

  it('should have every city with at least 1 connection', () => {
    baseCities.forEach(city => {
      expect(city.adjacentCityIds.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should form a single connected graph (no isolated subgraphs)', () => {
    // BFS from city 1 should reach all 43 cities
    const visited = new Set<number>();
    const queue = [baseCities[0].id];
    visited.add(queue[0]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const city = cityMap.get(currentId)!;
      city.adjacentCityIds.forEach(adjId => {
        if (!visited.has(adjId)) {
          visited.add(adjId);
          queue.push(adjId);
        }
      });
    }

    expect(visited.size).toBe(43);
  });

  it('should have adjacent cities within reasonable distance (max 30 units)', () => {
    const MAX_DISTANCE = 30;
    const errors: string[] = [];
    baseCities.forEach(city => {
      city.adjacentCityIds.forEach(adjId => {
        const adj = cityMap.get(adjId)!;
        const dist = Math.sqrt((city.x - adj.x) ** 2 + (city.y - adj.y) ** 2);
        if (dist > MAX_DISTANCE) {
          errors.push(
            `${city.name}→${adj.name}: distance ${dist.toFixed(1)} exceeds max ${MAX_DISTANCE}`
          );
        }
      });
    });
    expect(errors).toEqual([]);
  });

  it('should not have long-range "skip" connections that bypass intermediate cities', () => {
    // For each connection A→B, check there isn't a city C between them
    // that is closer to both A and B than A and B are to each other.
    // This catches connections like 西涼→天水 that skip 武都.
    const MAX_SKIP_RATIO = 0.6; // If C is < 60% of the A→B distance from both A and B, it's a skip
    const errors: string[] = [];

    baseCities.forEach(city => {
      city.adjacentCityIds.forEach(adjId => {
        if (adjId <= city.id) return; // Check each edge once
        const adj = cityMap.get(adjId)!;
        const abDist = Math.sqrt((city.x - adj.x) ** 2 + (city.y - adj.y) ** 2);

        // Only check for skips on longer connections (> 10 units)
        if (abDist < 10) return;

        baseCities.forEach(mid => {
          if (mid.id === city.id || mid.id === adjId) return;
          const acDist = Math.sqrt((city.x - mid.x) ** 2 + (city.y - mid.y) ** 2);
          const bcDist = Math.sqrt((adj.x - mid.x) ** 2 + (adj.y - mid.y) ** 2);

          if (acDist < abDist * MAX_SKIP_RATIO && bcDist < abDist * MAX_SKIP_RATIO) {
            // City C is between A and B — but only flag if C isn't already connected to both
            const midConnectsA = mid.adjacentCityIds.includes(city.id);
            const midConnectsB = mid.adjacentCityIds.includes(adjId);
            if (!midConnectsA && !midConnectsB) {
              errors.push(
                `${city.name}→${adj.name} (dist ${abDist.toFixed(1)}) may skip ${mid.name} ` +
                `(${acDist.toFixed(1)} from ${city.name}, ${bcDist.toFixed(1)} from ${adj.name})`
              );
            }
          }
        });
      });
    });

    // This test is informational — print warnings but don't fail on them
    // since some geographic features (mountains, rivers) justify longer connections
    if (errors.length > 0) {
      console.warn('Potential skip connections:\n' + errors.join('\n'));
    }
    // Hard limit: no connection should skip a city that's connected to NEITHER endpoint
    expect(errors.length).toBe(0);
  });

  // ── Specific RTK IV adjacency rules ──

  it('should have 西涼 as a dead-end (only connects to 天水)', () => {
    const xiliang = cityMap.get(9)!;
    expect(xiliang.adjacentCityIds).toEqual([10]);
  });

  it('should have 襄平 as a dead-end (only connects to 北平)', () => {
    const xiangping = cityMap.get(1)!;
    expect(xiangping.adjacentCityIds).toEqual([2]);
  });

  it('should have 雲南 as a dead-end (only connects to 建寧)', () => {
    const yunnan = cityMap.get(29)!;
    expect(yunnan.adjacentCityIds).toEqual([28]);
  });

  it('should NOT have 長安 directly connected to 宛', () => {
    const changan = cityMap.get(11)!;
    expect(changan.adjacentCityIds).not.toContain(30);
  });

  it('should NOT have 新野 connected to 許昌, 譙, or 壽春', () => {
    const xinye = cityMap.get(31)!;
    expect(xinye.adjacentCityIds).not.toContain(14); // 許昌
    expect(xinye.adjacentCityIds).not.toContain(17); // 譙
    expect(xinye.adjacentCityIds).not.toContain(20); // 壽春
  });

  it('should have 新野 connecting 宛, 襄陽, and 上庸', () => {
    const xinye = cityMap.get(31)!;
    expect(xinye.adjacentCityIds).toContain(23); // 上庸
    expect(xinye.adjacentCityIds).toContain(30); // 宛
    expect(xinye.adjacentCityIds).toContain(32); // 襄陽
    expect(xinye.adjacentCityIds.length).toBe(3);
  });

  it('should have 洛陽 as a central hub with 5 connections', () => {
    const luoyang = cityMap.get(12)!;
    expect(luoyang.adjacentCityIds).toContain(4);  // 晉陽
    expect(luoyang.adjacentCityIds).toContain(8);  // 鄴
    expect(luoyang.adjacentCityIds).toContain(13); // 弘農
    expect(luoyang.adjacentCityIds).toContain(14); // 許昌
    expect(luoyang.adjacentCityIds).toContain(30); // 宛
  });

  it('should not have redundant triangle cities (2-connection city where both neighbors connect to each other)', () => {
    // If a city A has exactly 2 neighbors B and C, and B↔C are directly
    // connected, then A is a redundant waypoint — you can go B→C directly,
    // making A pointless as a chokepoint. In RTK IV, 2-connection cities
    // exist specifically to force detours (e.g., 新野 between 宛 and 襄陽,
    // where 宛↔襄陽 is NOT direct).
    const errors: string[] = [];
    baseCities.forEach(city => {
      if (city.adjacentCityIds.length !== 2) return;
      const [bId, cId] = city.adjacentCityIds;
      const b = cityMap.get(bId)!;
      if (b.adjacentCityIds.includes(cId)) {
        errors.push(
          `${city.name}(${city.id}) has only 2 connections: ` +
          `${b.name}(${bId}) and ${cityMap.get(cId)!.name}(${cId}), ` +
          `but they already connect to each other — ${city.name} is redundant`
        );
      }
    });
    expect(errors).toEqual([]);
  });
});
