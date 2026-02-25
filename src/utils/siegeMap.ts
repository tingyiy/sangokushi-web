import type { BattleMap, TerrainType, BattleTerrainType } from '../types/battle';

/**
 * Siege & field battle map generators.
 *
 * Map size default: 21×21 (441 hexes).
 * Siege layout: rectangular wall ring with 4 gates at cardinal midpoints.
 * Field layout: terrain themed by BattleTerrainType.
 *
 * 4 terrain themes:
 *  - plains:   sparse forests, rare mountains, occasional river
 *  - wetland:  wide sinuous river, 2-3 bridges, swamp patches
 *  - highland: mountain ridges forming valley corridors
 *  - arid:     sand base, scattered mountain clusters, no rivers
 */

const DEFAULT_WALL_MARGIN = 3; // distance from edge to wall ring

/* ─── Helpers ─── */

function initTerrain(width: number, height: number, fill: TerrainType = 'plain'): TerrainType[][] {
  const terrain: TerrainType[][] = [];
  for (let q = 0; q < width; q++) {
    terrain[q] = [];
    for (let r = 0; r < height; r++) {
      terrain[q][r] = fill;
    }
  }
  return terrain;
}

/** Ensure columns 0-1 and (width-2)..(width-1) are passable for spawning. */
function clearSpawnAreas(terrain: TerrainType[][], width: number, height: number) {
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < 2; q++) terrain[q][r] = 'plain';
    for (let q = width - 2; q < width; q++) terrain[q][r] = 'plain';
  }
}

/** Safe set: only writes if in bounds and not in spawn columns. */
function safeSet(terrain: TerrainType[][], q: number, r: number, t: TerrainType, width: number, height: number) {
  if (q >= 2 && q < width - 2 && r >= 0 && r < height) {
    terrain[q][r] = t;
  }
}

function placeForestCluster(terrain: TerrainType[][], cx: number, cy: number, size: number, width: number, height: number) {
  for (let dq = -size; dq <= size; dq++) {
    for (let dr = -size; dr <= size; dr++) {
      const nq = cx + dq;
      const nr = cy + dr;
      const dist = Math.abs(dq) + Math.abs(dr);
      if (dist <= size && Math.random() < 0.7) {
        safeSet(terrain, nq, nr, 'forest', width, height);
      }
    }
  }
}

/* ─── Field Battle Generators ─── */

function generateFieldPlains(width: number, height: number): TerrainType[][] {
  const terrain = initTerrain(width, height);

  // 2-3 forest clusters
  const numForests = 2 + Math.floor(Math.random() * 2);
  for (let f = 0; f < numForests; f++) {
    const cx = 3 + Math.floor(Math.random() * (width - 6));
    const cy = 2 + Math.floor(Math.random() * (height - 4));
    const size = 2 + Math.floor(Math.random() * 2);
    placeForestCluster(terrain, cx, cy, size, width, height);
  }

  // 50% chance: mountain ridge
  if (Math.random() < 0.5) {
    const ridgeY = 3 + Math.floor(Math.random() * (height - 6));
    const ridgeStartX = 4 + Math.floor(Math.random() * (width - 8));
    const ridgeLen = 2 + Math.floor(Math.random() * 3);
    const ridgeDir = Math.random() < 0.5 ? 0 : 1;
    for (let i = 0; i < ridgeLen; i++) {
      const mq = ridgeStartX + i;
      const mr = ridgeY + (ridgeDir === 1 ? i : 0);
      safeSet(terrain, mq, mr, 'mountain', width, height);
    }
  }

  // 40% chance: river with bridge
  if (Math.random() < 0.4) {
    const riverX = 4 + Math.floor(Math.random() * (width - 8));
    for (let r = 0; r < height; r++) {
      const rq = riverX + Math.floor(Math.sin(r * 0.5) * 1.5);
      safeSet(terrain, rq, r, 'river', width, height);
    }
    const bridgeR = Math.floor(height / 2);
    const bridgeQ = riverX + Math.floor(Math.sin(bridgeR * 0.5) * 1.5);
    safeSet(terrain, bridgeQ, bridgeR, 'bridge', width, height);
  }

  clearSpawnAreas(terrain, width, height);
  return terrain;
}

function generateFieldWetland(width: number, height: number): TerrainType[][] {
  const terrain = initTerrain(width, height);

  // Wide sinuous river (2-3 hexes wide in places)
  const riverCenter = 3 + Math.floor(Math.random() * (width - 8)) + 2;
  for (let r = 0; r < height; r++) {
    const baseQ = riverCenter + Math.floor(Math.sin(r * 0.3) * 2.5);
    // Main channel
    safeSet(terrain, baseQ, r, 'river', width, height);
    // Widen in places
    if (Math.random() < 0.6) safeSet(terrain, baseQ - 1, r, 'river', width, height);
    if (Math.random() < 0.4) safeSet(terrain, baseQ + 1, r, 'river', width, height);
  }

  // 2-3 bridges
  const bridgeCount = 2 + (Math.random() < 0.5 ? 1 : 0);
  const bridgeSpacing = Math.floor(height / (bridgeCount + 1));
  for (let b = 1; b <= bridgeCount; b++) {
    const br = bridgeSpacing * b;
    const bq = riverCenter + Math.floor(Math.sin(br * 0.3) * 2.5);
    safeSet(terrain, bq, br, 'bridge', width, height);
  }

  // Swamp clusters on both sides of river
  const swampCount = 3 + Math.floor(Math.random() * 3);
  for (let s = 0; s < swampCount; s++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const cx = riverCenter + side * (3 + Math.floor(Math.random() * 4));
    const cy = Math.floor(Math.random() * height);
    const size = 1 + Math.floor(Math.random() * 2);
    for (let dq = -size; dq <= size; dq++) {
      for (let dr = -size; dr <= size; dr++) {
        if (Math.abs(dq) + Math.abs(dr) <= size && Math.random() < 0.6) {
          safeSet(terrain, cx + dq, cy + dr, 'swamp', width, height);
        }
      }
    }
  }

  // Sparse forests
  placeForestCluster(terrain, 3 + Math.floor(Math.random() * 4), Math.floor(Math.random() * height), 2, width, height);
  placeForestCluster(terrain, width - 5 - Math.floor(Math.random() * 4), Math.floor(Math.random() * height), 2, width, height);

  clearSpawnAreas(terrain, width, height);
  return terrain;
}

function generateFieldHighland(width: number, height: number): TerrainType[][] {
  const terrain = initTerrain(width, height);

  // Create mountain walls forming 1-2 valley corridors
  // Top mountain wall
  const topWallR = 3 + Math.floor(Math.random() * 3);
  for (let q = 2; q < width - 2; q++) {
    const r = topWallR + Math.floor(Math.sin(q * 0.4) * 1.5);
    safeSet(terrain, q, r, 'mountain', width, height);
    if (Math.random() < 0.6) safeSet(terrain, q, r - 1, 'mountain', width, height);
    if (Math.random() < 0.4) safeSet(terrain, q, r + 1, 'mountain', width, height);
  }

  // Bottom mountain wall
  const botWallR = height - 4 - Math.floor(Math.random() * 3);
  for (let q = 2; q < width - 2; q++) {
    const r = botWallR + Math.floor(Math.sin(q * 0.35 + 1) * 1.5);
    safeSet(terrain, q, r, 'mountain', width, height);
    if (Math.random() < 0.6) safeSet(terrain, q, r + 1, 'mountain', width, height);
    if (Math.random() < 0.4) safeSet(terrain, q, r - 1, 'mountain', width, height);
  }

  // 1-2 gaps in the walls (valley passages)
  const gap1 = 5 + Math.floor(Math.random() * (width - 10));
  const gapWidth = 2 + Math.floor(Math.random() * 2);
  for (let dq = 0; dq < gapWidth; dq++) {
    const q = gap1 + dq;
    for (let r = 0; r < height; r++) {
      if (terrain[q]?.[r] === 'mountain') terrain[q][r] = 'plain';
    }
  }

  // Optional second gap
  if (Math.random() < 0.6) {
    const gap2 = gap1 + 5 + Math.floor(Math.random() * (width - gap1 - 7));
    if (gap2 < width - 3) {
      for (let dq = 0; dq < 2; dq++) {
        const q = gap2 + dq;
        for (let r = 0; r < height; r++) {
          if (terrain[q]?.[r] === 'mountain') terrain[q][r] = 'plain';
        }
      }
    }
  }

  // Scatter some elevated mountain positions
  for (let i = 0; i < 5; i++) {
    const q = 3 + Math.floor(Math.random() * (width - 6));
    const r = Math.floor(Math.random() * height);
    if (terrain[q][r] === 'plain' && Math.random() < 0.3) {
      terrain[q][r] = 'mountain';
    }
  }

  // A few forest clusters in the valleys
  placeForestCluster(terrain, Math.floor(width / 3), Math.floor(height / 2), 2, width, height);

  clearSpawnAreas(terrain, width, height);
  return terrain;
}

function generateFieldArid(width: number, height: number): TerrainType[][] {
  const terrain = initTerrain(width, height, 'sand');

  // Scattered mountain clusters creating chokepoints
  const clusterCount = 3 + Math.floor(Math.random() * 3);
  for (let c = 0; c < clusterCount; c++) {
    const cx = 4 + Math.floor(Math.random() * (width - 8));
    const cy = 2 + Math.floor(Math.random() * (height - 4));
    const size = 1 + Math.floor(Math.random() * 2);
    for (let dq = -size; dq <= size; dq++) {
      for (let dr = -size; dr <= size; dr++) {
        if (Math.abs(dq) + Math.abs(dr) <= size && Math.random() < 0.5) {
          safeSet(terrain, cx + dq, cy + dr, 'mountain', width, height);
        }
      }
    }
  }

  // Occasional oasis (plain patches)
  for (let i = 0; i < 2; i++) {
    const ox = 4 + Math.floor(Math.random() * (width - 8));
    const oy = 2 + Math.floor(Math.random() * (height - 4));
    for (let dq = -1; dq <= 1; dq++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (Math.random() < 0.5) {
          safeSet(terrain, ox + dq, oy + dr, 'plain', width, height);
        }
      }
    }
  }

  // No rivers in arid maps

  clearSpawnAreas(terrain, width, height);
  return terrain;
}

/* ─── Siege Outer-Wall Terrain Generators ─── */

function fillSiegeOutside(
  terrain: TerrainType[][],
  width: number,
  height: number,
  wallLeft: number,
  wallRight: number,
  wallTop: number,
  wallBottom: number,
  battleTerrain: BattleTerrainType,
) {
  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      // Only fill outside hexes
      if (terrain[q][r] !== 'plain') continue;
      const inside = q > wallLeft && q < wallRight && r > wallTop && r < wallBottom;
      if (inside) continue;
      // Check if adjacent to wall — keep clear for movement
      const distToWall = Math.min(
        Math.abs(q - wallLeft), Math.abs(q - wallRight),
        Math.abs(r - wallTop), Math.abs(r - wallBottom),
      );
      if (distToWall <= 1) continue;
      // Skip spawn columns
      if (q < 2 || q >= width - 2) continue;

      switch (battleTerrain) {
        case 'plains': {
          const rand = Math.random();
          if (rand < 0.12) terrain[q][r] = 'forest';
          else if (rand < 0.16) terrain[q][r] = 'mountain';
          break;
        }
        case 'wetland': {
          const rand = Math.random();
          if (rand < 0.15) terrain[q][r] = 'swamp';
          else if (rand < 0.22) terrain[q][r] = 'forest';
          break;
        }
        case 'highland': {
          const rand = Math.random();
          if (rand < 0.25) terrain[q][r] = 'mountain';
          else if (rand < 0.35) terrain[q][r] = 'forest';
          break;
        }
        case 'arid': {
          const rand = Math.random();
          if (rand < 0.50) terrain[q][r] = 'sand';
          else if (rand < 0.60) terrain[q][r] = 'mountain';
          break;
        }
      }
    }
  }

  // Wetland siege: add a river crossing outside the west wall
  if (battleTerrain === 'wetland') {
    const riverQ = Math.max(2, wallLeft - 3);
    for (let r = 0; r < height; r++) {
      const rq = riverQ + Math.floor(Math.sin(r * 0.4) * 1);
      if (rq >= 2 && rq < wallLeft - 1) {
        terrain[rq][r] = 'river';
      }
    }
    // Bridges for passage
    const bridgeR1 = Math.floor(height / 3);
    const bridgeR2 = Math.floor((2 * height) / 3);
    for (const br of [bridgeR1, bridgeR2]) {
      const bq = riverQ + Math.floor(Math.sin(br * 0.4) * 1);
      if (bq >= 2 && bq < wallLeft - 1) {
        terrain[bq][br] = 'bridge';
      }
    }
  }
}

/* ─── Public API ─── */

export function generateSiegeMap(width: number, height: number, battleTerrain: BattleTerrainType = 'plains'): BattleMap {
  const terrain: TerrainType[][] = initTerrain(width, height);

  // Wall rectangle bounds
  const wallLeft = DEFAULT_WALL_MARGIN + 1;
  const wallRight = width - DEFAULT_WALL_MARGIN - 2;
  const wallTop = DEFAULT_WALL_MARGIN;
  const wallBottom = height - DEFAULT_WALL_MARGIN - 1;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // Gate positions: midpoint of each wall side
  const gatePositions = new Set<string>([
    `${wallLeft},${centerY}`,    // west gate
    `${wallRight},${centerY}`,   // east gate
    `${centerX},${wallTop}`,     // north gate
    `${centerX},${wallBottom}`,  // south gate
  ]);

  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      const key = `${q},${r}`;
      const onWallEdge =
        ((q === wallLeft || q === wallRight) && r >= wallTop && r <= wallBottom) ||
        ((r === wallTop || r === wallBottom) && q >= wallLeft && q <= wallRight);

      if (gatePositions.has(key)) {
        terrain[q][r] = 'gate';
      } else if (onWallEdge) {
        terrain[q][r] = 'city'; // wall segments (impassable)
      } else if (q > wallLeft && q < wallRight && r > wallTop && r < wallBottom) {
        terrain[q][r] = 'plain'; // interior
      }
      // else: remains 'plain' — to be filled by terrain generator below
    }
  }

  // Fill outside walls with terrain-specific features
  fillSiegeOutside(terrain, width, height, wallLeft, wallRight, wallTop, wallBottom, battleTerrain);

  // Clear spawn areas
  clearSpawnAreas(terrain, width, height);

  return { width, height, terrain };
}

export function generateFieldBattleMap(width: number, height: number, battleTerrain: BattleTerrainType = 'plains'): BattleMap {
  let terrain: TerrainType[][];

  switch (battleTerrain) {
    case 'wetland':
      terrain = generateFieldWetland(width, height);
      break;
    case 'highland':
      terrain = generateFieldHighland(width, height);
      break;
    case 'arid':
      terrain = generateFieldArid(width, height);
      break;
    case 'plains':
    default:
      terrain = generateFieldPlains(width, height);
      break;
  }

  return { width, height, terrain };
}

export function generateNavalMap(width: number, height: number): BattleMap {
  const terrain: TerrainType[][] = [];

  for (let q = 0; q < width; q++) {
    terrain[q] = [];
    for (let r = 0; r < height; r++) {
      const rand = Math.random();
      // Mostly river
      if (rand < 0.8) terrain[q][r] = 'river';
      else if (rand < 0.9) terrain[q][r] = 'plain'; // Islands
      else terrain[q][r] = 'mountain'; // Reefs?
    }
  }

  return { width, height, terrain };
}

export function getGatePositions(map: BattleMap): { q: number; r: number }[] {
  const gates: { q: number; r: number }[] = [];

  for (let q = 0; q < map.width; q++) {
    for (let r = 0; r < map.height; r++) {
      if (map.terrain[q][r] === 'gate') {
        gates.push({ q, r });
      }
    }
  }

  return gates;
}

/** Check if a hex is inside the wall perimeter of a siege map */
export function isInsideWalls(q: number, r: number, width: number, height: number): boolean {
  const wallLeft = DEFAULT_WALL_MARGIN + 1;
  const wallRight = width - DEFAULT_WALL_MARGIN - 2;
  const wallTop = DEFAULT_WALL_MARGIN;
  const wallBottom = height - DEFAULT_WALL_MARGIN - 1;
  return q > wallLeft && q < wallRight && r > wallTop && r < wallBottom;
}

export function isSiegeBattle(defenderCityId: number): boolean {
  return defenderCityId > 0;
}
