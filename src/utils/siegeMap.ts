import type { BattleMap, TerrainType } from '../types/battle';

/**
 * Siege map layout (15x15):
 *
 * Attackers spawn on the left (x=1..2).
 * A rectangular wall ring sits around the city center.
 * Gates are placed at the cardinal midpoints of each wall side.
 * Interior is plain terrain.
 * Area near walls is clear (plain/forest) so attackers can reach gates.
 * Mountains/forests appear further from the walls for tactical variety.
 */

const DEFAULT_WALL_MARGIN = 3; // distance from edge to wall ring

export function generateSiegeMap(width: number, height: number): BattleMap {
  const terrain: TerrainType[][] = [];

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
    terrain[q] = [];
    for (let r = 0; r < height; r++) {
      const key = `${q},${r}`;
      const onWallEdge =
        (q === wallLeft || q === wallRight) && r >= wallTop && r <= wallBottom ||
        (r === wallTop || r === wallBottom) && q >= wallLeft && q <= wallRight;

      if (gatePositions.has(key)) {
        terrain[q][r] = 'gate';
      } else if (onWallEdge) {
        terrain[q][r] = 'city'; // wall segments (impassable)
      } else if (q > wallLeft && q < wallRight && r > wallTop && r < wallBottom) {
        // Inside the walls — plain terrain
        terrain[q][r] = 'plain';
      } else {
        // Outside the walls
        // Keep area adjacent to walls clear for movement
        const distToWall = Math.min(
          Math.abs(q - wallLeft), Math.abs(q - wallRight),
          Math.abs(r - wallTop), Math.abs(r - wallBottom)
        );
        if (distToWall <= 1) {
          terrain[q][r] = 'plain';
        } else {
          const rand = Math.random();
          if (rand < 0.12) terrain[q][r] = 'forest';
          else if (rand < 0.16) terrain[q][r] = 'mountain';
          else terrain[q][r] = 'plain';
        }
      }
    }
  }

  return { width, height, terrain };
}

export function generateFieldBattleMap(width: number, height: number): BattleMap {
  const terrain: TerrainType[][] = [];

  // Generate coherent terrain using a simple approach:
  // 1. Start with all plains
  // 2. Place 1-2 forest clusters
  // 3. Optionally place a river or mountain ridge
  // 4. Ensure spawn areas (left and right columns) are clear

  for (let q = 0; q < width; q++) {
    terrain[q] = [];
    for (let r = 0; r < height; r++) {
      terrain[q][r] = 'plain';
    }
  }

  // Place 2-3 forest clusters
  const numForests = 2 + Math.floor(Math.random() * 2);
  for (let f = 0; f < numForests; f++) {
    const cx = 3 + Math.floor(Math.random() * (width - 6));
    const cy = 2 + Math.floor(Math.random() * (height - 4));
    const size = 2 + Math.floor(Math.random() * 2);
    for (let dq = -size; dq <= size; dq++) {
      for (let dr = -size; dr <= size; dr++) {
        const nq = cx + dq;
        const nr = cy + dr;
        if (nq >= 2 && nq < width - 2 && nr >= 0 && nr < height) {
          const dist = Math.abs(dq) + Math.abs(dr);
          if (dist <= size && Math.random() < 0.7) {
            terrain[nq][nr] = 'forest';
          }
        }
      }
    }
  }

  // 50% chance: place a mountain ridge (small diagonal or horizontal line)
  if (Math.random() < 0.5) {
    const ridgeY = 3 + Math.floor(Math.random() * (height - 6));
    const ridgeStartX = 4 + Math.floor(Math.random() * (width - 8));
    const ridgeLen = 2 + Math.floor(Math.random() * 3);
    const ridgeDir = Math.random() < 0.5 ? 0 : 1; // 0 = horizontal, 1 = diagonal
    for (let i = 0; i < ridgeLen; i++) {
      const mq = ridgeStartX + i;
      const mr = ridgeY + (ridgeDir === 1 ? i : 0);
      if (mq >= 2 && mq < width - 2 && mr >= 0 && mr < height) {
        terrain[mq][mr] = 'mountain';
      }
    }
  }

  // 40% chance: place a river (vertical or diagonal stream)
  if (Math.random() < 0.4) {
    const riverX = 4 + Math.floor(Math.random() * (width - 8));
    for (let r = 0; r < height; r++) {
      const rq = riverX + Math.floor(Math.sin(r * 0.5) * 1.5);
      if (rq >= 2 && rq < width - 2) {
        terrain[rq][r] = 'river';
      }
    }
    // Add a bridge at the midpoint
    const bridgeR = Math.floor(height / 2);
    const bridgeQ = riverX + Math.floor(Math.sin(bridgeR * 0.5) * 1.5);
    if (bridgeQ >= 2 && bridgeQ < width - 2) {
      terrain[bridgeQ][bridgeR] = 'bridge';
    }
  }

  // Clear spawn areas (columns 0-1 and width-2 to width-1)
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < 2; q++) terrain[q][r] = 'plain';
    for (let q = width - 2; q < width; q++) terrain[q][r] = 'plain';
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

export function isSiegeBattle(defenderCityId: number): boolean {
  return defenderCityId > 0;
}
