#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// City ID mapping: old -> new (only for IDs that need to change)
const cityIdMapping = {
  4: 5, 5: 4, 7: 8, 8: 6, 9: 16, 10: 12, 12: 30, 13: 15, 14: 7, 15: 18,
  16: 20, 17: 10, 18: 22, 19: 31, 20: 32, 21: 39, 22: 38, 23: 33, 24: 34,
  25: 35, 26: 41, 27: 24, 28: 25, 29: 27, 30: 37, 32: 36, 34: 28, 35: 42,
  36: 29, 38: 43, 40: 9, 42: 14
};

// Officer ID mapping: old -> new
const officerMap = {
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

const scenariosPath = path.resolve(__dirname, '../src/data/scenarios.ts');
let text = fs.readFileSync(scenariosPath, 'utf-8');

// Use placeholders to avoid double replacement
const cityPlaceholder = '__CITY_';
const officerPlaceholder = '__OFFICER_';
const rulerPlaceholder = '__RULER_';
const advisorPlaceholder = '__ADVISOR_';

// Sort IDs descending to avoid partial matches
const sortedCityIds = Object.keys(cityIdMapping).map(Number).sort((a, b) => b - a);
const sortedOfficerIds = Object.keys(officerMap).map(Number).sort((a, b) => b - a);

// Step 1: Replace rulerId values with placeholders FIRST
sortedOfficerIds.forEach(oldId => {
  text = text.replace(new RegExp(`rulerId: ${oldId}([,}])`, 'g'), `${rulerPlaceholder}${oldId}$1`);
  text = text.replace(new RegExp(`advisorId: ${oldId}([,}])`, 'g'), `${advisorPlaceholder}${oldId}$1`);
});

// Step 2: Replace makeCity IDs with placeholders
sortedCityIds.forEach(oldId => {
  text = text.replace(new RegExp(`makeCity\\(${oldId},`, 'g'), `makeCity(${cityPlaceholder}${oldId},`);
});

// Step 3: Replace officer IDs in makeOfficer with placeholders
sortedOfficerIds.forEach(oldId => {
  const regex = new RegExp(`makeOfficer\\(${oldId},\\s*([0-9]+),\\s*([0-9]+)`, 'g');
  text = text.replace(regex, (match, factionId, cityId) => {
    const newCityId = cityIdMapping[cityId] || cityId;
    return `makeOfficer(${officerPlaceholder}${oldId}, ${factionId}, ${newCityId}`;
  });
});

// Step 4: Replace filter arrays
text = text.replace(/filter\(c => !\[([^\]]+)\]\.includes\(c\.id\)\)/g, (match, ids) => {
  const idList = ids.split(',').map(s => parseInt(s.trim()));
  const newIdList = idList.map(id => cityIdMapping[id] || id);
  return `filter(c => ![${newIdList.join(', ')}].includes(c.id))`;
});

// Step 5: Replace all placeholders with actual new IDs
// Officers in makeOfficer
sortedOfficerIds.forEach(oldId => {
  const newId = officerMap[oldId];
  text = text.replace(new RegExp(`${officerPlaceholder}${oldId},`, 'g'), `${newId},`);
});

// Ruler IDs
sortedOfficerIds.forEach(oldId => {
  const newId = officerMap[oldId];
  text = text.replace(new RegExp(`${rulerPlaceholder}${oldId}([,}])`, 'g'), `rulerId: ${newId}$1`);
});

// Advisor IDs
sortedOfficerIds.forEach(oldId => {
  const newId = officerMap[oldId];
  text = text.replace(new RegExp(`${advisorPlaceholder}${oldId}([,}])`, 'g'), `advisorId: ${newId}$1`);
});

// Cities
sortedCityIds.forEach(oldId => {
  const newId = cityIdMapping[oldId];
  text = text.replace(new RegExp(`${cityPlaceholder}${oldId},`, 'g'), `${newId},`);
});

fs.writeFileSync(scenariosPath, text);
console.log('Updated scenarios.ts with RTK4 ID mappings');
