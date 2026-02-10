#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { cityIdMapping } = require('../src/data/cities');
const officerMap = { /* mapping table copied */ };
const scenariosPath = path.resolve(__dirname, '../src/data/scenarios.ts');
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
