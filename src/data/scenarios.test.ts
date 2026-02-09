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
    });
  });
});
