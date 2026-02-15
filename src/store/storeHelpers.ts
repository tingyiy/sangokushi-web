import type { Officer, City, Faction } from '../types';

/**
 * Auto-assign a governor for a city that has none.
 * RTK IV rule: if the ruler is present in the city, they ARE the governor.
 * Otherwise picks the best officer by politics + leadership.
 * Mutates the officers array in-place and returns the promoted officer (or null).
 */
export function autoAssignGovernorInPlace(officers: Officer[], cityId: number, factionId: number, factions?: Faction[]): Officer | null {
  const hasGov = officers.some(o => o.cityId === cityId && o.factionId === factionId && o.isGovernor);
  if (hasGov) return null;
  const rulerId = factions?.find(f => f.id === factionId)?.rulerId;
  // RTK IV: ruler present in city → ruler is the governor
  if (rulerId != null) {
    const rulerIdx = officers.findIndex(o => o.id === rulerId && o.cityId === cityId && o.factionId === factionId);
    if (rulerIdx >= 0) {
      officers[rulerIdx] = { ...officers[rulerIdx], isGovernor: true };
      return officers[rulerIdx];
    }
  }
  const candidates = officers
    .filter(o => o.cityId === cityId && o.factionId === factionId)
    .sort((a, b) => (b.politics + b.leadership) - (a.politics + a.leadership));
  if (candidates.length === 0) return null;
  const idx = officers.findIndex(o => o.id === candidates[0].id);
  officers[idx] = { ...officers[idx], isGovernor: true };
  return officers[idx];
}

/** Compute which map edge the attacker approaches from based on city coordinates */
export function getAttackDirection(fromCity: City, toCity: City): 'north' | 'south' | 'east' | 'west' {
  const dx = fromCity.x - toCity.x; // positive = attacker is east of target
  const dy = fromCity.y - toCity.y; // positive = attacker is south of target (y increases downward)
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'east' : 'west';
  } else {
    return dy > 0 ? 'south' : 'north';
  }
}

/**
 * Compute Euclidean distance between two cities using map coordinates (0-100 scale).
 */
export function getCityDistance(cityA: { x: number; y: number }, cityB: { x: number; y: number }): number {
  const dx = cityA.x - cityB.x;
  const dy = cityA.y - cityB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute the arrival day for reinforcements marching from a source city to a battle at the target city.
 * Adjacent cities = 1 day delay, farther cities scale linearly.
 * Units from the attacking city itself arrive on day 1 (no delay).
 *
 * Formula: arrivalDay = 1 + floor(distance / 15)
 * - Adjacent cities (distance ~10-20): 1-2 days
 * - Moderate distance (~30): 3 days
 * - Far away (~60): 5 days
 * - Cross-map (~100): 7-8 days
 */
export function computeArrivalDay(
  sourceCity: { x: number; y: number },
  targetCity: { x: number; y: number },
  isSameCity: boolean,
): number {
  if (isSameCity) return 1;
  const distance = getCityDistance(sourceCity, targetCity);
  return 1 + Math.floor(distance / 15);
}
