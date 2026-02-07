export interface Hex {
  q: number;
  r: number;
}

export interface Cube {
  x: number;
  y: number;
  z: number;
}

export function axialToCube(hex: Hex): Cube {
  return {
    x: hex.q,
    y: hex.r,
    z: -hex.q - hex.r
  };
}

export function cubeToAxial(cube: Cube): Hex {
  return {
    q: cube.x,
    r: cube.y
  };
}

export function getDistance(a: Hex, b: Hex): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return (Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y) + Math.abs(ac.z - bc.z)) / 2;
}

export const HEX_DIRECTIONS: Hex[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export function getNeighbor(hex: Hex, direction: number): Hex {
  const dir = HEX_DIRECTIONS[direction % 6];
  return {
    q: hex.q + dir.q,
    r: hex.r + dir.r
  };
}

export function getNeighbors(hex: Hex): Hex[] {
  return HEX_DIRECTIONS.map(dir => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r
  }));
}

// Flat-topped hex to pixel conversion
export function hexToPixel(hex: Hex, size: number): { x: number; y: number } {
  const x = size * (3 / 2 * hex.q);
  const y = size * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

// Pixel to flat-topped hex conversion
export function pixelToHex(x: number, y: number, size: number): Hex {
  const q = (2 / 3 * x) / size;
  const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / size;
  return roundHex({ q, r });
}

function roundHex(hex: Hex): Hex {
  const { x, y, z } = axialToCube(hex);
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const x_diff = Math.abs(rx - x);
  const y_diff = Math.abs(ry - y);
  const z_diff = Math.abs(rz - z);

  if (x_diff > y_diff && x_diff > z_diff) {
    rx = -ry - rz;
  } else if (y_diff > z_diff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return cubeToAxial({ x: rx, y: ry, z: rz });
}
