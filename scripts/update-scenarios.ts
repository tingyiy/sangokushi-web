#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import { cityIdMapping, reverseCityIdMapping } from '../src/data/cities';
import rtk4 from '../data/rtk4_officers_zh.json';
// ID maps from MIGRATION-PLAN
const officerMap: Record<number, number> = { /* ... copy mapping table ... */ };

const scenariosPath = path.resolve(__dirname, '../src/data/scenarios.ts');
let text = fs.readFileSync(scenariosPath, 'utf-8');

// Replace city IDs in makeCity and filters
text = text.replace(/makeCity\((\d+),/g, (_, id) => `makeCity(${cityIdMapping[id]},`);
text = text.replace(/filter\(c => !\[(.*?)\]\)/g, (_, ids) => {
  const newIds = ids.split(',').map(s => parseInt(s.trim())).map(oldId => cityIdMapping[oldId]!).join(',');
  return `filter(c => ![${newIds}])`;
});
// Replace faction ruler/advisor IDs and makeOfficer first arg
Object.entries(officerMap).forEach(([oldId, newId]) => {
  const re = new RegExp(`([=,]\s*)${oldId}([,)]`, 'g');
  text = text.replace(re, `$1${newId}$2`);
});

fs.writeFileSync(scenariosPath, text);
console.log('Updated scenarios.ts');
