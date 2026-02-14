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
  getMaxTroops,
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
  skills: ['rumor'] as RTK4Skill[],
  factionId: 1,
  cityId: 1,
  acted: false,
  loyalty: 80,
  isGovernor: false,
  treasureId: null,
  rank: 'common',
  relationships: [],
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

  describe('getMaxTroops', () => {
    test('common rank: leadership × 1000 × 1.0', () => {
      // leadership 80, rank common → 80 × 1000 × 1.0 = 80000
      expect(getMaxTroops(baseOfficer)).toBe(80000);
    });

    test('ruler: leadership × 1000 × 1.30', () => {
      // leadership 80, isRuler → 80 × 1000 × 1.30 = 104000
      expect(getMaxTroops(baseOfficer, true)).toBe(104000);
    });

    test('governor: leadership × 1000 × 1.10', () => {
      const governor = { ...baseOfficer, rank: 'governor' as const };
      // 80 × 1000 × 1.10 = 88000
      expect(getMaxTroops(governor)).toBe(88000);
    });

    test('viceroy: leadership × 1000 × 1.20', () => {
      const viceroy = { ...baseOfficer, rank: 'viceroy' as const };
      // 80 × 1000 × 1.20 = 96000
      expect(getMaxTroops(viceroy)).toBe(96000);
    });

    test('general: leadership × 1000 × 1.00', () => {
      const general = { ...baseOfficer, rank: 'general' as const };
      expect(getMaxTroops(general)).toBe(80000);
    });

    test('advisor: leadership × 1000 × 0.80', () => {
      const advisor = { ...baseOfficer, rank: 'advisor' as const };
      // 80 × 1000 × 0.80 = 64000
      expect(getMaxTroops(advisor)).toBe(64000);
    });

    test('attendant: leadership × 1000 × 0.90', () => {
      const attendant = { ...baseOfficer, rank: 'attendant' as const };
      // 80 × 1000 × 0.90 = 72000
      expect(getMaxTroops(attendant)).toBe(72000);
    });

    test('ruler overrides any rank', () => {
      // Even an advisor who is ruler gets the ruler multiplier
      const rulerAdvisor = { ...baseOfficer, rank: 'advisor' as const };
      expect(getMaxTroops(rulerAdvisor, true)).toBe(104000);
    });

    test('applies treasure leadership bonus', () => {
      // Horse treasure (id=13) gives +leadership
      const withHorse = { ...baseOfficer, treasureId: 13 };
      const maxNoHorse = getMaxTroops(baseOfficer);
      const maxWithHorse = getMaxTroops(withHorse);
      expect(maxWithHorse).toBeGreaterThan(maxNoHorse);
    });

    test('realistic example: 曹操 (leadership 95, ruler)', () => {
      const caoCao = { ...baseOfficer, leadership: 95 };
      // 95 × 1000 × 1.30 = 123500
      expect(getMaxTroops(caoCao, true)).toBe(123500);
    });

    test('realistic example: 關羽 (leadership 96, governor)', () => {
      const guanYu = { ...baseOfficer, leadership: 96, rank: 'governor' as const };
      // 96 × 1000 × 1.10 = 105600
      expect(getMaxTroops(guanYu)).toBe(105600);
    });

    test('realistic example: 諸葛亮 (leadership 82, advisor)', () => {
      const zhugeLiang = { ...baseOfficer, leadership: 82, rank: 'advisor' as const };
      // 82 × 1000 × 0.80 = 65600
      expect(getMaxTroops(zhugeLiang)).toBe(65600);
    });
  });
});
