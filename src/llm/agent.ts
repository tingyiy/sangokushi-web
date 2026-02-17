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
  buildStrategicContext, buildBattleContext, buildQuickStats,
  resetLogTracking,
} from './prompts';

// ── Agent State ─────────────────────────────────────────

let _isRunning = false;
let _shouldStop = false;
let _lastSeenBattleLogIndex = 0;
let _abortController: AbortController | null = null;

export function isAgentRunning(): boolean { return _isRunning; }
export function stopAgent(): void {
  _shouldStop = true;
  // Abort any in-flight chat completion immediately
  if (_abortController) {
    _abortController.abort();
    _abortController = null;
  }
}

/** Reset internal agent flags (for tests only). */
export function resetAgentForTest(): void {
  _isRunning = false;
  _shouldStop = false;
  _abortController = null;
}

/**
 * Drain new battle log entries since last check.
 * Returns the new entries and advances the tracker.
 */
function drainBattleLog(): string[] {
  const log = useBattleStore.getState().battleLog;
  const newEntries = log.slice(_lastSeenBattleLogIndex);
  _lastSeenBattleLogIndex = log.length;
  return newEntries;
}

/**
 * Confirm all pending game events, collecting their descriptions with quantitative impact.
 * Returns a summary string of all events (empty string if none).
 */
async function drainEvents(): Promise<string> {
  const summaries: string[] = [];
  while (useGameStore.getState().pendingEvents.length > 0) {
    const evt = useGameStore.getState().pendingEvents[0];
    const parts: string[] = [];
    if (evt.name) parts.push(evt.name);
    // Add city name if available
    if (evt.cityId != null) {
      const city = useGameStore.getState().cities.find(c => c.id === evt.cityId);
      if (city) parts.push(city.name);
    }
    // Add quantitative impact based on event type
    switch (evt.type) {
      case 'flood':
        parts.push('Pop -5%, Gold -10%, Food -15%, Defense -10');
        break;
      case 'locusts':
        parts.push('Food -30%');
        break;
      case 'plague':
        parts.push('Pop -10%, Troops -15%');
        break;
      case 'harvest':
        parts.push('Food +5000~10000');
        break;
    }
    summaries.push(parts.join(' — '));
    rtkApi.confirmEvent();
    await sleep(100);
  }
  return summaries.length > 0 ? `[Events]\n${summaries.map(s => `  - ${s}`).join('\n')}` : '';
}

// ── Response Parsing ────────────────────────────────────

interface StrategicResponse {
  thinking: string;
  plan?: string;
  command: Record<string, unknown>;
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
      case 'developFloodControl':
        return rtkApi.developFloodControl(cmd.cityId as number, cmd.officerId as number);
      case 'trainTroops':
        return rtkApi.trainTroops(cmd.cityId as number, cmd.officerId as number);
      case 'manufacture':
        return rtkApi.manufacture(cmd.cityId as number, cmd.weaponType as 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults', cmd.officerId as number);
      case 'setTaxRate':
        return rtkApi.setTaxRate(cmd.cityId as number, cmd.rate as 'low' | 'medium' | 'high');
      case 'disasterRelief':
        return rtkApi.disasterRelief(cmd.cityId as number, cmd.officerId as number);
      case 'buyFood':
        return rtkApi.buyFood(cmd.cityId as number, cmd.amount as number);

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
      case 'requestJointAttack':
        return rtkApi.requestJointAttack(cmd.allyFactionId as number, cmd.targetCityId as number, cmd.officerId as number | undefined);
      case 'exchangeHostage':
        return rtkApi.exchangeHostage(cmd.officerId as number, cmd.targetFactionId as number);

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
      case 'gatherIntelligence':
        return rtkApi.gatherIntelligence(cmd.targetCityId as number, cmd.officerId as number | undefined);

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
 * Run one strategic turn: loop asking LLM for one command at a time,
 * executing it, showing results + quick stats, until LLM sends endTurn.
 * Returns true on success, false on failure (API error, parse error).
 */
export async function runStrategicTurn(): Promise<boolean> {
  const state = useGameStore.getState();
  if (state.phase !== 'playing') {
    llmLog('error', `Cannot run strategic turn in phase: ${state.phase}`);
    return false;
  }

  llmLog('decision', `=== Starting LLM Strategic Turn: ${state.year}/${state.month} ===`);
  setLLMTurn(`${state.year}/${state.month}`);
  setLLMStatus('thinking', 'Planning turn...');
  startTurn(state.year, state.month);

  // First clear any pending events (and collect their descriptions)
  const startEvents = await drainEvents();

  // Build conversation: system prompt + initial context
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT_STRATEGIC },
    { role: 'user', content: buildStrategicContext() + (startEvents ? `\n\n${startEvents}` : '') },
  ];

  const MAX_ACTIONS_PER_TURN = 30; // safety limit
  const MAX_CONSECUTIVE_FAILURES = 3; // same error type repeats
  const MAX_TOTAL_FAILURES = 8; // any failures in a row → force end turn
  let isFirstAction = true;
  let consecutiveFailures = 0;
  let lastErrorSignature = '';

  for (let actionNum = 0; actionNum < MAX_ACTIONS_PER_TURN; actionNum++) {
    if (_shouldStop) {
      llmLog('decision', 'Agent stopped by user');
      break;
    }
    if (useGameStore.getState().phase !== 'playing') break;

    // Ask LLM for next action
    let response;
    try {
      setLLMStatus('thinking', isFirstAction ? 'Planning turn...' : 'Deciding next action...');
      _abortController = new AbortController();
      response = await chatCompletion(messages, { temperature: 0.7, signal: _abortController.signal });
      _abortController = null;
    } catch (e) {
      _abortController = null;
      if (_shouldStop) {
        llmLog('decision', 'Agent stopped during API call');
        return false;
      }
      const errMsg = e instanceof Error ? e.message : String(e);
      llmLog('error', `API call failed: ${errMsg}`);
      setLLMStatus('error', errMsg);
      return false;
    }

    let parsed: StrategicResponse;
    try {
      parsed = parseJsonResponse<StrategicResponse>(response.text);
    } catch (e) {
      llmLog('error', `Failed to parse LLM response: ${e}`, response.text);
      setLLMStatus('error', 'Failed to parse LLM response');
      // Fallback: end turn
      rtkApi.endTurn();
      return false;
    }

    // Add assistant response to conversation
    messages.push({ role: 'assistant', content: response.text });

    llmLog('decision', `LLM: ${parsed.thinking}`);
    if (parsed.plan) {
      llmLog('decision', `Plan: ${parsed.plan}`);
    }
    setLLMStatus('executing', parsed.thinking.slice(0, 80));

    // Update strategy notes (typically on first action)
    if (parsed.strategyNotes) {
      updateStrategyNotes(parsed.strategyNotes);
      llmLog('memory', `Strategy notes updated: ${parsed.strategyNotes.slice(0, 100)}...`);
    }

    isFirstAction = false;

    // Handle endTurn
    const cmd = parsed.command;
    const cmdType = cmd.cmd as string;

    if (cmdType === 'endTurn') {
      llmLog('action', 'Ending turn');
      recordReflection(parsed.thinking);
      rtkApi.endTurn();
      await sleep(300);

      // Clear any events generated by end turn (and log them)
      const endEvents = await drainEvents();
      if (endEvents) {
        llmLog('result', endEvents);
      }
      return true;
    }

    // Auto-select city if command provides cityId and needs it
    const cityId = cmd.cityId as number | undefined;
    if (cityId != null) {
      const needsSelect = [
        'startBattle', 'spy', 'rumor', 'counterEspionage', 'inciteRebellion', 'arson',
        'gatherIntelligence',
        'improveRelations', 'formAlliance', 'proposeCeasefire', 'demandSurrender', 'breakAlliance',
      ];
      if (needsSelect.includes(cmdType)) {
        rtkApi.selectCity(cityId);
      }
    }

    // Execute the command
    const result = executeCommand(cmd);
    const resultStr = result.ok
      ? `OK${result.data ? ': ' + JSON.stringify(result.data) : ''}`
      : `FAILED: ${result.error}`;

    llmLog('result', `${cmdType}: ${resultStr}`);
    recordAction(JSON.stringify(cmd), parsed.thinking, resultStr);

    // Build feedback message with result + quick stats
    const quickStats = buildQuickStats();
    let feedback = `Result: ${resultStr}\n${quickStats}`;

    // ── Failure tracking & intervention ─────────────────
    if (!result.ok) {
      // Extract a signature from the error to detect repeats
      const errorSig = extractErrorSignature(result.error ?? '');
      if (errorSig === lastErrorSignature) {
        consecutiveFailures++;
      } else {
        consecutiveFailures = 1;
        lastErrorSignature = errorSig;
      }

      if (consecutiveFailures >= MAX_TOTAL_FAILURES) {
        // Too many failures in a row — force end turn
        llmLog('error', `${MAX_TOTAL_FAILURES} consecutive failures, forcing end turn`);
        setLLMStatus('error', 'Too many consecutive failures — ending turn');
        rtkApi.endTurn();
        await sleep(300);
        await drainEvents();
        return true;
      }

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        // Same error repeating — inject a strong course-correction message
        const intervention = `\n\n⚠️ IMPORTANT: You have failed ${consecutiveFailures} times in a row with a similar error. STOP repeating the same command. Re-read the STATUS above carefully. Your options:\n1. Try a COMPLETELY DIFFERENT command on a DIFFERENT city or officer.\n2. If all officers have acted or all cities are developed, issue { "cmd": "endTurn" }.\nDo NOT retry the same failing command.`;
        feedback += intervention;
        llmLog('error', `Injecting course-correction after ${consecutiveFailures} consecutive failures: ${errorSig}`);

        // Also trim old failure messages from conversation to reduce noise
        trimFailureHistory(messages);
      }
    } else {
      // Success resets the failure counter
      consecutiveFailures = 0;
      lastErrorSignature = '';
    }

    messages.push({ role: 'user', content: feedback });
    llmLog('result', quickStats);

    await sleep(200);

    // Check if battle started
    if (useGameStore.getState().phase === 'battle') {
      llmLog('decision', 'Battle started! Switching to tactical mode.');
      await runBattlePhase();
      if (useGameStore.getState().phase !== 'playing') {
        llmLog('decision', `Phase after battle: ${useGameStore.getState().phase}`);
        return true;
      }
      // After battle, add updated status to conversation
      messages.push({ role: 'user', content: `Battle resolved. Back to strategic phase.\n${buildQuickStats()}` });
    }

    // Clear any pending events between actions (and surface them to the LLM)
    const interEvents = await drainEvents();
    if (interEvents) {
      messages.push({ role: 'user', content: interEvents });
    }
  }

  // Safety: if we hit max actions without endTurn, force it.
  // But if user pressed stop, leave the turn active for manual control.
  if (!_shouldStop && useGameStore.getState().phase === 'playing') {
    llmLog('action', 'Max actions reached, ending turn');
    rtkApi.endTurn();
    await sleep(300);
    await drainEvents();
  }

  return true;
}

// ── Battle Phase ────────────────────────────────────────

/**
 * Run the tactical battle phase: loop making decisions for each player unit.
 */
async function runBattlePhase(): Promise<void> {
  const battle = useBattleStore.getState();
  const game = useGameStore.getState();
  const attackerFaction = game.factions.find(f => f.id === battle.attackerId);
  const defenderFaction = game.factions.find(f => f.id === battle.defenderId);
  const defenderCity = game.cities.find(c => c.id === battle.defenderCityId);
  const isPlayerAttacker = battle.attackerId === battle.playerFactionId;
  const playerUnits = battle.units.filter(u => u.factionId === battle.playerFactionId && u.troops > 0);
  const enemyUnits = battle.units.filter(u => u.factionId !== battle.playerFactionId && u.troops > 0);
  const playerTroops = playerUnits.reduce((s, u) => s + u.troops, 0);
  const enemyTroops = enemyUnits.reduce((s, u) => s + u.troops, 0);

  startBattleMemory(defenderCity?.name ?? 'unknown');

  const battleDesc = isPlayerAttacker
    ? `Player (${attackerFaction?.name ?? '?'}) attacks ${defenderCity?.name ?? '?'} (${defenderFaction?.name ?? '?'})`
    : `${attackerFaction?.name ?? '?'} attacks ${defenderCity?.name ?? '?'} (defending)`;
  llmLog('battle', `=== Battle: ${battleDesc} | ${battle.isSiege ? 'Siege' : 'Field'} | ${playerUnits.length} units (${playerTroops} troops) vs ${enemyUnits.length} units (${enemyTroops} troops) ===`);
  setLLMStatus('thinking', 'Battle phase...');
  _lastSeenBattleLogIndex = battle.battleLog.length; // sync tracker

  let maxIterations = 200; // safety limit
  let noActiveUnitCount = 0; // track consecutive no-active-unit loops
  while (maxIterations-- > 0) {
    if (_shouldStop) break;

    const bState = useBattleStore.getState();
    const gState = useGameStore.getState();

    // Battle paused at month end? Return to strategic phase.
    // endTurn() will process the month and resume the battle.
    if (bState.battlePaused && !bState.isFinished) {
      llmLog('battle', `=== Battle paused at Day 30. Returning to strategic phase for month transition. ===`);
      // BattleScreen useEffect will transition phase to 'playing'
      // Wait for it if still in battle phase
      let waitCount = 0;
      while (useGameStore.getState().phase === 'battle' && waitCount < 20) {
        await sleep(200);
        waitCount++;
      }
      return;
    }

    // Battle finished?
    if (bState.isFinished || gState.phase !== 'battle') {
      const winner = bState.winnerFactionId;
      const outcome = winner === bState.playerFactionId ? 'VICTORY' : 'DEFEAT';
      llmLog('battle', `=== Battle ended: ${outcome} on Day ${bState.day} ===`);
      endBattleMemory(outcome);

      // Resolve battle: the agent must do what BattleScreen does —
      // call resolveBattle() then transition phase back to 'playing'.
      if (gState.phase === 'battle' && bState.isFinished && winner !== null) {
        const loserFactionId = winner === bState.attackerId ? bState.defenderId : bState.attackerId;
        const battleUnitsData = bState.units.map(u => ({
          officerId: u.officerId,
          troops: u.troops,
          factionId: u.factionId,
          status: u.status,
        }));
        gState.resolveBattle(
          winner,
          loserFactionId,
          bState.defenderCityId,
          battleUnitsData,
          bState.capturedOfficerIds,
          bState.routedOfficerIds,
        );
        useGameStore.getState().setPhase('playing');
        llmLog('decision', '=== Returning to Strategic Phase ===');
        await sleep(300);
      }

      // Clear post-battle events
      await drainEvents();
      return;
    }

    // Not our turn? Let the enemy phase run.
    if (bState.turnPhase === 'enemy') {
      const preEnemyLogLen = useBattleStore.getState().battleLog.length;
      while (useBattleStore.getState().stepEnemyPhase()) {
        await sleep(50);
      }
      // Log what happened during enemy phase
      const postEnemyLog = useBattleStore.getState().battleLog;
      const enemyEvents = postEnemyLog.slice(preEnemyLogLen);
      if (enemyEvents.length > 0) {
        llmLog('result', `[enemy phase] ${enemyEvents.join(' | ')}`);
      }
      // Sync battle log tracker
      _lastSeenBattleLogIndex = postEnemyLog.length;
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
      // No active unit selected — try to auto-select the first available player unit
      const nextPlayerUnit = bState.units.find(u =>
        u.factionId === bState.playerFactionId &&
        u.troops > 0 &&
        u.status === 'active'
      );

      if (nextPlayerUnit) {
        // Select this unit and continue the loop
        rtkApi.battle.selectUnit(nextPlayerUnit.id);
        await sleep(100);
        noActiveUnitCount = 0;
        continue;
      }

      // No player units left to act — end the player phase
      noActiveUnitCount++;
      if (noActiveUnitCount > 15) {
        llmLog('error', 'Battle stuck with no active unit, retreating');
        rtkApi.retreat();
        endBattleMemory('RETREAT (stuck)');
        return;
      }
      if (noActiveUnitCount > 1) {
        llmLog('battle', `No active unit for ${noActiveUnitCount} iterations, forcing phase advance`);
      }
      rtkApi.battle.endPlayerPhase();
      await sleep(300);
      continue;
    }

    // Reset counter when we do get an active unit
    noActiveUnitCount = 0;

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
      _abortController = new AbortController();
      const response = await chatCompletion(messages, { temperature: 0.5, signal: _abortController.signal });
      _abortController = null;
      const parsed = parseJsonResponse<BattleResponse>(response.text);
      action = parsed.action;
      llmLog('battle', `${activeUnit.officer.name}: ${parsed.thinking}`);
      setLLMStatus('executing', `Battle: ${activeUnit.officer.name} ${(action.action as string) ?? ''}`);
    } catch (e) {
      _abortController = null;
      if (_shouldStop) {
        llmLog('decision', 'Agent stopped during battle API call');
        return;
      }
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
      case 'retreat':
        result = rtkApi.retreat();
        break;
      default:
        llmLog('error', `Unknown battle action: ${actionType}, waiting`);
        result = rtkApi.battle.wait(activeUnit.id);
    }

    const resultStr = result.ok
      ? `OK${result.data ? ': ' + JSON.stringify(result.data) : ''}`
      : `FAILED: ${result.error}`;

    llmLog('action', `${activeUnit.officer.name} ${actionType}: ${resultStr}`);

    // Drain any new battle log entries (damage, kills, routs, etc.)
    const newBattleLogs = drainBattleLog();
    for (const entry of newBattleLogs) {
      llmLog('result', `[battle] ${entry}`);
    }

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
  resetLogTracking();
  llmLog('decision', '=== LLM Agent Started ===');

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

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
        const success = await runStrategicTurn();
        if (success) {
          consecutiveErrors = 0;
          await sleep(1000);
        } else {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            llmLog('error', `${MAX_CONSECUTIVE_ERRORS} consecutive errors — stopping agent. Check API key and model.`);
            setLLMStatus('error', `Stopped after ${MAX_CONSECUTIVE_ERRORS} consecutive errors`);
            break;
          }
          // Exponential backoff: 5s, 10s, 20s, 40s, ...
          const backoffMs = 5000 * Math.pow(2, consecutiveErrors - 1);
          llmLog('error', `Error ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}, retrying in ${backoffMs / 1000}s...`);
          setLLMStatus('error', `Retrying in ${backoffMs / 1000}s (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})...`);
          await sleep(backoffMs);
        }
      } else if (state.phase === 'battle') {
        await runBattlePhase();
        consecutiveErrors = 0;
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

/**
 * Extract a short signature from an error message for deduplication.
 * Groups similar errors together (e.g., "Not your city" variants all become "not_your_city").
 */
function extractErrorSignature(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('not your city')) return 'not_your_city';
  if (lower.includes('already acted')) return 'already_acted';
  if (lower.includes('must leave at least') || lower.includes('cannot attack')) return 'must_leave_officer';
  if (lower.includes('insufficient gold')) return 'insufficient_gold';
  if (lower.includes('insufficient food')) return 'insufficient_food';
  if (lower.includes('not found in city')) return 'officer_not_in_city';
  if (lower.includes('no governor')) return 'no_governor';
  if (lower.includes('no available officer')) return 'no_available_officer';
  if (lower.includes('not in playing phase')) return 'wrong_phase';
  // Default: first 40 chars normalized
  return lower.slice(0, 40).replace(/\s+/g, '_');
}

/**
 * Trim old failure messages from conversation to reduce context pollution.
 * Keeps the system prompt, initial context, and the last few exchanges.
 * Replaces middle failure exchanges with a summary.
 */
function trimFailureHistory(messages: ChatMessage[]): void {
  // Only trim if conversation is large enough
  if (messages.length < 10) return;

  // Count consecutive failure pairs (assistant + user with FAILED) from the middle
  let failureStart = -1;
  let failureEnd = -1;
  for (let i = 2; i < messages.length - 4; i++) {
    if (messages[i].role === 'user' && messages[i].content.includes('FAILED:')) {
      if (failureStart === -1) failureStart = i - 1; // include the assistant message before
      failureEnd = i;
    } else if (failureStart !== -1) {
      break; // only trim contiguous failures
    }
  }

  if (failureStart !== -1 && failureEnd !== -1 && failureEnd - failureStart >= 4) {
    // Count how many failures we're summarizing
    const failCount = Math.floor((failureEnd - failureStart + 1) / 2);
    // Extract the error types
    const errors = new Set<string>();
    for (let i = failureStart; i <= failureEnd; i++) {
      if (messages[i].role === 'user') {
        const match = messages[i].content.match(/FAILED: (.+?)(\n|$)/);
        if (match) errors.add(match[1].slice(0, 80));
      }
    }
    const summary: ChatMessage = {
      role: 'user',
      content: `[Summary: ${failCount} previous commands failed with errors: ${Array.from(errors).join('; ')}. Those attempts have been removed from history to save context.]`,
    };
    messages.splice(failureStart, failureEnd - failureStart + 1, summary);
    llmLog('memory', `Trimmed ${failCount} failure exchanges from conversation`);
  }
}
