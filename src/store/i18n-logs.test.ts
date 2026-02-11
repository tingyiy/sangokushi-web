/**
 * Regression test: ensure no hardcoded Chinese strings remain in store log calls.
 *
 * addLog() and addBattleLog() should use i18next.t() for all user-visible text.
 * Dynamic data (e.g. d.description for events) is allowed — it comes from the
 * scenario data layer which is localized separately.
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CHINESE_CHAR = /[\u4e00-\u9fff]/;

/** Lines that are allowed to contain Chinese because they log dynamic data, not hardcoded strings */
const ALLOWED_PATTERNS = [
  'addLog(d.description)',  // event descriptions from scenario data
];

function findChineseLogLines(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: string[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (
      (trimmed.includes('addLog(') || trimmed.includes('addBattleLog(')) &&
      CHINESE_CHAR.test(trimmed) &&
      !ALLOWED_PATTERNS.some(p => trimmed.includes(p))
    ) {
      violations.push(`${path.basename(filePath)}:${i + 1}: ${trimmed}`);
    }
  });

  return violations;
}

describe('i18n: no hardcoded Chinese in store logs', () => {
  test('gameStore.ts addLog() calls contain no Chinese', () => {
    const violations = findChineseLogLines(
      path.resolve(__dirname, 'gameStore.ts')
    );
    expect(violations, `Found hardcoded Chinese in addLog calls:\n${violations.join('\n')}`).toEqual([]);
  });

  test('battleStore.ts addBattleLog() calls contain no Chinese', () => {
    const violations = findChineseLogLines(
      path.resolve(__dirname, 'battleStore.ts')
    );
    expect(violations, `Found hardcoded Chinese in addBattleLog calls:\n${violations.join('\n')}`).toEqual([]);
  });
});
