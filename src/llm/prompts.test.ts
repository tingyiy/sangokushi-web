/**
 * Regression test: every command the LLM agent can dispatch must be
 * documented in the corresponding system prompt so the LLM knows about it.
 *
 * Two dispatchers exist:
 *  - executeCommand() in agent.ts  → strategic commands → SYSTEM_PROMPT_STRATEGIC
 *  - runBattlePhase() switch        → battle actions    → SYSTEM_PROMPT_BATTLE
 *
 * If a command exists in a dispatcher but not in its prompt, the LLM will
 * never know it can use it.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SYSTEM_PROMPT_STRATEGIC, SYSTEM_PROMPT_BATTLE } from './prompts';

// ── Extract command names from agent.ts ──────────────────────────────

function getAgentSource(): string {
  return readFileSync(resolve(__dirname, 'agent.ts'), 'utf-8');
}

/**
 * Extract case labels from the executeCommand() strategic dispatcher.
 * It starts at `switch (type) {` and ends before the battle dispatcher.
 */
function extractStrategicCommands(src: string): string[] {
  // executeCommand contains `switch (type) {` with cases like `case 'endTurn':`
  // The battle dispatcher uses `switch (actionType) {`
  const strategicBlock = src.split('switch (type)')[1]?.split('switch (actionType)')[0] ?? '';
  const matches = strategicBlock.matchAll(/case\s+'(\w+)'/g);
  return [...new Set([...matches].map(m => m[1]))];
}

/**
 * Extract case labels from the battle dispatcher (`switch (actionType)`).
 */
function extractBattleCommands(src: string): string[] {
  const battleBlock = src.split('switch (actionType)')[1] ?? '';
  const matches = battleBlock.matchAll(/case\s+'(\w+)'/g);
  return [...new Set([...matches].map(m => m[1]))];
}

// Commands that are internal plumbing — the LLM never issues them directly.
// If you add a command here, add a comment explaining why.
const INTERNAL_STRATEGIC_COMMANDS = new Set([
  'selectCity',     // auto-handled by agent before diplomacy/strategy commands
  'confirmEvent',   // event queue processing, not a player action
  'popEvent',       // event queue processing, not a player action
  'retreat',        // handled in battle dispatcher, not strategic prompt
]);

describe('LLM prompt completeness', () => {
  const src = getAgentSource();
  const strategicCmds = extractStrategicCommands(src);
  const battleCmds = extractBattleCommands(src);

  test('extracted strategic commands from dispatcher', () => {
    expect(strategicCmds.length).toBeGreaterThan(15);
  });

  test('extracted battle commands from dispatcher', () => {
    expect(battleCmds.length).toBeGreaterThan(3);
  });

  test('every strategic command appears in SYSTEM_PROMPT_STRATEGIC or is explicitly internal', () => {
    const missing: string[] = [];
    for (const cmd of strategicCmds) {
      if (INTERNAL_STRATEGIC_COMMANDS.has(cmd)) continue;
      if (!SYSTEM_PROMPT_STRATEGIC.includes(cmd)) {
        missing.push(cmd);
      }
    }
    expect(
      missing,
      `Strategic commands in agent dispatcher but missing from SYSTEM_PROMPT_STRATEGIC:\n  ${missing.join('\n  ')}\n\nEither add them to SYSTEM_PROMPT_STRATEGIC in src/llm/prompts.ts, or add them to INTERNAL_STRATEGIC_COMMANDS in this test with a justification.`,
    ).toEqual([]);
  });

  test('every battle command appears in SYSTEM_PROMPT_BATTLE', () => {
    const missing: string[] = [];
    for (const cmd of battleCmds) {
      if (!SYSTEM_PROMPT_BATTLE.includes(cmd)) {
        missing.push(cmd);
      }
    }
    expect(
      missing,
      `Battle commands in agent dispatcher but missing from SYSTEM_PROMPT_BATTLE:\n  ${missing.join('\n  ')}\n\nAdd them to SYSTEM_PROMPT_BATTLE in src/llm/prompts.ts.`,
    ).toEqual([]);
  });

  test('INTERNAL_STRATEGIC_COMMANDS entries are actually in the dispatcher', () => {
    for (const cmd of INTERNAL_STRATEGIC_COMMANDS) {
      expect(
        strategicCmds,
        `${cmd} is in INTERNAL_STRATEGIC_COMMANDS but not in the agent dispatcher — remove it from the exclusion list`,
      ).toContain(cmd);
    }
  });
});
