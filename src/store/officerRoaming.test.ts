import { describe, test, expect, vi, afterEach } from 'vitest';
import { useGameStore } from './gameStore';
import { scenarios } from '../data/scenarios';

function startGame(scenarioId: number, factionId: number) {
  const { selectScenario, selectFaction, confirmSettings } = useGameStore.getState();
  const scenario = scenarios.find(s => s.id === scenarioId)!;
  selectScenario(scenario);
  selectFaction(factionId);
  confirmSettings();
}

describe('Officer Roaming System', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('unaffiliated officers can migrate to adjacent cities over time', () => {
    startGame(1, 5); // Scenario 1 (189), faction 5 = 袁紹
    const initialState = useGameStore.getState();

    // Find unaffiliated officers
    const unaffiliated = initialState.officers.filter(o => o.factionId === null);
    expect(unaffiliated.length).toBeGreaterThan(0);

    // Record initial city assignments
    const initialCityMap = new Map(unaffiliated.map(o => [o.id, o.cityId]));

    // Force Math.random to always roam (return < 0.10 for roam chance)
    let callCount = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      // For roaming: return low value to trigger migration
      // For other random calls: return 0.5 (safe middle)
      return 0.05; // Always roam, always pick first adjacent city
    });

    // End turn to trigger month processing (which includes roaming)
    useGameStore.getState().endTurn();

    const afterState = useGameStore.getState();
    const afterUnaffiliated = afterState.officers.filter(o => o.factionId === null);

    // Some officers should have moved (with random always < 0.10)
    let movedCount = 0;
    for (const off of afterUnaffiliated) {
      const originalCity = initialCityMap.get(off.id);
      if (originalCity !== undefined && off.cityId !== originalCity) {
        movedCount++;
        // Verify the officer moved to an adjacent city
        const sourceCity = initialState.cities.find(c => c.id === originalCity);
        expect(sourceCity).toBeDefined();
        expect(sourceCity!.adjacentCityIds).toContain(off.cityId);
      }
    }

    // With 100% roam chance, all surviving unaffiliated officers should have moved
    expect(movedCount).toBeGreaterThan(0);
  });

  test('affiliated officers do not roam', () => {
    startGame(1, 5);
    const initialState = useGameStore.getState();

    // Find affiliated officers
    const affiliated = initialState.officers.filter(o => o.factionId !== null);
    const initialCityMap = new Map(affiliated.map(o => [o.id, o.cityId]));

    vi.spyOn(Math, 'random').mockReturnValue(0.01); // Always trigger roam

    useGameStore.getState().endTurn();

    const afterState = useGameStore.getState();
    // Check affiliated officers didn't move (they may have been transferred by AI, so check faction-owned only)
    const playerFactionId = initialState.playerFaction?.id;
    if (playerFactionId !== undefined) {
      const playerOfficers = afterState.officers.filter(o => o.factionId === playerFactionId);
      for (const off of playerOfficers) {
        const originalCity = initialCityMap.get(off.id);
        // Player officers should not have been moved by roaming
        // (they could only change city via transferOfficer or battle, not roaming)
        if (originalCity !== undefined) {
          expect(off.cityId).toBe(originalCity);
        }
      }
    }
  });

  test('roaming does not move officers when random exceeds threshold', () => {
    startGame(1, 5);
    const initialState = useGameStore.getState();
    const unaffiliated = initialState.officers.filter(o => o.factionId === null);
    const initialCityMap = new Map(unaffiliated.map(o => [o.id, o.cityId]));

    // High random value = no roaming
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    useGameStore.getState().endTurn();

    const afterState = useGameStore.getState();
    const afterUnaffiliated = afterState.officers.filter(o => o.factionId === null);

    // No officers should have moved
    for (const off of afterUnaffiliated) {
      const originalCity = initialCityMap.get(off.id);
      if (originalCity !== undefined) {
        expect(off.cityId).toBe(originalCity);
      }
    }
  });
});
