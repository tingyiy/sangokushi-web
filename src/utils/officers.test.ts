import { describe, test, expect } from 'vitest';
import type { Officer, RTK4Skill } from '../types';
import {
  getEffectiveStats,
  getOfficerTreasure,
  getOfficerAge,
  isOfficerAlive,
  getTotalStats,
  getCombatStats,
  getMentalStats,
} from './officers';

const baseOfficer: Officer = {
  id: 1,
  name: '測試武將',
  portraitId: 1,
  birthYear: 160,
  deathYear: 220,
  leadership: 80,
  war: 85,
  intelligence: 70,
  politics: 65,
  charisma: 75,
  skills: ['流言'] as RTK4Skill[],
  factionId: 1,
  cityId: 1,
  stamina: 100,
  loyalty: 80,
  isGovernor: false,
  treasureId: null,
};

describe('officers', () => {
  describe('getEffectiveStats', () => {
    test('returns base stats when no treasure equipped', () => {
      const stats = getEffectiveStats(baseOfficer);
      expect(stats.leadership).toBe(80);
      expect(stats.war).toBe(85);
      expect(stats.intelligence).toBe(70);
      expect(stats.politics).toBe(65);
      expect(stats.charisma).toBe(75);
    });

    test('adds treasure bonuses correctly', () => {
      const officerWithTreasure: Officer = {
        ...baseOfficer,
        treasureId: 1, // 孟德新書: intelligence +5, politics +5
      };
      const stats = getEffectiveStats(officerWithTreasure);
      expect(stats.intelligence).toBe(75);
      expect(stats.politics).toBe(70);
    });

    test('caps stats at 100', () => {
      const officerWithHighStats: Officer = {
        ...baseOfficer,
        war: 99,
        treasureId: 9, // 方天畫戟: war +10
      };
      const stats = getEffectiveStats(officerWithHighStats);
      expect(stats.war).toBe(100); // Capped at 100
    });

    test('returns base stats for invalid treasure ID', () => {
      const officerWithInvalidTreasure: Officer = {
        ...baseOfficer,
        treasureId: 999,
      };
      const stats = getEffectiveStats(officerWithInvalidTreasure);
      expect(stats.leadership).toBe(80);
      expect(stats.war).toBe(85);
    });

    test('handles all treasure types', () => {
      // Test book
      const withBook = getEffectiveStats({ ...baseOfficer, treasureId: 1 });
      expect(withBook.intelligence).toBeGreaterThan(baseOfficer.intelligence);

      // Test sword
      const withSword = getEffectiveStats({ ...baseOfficer, treasureId: 5 });
      expect(withSword.war).toBeGreaterThan(baseOfficer.war);

      // Test weapon
      const withWeapon = getEffectiveStats({ ...baseOfficer, treasureId: 9 });
      expect(withWeapon.war).toBeGreaterThan(baseOfficer.war);

      // Test horse
      const withHorse = getEffectiveStats({ ...baseOfficer, treasureId: 13 });
      expect(withHorse.leadership).toBeGreaterThan(baseOfficer.leadership);

      // Test seal
      const withSeal = getEffectiveStats({ ...baseOfficer, treasureId: 17 });
      expect(withSeal.charisma).toBeGreaterThan(baseOfficer.charisma);
    });
  });

  describe('getOfficerTreasure', () => {
    test('returns undefined when no treasure equipped', () => {
      expect(getOfficerTreasure(baseOfficer)).toBeUndefined();
    });

    test('returns treasure object when equipped', () => {
      const officerWithTreasure = { ...baseOfficer, treasureId: 1 };
      const treasure = getOfficerTreasure(officerWithTreasure);
      expect(treasure).toBeDefined();
      expect(treasure?.name).toBe('孟德新書');
    });

    test('returns undefined for invalid treasure ID', () => {
      const officerWithInvalidTreasure = { ...baseOfficer, treasureId: 999 };
      expect(getOfficerTreasure(officerWithInvalidTreasure)).toBeUndefined();
    });
  });

  describe('getOfficerAge', () => {
    test('calculates age correctly', () => {
      expect(getOfficerAge(baseOfficer, 190)).toBe(30);
      expect(getOfficerAge(baseOfficer, 200)).toBe(40);
      expect(getOfficerAge(baseOfficer, 160)).toBe(0);
    });

    test('returns negative for years before birth', () => {
      expect(getOfficerAge(baseOfficer, 150)).toBe(-10);
    });
  });

  describe('isOfficerAlive', () => {
    test('returns true for years within lifespan', () => {
      expect(isOfficerAlive(baseOfficer, 160)).toBe(true);
      expect(isOfficerAlive(baseOfficer, 190)).toBe(true);
      expect(isOfficerAlive(baseOfficer, 220)).toBe(true);
    });

    test('returns false for years before birth', () => {
      expect(isOfficerAlive(baseOfficer, 150)).toBe(false);
      expect(isOfficerAlive(baseOfficer, 159)).toBe(false);
    });

    test('returns false for years after death', () => {
      expect(isOfficerAlive(baseOfficer, 221)).toBe(false);
      expect(isOfficerAlive(baseOfficer, 250)).toBe(false);
    });
  });

  describe('getTotalStats', () => {
    test('calculates total correctly', () => {
      const total = getTotalStats(baseOfficer);
      expect(total).toBe(80 + 85 + 70 + 65 + 75); // 375
    });

    test('includes treasure bonuses', () => {
      const officerWithTreasure = { ...baseOfficer, treasureId: 1 };
      const total = getTotalStats(officerWithTreasure);
      expect(total).toBe(375 + 10); // +5 int, +5 pol
    });
  });

  describe('getCombatStats', () => {
    test('returns leadership + war', () => {
      expect(getCombatStats(baseOfficer)).toBe(80 + 85); // 165
    });

    test('includes treasure bonuses', () => {
      const officerWithWeapon = { ...baseOfficer, treasureId: 9 }; // war +10
      expect(getCombatStats(officerWithWeapon)).toBe(80 + 95); // 175
    });
  });

  describe('getMentalStats', () => {
    test('returns intelligence + politics', () => {
      expect(getMentalStats(baseOfficer)).toBe(70 + 65); // 135
    });

    test('includes treasure bonuses', () => {
      const officerWithBook = { ...baseOfficer, treasureId: 1 }; // int +5, pol +5
      expect(getMentalStats(officerWithBook)).toBe(75 + 70); // 145
    });
  });
});
