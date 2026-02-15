/**
 * LLM Agent — main loop for both strategic and tactical play.
 *
 * Reads game state, asks the LLM for decisions, executes commands via rtkApi,
 * and records everything in memory for coherent multi-turn play.
 */

import { rtkApi } from '../debug/rtk-api';
import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { chatCompletion } from './openrouter';
import type { ChatMessage } from './openrouter';
import { getApiKey, isLLMEnabled } from './config';
import { llmLog } from './log';
import { setLLMStatus, setLLMTurn, resetLLMStatus } from './status';
import {
  startTurn, recordAction, recordReflection,
  updateStrategyNotes,
  startBattle as startBattleMemory, recordBattleAction, endBattle as endBattleMemory,
} from './memory';
import {
  SYSTEM_PROMPT_STRATEGIC, SYSTEM_PROMPT_BATTLE,
  buildStrategicContext, buildBattleContext,
} from './prompts';

// ── Agent State ─────────────────────────────────────────

let _isRunning = false;
let _shouldStop = false;

export function isAgentRunning(): boolean { return _isRunning; }
export function stopAgent(): void { _shouldStop = true; }

// ── Response Parsing ────────────────────────────────────

interface StrategicResponse {
  thinking: string;
  commands: Record<string, unknown>[];
  strategyNotes?: string;
}

interface BattleResponse {
  thinking: string;
  action: Record<string, unknown>;
}

/**
 * Parse LLM response text into structured data.
 * Handles:
 *   - <think>...</think> blocks from reasoning models (stripped)
 *   - Markdown code fences
 *   - Raw JSON
 */
function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim();

  // Strip <think>...</think> reasoning blocks (DeepSeek R1, Qwen thinking, etc.)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Strip markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1];
  }
  // Try to find JSON object boundaries
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }
  return JSON.parse(cleaned);
}

// ── Command Execution ───────────────────────────────────

interface CommandResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Execute a single strategic command via rtkApi.
 * Returns a result object with ok/error.
 */
function executeCommand(cmd: Record<string, unknown>): CommandResult {
  const type = cmd.cmd as string;
  llmLog('action', `Executing: ${type}`, cmd);

  try {
    switch (type) {
      // Domestic
      case 'developCommerce':
        return rtkApi.developCommerce(cmd.cityId as number, cmd.officerId as number);
      case 'developAgriculture':
        return rtkApi.developAgriculture(cmd.cityId as number, cmd.officerId as number);
      case 'reinforceDefense':
        return rtkApi.reinforceDefense(cmd.cityId as number, cmd.officerId as number);
      case 'developTechnology':
        return rtkApi.developTechnology(cmd.cityId as number, cmd.officerId as number);
      case 'trainTroops':
        return rtkApi.trainTroops(cmd.cityId as number, cmd.officerId as number);
      case 'manufacture':
        return rtkApi.manufacture(cmd.cityId as number, cmd.weaponType as 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults', cmd.officerId as number);
      case 'setTaxRate':
        return rtkApi.setTaxRate(cmd.cityId as number, cmd.rate as 'low' | 'medium' | 'high');
      case 'disasterRelief':
        return rtkApi.disasterRelief(cmd.cityId as number, cmd.officerId as number);

      // Military
      case 'draftTroops':
        return rtkApi.draftTroops(cmd.cityId as number, cmd.amount as number, cmd.officerId as number);
      case 'transport':
        return rtkApi.transport(
          cmd.fromCityId as number, cmd.toCityId as number,
          cmd.resources as { gold?: number; food?: number; troops?: number },
          cmd.officerId as number,
        );
      case 'transferOfficer':
        return rtkApi.transferOfficer(cmd.officerId as number, cmd.targetCityId as number);
      case 'setBattleFormation': {
        // LLM may send any unit type string; cast to expected parameter type
        const formation = cmd.formation as { officerIds: number[]; unitTypes: string[]; troops?: number[] } | null;
        return rtkApi.setBattleFormation(formation as Parameters<typeof rtkApi.setBattleFormation>[0]);
      }
      case 'startBattle':
        return rtkApi.startBattle(cmd.targetCityId as number);
      case 'retreat':
        return rtkApi.retreat();

      // Personnel
      case 'recruitOfficer':
        return rtkApi.recruitOfficer(cmd.officerId as number, cmd.recruiterId as number | undefined);
      case 'searchOfficer':
        return rtkApi.searchOfficer(cmd.cityId as number, cmd.officerId as number | undefined);
      case 'recruitPOW':
        return rtkApi.recruitPOW(cmd.officerId as number, cmd.recruiterId as number | undefined);
      case 'rewardOfficer':
        return rtkApi.rewardOfficer(cmd.officerId as number, cmd.type as 'gold' | 'treasure', cmd.amount as number | undefined);
      case 'executeOfficer':
        return rtkApi.executeOfficer(cmd.officerId as number);
      case 'dismissOfficer':
        return rtkApi.dismissOfficer(cmd.officerId as number);
      case 'appointGovernor':
        return rtkApi.appointGovernor(cmd.cityId as number, cmd.officerId as number);
      case 'appointAdvisor':
        return rtkApi.appointAdvisor(cmd.officerId as number);
      case 'promoteOfficer':
        return rtkApi.promoteOfficer(cmd.officerId as number, cmd.rank as Parameters<typeof rtkApi.promoteOfficer>[1]);

      // Diplomacy
      case 'selectCity':
        return rtkApi.selectCity(cmd.cityId as number);
      case 'improveRelations':
        return rtkApi.improveRelations(cmd.targetFactionId as number, cmd.officerId as number | undefined);
      case 'formAlliance':
        return rtkApi.formAlliance(cmd.targetFactionId as number, cmd.officerId as number | undefined);
      case 'proposeCeasefire':
        return rtkApi.proposeCeasefire(cmd.targetFactionId as number, cmd.officerId as number | undefined);
      case 'demandSurrender':
        return rtkApi.demandSurrender(cmd.targetFactionId as number, cmd.officerId as number | undefined);
      case 'breakAlliance':
        return rtkApi.breakAlliance(cmd.targetFactionId as number);

      // Strategy
      case 'spy':
        return rtkApi.spy(cmd.targetCityId as number, cmd.officerId as number | undefined);
      case 'rumor':
        return rtkApi.rumor(cmd.targetCityId as number, cmd.officerId as number | undefined);
      case 'counterEspionage':
        return rtkApi.counterEspionage(cmd.targetCityId as number, cmd.targetOfficerId as number, cmd.officerId as number | undefined);
      case 'inciteRebellion':
        return rtkApi.inciteRebellion(cmd.targetCityId as number, cmd.officerId as number | undefined);
      case 'arson':
        return rtkApi.arson(cmd.targetCityId as number, cmd.officerId as number | undefined);

      // Events
      case 'confirmEvent':
        return rtkApi.confirmEvent();
      case 'popEvent':
        return rtkApi.popEvent();

      // End turn
      case 'endTurn':
        return rtkApi.endTurn();

      default:
        return { ok: false, error: `Unknown command: ${type}` };
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    llmLog('error', `Command ${type} threw: ${error}`);
    return { ok: false, error };
  }
}

// ── Strategic Turn ──────────────────────────────────────

/**
 * Run one strategic turn: ask LLM for commands, execute them, record results.
 */
export async function runStrategicTurn(): Promise<void> {
  const state = useGameStore.getState();
  if (state.phase !== 'playing') {
    llmLog('error', `Cannot run strategic turn in phase: ${state.phase}`);
    return;
  }

  llmLog('decision', `=== Starting LLM Strategic Turn: ${state.year}/${state.month} ===`);
  setLLMTurn(`${state.year}/${state.month}`);
  setLLMStatus('thinking', 'Planning turn...');
  startTurn(state.year, state.month);

  // First clear any pending events
  while (useGameStore.getState().pendingEvents.length > 0) {
    rtkApi.confirmEvent();
    await sleep(100);
  }

  const context = buildStrategicContext();
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT_STRATEGIC },
    { role: 'user', content: context },
  ];

  let response;
  try {
    response = await chatCompletion(messages, { temperature: 0.7 });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    llmLog('error', `API call failed: ${errMsg}`);
    setLLMStatus('error', errMsg);
    return;
  }
  let parsed: StrategicResponse;

  try {
    parsed = parseJsonResponse<StrategicResponse>(response.text);
  } catch (e) {
    llmLog('error', `Failed to parse LLM response: ${e}`, response.text);
    setLLMStatus('error', `Failed to parse LLM response`);
    // Fallback: just end turn
    rtkApi.endTurn();
    return;
  }

  llmLog('decision', `LLM Thinking: ${parsed.thinking}`);
  setLLMStatus('executing', parsed.thinking.slice(0, 80));

  // Update strategy notes if provided
  if (parsed.strategyNotes) {
    updateStrategyNotes(parsed.strategyNotes);
    llmLog('memory', `Strategy notes updated: ${parsed.strategyNotes.slice(0, 100)}...`);
  }

  // Execute commands sequentially
  for (const cmd of parsed.commands) {
    if (_shouldStop) {
      llmLog('decision', 'Agent stopped by user');
      break;
    }

    const cmdType = cmd.cmd as string;

    // Skip endTurn here — we'll handle it after
    if (cmdType === 'endTurn') continue;

    const result = executeCommand(cmd);
    const resultStr = result.ok
      ? `OK${result.data ? ': ' + JSON.stringify(result.data) : ''}`
      : `FAILED: ${result.error}`;

    llmLog('result', `${cmdType}: ${resultStr}`);
    recordAction(
      JSON.stringify(cmd),
      parsed.thinking,
      resultStr,
    );

    // Small delay between commands for UI to update
    await sleep(200);

    // Check if battle started (phase changed)
    if (useGameStore.getState().phase === 'battle') {
      llmLog('decision', 'Battle started! Switching to tactical mode.');
      await runBattlePhase();
      // After battle, check if we're back in playing phase
      if (useGameStore.getState().phase !== 'playing') {
        llmLog('decision', `Phase after battle: ${useGameStore.getState().phase}`);
        return;
      }
    }
  }

  // Record reflection
  recordReflection(parsed.thinking);

  // End turn
  if (!_shouldStop && useGameStore.getState().phase === 'playing') {
    llmLog('action', 'Ending turn');
    rtkApi.endTurn();
    await sleep(300);

    // Clear any events generated by end turn
    while (useGameStore.getState().pendingEvents.length > 0) {
      rtkApi.confirmEvent();
      await sleep(100);
    }
  }
}

// ── Battle Phase ────────────────────────────────────────

/**
 * Run the tactical battle phase: loop making decisions for each player unit.
 */
async function runBattlePhase(): Promise<void> {
  const battle = useBattleStore.getState();
  const defenderFaction = battle.units.find(u => u.factionId !== battle.playerFactionId)?.factionId;
  const targetCity = defenderFaction != null
    ? useGameStore.getState().cities.find(c => c.factionId === defenderFaction)
    : undefined;
  startBattleMemory(targetCity?.name ?? 'unknown');

  llmLog('battle', '=== Entering Battle Phase ===');
  setLLMStatus('thinking', 'Battle phase...');

  let maxIterations = 200; // safety limit
  while (maxIterations-- > 0) {
    if (_shouldStop) break;

    const bState = useBattleStore.getState();
    const gState = useGameStore.getState();

    // Battle finished?
    if (bState.isFinished || gState.phase !== 'battle') {
      const winner = bState.winnerFactionId;
      const outcome = winner === bState.playerFactionId ? 'VICTORY' : 'DEFEAT';
      llmLog('battle', `Battle ended: ${outcome}`);
      endBattleMemory(outcome);

      // Resolve battle and clear events
      if (gState.phase === 'battle') {
        // The battle should auto-resolve via the store
        await sleep(300);
      }
      // Clear post-battle events
      while (useGameStore.getState().pendingEvents.length > 0) {
        rtkApi.confirmEvent();
        await sleep(100);
      }
      return;
    }

    // Not our turn? Let the enemy phase run.
    if (bState.turnPhase === 'enemy') {
      while (useBattleStore.getState().stepEnemyPhase()) {
        await sleep(50);
      }
      continue;
    }

    // It's player phase
    if (bState.turnPhase !== 'player') {
      await sleep(100);
      continue;
    }

    // Get active unit
    const activeUnit = bState.units.find(u => u.id === bState.activeUnitId);
    if (!activeUnit) {
      // No active unit — end player phase
      llmLog('battle', 'No active unit, ending player phase');
      rtkApi.battle.endPlayerPhase();
      await sleep(200);
      continue;
    }

    // Check if this unit belongs to us
    if (activeUnit.factionId !== bState.playerFactionId) {
      await sleep(100);
      continue;
    }

    // Ask LLM for tactical decision
    const battleContext = buildBattleContext();
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT_BATTLE },
      { role: 'user', content: battleContext },
    ];

    let action: Record<string, unknown>;
    try {
      setLLMStatus('thinking', `Battle: ${activeUnit.officer.name} deciding...`);
      const response = await chatCompletion(messages, { temperature: 0.5 });
      const parsed = parseJsonResponse<BattleResponse>(response.text);
      action = parsed.action;
      llmLog('battle', `${activeUnit.officer.name}: ${parsed.thinking}`);
      setLLMStatus('executing', `Battle: ${activeUnit.officer.name} ${(action.action as string) ?? ''}`);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      llmLog('error', `Battle LLM error, defaulting to wait: ${errMsg}`);
      setLLMStatus('error', `Battle API error: ${errMsg}`);
      action = { action: 'wait' };
    }

    // Execute the action
    const actionType = action.action as string;
    let result: CommandResult;

    switch (actionType) {
      case 'move':
        result = rtkApi.battle.move(activeUnit.id, action.q as number, action.r as number);
        break;
      case 'attack':
        result = rtkApi.battle.attack(activeUnit.id, action.targetUnitId as string);
        break;
      case 'attackGate':
        result = rtkApi.battle.attackGate(activeUnit.id, action.gateQ as number, action.gateR as number);
        break;
      case 'tactic':
        result = rtkApi.battle.executeTactic(activeUnit.id, action.tactic as Parameters<typeof rtkApi.battle.executeTactic>[1], action.targetId as string | undefined, action.targetHex as { q: number; r: number } | undefined);
        break;
      case 'wait':
        result = rtkApi.battle.wait(activeUnit.id);
        break;
      case 'endPlayerPhase':
        result = rtkApi.battle.endPlayerPhase();
        break;
      default:
        llmLog('error', `Unknown battle action: ${actionType}, waiting`);
        result = rtkApi.battle.wait(activeUnit.id);
    }

    const resultStr = result.ok
      ? `OK${result.data ? ': ' + JSON.stringify(result.data) : ''}`
      : `FAILED: ${result.error}`;

    recordBattleAction(
      `${activeUnit.officer.name}: ${actionType}`,
      '',
      resultStr,
    );

    await sleep(300);
  }

  if (maxIterations <= 0) {
    llmLog('error', 'Battle iteration limit reached, retreating');
    rtkApi.retreat();
    endBattleMemory('RETREAT (iteration limit)');
  }
}

// ── Main Loop ───────────────────────────────────────────

/**
 * Start the LLM agent loop. Runs continuously until stopped or game ends.
 */
export async function startAgent(): Promise<void> {
  if (_isRunning) {
    llmLog('error', 'Agent is already running');
    return;
  }
  if (!getApiKey()) {
    llmLog('error', 'No API key configured');
    return;
  }
  if (!isLLMEnabled()) {
    llmLog('error', 'LLM is not enabled');
    return;
  }

  _isRunning = true;
  _shouldStop = false;
  llmLog('decision', '=== LLM Agent Started ===');

  try {
    while (!_shouldStop) {
      const state = useGameStore.getState();

      // Check end conditions
      if (state.phase === 'victory' || state.phase === 'defeat') {
        llmLog('decision', `Game over: ${state.phase}`);
        break;
      }

      // Only act during playing phase
      if (state.phase === 'playing') {
        await runStrategicTurn();
        // Wait before next turn to let UI breathe
        await sleep(1000);
      } else if (state.phase === 'battle') {
        await runBattlePhase();
        await sleep(500);
      } else {
        // Not in a phase we can act on — wait and check again
        await sleep(500);
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    llmLog('error', `Agent error: ${errMsg}`);
    setLLMStatus('error', errMsg);
  } finally {
    _isRunning = false;
    _shouldStop = false;
    resetLLMStatus();
    llmLog('decision', '=== LLM Agent Stopped ===');
  }
}

// ── Utility ─────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
