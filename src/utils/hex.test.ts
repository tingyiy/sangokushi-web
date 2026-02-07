import { axialToCube, cubeToAxial, getDistance, getNeighbor, getNeighbors, hexToPixel, pixelToHex } from './hex';
import type { Hex } from './hex';

describe('Hex Utilities', () => {
  test('axialToCube converts correctly', () => {
    const hex: Hex = { q: 1, r: -1 };
    const cube = axialToCube(hex);
    expect(cube).toEqual({ x: 1, y: -1, z: 0 });
    expect(cube.x + cube.y + cube.z).toBe(0);
  });

  test('cubeToAxial converts correctly', () => {
    const cube = { x: 2, y: -3, z: 1 };
    const hex = cubeToAxial(cube);
    expect(hex).toEqual({ q: 2, r: -3 });
  });

  test('getDistance calculates correctly', () => {
    const a: Hex = { q: 0, r: 0 };
    const b: Hex = { q: 2, r: 0 };
    expect(getDistance(a, b)).toBe(2);

    const c: Hex = { q: 1, r: -1 };
    expect(getDistance(a, c)).toBe(1);

    const d: Hex = { q: -1, r: -1 };
    expect(getDistance(a, d)).toBe(2);
  });

  test('getNeighbor returns correct hex', () => {
    const hex: Hex = { q: 0, r: 0 };
    const neighbor = getNeighbor(hex, 0); // { q: 1, r: 0 }
    expect(neighbor).toEqual({ q: 1, r: 0 });
  });

  test('getNeighbors returns 6 neighbors', () => {
    const hex: Hex = { q: 0, r: 0 };
    const neighbors = getNeighbors(hex);
    expect(neighbors.length).toBe(6);
    expect(neighbors).toContainEqual({ q: 1, r: 0 });
    expect(neighbors).toContainEqual({ q: 0, r: 1 });
  });

  test('hexToPixel and pixelToHex are consistent', () => {
    const hex: Hex = { q: 2, r: 3 };
    const size = 10;
    const pixel = hexToPixel(hex, size);
    const resultHex = pixelToHex(pixel.x, pixel.y, size);
    expect(resultHex).toEqual(hex);
  });

  test('roundHex handles fractional coordinates', () => {
    // A point near (1, 0)
    const pixel = hexToPixel({ q: 1, r: 0 }, 10);
    const resultHex = pixelToHex(pixel.x + 2, pixel.y + 2, 10);
    expect(resultHex).toEqual({ q: 1, r: 0 });
  });
});
