import { getDistance, getNeighbors } from './hex';
import type { Hex } from './hex';
import type { TerrainType } from '../types/battle';

export const TERRAIN_COSTS: Record<TerrainType, number> = {
  plain: 1,
  forest: 2,
  mountain: 3,
  river: 4,
  city: 1,
  gate: 1,
  bridge: 1
};

interface PathNode {
  hex: Hex;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export function findPath(
  start: Hex,
  end: Hex,
  width: number,
  height: number,
  terrain: TerrainType[][],
  blockedHexes: Set<string>
): Hex[] | null {
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    hex: start,
    g: 0,
    h: getDistance(start, end),
    f: getDistance(start, end),
    parent: null
  };

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.hex.q === end.q && current.hex.r === end.r) {
      // Found path
      const path: Hex[] = [];
      let temp: PathNode | null = current;
      while (temp) {
        path.push(temp.hex);
        temp = temp.parent;
      }
      return path.reverse();
    }

    const key = `${current.hex.q},${current.hex.r}`;
    closedSet.add(key);

    const neighbors = getNeighbors(current.hex);
    for (const neighbor of neighbors) {
      // Check bounds
      // Assuming r is row and q is axial column
      // We need a way to map q,r to 2D array indices safely
      // For simplicity, let's assume terrain is indexed by q,r with some offset
      // or we just use a simplified check
      if (Math.abs(neighbor.q) > width || Math.abs(neighbor.r) > height) continue;

      const neighborKey = `${neighbor.q},${neighbor.r}`;
      if (closedSet.has(neighborKey) || blockedHexes.has(neighborKey)) continue;

      // Get terrain cost (default to 1 if outside)
      // This part needs careful mapping from q,r to terrain array
      // Let's assume a simple offset mapping for now:
      const qIdx = neighbor.q + Math.floor(width / 2);
      const rIdx = neighbor.r + Math.floor(height / 2);
      
      let moveCost = 1;
      if (terrain[qIdx] && terrain[qIdx][rIdx]) {
        moveCost = TERRAIN_COSTS[terrain[qIdx][rIdx]];
      } else {
        continue; // Outside map
      }

      const gScore = current.g + moveCost;
      let neighborNode = openSet.find(n => n.hex.q === neighbor.q && n.hex.r === neighbor.r);

      if (!neighborNode) {
        neighborNode = {
          hex: neighbor,
          g: gScore,
          h: getDistance(neighbor, end),
          f: gScore + getDistance(neighbor, end),
          parent: current
        };
        openSet.push(neighborNode);
      } else if (gScore < neighborNode.g) {
        neighborNode.g = gScore;
        neighborNode.f = gScore + neighborNode.h;
        neighborNode.parent = current;
      }
    }
  }

  return null;
}

export function getMoveRange(
  start: Hex,
  range: number,
  width: number,
  height: number,
  terrain: TerrainType[][],
  blockedHexes: Set<string>
): Map<string, number> {
  const visited = new Map<string, number>();
  const queue: { hex: Hex; cost: number }[] = [{ hex: start, cost: 0 }];
  visited.set(`${start.q},${start.r}`, 0);

  while (queue.length > 0) {
    const { hex, cost } = queue.shift()!;

    const neighbors = getNeighbors(hex);
    for (const neighbor of neighbors) {
      const qIdx = neighbor.q + Math.floor(width / 2);
      const rIdx = neighbor.r + Math.floor(height / 2);
      
      if (!terrain[qIdx] || !terrain[qIdx][rIdx]) continue;
      
      const neighborKey = `${neighbor.q},${neighbor.r}`;
      if (blockedHexes.has(neighborKey)) continue;

      const moveCost = TERRAIN_COSTS[terrain[qIdx][rIdx]];
      const totalCost = cost + moveCost;

      if (totalCost <= range) {
        if (!visited.has(neighborKey) || totalCost < visited.get(neighborKey)!) {
          visited.set(neighborKey, totalCost);
          queue.push({ hex: neighbor, cost: totalCost });
        }
      }
    }
  }

  return visited;
}
