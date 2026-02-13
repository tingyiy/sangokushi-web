import { describe, it, expect } from 'vitest';
import { scenarios } from './scenarios';
import { baseCities } from './cities';
import { baseOfficers } from './officers';

describe('Scenarios Data Integrity', () => {
  it('should have 6 scenarios', () => {
    expect(scenarios.length).toBe(6);
  });

  scenarios.forEach(scenario => {
    describe(`Scenario ${scenario.id}: ${scenario.name}`, () => {
      it('should have valid faction rulers', () => {
        scenario.factions.forEach(faction => {
          const ruler = baseOfficers.find(o => o.id === faction.rulerId);
          expect(ruler).toBeDefined();
        });
      });

      it('should have valid city references', () => {
        scenario.cities.forEach(city => {
          const base = baseCities.find(c => c.id === city.id);
          expect(base).toBeDefined();
          if (city.factionId !== null) {
            const faction = scenario.factions.find(f => f.id === city.factionId);
            expect(faction).toBeDefined();
          }
        });
      });

      it('should have valid officer assignments', () => {
        scenario.officers.forEach(officer => {
          // Check base officer exists
          const base = baseOfficers.find(o => o.id === officer.id);
          expect(base).toBeDefined();

          // Check faction exists (if assigned)
          if (officer.factionId !== null) {
            const faction = scenario.factions.find(f => f.id === officer.factionId);
            expect(faction).toBeDefined();
          }

          // Check city exists
          const city = scenario.cities.find(c => c.id === officer.cityId);
          expect(city).toBeDefined();
        });
      });

      it('should assign rulers correctly', () => {
        scenario.factions.forEach(faction => {
          // Ruler MUST be an officer in the scenario
          const rulerInScenario = scenario.officers.find(o => o.id === faction.rulerId);
          expect(rulerInScenario).toBeDefined();
          expect(rulerInScenario?.factionId).toBe(faction.id);
        });
      });

      it('should have valid advisors', () => {
        scenario.factions.forEach(faction => {
          if (faction.advisorId !== null) {
            const advisor = baseOfficers.find(o => o.id === faction.advisorId);
            expect(advisor).toBeDefined();
            const advisorInScenario = scenario.officers.find(o => o.id === faction.advisorId);
            if (advisorInScenario) {
              expect(advisorInScenario.factionId).toBe(faction.id);
            }
          }
        });
      });

      it('every faction-owned city has at least one officer', () => {
        const factionCities = scenario.cities.filter(c => c.factionId !== null);
        factionCities.forEach(city => {
          const officers = scenario.officers.filter(
            o => o.factionId === city.factionId && o.cityId === city.id
          );
          expect(
            officers.length,
            `City "${city.name}" (id=${city.id}, faction=${city.factionId}) has no officers`
          ).toBeGreaterThanOrEqual(1);
        });
      });

      it('every faction-owned city has exactly one governor', () => {
        const factionCities = scenario.cities.filter(c => c.factionId !== null);
        factionCities.forEach(city => {
          const governors = scenario.officers.filter(
            o => o.factionId === city.factionId && o.cityId === city.id && o.isGovernor
          );
          expect(
            governors.length,
            `City "${city.name}" (id=${city.id}, faction=${city.factionId}) has ${governors.length} governors`
          ).toBe(1);
        });
      });

      it('no duplicate city IDs', () => {
        const ids = scenario.cities.map(c => c.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(dupes, `Duplicate city IDs: ${dupes.join(', ')}`).toEqual([]);
      });

      it('no duplicate officer IDs', () => {
        const ids = scenario.officers.map(o => o.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(dupes, `Duplicate officer IDs: ${dupes.join(', ')}`).toEqual([]);
      });

      it('unoccupied cities have no faction officers or governors', () => {
        const neutralCities = scenario.cities.filter(c => c.factionId === null);
        neutralCities.forEach(city => {
          const factionOfficers = scenario.officers.filter(
            o => o.cityId === city.id && o.factionId !== null
          );
          expect(
            factionOfficers.length,
            `Neutral city "${city.name}" (id=${city.id}) has ${factionOfficers.length} faction officer(s): ${factionOfficers.map(o => o.name).join(', ')}`
          ).toBe(0);
        });
      });

      it('faction officers are only in cities owned by their faction or neutral', () => {
        scenario.officers.forEach(officer => {
          if (officer.factionId === null) return; // unaffiliated officers can be anywhere
          const city = scenario.cities.find(c => c.id === officer.cityId);
          if (!city) return; // covered by other test
          if (city.factionId === null) return; // neutral city is OK for unaffiliated
          expect(
            city.factionId,
            `Officer "${officer.name}" (faction=${officer.factionId}) is in city "${city.name}" (faction=${city.factionId})`
          ).toBe(officer.factionId);
        });
      });

      it('each faction\'s cities form a connected subgraph', () => {
        const cityMap = new Map(baseCities.map(c => [c.id, c]));
        const errors: string[] = [];

        scenario.factions.forEach(faction => {
          const factionCityIds = scenario.cities
            .filter(c => c.factionId === faction.id)
            .map(c => c.id);

          if (factionCityIds.length <= 1) return; // 0 or 1 city is trivially connected

          // BFS from the first city, only traversing edges between faction cities
          const factionSet = new Set(factionCityIds);
          const visited = new Set<number>();
          const queue = [factionCityIds[0]];
          visited.add(queue[0]);

          while (queue.length > 0) {
            const currentId = queue.shift()!;
            const base = cityMap.get(currentId);
            if (!base) continue;
            for (const adjId of base.adjacentCityIds) {
              if (factionSet.has(adjId) && !visited.has(adjId)) {
                visited.add(adjId);
                queue.push(adjId);
              }
            }
          }

          const unreached = factionCityIds.filter(id => !visited.has(id));
          if (unreached.length > 0) {
            const rulerName = baseOfficers.find(o => o.id === faction.rulerId)?.name ?? `ruler#${faction.rulerId}`;
            const unreachedNames = unreached.map(id => {
              const c = baseCities.find(bc => bc.id === id);
              return `${c?.name ?? '?'}(${id})`;
            });
            errors.push(
              `${rulerName}'s cities are disconnected — cannot reach: ${unreachedNames.join(', ')}`
            );
          }
        });

        expect(errors).toEqual([]);
      });
    });
  });
});
