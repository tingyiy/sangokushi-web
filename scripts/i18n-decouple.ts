/**
 * i18n Phase 2: Bulk replacement script
 * Replaces Chinese type literal strings (skills, ranks, categories)
 * with English keys across all .ts/.tsx files under src/
 * 
 * Usage: npx tsx scripts/i18n-decouple.ts [--dry-run]
 */

import fs from 'fs';
import path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Mapping tables ──────────────────────────────────────────────

const SKILL_MAP: Record<string, string> = {
  '外交': 'diplomacy',
  '情報': 'intelligence',
  '人才': 'talent',
  '製造': 'manufacture',
  '做敵': 'provoke',
  '驅虎': 'tigerTrap',
  '流言': 'rumor',
  '燒討': 'arson',
  '諜報': 'espionage',
  '步兵': 'infantry',
  '騎兵': 'cavalry',
  '弓兵': 'archery',
  '海戰': 'naval',
  '火計': 'firePlot',
  '落石': 'rockfall',
  '同討': 'jointAttack',
  '天變': 'weatherChange',
  '風變': 'windChange',
  '混亂': 'confusion',
  '連環': 'chainLink',
  '落雷': 'lightning',
  '修復': 'repair',
  '罵聲': 'taunt',
  '虛報': 'falseReport',
  '鼓舞': 'inspire',
  '伏兵': 'ambush',
};

const RANK_MAP: Record<string, string> = {
  '太守': 'governor',
  '將軍': 'general',
  '都督': 'viceroy',
  '軍師': 'advisor',
  '侍中': 'attendant',
  '一般': 'common',
};

const CATEGORY_MAP: Record<string, string> = {
  '內政': 'domestic',
  '軍事': 'military',
  '人事': 'personnel',
  // '外交' handled by SKILL_MAP (same mapping: 'diplomacy')
  '謀略': 'strategy',
  '結束': 'end',
};

// Merge all mappings. Order matters: longer strings first to avoid partial matches.
// (Not strictly needed since we match exact quoted strings, but good practice.)
const ALL_MAPPINGS: Record<string, string> = {
  ...SKILL_MAP,
  ...RANK_MAP,
  ...CATEGORY_MAP,
};

// ── File discovery ──────────────────────────────────────────────

function findFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, dist, i18n locales
      if (['node_modules', 'dist', '.git', 'locales'].includes(entry.name)) continue;
      results.push(...findFiles(fullPath, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Replacement logic ───────────────────────────────────────────

function processFile(filePath: string): { changed: boolean; replacements: number; details: string[] } {
  let content = fs.readFileSync(filePath, 'utf-8');
  let totalReplacements = 0;
  const details: string[] = [];

  // Sort keys by length descending so longer strings are replaced first
  const sortedKeys = Object.keys(ALL_MAPPINGS).sort((a, b) => b.length - a.length);

  for (const zhKey of sortedKeys) {
    const enKey = ALL_MAPPINGS[zhKey];
    
    // Match the Chinese string inside single or double quotes: 'X' or "X"
    // Uses lookahead/lookbehind to preserve the quote character
    // Pattern: (?<=['"])中文(?=['"])
    const regex = new RegExp(`(?<=['"\`])${escapeRegex(zhKey)}(?=['"\`])`, 'g');
    
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      content = content.replace(regex, enKey);
      totalReplacements += matches.length;
      details.push(`  ${zhKey} → ${enKey} (${matches.length}x)`);
    }
  }

  if (totalReplacements > 0 && !DRY_RUN) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { changed: totalReplacements > 0, replacements: totalReplacements, details };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Main ────────────────────────────────────────────────────────

const srcDir = path.resolve(import.meta.dirname!, '..', 'src');
const files = findFiles(srcDir, ['.ts', '.tsx']);

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Processing ${files.length} files...`);
console.log('');

let totalFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  const relPath = path.relative(path.resolve(srcDir, '..'), file);
  const result = processFile(file);
  if (result.changed) {
    totalFiles++;
    totalReplacements += result.replacements;
    console.log(`${relPath} (${result.replacements} replacements)`);
    for (const d of result.details) {
      console.log(d);
    }
    console.log('');
  }
}

console.log('────────────────────────────────────────');
console.log(`Total: ${totalReplacements} replacements in ${totalFiles} files`);
if (DRY_RUN) {
  console.log('(dry run — no files modified)');
}
