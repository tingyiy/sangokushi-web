import { describe, it, expect } from 'vitest';
import { scenarios } from './scenarios';
import { baseCities } from './cities';
import { baseOfficers } from './officers';

describe('Scenarios Data Integrity', () => {
  it('should have 5 scenarios', () => {
    expect(scenarios.length).toBe(5);
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
          // Ruler should be an officer in the scenario
          // Note: In some scenarios, rulers might not be fully defined in the 'officers' list 
          // if we only defined "key" officers. But they should be in baseOfficers.
          // Let's check if the ruler is assigned to the correct faction if they exist in the scenario list.
          const rulerInScenario = scenario.officers.find(o => o.id === faction.rulerId);
          if (rulerInScenario) {
            expect(rulerInScenario.factionId).toBe(faction.id);
          }
        });
      });
    });
  });
});
