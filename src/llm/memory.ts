/**
 * LLM Agent Memory System.
 *
 * Tracks what the agent did, what happened, and its strategic plans
 * so it can make coherent decisions across turns.
 *
 * Memory types:
 * - Turn journal: Per-action records (what, why, result) within a turn
 * - Strategy notes: LLM's own notes about long-term plans
 * - Battle journal: Per-action records during tactical battles
 *
 * Memory is kept in-memory (not persisted to localStorage) and included
 * in the LLM's context each turn. Old entries are pruned to fit context limits.
 */

// ── Types ───────────────────────────────────────────────

export interface ActionRecord {
  /** What command was executed */
  action: string;
  /** Why the agent chose this (from LLM reasoning) */
  reasoning: string;
  /** Result: ok/fail + details */
  result: string;
  /** Timestamp within the turn */
  timestamp: string;
}

export interface TurnEntry {
  year: number;
  month: number;
  actions: ActionRecord[];
  /** LLM's end-of-turn reflection / strategy update */
  reflection?: string;
}

export interface BattleEntry {
  /** Which city was attacked/defended */
  city: string;
  /** Day-by-day actions and results */
  actions: ActionRecord[];
  /** Battle outcome */
  outcome?: string;
}

export interface AgentMemory {
  /** Rolling turn-by-turn journal (most recent first) */
  turnHistory: TurnEntry[];
  /** LLM's strategic notes — persisted across turns */
  strategyNotes: string;
  /** Current battle context (null when not in battle) */
  currentBattle: BattleEntry | null;
  /** Completed battles (kept for context) */
  battleHistory: BattleEntry[];
}

// ── Constants ───────────────────────────────────────────

/** Max turns of history to keep (older ones are pruned) */
const MAX_TURN_HISTORY = 12;
/** Max completed battles to keep */
const MAX_BATTLE_HISTORY = 5;
/** Max strategy notes length (chars) */
const MAX_STRATEGY_NOTES_LENGTH = 2000;

// ── Singleton state ─────────────────────────────────────

let memory: AgentMemory = {
  turnHistory: [],
  strategyNotes: '',
  currentBattle: null,
  battleHistory: [],
};

// ── Accessors ───────────────────────────────────────────

export function getMemory(): AgentMemory {
  return memory;
}

export function resetMemory(): void {
  memory = {
    turnHistory: [],
    strategyNotes: '',
    currentBattle: null,
    battleHistory: [],
  };
}

// ── Turn Journal ────────────────────────────────────────

/** Start a new turn entry */
export function startTurn(year: number, month: number): void {
  // Check if we already have an entry for this turn
  const existing = memory.turnHistory.find(t => t.year === year && t.month === month);
  if (!existing) {
    memory.turnHistory.unshift({ year, month, actions: [] });
    // Prune old entries
    if (memory.turnHistory.length > MAX_TURN_HISTORY) {
      memory.turnHistory = memory.turnHistory.slice(0, MAX_TURN_HISTORY);
    }
  }
}

/** Record an action in the current turn */
export function recordAction(action: string, reasoning: string, result: string): void {
  const current = memory.turnHistory[0];
  if (!current) return;
  current.actions.push({
    action,
    reasoning,
    result,
    timestamp: new Date().toISOString(),
  });
}

/** Record end-of-turn reflection */
export function recordReflection(reflection: string): void {
  const current = memory.turnHistory[0];
  if (current) {
    current.reflection = reflection;
  }
}

// ── Strategy Notes ──────────────────────────────────────

/** Update strategy notes (LLM writes these for itself) */
export function updateStrategyNotes(notes: string): void {
  memory.strategyNotes = notes.slice(0, MAX_STRATEGY_NOTES_LENGTH);
}

// ── Battle Journal ──────────────────────────────────────

/** Start tracking a new battle */
export function startBattle(city: string): void {
  memory.currentBattle = { city, actions: [] };
}

/** Record an action during battle */
export function recordBattleAction(action: string, reasoning: string, result: string): void {
  if (!memory.currentBattle) return;
  memory.currentBattle.actions.push({
    action,
    reasoning,
    result,
    timestamp: new Date().toISOString(),
  });
}

/** End the current battle and archive it */
export function endBattle(outcome: string): void {
  if (!memory.currentBattle) return;
  memory.currentBattle.outcome = outcome;
  memory.battleHistory.unshift(memory.currentBattle);
  if (memory.battleHistory.length > MAX_BATTLE_HISTORY) {
    memory.battleHistory = memory.battleHistory.slice(0, MAX_BATTLE_HISTORY);
  }
  memory.currentBattle = null;
}

// ── Serialization for LLM context ───────────────────────

/**
 * Format memory as text for inclusion in the LLM prompt.
 * Keeps recent history and strategy notes within a token budget.
 */
export function formatMemoryForPrompt(): string {
  const parts: string[] = [];

  // Strategy notes
  if (memory.strategyNotes) {
    parts.push('=== YOUR STRATEGIC NOTES ===');
    parts.push(memory.strategyNotes);
    parts.push('');
  }

  // Recent turn history (last 6 turns)
  const recentTurns = memory.turnHistory.slice(0, 6);
  if (recentTurns.length > 0) {
    parts.push('=== RECENT TURN HISTORY ===');
    for (const turn of recentTurns) {
      parts.push(`--- Turn ${turn.year}/${turn.month} ---`);
      for (const a of turn.actions) {
        parts.push(`  Action: ${a.action}`);
        parts.push(`  Reasoning: ${a.reasoning}`);
        parts.push(`  Result: ${a.result}`);
      }
      if (turn.reflection) {
        parts.push(`  Reflection: ${turn.reflection}`);
      }
    }
    parts.push('');
  }

  // Current battle context
  if (memory.currentBattle) {
    parts.push('=== CURRENT BATTLE ===');
    parts.push(`Battle at: ${memory.currentBattle.city}`);
    // Only show last 10 battle actions to keep context reasonable
    const recentBattleActions = memory.currentBattle.actions.slice(-10);
    for (const a of recentBattleActions) {
      parts.push(`  ${a.action} → ${a.result}`);
    }
    parts.push('');
  }

  // Recent battle outcomes
  if (memory.battleHistory.length > 0) {
    parts.push('=== PAST BATTLES ===');
    for (const b of memory.battleHistory.slice(0, 3)) {
      parts.push(`  ${b.city}: ${b.outcome ?? 'unknown'} (${b.actions.length} actions)`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
