/**
 * LLM console logging utility.
 * All LLM-related output uses the [RTK-LLM] prefix for easy filtering.
 * Each message includes a game timestamp (year/month or battle day).
 *
 * Usage in browser console:
 *   Filter by "[RTK-LLM]" to see only LLM decisions.
 */

import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';

type LogLevel = 'decision' | 'action' | 'result' | 'error' | 'api' | 'memory' | 'battle';

const LOG_STYLES: Record<LogLevel, string> = {
  decision: 'color: #a78bfa; font-weight: bold',    // purple — LLM's reasoning
  action:   'color: #60a5fa; font-weight: bold',     // blue — command being executed
  result:   'color: #34d399',                         // green — action result
  error:    'color: #f87171; font-weight: bold',      // red — errors
  api:      'color: #94a3b8',                         // gray — API calls
  memory:   'color: #fbbf24',                         // yellow — memory updates
  battle:   'color: #ef5350; font-weight: bold',      // red — battle decisions
};

const PREFIX = '[RTK-LLM]';

/** Build a short game timestamp string like "189/3" or "189/3 Battle D5". */
function gameTimestamp(): string {
  const game = useGameStore.getState();
  const ts = `${game.year}/${game.month}`;
  if (game.phase === 'battle') {
    const battle = useBattleStore.getState();
    return `${ts} ⚔D${battle.day}`;
  }
  return ts;
}

/**
 * Log an LLM-related message with styled prefix and game timestamp.
 * All messages are prefixed with [RTK-LLM] for console filtering.
 */
export function llmLog(level: LogLevel, message: string, data?: unknown): void {
  const style = LOG_STYLES[level];
  const ts = gameTimestamp();
  if (data !== undefined) {
    console.log(`%c${PREFIX} [${ts}] [${level}] ${message}`, style, data);
  } else {
    console.log(`%c${PREFIX} [${ts}] [${level}] ${message}`, style);
  }
}
