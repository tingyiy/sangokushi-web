#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { cityIdMapping } from '../src/data/cities.js';
const officerMap = { /* ... mapping table entries ... */ };
const scenariosPath = path.resolve('src/data/scenarios.ts');
let text = fs.readFileSync(scenariosPath, 'utf-8');
text = text.replace(/makeCity\((\d+),/g, (_, id) => `makeCity(${cityIdMapping[id]},`);
text = text.replace(/filter\(c => !\[(.*?)\]\)/g, (_, ids) => {
  const newIds = ids.split(',').map(s => parseInt(s.trim())).map(oldId => cityIdMapping[oldId]).join(',');
  return `filter(c => ![${newIds}])`;
});
Object.entries(officerMap).forEach(([oldId, newId]) => {
  const re = new RegExp(`([=,]\s*)${oldId}([,)]`, 'g');
  text = text.replace(re, `$1${newId}$2`);
});
fs.writeFileSync(scenariosPath, text);
console.log('Updated scenarios.ts');
