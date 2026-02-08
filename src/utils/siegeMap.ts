import type { BattleMap, TerrainType } from '../types/battle';

function isWallPosition(q: number, r: number, width: number, height: number): boolean {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const wallRadius = Math.floor(Math.min(width, height) / 4);
  
  const dx = q - centerX;
  const dy = r - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return Math.abs(distance - wallRadius) < 1.5;
}

function isGatePosition(q: number, r: number, width: number, height: number): boolean {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const wallRadius = Math.floor(Math.min(width, height) / 4);
  
  const dx = q - centerX;
  const dy = r - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (Math.abs(distance - wallRadius) < 1.5) {
    if (q === centerX + wallRadius || q === centerX - wallRadius ||
        r === centerY + wallRadius || r === centerY - wallRadius) {
      return true;
    }
  }
  
  return false;
}

function isInsideWalls(q: number, r: number, width: number, height: number): boolean {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const wallRadius = Math.floor(Math.min(width, height) / 4);
  
  const dx = q - centerX;
  const dy = r - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance < wallRadius - 1;
}

export function generateSiegeMap(width: number, height: number): BattleMap {
  const terrain: TerrainType[][] = [];
  
  for (let q = 0; q < width; q++) {
    terrain[q] = [];
    for (let r = 0; r < height; r++) {
      if (isGatePosition(q, r, width, height)) {
        terrain[q][r] = 'gate';
      } else if (isWallPosition(q, r, width, height)) {
        terrain[q][r] = 'mountain';
      } else if (isInsideWalls(q, r, width, height)) {
        terrain[q][r] = 'city';
      } else {
        const rand = Math.random();
        if (rand < 0.1) terrain[q][r] = 'forest';
        else if (rand < 0.15) terrain[q][r] = 'mountain';
        else terrain[q][r] = 'plain';
      }
    }
  }
  
  return { width, height, terrain };
}

export function generateFieldBattleMap(width: number, height: number): BattleMap {
  const terrain: TerrainType[][] = [];
  
  for (let q = 0; q < width; q++) {
    terrain[q] = [];
    for (let r = 0; r < height; r++) {
      const rand = Math.random();
      if (rand < 0.1) terrain[q][r] = 'mountain';
      else if (rand < 0.2) terrain[q][r] = 'forest';
      else if (rand < 0.25) terrain[q][r] = 'river';
      else terrain[q][r] = 'plain';
    }
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
