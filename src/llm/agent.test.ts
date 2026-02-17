/**
 * Tests for LLM agent behavior.
 *
 * Bug #36 regression: stopAgent() should NOT auto-end the turn.
 * When the user stops the agent, the game should stay in 'playing' phase
 * so the user can take manual control.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../store/gameStore';
import type { RTK4Skill } from '../types';

// Mock the chatCompletion module so we can control LLM responses
vi.mock('./openrouter', () => ({
  chatCompletion: vi.fn(),
}));

// Mock config to enable LLM
vi.mock('./config', () => ({
  getApiKey: () => 'test-key',
  isLLMEnabled: () => true,
}));

import { chatCompletion } from './openrouter';
import { runStrategicTurn, stopAgent, resetAgentForTest } from './agent';

const mockedChatCompletion = vi.mocked(chatCompletion);

/** Minimal game state for testing agent behavior */
function setupMinimalState() {
  useGameStore.setState({
    phase: 'playing',
    scenario: null,
    year: 189,
    month: 1,
    playerFaction: {
      id: 1, name: '劉備', rulerId: 1, color: '#00ff00', isPlayer: true,
      relations: {}, allies: [], ceasefires: [],
      hostageOfficerIds: [], powOfficerIds: [], advisorId: null,
    },
    cities: [
      {
        id: 1, name: '平原', x: 50, y: 50, factionId: 1, population: 50000,
        gold: 10000, food: 30000, commerce: 200, agriculture: 300, defense: 50,
        troops: 5000, adjacentCityIds: [2],
        floodControl: 30, technology: 40, peopleLoyalty: 70, morale: 60, training: 50,
        crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      },
    ],
    officers: [
      {
        id: 1, name: '劉備', leadership: 75, war: 65, intelligence: 75, politics: 80, charisma: 98,
        skills: ['talent', 'benevolence'] as RTK4Skill[],
        portraitId: 1, birthYear: 160, deathYear: 230, treasureId: null,
        factionId: 1, cityId: 1, acted: false, loyalty: 100, isGovernor: true,
        rank: 'governor' as const, relationships: [],
      },
    ],
    factions: [
      { id: 1, name: '劉備', rulerId: 1, color: '#00ff00', isPlayer: true, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
    ],
    selectedCityId: 1,
    activeCommandCategory: null,
    log: [],
    duelState: null,
    battleFormation: null,
  });
}

describe('agent — stop behavior (Bug #36)', () => {
  beforeEach(() => {
    setupMinimalState();
    resetAgentForTest();
    vi.clearAllMocks();
  });

  it('does NOT auto-end turn when user stops the agent', async () => {
    // The LLM will return a valid domestic action.
    // But we stop the agent BEFORE the LLM call by setting _shouldStop.
    // The for-loop should break immediately (line 302-304),
    // and the post-loop code should NOT call endTurn because _shouldStop is true.

    // Stop immediately — set _shouldStop before runStrategicTurn enters its loop
    stopAgent();

    const monthBefore = useGameStore.getState().month;
    await runStrategicTurn();
    const monthAfter = useGameStore.getState().month;

    // Turn should NOT have advanced
    expect(monthAfter).toBe(monthBefore);
    // Phase should still be 'playing'
    expect(useGameStore.getState().phase).toBe('playing');
    // chatCompletion should never have been called (stopped before first iteration)
    expect(mockedChatCompletion).not.toHaveBeenCalled();
  });

  it('does auto-end turn when max actions reached (not user stop)', async () => {
    // Simulate the LLM returning non-endTurn commands until max actions.
    // We set MAX_ACTIONS_PER_TURN = 30, so we need 30 responses.
    // Each returns a developCommerce command.
    let callCount = 0;
    mockedChatCompletion.mockImplementation(async () => {
      callCount++;
      return {
        text: JSON.stringify({
          thinking: `Action ${callCount}`,
          command: { cmd: 'developCommerce', cityId: 1, officerId: 1 },
        }),
        model: 'test-model',
      };
    });

    const monthBefore = useGameStore.getState().month;
    await runStrategicTurn();
    const monthAfter = useGameStore.getState().month;

    // The turn SHOULD have been force-ended (month advanced by 1)
    expect(monthAfter).toBe(monthBefore + 1);
  });
});
