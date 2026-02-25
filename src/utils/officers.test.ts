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
  getRankSlots,
  meetsRankRequirements,
  hasRankSlot,
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

  describe('getMaxTroops (quadratic: ldr² × 3 × rankMult)', () => {
    // baseOfficer: leadership 80, rank common (×0.80)
    // 80² × 3 × 0.80 = 15360
    test('common rank: ldr² × 3 × 0.80', () => {
      expect(getMaxTroops(baseOfficer)).toBe(15360);
    });

    test('ruler: ldr² × 3 × 3.00, capped at 80000', () => {
      // leadership 80, isRuler → min(80² × 3 × 3.00, 80000) = min(57600, 80000) = 57600
      expect(getMaxTroops(baseOfficer, true)).toBe(57600);
    });

    test('governor: ldr² × 3 × 1.30', () => {
      const governor = { ...baseOfficer, rank: 'governor' as const };
      // 80² × 3 × 1.30 = 24960
      expect(getMaxTroops(governor)).toBe(24960);
    });

    test('viceroy: ldr² × 3 × 1.50', () => {
      const viceroy = { ...baseOfficer, rank: 'viceroy' as const };
      // 80² × 3 × 1.50 = 28800
      expect(getMaxTroops(viceroy)).toBe(28800);
    });

    test('general: ldr² × 3 × 1.00', () => {
      const general = { ...baseOfficer, rank: 'general' as const };
      // 80² × 3 × 1.00 = 19200
      expect(getMaxTroops(general)).toBe(19200);
    });

    test('advisor: ldr² × 3 × 0.50', () => {
      const advisor = { ...baseOfficer, rank: 'advisor' as const };
      // 80² × 3 × 0.50 = 9600
      expect(getMaxTroops(advisor)).toBe(9600);
    });

    test('attendant: ldr² × 3 × 0.70', () => {
      const attendant = { ...baseOfficer, rank: 'attendant' as const };
      // 80² × 3 × 0.70 = 13440
      expect(getMaxTroops(attendant)).toBe(13440);
    });

    test('ruler cap applies to any rank', () => {
      const rulerAdvisor = { ...baseOfficer, rank: 'advisor' as const };
      // leadership 80 → 80² × 3 × 3.00 = 57600 (under cap)
      expect(getMaxTroops(rulerAdvisor, true)).toBe(57600);
    });

    test('high-leadership ruler is capped at 80000', () => {
      // leadership 100, ruler → min(100² × 3 × 3.00, 80000) = min(90000, 80000) = 80000
      const strongRuler = { ...baseOfficer, leadership: 100 };
      expect(getMaxTroops(strongRuler, true)).toBe(80000);
    });

    test('applies treasure leadership bonus', () => {
      const withHorse = { ...baseOfficer, treasureId: 13 };
      expect(getMaxTroops(withHorse)).toBeGreaterThan(getMaxTroops(baseOfficer));
    });

    test('realistic: 曹操 (ldr 95, ruler) → 80k (capped)', () => {
      const caoCao = { ...baseOfficer, leadership: 95 };
      // min(95² × 3 × 3.00, 80000) = min(81225, 80000) = 80000
      expect(getMaxTroops(caoCao, true)).toBe(80000);
    });

    test('realistic: 關羽 (ldr 96, governor) → ~36k', () => {
      const guanYu = { ...baseOfficer, leadership: 96, rank: 'governor' as const };
      // 96² × 3 × 1.30 = 35942
      expect(getMaxTroops(guanYu)).toBe(35942);
    });

    test('realistic: 張飛 (ldr 75, general) → ~17k', () => {
      const zhangFei = { ...baseOfficer, leadership: 75, rank: 'general' as const };
      // 75² × 3 × 1.00 = 16875
      expect(getMaxTroops(zhangFei)).toBe(16875);
    });

    test('realistic: 諸葛亮 (ldr 82, advisor) → ~10k', () => {
      const zhugeLiang = { ...baseOfficer, leadership: 82, rank: 'advisor' as const };
      // 82² × 3 × 0.50 = 10086
      expect(getMaxTroops(zhugeLiang)).toBe(10086);
    });

    test('realistic: weak officer (ldr 40, common) → ~4k', () => {
      const weak = { ...baseOfficer, leadership: 40, rank: 'common' as const };
      // 40² × 3 × 0.80 = 3840
      expect(getMaxTroops(weak)).toBe(3840);
    });
  });

  describe('R-006: Rank Slot Limits & Eligibility', () => {
    describe('getRankSlots', () => {
      test('1 city: 1 advisor, 1 viceroy, 2 generals, 1 attendant', () => {
        const slots = getRankSlots(1);
        expect(slots.advisor).toBe(1);
        expect(slots.viceroy).toBe(1);
        expect(slots.general).toBe(2);
        expect(slots.attendant).toBe(1);
        expect(slots.governor).toBe(0);
        expect(slots.common).toBeNull();
      });

      test('5 cities: 1 advisor, 1 viceroy, 10 generals, 5 attendants', () => {
        const slots = getRankSlots(5);
        expect(slots.advisor).toBe(1);
        expect(slots.viceroy).toBe(1);
        expect(slots.general).toBe(10);
        expect(slots.attendant).toBe(5);
      });

      test('12 cities: 1 advisor, 1 viceroy, 24 generals, 12 attendants', () => {
        const slots = getRankSlots(12);
        expect(slots.advisor).toBe(1);
        expect(slots.viceroy).toBe(1);
        expect(slots.general).toBe(24);
        expect(slots.attendant).toBe(12);
      });
    });

    describe('meetsRankRequirements', () => {
      test('advisor requires intelligence >= 90', () => {
        expect(meetsRankRequirements({ ...baseOfficer, intelligence: 89 }, 'advisor')).toBe(false);
        expect(meetsRankRequirements({ ...baseOfficer, intelligence: 90 }, 'advisor')).toBe(true);
      });

      test('viceroy requires leadership >= 85', () => {
        expect(meetsRankRequirements({ ...baseOfficer, leadership: 84 }, 'viceroy')).toBe(false);
        expect(meetsRankRequirements({ ...baseOfficer, leadership: 85 }, 'viceroy')).toBe(true);
      });

      test('general requires leadership >= 70 OR war >= 75', () => {
        expect(meetsRankRequirements({ ...baseOfficer, leadership: 69, war: 74 }, 'general')).toBe(false);
        expect(meetsRankRequirements({ ...baseOfficer, leadership: 70, war: 50 }, 'general')).toBe(true);
        expect(meetsRankRequirements({ ...baseOfficer, leadership: 50, war: 75 }, 'general')).toBe(true);
      });

      test('common and attendant have no requirements', () => {
        const weak = { ...baseOfficer, leadership: 10, war: 10, intelligence: 10, politics: 10 };
        expect(meetsRankRequirements(weak, 'common')).toBe(true);
        expect(meetsRankRequirements(weak, 'attendant')).toBe(true);
      });
    });

    describe('hasRankSlot', () => {
      const faction1Officers = [
        { ...baseOfficer, id: 1, factionId: 1, rank: 'advisor' as const },
        { ...baseOfficer, id: 2, factionId: 1, rank: 'general' as const },
        { ...baseOfficer, id: 3, factionId: 1, rank: 'common' as const },
      ];

      test('advisor slot full when 1 already assigned (1-city faction)', () => {
        expect(hasRankSlot('advisor', 1, faction1Officers, 1)).toBe(false);
      });

      test('advisor slot open when excluding current holder', () => {
        expect(hasRankSlot('advisor', 1, faction1Officers, 1, 1)).toBe(true);
      });

      test('general slot open when under limit', () => {
        // 1 city → 2 general slots, only 1 used
        expect(hasRankSlot('general', 1, faction1Officers, 1)).toBe(true);
      });

      test('governor is never promotable', () => {
        expect(hasRankSlot('governor', 1, faction1Officers, 5)).toBe(false);
      });

      test('common is always open', () => {
        expect(hasRankSlot('common', 1, faction1Officers, 1)).toBe(true);
      });
    });
  });
});
