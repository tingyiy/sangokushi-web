import { describe, test, expect } from 'vitest';
import { getSeason } from './mapData';

describe('getSeason', () => {
  test('months 1-3 are spring', () => {
    expect(getSeason(1)).toBe('spring');
    expect(getSeason(2)).toBe('spring');
    expect(getSeason(3)).toBe('spring');
  });

  test('months 4-6 are summer', () => {
    expect(getSeason(4)).toBe('summer');
    expect(getSeason(5)).toBe('summer');
    expect(getSeason(6)).toBe('summer');
  });

  test('months 7-9 are autumn', () => {
    expect(getSeason(7)).toBe('autumn');
    expect(getSeason(8)).toBe('autumn');
    expect(getSeason(9)).toBe('autumn');
  });

  test('months 10-12 are winter', () => {
    expect(getSeason(10)).toBe('winter');
    expect(getSeason(11)).toBe('winter');
    expect(getSeason(12)).toBe('winter');
  });
});
