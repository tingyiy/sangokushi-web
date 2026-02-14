import type { Officer, Treasure, OfficerRank } from '../types';
import { treasures } from '../data/treasures';

/**
 * Officer Utility Functions - Phase 1.3, 1.4
 * Provides functions for officer data manipulation and effective stat calculation
 */

/**
 * Rank-based multiplier for MaxTroops calculation.
 * Rulers get a special bonus detected via faction.rulerId (not stored in rank).
 */
const RANK_TROOP_MULTIPLIER: Record<OfficerRank, number> = {
  governor:  1.10,  // 太守 — regional commander
  viceroy:   1.20,  // 都督/丞相 — supreme commander
  general:   1.00,  // 將軍 — standard officer
  advisor:   0.80,  // 軍師 — strategist, not a field commander
  attendant: 0.90,  // 侍中 — court official
  common:    1.00,  // 一般 — baseline
};

/** Ruler multiplier (applied when officer is faction.rulerId) */
const RULER_TROOP_MULTIPLIER = 1.30;

/**
 * Calculate the maximum troops an officer can command in battle.
 * Formula: leadership × 1000 × rankMultiplier
 *
 * @param officer The officer
 * @param isRuler Whether this officer is the ruler of their faction
 * @returns Maximum troops (integer)
 */
export function getMaxTroops(officer: Officer, isRuler = false): number {
  const stats = getEffectiveStats(officer);
  const multiplier = isRuler ? RULER_TROOP_MULTIPLIER : RANK_TROOP_MULTIPLIER[officer.rank];
  return Math.floor(stats.leadership * 1000 * multiplier);
}

/** Get officer stats with treasure bonuses applied */
export function getEffectiveStats(officer: Officer): {
  leadership: number;
  war: number;
  intelligence: number;
  politics: number;
  charisma: number;
} {
  const base = {
    leadership: officer.leadership,
    war: officer.war,
    intelligence: officer.intelligence,
    politics: officer.politics,
    charisma: officer.charisma,
  };

  if (officer.treasureId === null) return base;

  const treasure = treasures.find(t => t.id === officer.treasureId);
  if (!treasure) return base;

  return {
    leadership: Math.min(100, base.leadership + (treasure.statBonuses.leadership ?? 0)),
    war: Math.min(100, base.war + (treasure.statBonuses.war ?? 0)),
    intelligence: Math.min(100, base.intelligence + (treasure.statBonuses.intelligence ?? 0)),
    politics: Math.min(100, base.politics + (treasure.statBonuses.politics ?? 0)),
    charisma: Math.min(100, base.charisma + (treasure.statBonuses.charisma ?? 0)),
  };
}

/** Get treasure equipped by an officer */
export function getOfficerTreasure(officer: Officer): Treasure | undefined {
  if (officer.treasureId === null) return undefined;
  return treasures.find(t => t.id === officer.treasureId);
}

/** Calculate officer age based on scenario year */
export function getOfficerAge(officer: Officer, currentYear: number): number {
  return currentYear - officer.birthYear;
}

/** Check if officer is alive in a given year */
export function isOfficerAlive(officer: Officer, currentYear: number): boolean {
  return currentYear >= officer.birthYear && currentYear <= officer.deathYear;
}

/** Get total stat sum (for comparing officer strength) */
export function getTotalStats(officer: Officer): number {
  const stats = getEffectiveStats(officer);
  return stats.leadership + stats.war + stats.intelligence + stats.politics + stats.charisma;
}

/** Get combat stats (leadership + war) */
export function getCombatStats(officer: Officer): number {
  const stats = getEffectiveStats(officer);
  return stats.leadership + stats.war;
}

/** Get mental stats (intelligence + politics) */
export function getMentalStats(officer: Officer): number {
  const stats = getEffectiveStats(officer);
  return stats.intelligence + stats.politics;
}
