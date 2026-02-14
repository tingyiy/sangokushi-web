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
