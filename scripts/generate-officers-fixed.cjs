#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// RTK4 officers data
const rtk4Path = path.resolve(__dirname, '../data/rtk4_officers_zh.json');
const rtk4 = JSON.parse(fs.readFileSync(rtk4Path, 'utf-8'));

// Original officers with skills
const originalPath = '/tmp/original_officers.ts';
const originalText = fs.readFileSync(originalPath, 'utf-8');

// ID mapping: old -> new
const idMap = {
  1: 169, 2: 100, 3: 390, 4: 443, 5: 421, 6: 204, 7: 128, 8: 308, 9: 229, 10: 70,
  11: 143, 12: 96, 13: 388, 14: 98, 20: 11, 21: 326, 22: 334, 23: 398, 24: 339,
  25: 391, 26: 347, 27: 55, 28: 350, 29: 349, 30: 103, 31: 136, 32: 253, 33: 18,
  34: 17, 35: 372, 36: 384, 50: 264, 51: 258, 52: 273, 53: 430, 54: 199, 55: 194,
  56: 82, 57: 281, 58: 125, 59: 196, 60: 415, 61: 44, 62: 108, 70: 187, 71: 66,
  72: 376, 73: 377, 74: 170, 75: 185, 76: 208, 77: 94, 78: 285, 79: 399, 80: 219,
  85: 123, 86: 354, 87: 309, 88: 160, 89: 396, 91: 158, 92: 104, 93: 288, 94: 147,
  95: 244, 96: 75, 97: 84, 98: 133, 99: 410, 101: 6, 102: 151, 103: 152, 104: 310,
  106: 353, 107: 223, 108: 222, 109: 32, 110: 228, 111: 205, 112: 343, 113: 402, 114: 355
};

// Reverse map: new -> old
const reverseMap = {};
Object.entries(idMap).forEach(([oldId, newId]) => {
  reverseMap[newId] = parseInt(oldId);
});

// Extract skills from original officers
const skillMap = {};
const entryRegex = /\{\s*id:\s*(\d+),[\s\S]*?skills:\s*\[([^\]]*)\]/g;
let m;
while ((m = entryRegex.exec(originalText))) {
  const id = Number(m[1]);
  const skills = m[2]
    .split(',')
    .map(s => s.trim().replace(/['\"]/g, ''))
    .filter(Boolean);
  if (skills.length > 0) {
    skillMap[id] = skills;
  }
}

console.log('Found', Object.keys(skillMap).length, 'officers with skills in original file');

// Custom officers (IDs 450-456)
const customOfficers = [
  { id: 450, name: '貂蟬', portraitId: 450, birthYear: 170, deathYear: 220, leadership: 15, war: 18, intelligence: 72, politics: 60, charisma: 98, skills: ['做敵'] },
  { id: 451, name: '張角', portraitId: 451, birthYear: 140, deathYear: 184, leadership: 80, war: 55, intelligence: 72, politics: 42, charisma: 95, skills: ['情報', '流言', '落雷'] },
  { id: 452, name: '張寶', portraitId: 452, birthYear: 142, deathYear: 184, leadership: 62, war: 58, intelligence: 55, politics: 32, charisma: 60, skills: ['流言'] },
  { id: 453, name: '張梁', portraitId: 453, birthYear: 144, deathYear: 184, leadership: 60, war: 62, intelligence: 45, politics: 28, charisma: 55, skills: [] },
  { id: 454, name: '牛輔', portraitId: 454, birthYear: 158, deathYear: 192, leadership: 65, war: 68, intelligence: 42, politics: 38, charisma: 45, skills: ['騎兵'] },
  { id: 455, name: '楊弘', portraitId: 455, birthYear: 155, deathYear: 197, leadership: 52, war: 35, intelligence: 78, politics: 72, charisma: 58, skills: ['外交'] },
  { id: 456, name: '田楷', portraitId: 456, birthYear: 160, deathYear: 199, leadership: 68, war: 72, intelligence: 58, politics: 55, charisma: 60, skills: ['騎兵'] }
];

// Build entries
const entries = rtk4.map(o => {
  const id = o.id;
  const nameZh = id === 19 ? '曹叡' : o.name_zh;
  // Get skills from original officer using reverse mapping
  const oldId = reverseMap[id];
  const skills = oldId ? skillMap[oldId] || [] : [];
  return `  { id: ${id}, name: '${nameZh}', portraitId: ${id}, birthYear: ${o.birth_year}, deathYear: ${o.death_year}, leadership: ${o.leadership}, war: ${o.war}, intelligence: ${o.intelligence}, politics: ${o.politics}, charisma: ${o.charisma}, skills: [${skills.map(s => `'${s}'`).join(', ')}] }`;
});

// Add custom officers
customOfficers.forEach(c => {
  entries.push(`  { id: ${c.id}, name: '${c.name}', portraitId: ${c.portraitId}, birthYear: ${c.birthYear}, deathYear: ${c.deathYear}, leadership: ${c.leadership}, war: ${c.war}, intelligence: ${c.intelligence}, politics: ${c.politics}, charisma: ${c.charisma}, skills: [${c.skills.map(s => `'${s}'`).join(', ')}] }`);
});

const outPath = path.resolve(__dirname, '../src/data/officers.ts');
const header = `import type { BaseOfficer } from '../types';\n\nexport const baseOfficers: BaseOfficer[] = [\n`;
const footer = '\n];\n';
fs.writeFileSync(outPath, header + entries.join(',\n') + footer);
console.log('Generated', entries.length, 'officers with skills');

// Verify some key officers
console.log('\nVerifying key officers:');
[11, 100, 443, 430, 253].forEach(id => {
  const entry = entries.find(e => e.includes(`id: ${id},`));
  if (entry) {
    const skillsMatch = entry.match(/skills: \[([^\]]*)\]/);
    console.log(`ID ${id}: ${skillsMatch ? skillsMatch[1] : 'none'}`);
  }
});
