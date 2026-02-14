/**
 * Comprehensive i18n regression test suite.
 *
 * Ensures no hardcoded Chinese strings leak into user-visible output in English mode.
 * Covers:
 *  - addLog() / addBattleLog() calls in stores
 *  - AI decision description fields
 *  - Event name/description fields
 *  - Advisor suggestion strings
 *  - SVG map text labels
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CHINESE_CHAR = /[\u4e00-\u9fff]/;

/** Lines that are allowed to contain Chinese because they reference dynamic scenario data */
const ALLOWED_PATTERNS = [
  'addLog(d.description)',  // event descriptions from scenario data (already localized at source)
];

/**
 * Find lines in a file that match a pattern and contain Chinese characters.
 */
function findChineseLines(filePath: string, pattern: RegExp, allowedPatterns: string[] = ALLOWED_PATTERNS): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: string[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (
      pattern.test(trimmed) &&
      CHINESE_CHAR.test(trimmed) &&
      !allowedPatterns.some(p => trimmed.includes(p))
    ) {
      violations.push(`${path.basename(filePath)}:${i + 1}: ${trimmed}`);
    }
  });

  return violations;
}

/**
 * Scan a file for any non-comment line containing Chinese and matching a pattern.
 */
function findChineseInFile(filePath: string, pattern: RegExp): string[] {
  return findChineseLines(filePath, pattern, []);
}

describe('i18n: no hardcoded Chinese in store logs', () => {
  test('gameStore.ts addLog() calls contain no Chinese', () => {
    const violations = findChineseLines(
      path.resolve(__dirname, '../store/gameStore.ts'),
      /addLog\(/
    );
    expect(violations, `Found hardcoded Chinese in addLog calls:\n${violations.join('\n')}`).toEqual([]);
  });

  test('battleStore.ts addBattleLog() calls contain no Chinese', () => {
    const violations = findChineseLines(
      path.resolve(__dirname, '../store/battleStore.ts'),
      /addBattleLog\(/
    );
    expect(violations, `Found hardcoded Chinese in addBattleLog calls:\n${violations.join('\n')}`).toEqual([]);
  });
});

describe('i18n: no hardcoded Chinese in AI decision descriptions', () => {
  const aiFiles = [
    'aiPersonnel.ts',
    'aiDevelopment.ts',
    'aiMilitary.ts',
    'aiStrategy.ts',
    'aiDiplomacy.ts',
  ];

  aiFiles.forEach(fileName => {
    test(`${fileName} description fields contain no Chinese`, () => {
      const filePath = path.resolve(__dirname, '../ai', fileName);
      const violations = findChineseInFile(filePath, /description:/);
      expect(violations, `Found hardcoded Chinese in ${fileName}:\n${violations.join('\n')}`).toEqual([]);
    });
  });
});

describe('i18n: no hardcoded Chinese in event definitions', () => {
  test('events.ts name/description fields contain no Chinese', () => {
    const filePath = path.resolve(__dirname, '../systems/events.ts');
    const violations = [
      ...findChineseInFile(filePath, /name:/),
      ...findChineseInFile(filePath, /description:/),
    ];
    expect(violations, `Found hardcoded Chinese in events.ts:\n${violations.join('\n')}`).toEqual([]);
  });

  test('historicalEvents.ts name/description/effects fields contain no Chinese', () => {
    const filePath = path.resolve(__dirname, '../data/historicalEvents.ts');
    const violations = [
      ...findChineseInFile(filePath, /name:/),
      ...findChineseInFile(filePath, /description:/),
      ...findChineseInFile(filePath, /return '/),
    ];
    expect(violations, `Found hardcoded Chinese in historicalEvents.ts:\n${violations.join('\n')}`).toEqual([]);
  });
});

describe('i18n: no hardcoded Chinese in advisor suggestions', () => {
  test('advisor.ts suggestion strings contain no Chinese', () => {
    const filePath = path.resolve(__dirname, '../systems/advisor.ts');
    const violations = findChineseInFile(filePath, /suggestions\.push\(/);
    expect(violations, `Found hardcoded Chinese in advisor.ts:\n${violations.join('\n')}`).toEqual([]);
  });
});

describe('i18n: no hardcoded Chinese in SVG map', () => {
  test('terrain-map.svg contains no Chinese text elements', () => {
    const svgPath = path.resolve(__dirname, '../../public/terrain-map.svg');
    const content = fs.readFileSync(svgPath, 'utf-8');
    // Find all <text>...</text> elements and check for Chinese
    const textElements = content.match(/<text[^>]*>[^<]*<\/text>/g) || [];
    const chineseTexts = textElements.filter(el => CHINESE_CHAR.test(el));
    expect(chineseTexts, `Found Chinese text elements in SVG:\n${chineseTexts.join('\n')}`).toEqual([]);
  });
});

describe('i18n: no hardcoded Chinese in CLI addLog calls', () => {
  test('cli/play.ts addLog() calls contain no Chinese', () => {
    const filePath = path.resolve(__dirname, '../cli/play.ts');
    const violations = findChineseLines(filePath, /addLog\(/);
    expect(violations, `Found hardcoded Chinese in CLI addLog calls:\n${violations.join('\n')}`).toEqual([]);
  });
});

describe('i18n: comprehensive Chinese leak scan across source files', () => {
  test('no Chinese in addLog/addBattleLog calls across all .ts files', () => {
    const srcDir = path.resolve(__dirname, '..');

    function walkSync(dir: string): string[] {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip i18n, test, and node_modules directories
          if (['i18n', 'test', 'node_modules'].includes(entry.name)) continue;
          files.push(...walkSync(full));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
          // Skip CLI (has its own test) and locale files
          if (full.includes('cli/play.ts')) continue;
          files.push(full);
        }
      }
      return files;
    }

    const tsFiles = walkSync(srcDir);
    const allViolations: string[] = [];
    for (const fullPath of tsFiles) {
      const violations = findChineseLines(fullPath, /addLog\(|addBattleLog\(/);
      allViolations.push(...violations);
    }

    expect(allViolations, `Found hardcoded Chinese in addLog/addBattleLog calls:\n${allViolations.join('\n')}`).toEqual([]);
  });
});

describe('i18n: no raw English game-data keys in UI components', () => {
  /**
   * Scans component files for patterns where skill/rank/unit-type arrays
   * are joined or displayed without being translated via t() or i18next.t().
   *
   * Anti-patterns caught:
   *   o.skills.join(',')          — raw English skill keys displayed
   *   o.skills.slice(...).join()  — same, with slice
   *
   * Correct patterns (not flagged):
   *   o.skills.map(s => t(`data:skill.${s}`)).join()
   */
  function findRawSkillJoins(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const violations: string[] = [];

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

      // Detect: .skills.join( or .skills.slice(...).join( WITHOUT a preceding .map(
      // This catches raw skill arrays being joined without translation.
      if (/\.skills\b/.test(trimmed) && /\.join\(/.test(trimmed) && !trimmed.includes('.map(')) {
        violations.push(`${path.basename(filePath)}:${i + 1}: ${trimmed}`);
      }
    });

    return violations;
  }

  function walkTsxFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'test'].includes(entry.name)) continue;
        files.push(...walkTsxFiles(full));
      } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
        files.push(full);
      }
    }
    return files;
  }

  test('no raw .skills.join() without .map() in React components', () => {
    const componentsDir = path.resolve(__dirname, '../components');
    const tsxFiles = walkTsxFiles(componentsDir);
    const allViolations: string[] = [];
    for (const filePath of tsxFiles) {
      allViolations.push(...findRawSkillJoins(filePath));
    }
    expect(allViolations, `Found raw skill keys displayed without t() translation:\n${allViolations.join('\n')}`).toEqual([]);
  });

  test('no raw .skills.join() without .map() in CLI', () => {
    const cliPath = path.resolve(__dirname, '../cli/play.ts');
    const violations = findRawSkillJoins(cliPath);
    expect(violations, `Found raw skill keys displayed without translation in CLI:\n${violations.join('\n')}`).toEqual([]);
  });
});

describe('i18n: no hardcoded Chinese in React component JSX', () => {
  /**
   * Scans .tsx files for hardcoded Chinese characters in JSX expressions.
   * Exceptions:
   *  - Comments (// or /* ... *\/)
   *  - import statements
   *  - Type annotations / interfaces
   *  - CSS class names or property keys
   *  - String comparisons (=== '...')
   */
  function findHardcodedChineseInJsx(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const violations: string[] = [];

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      // Skip comments (// ..., /* ..., * ..., {/* ... */})
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (/^\{\/\*.*\*\/\}$/.test(trimmed)) return; // JSX comments: {/* ... */}
      // Skip import lines
      if (trimmed.startsWith('import ')) return;
      // Skip type/interface definitions
      if (/^(type|interface|export type|export interface)\s/.test(trimmed)) return;

      if (CHINESE_CHAR.test(trimmed)) {
        // Allow Chinese in:
        //  - String comparisons (=== '...' or !== '...')
        //  - Console.log (debug only)
        //  - Test data (expect, describe, it, test)
        //  - Keys in objects that are data definitions (e.g. name: '曹操')
        //  - Language switcher display names (繁體中文/English are intentionally native)
        if (/===\s*['"]|!==\s*['"]/.test(trimmed)) return;
        if (/console\.(log|warn|error)/.test(trimmed)) return;
        if (/\b(describe|it|test|expect)\(/.test(trimmed)) return;
        if (/options=\{\[.*'繁體中文'/.test(trimmed)) return;

        violations.push(`${path.basename(filePath)}:${i + 1}: ${trimmed}`);
      }
    });

    return violations;
  }

  function walkTsxFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'test'].includes(entry.name)) continue;
        files.push(...walkTsxFiles(full));
      } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
        files.push(full);
      }
    }
    return files;
  }

  test('no hardcoded Chinese in component .tsx files', () => {
    const componentsDir = path.resolve(__dirname, '../components');
    const tsxFiles = walkTsxFiles(componentsDir);
    const allViolations: string[] = [];
    for (const filePath of tsxFiles) {
      allViolations.push(...findHardcodedChineseInJsx(filePath));
    }
    expect(allViolations, `Found hardcoded Chinese in React components:\n${allViolations.join('\n')}`).toEqual([]);
  });
});
