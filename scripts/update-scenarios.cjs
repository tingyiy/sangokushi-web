#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { cityIdMapping } = require('../src/data/cities');

const officerMap = {
  1:169,2:100,3:390,4:443,5:421,6:204,7:128,8:308,9:229,10:70,
  11:143,12:96,13:388,14:98,20:11,21:326,22:334,23:398,24:339,25:391,26:347,27:55,
  28:350,29:349,30:103,31:136,32:253,33:18,34:17,35:372,36:384,50:264,51:258,52:273,
  53:430,54:199,55:194,56:82,57:281,58:125,59:196,60:415,61:44,62:108,70:187,71:66,
  72:376,73:377,74:170,75:185,76:208,77:94,78:285,79:399,80:219,85:123,86:354,87:309,
  88:160,89:396,91:158,92:104,93:288,94:147,95:244,96:75,97:84,98:133,99:410,101:6,
  102:151,103:152,104:310,106:353,107:223,108:222,109:32,110:228,111:205,112:343,113:402,114:355
};

const scenariosPath = path.resolve(__dirname, '../src/data/scenarios.ts');
// Update scenarios.ts with RTK4 ID mappings
let text = fs.readFileSync(scenariosPath, 'utf-8');

text = text.replace(/makeCity\((\d+),/g, (_, id) => {
  const mapped = cityIdMapping[id] ?? id;
  return `makeCity(${mapped},`;
});
text = text.replace(/filter\(c => !\[(.*?)\]\)/g, (_, ids) => {
  const newIds = ids.split(',').map(s => parseInt(s.trim())).map(oldId => cityIdMapping[oldId] ?? oldId).join(',');
  return `filter(c => ![${newIds}])`;
});
Object.entries(officerMap).forEach(([oldId, newId]) => {
  const re = new RegExp(`([=,]\s*)${oldId}([,)]`, 'g');
  text = text.replace(re, `$1${newId}$2`);
});
fs.writeFileSync(scenariosPath, text);
console.log('Updated scenarios.ts');
