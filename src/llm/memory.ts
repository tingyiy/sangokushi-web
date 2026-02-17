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
  /** Siege or field battle */
  type?: 'siege' | 'field';
  /** How many days the battle lasted */
  days?: number;
  /** Reason the battle ended: commander killed, all units eliminated, rout, time limit, retreat */
  outcomeReason?: string;
  /** Our troops at start and end */
  ourTroopsStart?: number;
  ourTroopsEnd?: number;
  /** Enemy troops at start and end */
  enemyTroopsStart?: number;
  enemyTroopsEnd?: number;
  /** Officers we lost (captured/fled) */
  officersLost?: string[];
  /** Enemy officers we captured */
  officersCaptured?: string[];
  /** Our officers that participated */
  ourOfficers?: string[];
  /** Enemy officers that participated */
  enemyOfficers?: string[];
}

/** Permanent record of a war/diplomatic event — never pruned */
export interface WarRecord {
  /** When it happened */
  year: number;
  month: number;
  /** Who initiated the attack */
  aggressorFaction: string;
  /** Who was attacked */
  defenderFaction: string;
  /** City that was attacked */
  city: string;
  /** Did the aggressor win? */
  aggressorWon: boolean;
  /** Was our faction the attacker? */
  weAttacked: boolean;
  /** Was our faction the defender? */
  weWereAttacked: boolean;
  /** Brief summary */
  summary: string;
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
  /** Permanent war/diplomatic history — never pruned, shapes foreign policy */
  warRecords: WarRecord[];
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
  warRecords: [],
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
    warRecords: [],
  };
}

/** Restore memory from serialized data (e.g., from a save file) */
export function restoreMemory(data: Partial<AgentMemory>): void {
  memory = {
    turnHistory: data.turnHistory ?? [],
    strategyNotes: data.strategyNotes ?? '',
    currentBattle: data.currentBattle ?? null,
    battleHistory: data.battleHistory ?? [],
    warRecords: data.warRecords ?? [],
  };
}

/** Serialize memory for persistence (e.g., save file) */
export function serializeMemory(): AgentMemory {
  return { ...memory };
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

/** Record initial battle state (troop counts, officers, battle type) */
export function recordBattleStart(data: {
  type: 'siege' | 'field';
  ourOfficers: string[];
  enemyOfficers: string[];
  ourTroops: number;
  enemyTroops: number;
}): void {
  if (!memory.currentBattle) return;
  memory.currentBattle.type = data.type;
  memory.currentBattle.ourOfficers = data.ourOfficers;
  memory.currentBattle.enemyOfficers = data.enemyOfficers;
  memory.currentBattle.ourTroopsStart = data.ourTroops;
  memory.currentBattle.enemyTroopsStart = data.enemyTroops;
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
export function endBattle(outcome: string, details?: {
  days?: number;
  outcomeReason?: string;
  ourTroopsEnd?: number;
  enemyTroopsEnd?: number;
  officersLost?: string[];
  officersCaptured?: string[];
}): void {
  if (!memory.currentBattle) return;
  memory.currentBattle.outcome = outcome;
  if (details) {
    memory.currentBattle.days = details.days;
    memory.currentBattle.outcomeReason = details.outcomeReason;
    memory.currentBattle.ourTroopsEnd = details.ourTroopsEnd;
    memory.currentBattle.enemyTroopsEnd = details.enemyTroopsEnd;
    memory.currentBattle.officersLost = details.officersLost;
    memory.currentBattle.officersCaptured = details.officersCaptured;
  }
  memory.battleHistory.unshift(memory.currentBattle);
  if (memory.battleHistory.length > MAX_BATTLE_HISTORY) {
    memory.battleHistory = memory.battleHistory.slice(0, MAX_BATTLE_HISTORY);
  }
  memory.currentBattle = null;
}

// ── War Records (permanent diplomatic memory) ───────────

/** Record a war event — never pruned, shapes long-term foreign policy */
export function recordWar(record: WarRecord): void {
  memory.warRecords.push(record);
}

// ── Serialization for LLM context ───────────────────────

/**
 * Format memory as text for inclusion in the LLM prompt.
 * Keeps recent history and strategy notes within a token budget.
 * Detects and condenses repeated identical turn patterns.
 */
export function formatMemoryForPrompt(): string {
  const parts: string[] = [];

  // Strategy notes
  if (memory.strategyNotes) {
    parts.push('=== YOUR STRATEGIC NOTES ===');
    parts.push(memory.strategyNotes);
    parts.push('');
  }

  // Recent turn history (last 6 turns) — condensed
  const recentTurns = memory.turnHistory.slice(0, 6);
  if (recentTurns.length > 0) {
    parts.push('=== RECENT TURN HISTORY ===');

    // Extract a short signature for each turn's actions (just cmd names)
    const turnSignatures: { sig: string; turns: TurnEntry[] }[] = [];
    for (const turn of recentTurns) {
      const sig = turn.actions.map(a => {
        try {
          const cmd = JSON.parse(a.action) as { cmd?: string };
          return cmd.cmd ?? 'unknown';
        } catch { return 'unknown'; }
      }).join(', ');

      // Merge with previous group if same signature
      const last = turnSignatures[turnSignatures.length - 1];
      if (last && last.sig === sig) {
        last.turns.push(turn);
      } else {
        turnSignatures.push({ sig, turns: [turn] });
      }
    }

    // Output condensed groups
    for (const group of turnSignatures) {
      if (group.turns.length > 1) {
        // Condensed: multiple turns with same pattern
        const first = group.turns[group.turns.length - 1]!;
        const last = group.turns[0]!;
        parts.push(`--- Turns ${first.year}/${first.month} to ${last.year}/${last.month} (${group.turns.length} turns, SAME PATTERN) ---`);
        parts.push(`  Repeated actions: ${group.sig}`);
        // Show results from the most recent one
        for (const a of last.actions) {
          parts.push(`  Result: ${a.result}`);
        }
        if (group.turns.length >= 3) {
          parts.push(`  *** NOTE: You repeated this exact pattern ${group.turns.length} times. Consider a different approach. ***`);
        }
      } else {
        // Single turn — show normally but condensed
        const turn = group.turns[0]!;
        parts.push(`--- Turn ${turn.year}/${turn.month} ---`);
        for (const a of turn.actions) {
          try {
            const cmd = JSON.parse(a.action) as { cmd?: string };
            parts.push(`  ${cmd.cmd}: ${a.result}`);
          } catch {
            parts.push(`  ${a.action}: ${a.result}`);
          }
        }
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
    parts.push('=== PAST BATTLES (戰報) ===');
    for (const b of memory.battleHistory.slice(0, 3)) {
      const typeStr = b.type === 'siege' ? 'Siege' : b.type === 'field' ? 'Field' : '';
      const daysStr = b.days ? `Day ${b.days}` : '';
      const header = [b.city, b.outcome, typeStr, daysStr].filter(Boolean).join(' | ');
      parts.push(`  [${header}]`);
      if (b.outcomeReason) {
        parts.push(`    Reason: ${b.outcomeReason}`);
      }
      if (b.ourOfficers?.length) {
        parts.push(`    Our officers: ${b.ourOfficers.join(', ')}`);
      }
      if (b.enemyOfficers?.length) {
        parts.push(`    Enemy officers: ${b.enemyOfficers.join(', ')}`);
      }
      if (b.ourTroopsStart != null && b.ourTroopsEnd != null) {
        const loss = b.ourTroopsStart - b.ourTroopsEnd;
        parts.push(`    Our troops: ${b.ourTroopsStart} → ${b.ourTroopsEnd} (lost ${loss})`);
      }
      if (b.enemyTroopsStart != null && b.enemyTroopsEnd != null) {
        const loss = b.enemyTroopsStart - b.enemyTroopsEnd;
        parts.push(`    Enemy troops: ${b.enemyTroopsStart} → ${b.enemyTroopsEnd} (lost ${loss})`);
      }
      if (b.officersCaptured?.length) {
        parts.push(`    Captured: ${b.officersCaptured.join(', ')}`);
      }
      if (b.officersLost?.length) {
        parts.push(`    Lost: ${b.officersLost.join(', ')}`);
      }
    }
    parts.push('');
  }

  // Permanent war history — shapes long-term foreign policy
  if (memory.warRecords.length > 0) {
    parts.push('=== WAR HISTORY (permanent) ===');
    for (const w of memory.warRecords) {
      let direction: string;
      let result: string;
      if (w.weAttacked) {
        direction = `We attacked ${w.defenderFaction}`;
        result = w.aggressorWon ? 'we won' : 'we lost';
      } else if (w.weWereAttacked) {
        direction = `⚠ ATTACKED BY ${w.aggressorFaction}`;
        result = w.aggressorWon ? 'they won' : 'we repelled them';
      } else {
        direction = `${w.aggressorFaction} attacked ${w.defenderFaction}`;
        result = w.aggressorWon ? `${w.aggressorFaction} won` : `${w.defenderFaction} repelled`;
      }
      parts.push(`  ${w.year}/${w.month}: ${direction} at ${w.city} — ${result}. ${w.summary}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
