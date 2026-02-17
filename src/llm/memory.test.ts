import { describe, test, expect, beforeEach } from 'vitest';
import { resetMemory, recordWar, formatMemoryForPrompt } from './memory';

describe('formatMemoryForPrompt war history', () => {
  beforeEach(() => {
    resetMemory();
  });

  test('third-party war uses faction names, not "We"', () => {
    recordWar({
      year: 189, month: 7,
      aggressorFaction: '曹操', defenderFaction: '袁紹',
      city: '許昌', aggressorWon: true,
      weAttacked: false, weWereAttacked: false,
      summary: 'overrun. 曹操 captured 許昌. (other factions)',
    });

    const output = formatMemoryForPrompt();
    expect(output).toContain('曹操 attacked 袁紹 at 許昌');
    expect(output).toContain('曹操 won');
    expect(output).not.toContain('We attacked');
    expect(output).not.toContain('we won');
  });

  test('player attacking uses "We attacked"', () => {
    recordWar({
      year: 190, month: 3,
      aggressorFaction: '劉備', defenderFaction: '曹操',
      city: '平原', aggressorWon: true,
      weAttacked: true, weWereAttacked: false,
      summary: 'battle. 劉備 captured 平原.',
    });

    const output = formatMemoryForPrompt();
    expect(output).toContain('We attacked 曹操 at 平原');
    expect(output).toContain('we won');
    expect(output).not.toContain('劉備 attacked');
  });

  test('player defending uses "ATTACKED BY"', () => {
    recordWar({
      year: 190, month: 5,
      aggressorFaction: '曹操', defenderFaction: '劉備',
      city: '下邳', aggressorWon: false,
      weAttacked: false, weWereAttacked: true,
      summary: 'battle. 劉備 repelled the attack.',
    });

    const output = formatMemoryForPrompt();
    expect(output).toContain('ATTACKED BY 曹操 at 下邳');
    expect(output).toContain('we repelled them');
    expect(output).not.toContain('We attacked');
  });

  test('player defending and losing shows "they won"', () => {
    recordWar({
      year: 190, month: 6,
      aggressorFaction: '曹操', defenderFaction: '劉備',
      city: '下邳', aggressorWon: true,
      weAttacked: false, weWereAttacked: true,
      summary: 'battle. 曹操 captured 下邳.',
    });

    const output = formatMemoryForPrompt();
    expect(output).toContain('ATTACKED BY 曹操 at 下邳');
    expect(output).toContain('they won');
  });

  test('player attacking and losing shows "we lost"', () => {
    recordWar({
      year: 190, month: 8,
      aggressorFaction: '劉備', defenderFaction: '袁紹',
      city: '鄴', aggressorWon: false,
      weAttacked: true, weWereAttacked: false,
      summary: 'battle. 袁紹 repelled the attack.',
    });

    const output = formatMemoryForPrompt();
    expect(output).toContain('We attacked 袁紹 at 鄴');
    expect(output).toContain('we lost');
  });

  test('third-party war where defender wins', () => {
    recordWar({
      year: 191, month: 1,
      aggressorFaction: '袁紹', defenderFaction: '曹操',
      city: '鄴', aggressorWon: false,
      weAttacked: false, weWereAttacked: false,
      summary: 'battle. 曹操 repelled the attack. (other factions)',
    });

    const output = formatMemoryForPrompt();
    expect(output).toContain('袁紹 attacked 曹操 at 鄴');
    expect(output).toContain('曹操 repelled');
    expect(output).not.toContain('We');
    expect(output).not.toContain('we');
  });
});
