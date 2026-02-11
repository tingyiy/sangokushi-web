import type { Officer, City } from '../types';

/**
 * Auto-assign the best available officer as governor for a city that has none.
 * Mutates the officers array in-place and returns the promoted officer (or null).
 */
export function autoAssignGovernorInPlace(officers: Officer[], cityId: number, factionId: number): Officer | null {
  const hasGov = officers.some(o => o.cityId === cityId && o.factionId === factionId && o.isGovernor);
  if (hasGov) return null;
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
