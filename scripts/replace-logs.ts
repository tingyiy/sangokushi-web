/**
 * Script to replace all addLog() / addBattleLog() calls in gameStore.ts and battleStore.ts
 * with i18next.t() calls using the logs namespace.
 *
 * Usage: npx tsx scripts/replace-logs.ts
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── Helpers ───────────────────────────────────────────────

function replaceInFile(filePath: string, replacements: [string, string][]) {
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [oldStr, newStr] of replacements) {
    if (!content.includes(oldStr)) {
      console.warn(`  ⚠ NOT FOUND: ${oldStr.slice(0, 80)}...`);
      continue;
    }
    // Only replace first occurrence to avoid accidents
    content = content.replace(oldStr, newStr);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

const t = (key: string, params?: string) =>
  params ? `i18next.t('logs:${key}', ${params})` : `i18next.t('logs:${key}')`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ln = (name: string) => `localizedName(${name})`;

// ─── gameStore.ts replacements ─────────────────────────────

const gsPath = path.resolve('src/store/gameStore.ts');

const gsReplacements: [string, string][] = [
  // Line 285 — faction chosen (inside set({ log: [...] }))
  [
    "log: [`${faction.name}，天命所歸。${state.year}年${state.month}月，征途開始！`]",
    `log: [${t('game.factionChosen', `{ faction: localizedName(faction.name), year: state.year, month: state.month }`)}]`
  ],
  // Line 303
  [
    "get().addLog('遊戲設定完成，開始征戰！');",
    `get().addLog(${t('game.settingsConfirm')});`
  ],
  // Line 328
  [
    "get().addLog('我軍撤退了！');",
    `get().addLog(${t('game.retreat')});`
  ],
  // Line 451
  [
    "get().addLog(`【繼承】${deadOfficer.name} 逝世，由 ${successor.name} 繼任為君主。`);",
    `get().addLog(${t('game.succession', '{ dead: localizedName(deadOfficer.name), successor: localizedName(successor.name) }')});`
  ],
  // Line 456
  [
    "get().addLog(`【滅亡】${deadOfficer.name} 逝世，該勢力因無繼承人而土崩瓦解。`);",
    `get().addLog(${t('game.factionCollapse', '{ dead: localizedName(deadOfficer.name) }')});`
  ],
  // Line 459
  [
    "get().addLog(`【訃告】${deadOfficer.name} 病逝了。`);",
    `get().addLog(${t('game.obituary', '{ name: localizedName(deadOfficer.name) }')});`
  ],
  // Line 474
  [
    "get().addLog(`── ${newYear}年${newMonth}月 ──`);",
    `get().addLog(${t('game.turnHeader', '{ year: newYear, month: newMonth }')});`
  ],
  // Line 494
  [
    "get().addLog(`【事件】${event.name}：${event.description}`);",
    `get().addLog(${t('game.event', '{ name: event.name, description: event.description }')});`
  ],
  // Line 514
  [
    "suggestions.forEach(s => get().addLog(`【軍師】${s}`));",
    `suggestions.forEach(s => get().addLog(${t('game.advisor', '{ suggestion: s }')}));`
  ],
  // Line 653 — tax rate
  [
    "const rateText = rate === 'low' ? '低 (5%)' : rate === 'medium' ? '中 (10%)' : '高 (15%)';",
    "const rateText = i18next.t(`data:taxRate.${rate}`);"
  ],
  [
    "get().addLog(`${city?.name} 稅率已變更為 ${rateText}。`);",
    "get().addLog(i18next.t('logs:domestic.taxRateChanged', { city: localizedName(city?.name ?? ''), rate: rateText }));"
  ],
  // Line 661 — promote
  [
    "get().addLog(`${officer?.name} 已被任命為 ${rank}。`);",
    "get().addLog(i18next.t('logs:domestic.promoted', { name: localizedName(officer?.name ?? ''), rank: i18next.t(`data:rank.${rank}`) }));"
  ],

  // ─── developCommerce ───
  [
    "if (city) get().addLog(`金不足，無法開發商業。需要 500（現有 ${city.gold}）。`);",
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:domestic.developCommerce_action', '開發商業'), required: 500, current: city.gold }")});`
  ],

  // ─── developAgriculture ───
  [
    "if (city) get().addLog(`金不足，無法開發農業。需要 500（現有 ${city.gold}）。`);",
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:domestic.developAgriculture_action', '開發農業'), required: 500, current: city.gold }")});`
  ],

  // ─── reinforceDefense ───
  [
    "if (city) get().addLog(`金不足，無法強化城防。需要 300（現有 ${city.gold}）。`);",
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:domestic.reinforceDefense_action', '強化城防'), required: 300, current: city.gold }")});`
  ],

  // ─── developFlood ───
  [
    "if (city) get().addLog(`金不足，無法開發治水。需要 500（現有 ${city.gold}）。`);",
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:domestic.developFlood_action', '開發治水'), required: 500, current: city.gold }")});`
  ],

  // ─── developTech ───
  [
    "if (city) get().addLog(`金不足，無法開發技術。需要 800（現有 ${city.gold}）。`);",
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:domestic.developTech_action', '開發技術'), required: 800, current: city.gold }")});`
  ],

  // ─── train ───
  [
    "if (city) get().addLog(`糧不足，無法訓練。需要 500（現有 ${city.food}）。`);",
    `if (city) get().addLog(${t('error.foodInsufficient', '{ required: 500, current: city.food }')});`
  ],
  [
    "get().addLog('城中無兵，無法訓練。');",
    `get().addLog(${t('error.noTroops')});`
  ],

  // ─── manufacture ───
  [
    "if (city) get().addLog(`金不足，無法製造。需要 1000（現有 ${city.gold}）。`);",
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:domestic.manufacture_action', '製造'), required: 1000, current: city.gold }")});`
  ],
];

// Handle repeated patterns — officerNotInCity / noOfficerInCity / staminaInsufficient
// These appear many times across different commands. We need to replace each unique occurrence.
// The approach: read the file, find each line, and replace it.

console.log('Starting gameStore.ts replacements...');
replaceInFile(gsPath, gsReplacements);
console.log(`Applied ${gsReplacements.length} initial replacements to gameStore.ts`);

// Now do the remaining replacements on the modified file
// Read the file again for the bulk mechanical replacements
let gsContent = fs.readFileSync(gsPath, 'utf-8');

// ─── Helper: name localization wrapper ─────────────────────
// Replace patterns like `${executor.name}` in logs with `${localizedName(executor.name)}`
// and `${city.name}` with `${localizedName(city.name)}` etc.

// Replace all the repeated error patterns
const repeatedReplacements: [RegExp, string][] = [
  // officerNotInCity / noOfficerInCity pattern (appears ~10 times)
  [
    /get\(\)\.addLog\(officerId \? '指派武將不在該城，無法執行指令。' : '城中無武將，無法執行指令。'\);/g,
    `get().addLog(officerId ? ${t('error.officerNotInCity')} : ${t('error.noOfficerInCity')});`
  ],
  // officerNotInCityOrFaction pattern (appears ~3 times)
  [
    /get\(\)\.addLog\(recruiterId \? '指派武將不在該城或不屬於我方。' : '城中無人可派。'\);/g,
    `get().addLog(recruiterId ? ${t('error.officerNotInCityOrFaction')} : ${t('error.noOfficerAvailable')});`
  ],
  [
    /get\(\)\.addLog\(officerId \? '指派武將不在該城或不屬於我方。' : '城中無人可派。'\);/g,
    `get().addLog(officerId ? ${t('error.officerNotInCityOrFaction')} : ${t('error.noOfficerAvailable')});`
  ],
  // noOfficerAvailable pattern (city has no officer to dispatch) — standalone
  [
    /get\(\)\.addLog\('城中無人可派。'\);/g,
    `get().addLog(${t('error.noOfficerAvailable')});`
  ],
  // noOfficerForSurrender patterns
  [
    /get\(\)\.addLog\('城內無將領可執行勸降。'\);/g,
    `get().addLog(${t('error.noOfficerForSurrender')});`
  ],
  [
    /get\(\)\.addLog\(recruiterId \? '指派武將不在該城或不屬於我方。' : '城內無將領可執行勸降。'\);/g,
    `get().addLog(recruiterId ? ${t('error.officerNotInCityOrFaction')} : ${t('error.noOfficerForSurrender')});`
  ],
  // staminaInsufficientGeneric pattern
  [
    /get\(\)\.addLog\('體力不足。'\);/g,
    `get().addLog(${t('error.staminaInsufficientGeneric')});`
  ],

  // ─── Stamina insufficient with name and required amount ───
  // Pattern: ${executor.name} 體力不足（需 20），無法執行指令。
  [
    /get\(\)\.addLog\(`\$\{executor\.name\} 體力不足（需 (\d+)），無法執行指令。`\);/g,
    (_, stamina: string) => `get().addLog(${t('error.staminaInsufficient', `{ name: localizedName(executor.name), required: ${stamina} }`)});`
  ],
  // ${recruiter.name} 體力不足（需 15），無法執行指令。
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 體力不足（需 (\d+)），無法執行指令。`\);/g,
    (_, stamina: string) => `get().addLog(${t('error.staminaInsufficient', `{ name: localizedName(recruiter.name), required: ${stamina} }`)});`
  ],
  // ${messenger.name} 體力不足（需 15），無法執行指令。
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 體力不足（需 (\d+)），無法執行指令。`\);/g,
    (_, stamina: string) => `get().addLog(${t('error.staminaInsufficient', `{ name: localizedName(messenger.name), required: ${stamina} }`)});`
  ],
  // ${recruiter.name} 體力不足（需 15）。 (short form)
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 體力不足（需 (\d+)）。`\);/g,
    (_, stamina: string) => `get().addLog(${t('error.staminaInsufficientShort', `{ name: localizedName(recruiter.name), required: ${stamina} }`)});`
  ],
  // ${messenger.name} 體力不足（需 20），無法執行指令。  -- for alliance
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 體力不足（需 (\d+)），無法執行指令。`\);/g,
    (_, stamina: string) => `get().addLog(${t('error.staminaInsufficient', `{ name: localizedName(messenger.name), required: ${stamina} }`)});`
  ],

  // ─── Domestic success messages ───
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 商業發展 \+\$\{10 \+ bonus\}（花費 500 金，體力 -20）`\);/g,
    `get().addLog(${t('domestic.developCommerce', '{ city: localizedName(city.name), officer: localizedName(executor.name), bonus: 10 + bonus }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 農業發展 \+\$\{10 \+ bonus\}（花費 500 金，體力 -20）`\);/g,
    `get().addLog(${t('domestic.developAgriculture', '{ city: localizedName(city.name), officer: localizedName(executor.name), bonus: 10 + bonus }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 城防強化 \+5（花費 300 金，體力 -20）`\);/g,
    `get().addLog(${t('domestic.reinforceDefense', '{ city: localizedName(city.name), officer: localizedName(executor.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 治水發展 \+\$\{8 \+ bonus\}（花費 500 金，體力 -20）`\);/g,
    `get().addLog(${t('domestic.developFlood', '{ city: localizedName(city.name), officer: localizedName(executor.name), bonus: 8 + bonus }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 技術發展 \+\$\{5 \+ bonus\}（花費 800 金，體力 -25）`\);/g,
    `get().addLog(${t('domestic.developTech', '{ city: localizedName(city.name), officer: localizedName(executor.name), bonus: 5 + bonus }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 訓練部隊（花費 500 糧，體力 -20）`\);/g,
    `get().addLog(${t('domestic.trainTroops', '{ city: localizedName(city.name), officer: localizedName(executor.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 製造了 \$\{amount\} 單位 \$\{weaponNames\[weaponType\]\}（花費 1000 金，體力 -30）`\);/g,
    `get().addLog(${t('domestic.manufacture', "{ city: localizedName(city.name), officer: localizedName(executor.name), amount, weapon: i18next.t(`data:weapon.${weaponType}`) }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 賑災民心 \+\$\{15 \+ bonus\}（花費 500 金, 1000 糧，體力 -15）`\);/g,
    `get().addLog(${t('domestic.relief', '{ city: localizedName(city.name), officer: localizedName(executor.name), bonus: 15 + bonus }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\}：\$\{executor\.name\} 徵兵 \$\{actual\} 人（體力 -10）`\);/g,
    `get().addLog(${t('domestic.conscript', '{ city: localizedName(city.name), officer: localizedName(executor.name), amount: actual }')});`
  ],

  // ─── Manufacture skill / tech errors ───
  [
    /get\(\)\.addLog\(`\$\{executor\.name\} 不具備製造技能。`\);/g,
    `get().addLog(${t('error.noManufactureSkill', '{ name: localizedName(executor.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`技術不足（需 \$\{gates\[weaponType\]\}），無法製造該武器。`\);/g,
    `get().addLog(${t('error.techInsufficient', '{ required: gates[weaponType] }')});`
  ],

  // ─── Resource insufficient (relief) ───
  [
    /get\(\)\.addLog\(`資源不足，無法賑災。\$\{shortages\.join\('、'\)\}。`\);/g,
    `get().addLog(${t('error.resourceInsufficient', "{ action: i18next.t('logs:domestic.relief_action', '賑災'), details: shortages.join(i18next.t('logs:common.comma', '、')) }")});`
  ],
  // Resource insufficient for conscription
  [
    /get\(\)\.addLog\(`資源不足，無法徵兵。需要：\$\{shortages\.join\('、'\)\}。`\);/g,
    `get().addLog(${t('error.resourceInsufficient', "{ action: i18next.t('logs:domestic.conscript_action', '徵兵'), details: shortages.join(i18next.t('logs:common.comma', '、')) }")});`
  ],

  // ─── Personnel ───
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 成功招攬 \$\{officer\.name\}！忠誠 60（體力 -15）`\);/g,
    `get().addLog(${t('personnel.recruitSuccess', '{ recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 招攬 \$\{officer\.name\} 失敗。（體力 -15）`\);/g,
    `get().addLog(${t('personnel.recruitFail', '{ recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 在 \$\{city\.name\} 找到了 \$\{foundOfficer\.name\}！（體力 -15）`\);/g,
    `get().addLog(${t('personnel.searchFoundOfficer', '{ recruiter: localizedName(recruiter.name), city: localizedName(city.name), officer: localizedName(foundOfficer.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 在 \$\{city\.name\} 搜索時發現了寶物！（體力 -15）`\);/g,
    `get().addLog(${t('personnel.searchFoundTreasure', '{ recruiter: localizedName(recruiter.name), city: localizedName(city.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 在 \$\{city\.name\} 搜索，一無所獲。（體力 -15）`\);/g,
    `get().addLog(${t('personnel.searchNothing', '{ recruiter: localizedName(recruiter.name), city: localizedName(city.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 成功勸降了 \$\{officer\.name\}！（體力 -15）`\);/g,
    `get().addLog(${t('personnel.surrenderSuccess', '{ recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 勸降 \$\{officer\.name\} 失敗。（體力 -15）`\);/g,
    `get().addLog(${t('personnel.surrenderFail', '{ recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }')});`
  ],
  [
    /get\(\)\.addLog\('寶物賞賜尚未實裝。'\);/g,
    `get().addLog(${t('error.treasureRewardNotImplemented')});`
  ],
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法賞賜。需要 \$\{amount\}（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.rewardGoldInsufficient', '{ amount, current: city.gold }')});`
  ],
  [
    /get\(\)\.addLog\(`賞賜 \$\{officer\?\.name\} \$\{amount\} 金，忠誠上升。`\);/g,
    `get().addLog(${t('personnel.reward', "{ officer: localizedName(officer?.name ?? ''), amount }")});`
  ],
  [
    /get\(\)\.addLog\(`處斬了 \$\{officer\.name\}。`\);/g,
    `get().addLog(${t('personnel.execute', '{ name: localizedName(officer.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{officer\.name\} 被逐出了勢力。`\);/g,
    `get().addLog(${t('personnel.banish', '{ name: localizedName(officer.name) }')});`
  ],
  [
    /get\(\)\.addLog\('找不到該武將。'\);/g,
    `get().addLog(${t('error.officerNotFound')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{appointee\.name\} 不屬於我方勢力，無法任命為太守。`\);/g,
    `get().addLog(${t('error.notOurFaction', '{ name: localizedName(appointee.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{appointee\.name\} 不在 \$\{targetCity\?\.name \|\| '該城'\}，無法任命為太守。`\);/g,
    `get().addLog(${t('error.notInTargetCity', "{ name: localizedName(appointee.name), city: localizedName(targetCity?.name || '') }")});`
  ],
  [
    /get\(\)\.addLog\(`任命 \$\{finalOfficer\?\.name\} 為太守。`\);/g,
    `get().addLog(${t('personnel.appointGovernor', "{ name: localizedName(finalOfficer?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`任命 \$\{advisor\?\.name\} 為軍師。`\);/g,
    `get().addLog(${t('personnel.appointAdvisor', "{ name: localizedName(advisor?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{executor\.name\} 體力不足（需 10），無法執行指令。`\);/g,
    `get().addLog(${t('error.staminaInsufficient', '{ name: localizedName(executor.name), required: 10 }')});`
  ],

  // ─── Transport ───
  [
    /get\(\)\.addLog\('太守體力不足（需 20）。'\);/g,
    `get().addLog(${t('error.transportStamina')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{label\}不足，無法輸送。需要 \$\{amount\}（現有 \$\{fromCity\[resource\]\}）。`\);/g,
    `get().addLog(${t('error.transportInsufficient', '{ label, amount, current: fromCity[resource] }')});`
  ],
  [
    /get\(\)\.addLog\(`從 \$\{fromCity\.name\} 向 \$\{toCity\.name\} 輸送了 \$\{amount\} \$\{resource === 'gold' \? '金' : resource === 'food' \? '糧' : '兵'\}。`\);/g,
    `get().addLog(${t('domestic.transport', "{ from: localizedName(fromCity.name), to: localizedName(toCity.name), amount, resource: i18next.t(`logs:common.${resource}`) }")});`
  ],
  // Move officer
  [
    /get\(\)\.addLog\(`\$\{officer\?\.name \|\| '武將'\} 體力不足（需 10）。`\);/g,
    `get().addLog(${t('error.moveOfficerStamina', "{ name: localizedName(officer?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\('只能移動到我方城市。'\);/g,
    `get().addLog(${t('error.moveOnlyFriendly')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{officer\.name\} 移動到了 \$\{finalDestCity\?\.name\}。`\);/g,
    `get().addLog(${t('personnel.moveOfficer', "{ name: localizedName(officer.name), city: localizedName(finalDestCity?.name ?? '') }")});`
  ],

  // ─── Military ───
  [
    /get\(\)\.addLog\('城中無將！'\);/g,
    `get().addLog(${t('error.noCityOfficers')});`
  ],
  [
    /get\(\)\.addLog\('四周無敵軍。'\);/g,
    `get().addLog(${t('error.noEnemyNearby')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{duelCity\.name\} 是一座空城。`\);/g,
    `get().addLog(${t('error.emptyCityDuel', '{ city: localizedName(duelCity.name) }')});`
  ],
  [
    /get\(\)\.addLog\('無將領可統兵。'\);/g,
    `get().addLog(${t('error.noCommanders')});`
  ],
  [
    /get\(\)\.addLog\(`兵力不足，無法出征。城內駐兵 \$\{city\.troops\}。`\);/g,
    `get().addLog(${t('error.insufficientTroopsBasic', '{ troops: city.troops }')});`
  ],
  [
    /get\(\)\.addLog\(`兵力不足，無法出征。需要 \$\{totalTroopsToDeploy\}（城內駐兵 \$\{city\.troops\}）。`\);/g,
    `get().addLog(${t('error.insufficientTroopsRequired', '{ required: totalTroopsToDeploy, troops: city.troops }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{commander\.name\} 體力不足（需 30），無法出征。`\);/g,
    `get().addLog(${t('error.commanderStamina', '{ name: localizedName(commander.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`城內武器不足，無法依此編制出征。\$\{shortages\.join\('、'\)\}。`\);/g,
    `get().addLog(${t('error.weaponShortage', "{ details: shortages.join(i18next.t('logs:common.comma', '、')) }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{targetCity\.name\} 是一座空城！\$\{commander\.name\} 率軍佔領了 \$\{targetCity\.name\}！`\);/g,
    `get().addLog(${t('military.captureEmptyCity', '{ city: localizedName(targetCity.name), commander: localizedName(commander.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{loserFaction\?\.name \|\| '敵方'\} 勢力已被消滅！`\);/g,
    `get().addLog(${t('military.factionDestroyed', "{ faction: localizedName(loserFaction?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`出征 \$\{targetCity\.name\}！（所有參戰將領體力 -30）`\);/g,
    `get().addLog(${t('military.marchToCity', '{ city: localizedName(targetCity.name) }')});`
  ],
  // AI battle log — win
  [
    /get\(\)\.addLog\(`【合戰】\$\{state\.factions\.find\(f => f\.id === city\.factionId\)\?\.name\} 攻打 \$\{targetCity\.name\}，\$\{attackerPower > defenderPower \? '攻陷了該城' : '被擊退了'\}。`\);/g,
    `get().addLog(attackerPower > defenderPower ? ${t('military.aiBattleWin', "{ faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }")} : ${t('military.aiBattleLose', "{ faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }")});`
  ],
  [
    /get\(\)\.addLog\(`【合戰】\$\{state\.factions\.find\(f => f\.id === city\.factionId\)\?\.name\} 欲攻打 \$\{targetCity\.name\}，但戰場已滿。`\);/g,
    `get().addLog(${t('military.aiBattleFull', "{ faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{state\.factions\.find\(f => f\.id === city\.factionId\)\?\.name\} 軍從 \$\{city\.name\} 出征 \$\{targetCity\.name\}！`\);/g,
    `get().addLog(${t('military.aiMarch', "{ faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), from: localizedName(city.name), to: localizedName(targetCity.name) }")});`
  ],

  // ─── Diplomacy ───
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法進行贈呈。需要 1000（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:diplomacy.gift_action', '進行贈呈'), required: 1000, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 出使 \$\{targetFaction\.name\}，敵對心降低了 \$\{reduction\}。（體力 -15）`\);/g,
    `get().addLog(${t('diplomacy.giftSuccess', '{ messenger: localizedName(messenger.name), faction: localizedName(targetFaction.name), reduction }')});`
  ],
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法結盟。需要 2000（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:diplomacy.alliance_action', '結盟'), required: 2000, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 體力不足（需 20），無法執行指令。`\);/g,
    `get().addLog(${t('error.staminaInsufficient', '{ name: localizedName(messenger.name), required: 20 }')});`
  ],
  [
    /get\(\)\.addLog\(`我方與 \$\{targetFaction\.name\} 已經是同盟了。`\);/g,
    `get().addLog(${t('error.alreadyAllied', '{ faction: localizedName(targetFaction.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 成功說服 \$\{targetFaction\.name\} 結為同盟！（體力 -20）`\);/g,
    `get().addLog(${t('diplomacy.allianceSuccess', '{ messenger: localizedName(messenger.name), faction: localizedName(targetFaction.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 的結盟提議被 \$\{targetFaction\.name\} 拒絕了。（體力 -20）`\);/g,
    `get().addLog(${t('diplomacy.allianceRejected', '{ messenger: localizedName(messenger.name), faction: localizedName(targetFaction.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 成功說服 \$\{targetFaction\?\.name\} 共同進攻 \$\{targetCity\?\.name\}！`\);/g,
    `get().addLog(${t('diplomacy.jointAttackSuccess', "{ messenger: localizedName(messenger.name), faction: localizedName(targetFaction?.name ?? ''), city: localizedName(targetCity?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{targetFaction\?\.name\} 拒絕了共同作戰的提議。`\);/g,
    `get().addLog(${t('diplomacy.jointAttackRejected', "{ faction: localizedName(targetFaction?.name ?? '') }")});`
  ],
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法提議停戰。需要 1000（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:diplomacy.ceasefire_action', '提議停戰'), required: 1000, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 成功與 \$\{targetFaction\?\.name\} 達成停戰協議（期限一年）。`\);/g,
    `get().addLog(${t('diplomacy.ceasefireSuccess', "{ messenger: localizedName(messenger.name), faction: localizedName(targetFaction?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{targetFaction\?\.name\} 拒絕了停戰協議。`\);/g,
    `get().addLog(${t('diplomacy.ceasefireRejected', "{ faction: localizedName(targetFaction?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{targetFaction\.name\} 向我軍投降了！`\);/g,
    `get().addLog(${t('diplomacy.surrenderAccepted', '{ faction: localizedName(targetFaction.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{targetFaction\?\.name\} 斬釘截鐵地拒絕了投降的要求。`\);/g,
    `get().addLog(${t('diplomacy.surrenderRejected', "{ faction: localizedName(targetFaction?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`背棄了與 \$\{targetFaction\?\.name\} 的同盟！天下人皆感憤慨。`\);/g,
    `get().addLog(${t('diplomacy.betrayAlliance', "{ faction: localizedName(targetFaction?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{officer\.name\} 已經是人質了。`\);/g,
    `get().addLog(${t('error.alreadyHostage', '{ name: localizedName(officer.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`將 \$\{officer\.name\} 送往 \$\{targetFaction\?\.name\} 作為人質。`\);/g,
    `get().addLog(${t('military.hostage', "{ officer: localizedName(officer.name), faction: localizedName(targetFaction?.name ?? '') }")});`
  ],

  // ─── Strategy ───
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法執行流言。需要 500（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:strategy.rumor_action', '執行流言'), required: 500, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 不具備流言技能，無法執行此計策。`\);/g,
    `get().addLog(${t('error.noSkillRumor', '{ name: localizedName(messenger.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 在 \$\{targetCity\.name\} 散佈流言，民心動搖，將領忠誠下降！（體力 -15）`\);/g,
    `get().addLog(${t('strategy.rumorSuccess', '{ messenger: localizedName(messenger.name), city: localizedName(targetCity.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 的流言計策被識破了。（體力 -15）`\);/g,
    `get().addLog(${t('strategy.rumorFail', '{ messenger: localizedName(messenger.name) }')});`
  ],
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法反間。需要 800（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:strategy.provoke_action', '反間'), required: 800, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 不具備做敵技能。`\);/g,
    `get().addLog(${t('error.noSkillProvoke', '{ name: localizedName(messenger.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 成功實施反間，\$\{targetOfficer\.name\} 的忠誠度下降了！`\);/g,
    `get().addLog(${t('strategy.provokeSuccess', '{ messenger: localizedName(messenger.name), officer: localizedName(targetOfficer.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 的反間計策失敗了。`\);/g,
    `get().addLog(${t('strategy.provokeFail', '{ messenger: localizedName(messenger.name) }')});`
  ],
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法煽動叛亂。需要 1000（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:strategy.tigerTrap_action', '煽動叛亂'), required: 1000, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 不具備驅虎技能。`\);/g,
    `get().addLog(${t('error.noSkillTigerTrap', '{ name: localizedName(messenger.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 在 \$\{targetCity\.name\} 煽動造反，民心大幅下降！`\);/g,
    `get().addLog(${t('strategy.tigerTrapSuccess', '{ messenger: localizedName(messenger.name), city: localizedName(targetCity.name) }')});`
  ],
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法放火。需要 500（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:strategy.arson_action', '放火'), required: 500, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 不具備燒討技能。`\);/g,
    `get().addLog(${t('error.noSkillArson', '{ name: localizedName(messenger.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 在 \$\{targetCity\?\.name\} 放火成功，燒毀了大量物資！`\);/g,
    `get().addLog(${t('strategy.arsonSuccess', "{ messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 在 \$\{targetCity\?\.name\} 的放火行動失敗了。`\);/g,
    `get().addLog(${t('strategy.arsonFail', "{ messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }")});`
  ],
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法間諜。需要 500（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:strategy.espionage_action', '間諜'), required: 500, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 不具備諜報技能。`\);/g,
    `get().addLog(${t('error.noSkillEspionage', '{ name: localizedName(messenger.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 滲透入 \$\{targetCity\?\.name\} 並送回了情報！`\);/g,
    `get().addLog(${t('strategy.espionageSuccess', "{ messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 在 \$\{targetCity\?\.name\} 潛入失敗，敵方加強了警戒。`\);/g,
    `get().addLog(${t('strategy.espionageFail', "{ messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }")});`
  ],
  [
    /if \(city\) get\(\)\.addLog\(`金不足，無法探查。需要 300（現有 \$\{city\.gold\}）。`\);/g,
    `if (city) get().addLog(${t('error.goldInsufficient', "{ action: i18next.t('logs:strategy.intelligence_action', '探查'), required: 300, current: city.gold }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 不具備情報技能。`\);/g,
    `get().addLog(${t('error.noSkillIntelligence', '{ name: localizedName(messenger.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{messenger\.name\} 收集了關於 \$\{targetCity\?\.name\} 的最新情報。`\);/g,
    `get().addLog(${t('strategy.intelligenceSuccess', "{ messenger: localizedName(messenger.name), city: localizedName(targetCity?.name ?? '') }")});`
  ],

  // ─── AI actions ───
  [
    /if \(success\) get\(\)\.addLog\(`\$\{state\.factions\.find\(f => f\.id === factionId\)\?\.name\} 的 \$\{recruiter\.name\} 成功招攬了 \$\{officer\.name\}。`\);/g,
    `if (success) get().addLog(${t('ai.recruitSuccess', "{ faction: localizedName(state.factions.find(f => f.id === factionId)?.name ?? ''), recruiter: localizedName(recruiter.name), officer: localizedName(officer.name) }")});`
  ],
  [
    /if \(success\) get\(\)\.addLog\(`\$\{state\.factions\.find\(f => f\.id === factionId\)\?\.name\} 成功勸降了戰俘 \$\{officer\.name\}。`\);/g,
    `if (success) get().addLog(${t('ai.powRecruitSuccess', "{ faction: localizedName(state.factions.find(f => f.id === factionId)?.name ?? ''), officer: localizedName(officer.name) }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{recruiter\.name\} 在 \$\{city\.name\} 發現了在野武將 \$\{foundOfficer\.name\}。`\);/g,
    `get().addLog(${t('ai.searchFound', '{ recruiter: localizedName(recruiter.name), city: localizedName(city.name), officer: localizedName(foundOfficer.name) }')});`
  ],
  [
    /if \(result\.success\) get\(\)\.addLog\(`\$\{state\.factions\.find\(f => f\.id === city\.factionId\)\?\.name\} 對 \$\{targetCity\?\.name\} 進行了諜報活動。`\);/g,
    `if (result.success) get().addLog(${t('ai.espionageAction', "{ faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity?.name ?? '') }")});`
  ],
  [
    /get\(\)\.addLog\(`\$\{state\.factions\.find\(f => f\.id === city\.factionId\)\?\.name\} 在 \$\{targetCity\.name\} 散佈了流言。`\);/g,
    `get().addLog(${t('ai.rumorAction', "{ faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }")});`
  ],

  // ─── Post-battle ───
  [
    /get\(\)\.addLog\(`\$\{o\.name\} 兵敗被俘！`\);/g,
    `get().addLog(${t('postBattle.captured', '{ name: localizedName(o.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{o\.name\} 逃往 \$\{fleeCity\.name\}。`\);/g,
    `get().addLog(${t('postBattle.fleeToCity', '{ name: localizedName(o.name), city: localizedName(fleeCity.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{o\.name\} 無處可逃，被俘！`\);/g,
    `get().addLog(${t('postBattle.nowhereToFlee', '{ name: localizedName(o.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{o\.name\} 棄城逃往 \$\{fleeCity\.name\}。`\);/g,
    `get().addLog(${t('postBattle.abandonCity', '{ name: localizedName(o.name), city: localizedName(fleeCity.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{o\.name\} 無處可逃，被俘。`\);/g,
    `get().addLog(${t('postBattle.abandonNoFlee', '{ name: localizedName(o.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{o\.name\} 被俘。`\);/g,
    `get().addLog(${t('postBattle.capturedSimple', '{ name: localizedName(o.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{rulerCaptured\.name\} 被俘，\$\{successor\.name\} 繼任為君主。`\);/g,
    `get().addLog(${t('postBattle.rulerCaptured', '{ ruler: localizedName(rulerCaptured.name), successor: localizedName(successor.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{loserFaction\.name\} 勢力已被消滅！`\);/g,
    `get().addLog(${t('postBattle.factionDestroyed', '{ faction: localizedName(loserFaction.name) }')});`
  ],
  [
    /get\(\)\.addLog\(`\$\{city\.name\} 已被 \$\{winnerFaction\?\.name \|\| '敵軍'\} 攻陷！剩餘守軍 \$\{Math\.floor\(totalSurvivingTroops \* 0\.8\)\}。`\);/g,
    `get().addLog(${t('postBattle.cityFallen', "{ city: localizedName(city.name), faction: localizedName(winnerFaction?.name ?? ''), troops: Math.floor(totalSurvivingTroops * 0.8) }")});`
  ],

  // ─── Save/Load ───
  [
    /get\(\)\.addLog\(`遊戲已儲存至存檔 \$\{slot\}`\);/g,
    `get().addLog(${t('game.savedToSlot', '{ slot }')});`
  ],
  [
    /get\(\)\.addLog\('儲存失敗！'\);/g,
    `get().addLog(${t('game.saveFailed')});`
  ],
  [
    /get\(\)\.addLog\(`存檔 \$\{slot\} 不存在！`\);/g,
    `get().addLog(${t('game.slotNotFound', '{ slot }')});`
  ],
  [
    /get\(\)\.addLog\('載入失敗！'\);/g,
    `get().addLog(${t('game.loadFailed')});`
  ],
  [
    /get\(\)\.addLog\(`存檔 \$\{slot\} 已刪除`\);/g,
    `get().addLog(${t('game.slotDeleted', '{ slot }')});`
  ],
];

for (const [regex, replacement] of repeatedReplacements) {
  if (typeof replacement === 'string') {
    gsContent = gsContent.replace(regex, replacement);
  } else {
    gsContent = gsContent.replace(regex, replacement as (...args: string[]) => string);
  }
}

// Add i18next import and localizedName import at top
if (!gsContent.includes("import i18next from 'i18next'")) {
  gsContent = gsContent.replace(
    "import { create } from 'zustand';",
    "import { create } from 'zustand';\nimport i18next from 'i18next';\nimport { localizedName } from '../i18n/dataNames';"
  );
}

fs.writeFileSync(gsPath, gsContent, 'utf-8');
console.log('gameStore.ts regex replacements done.');

// ─── battleStore.ts replacements ───────────────────────────

const bsPath = path.resolve('src/store/battleStore.ts');
let bsContent = fs.readFileSync(bsPath, 'utf-8');

const bsReplacements: [RegExp, string][] = [
  [
    /get\(\)\.addBattleLog\(`\$\{unit\.officer\.name\} 移動至 \(\$\{q\},\$\{r\}\)`\);/g,
    `get().addBattleLog(${t('battle.move', '{ name: localizedName(unit.officer.name), q, r }')});`
  ],
  // Attack with optional counter — multiline
  [
    /get\(\)\.addBattleLog\(\s*`\$\{attacker\.officer\.name\} 攻擊 \$\{target\.officer\.name\}，造成 \$\{damage\} 傷害` \+\s*\(counterDamage > 0 \? `，受到反擊 \$\{counterDamage\}` : ''\) \+ '。'\s*\);/g,
    `get().addBattleLog(counterDamage > 0 ? ${t('battle.attackWithCounter', '{ attacker: localizedName(attacker.officer.name), target: localizedName(target.officer.name), damage, counter: counterDamage }')} : ${t('battle.attack', '{ attacker: localizedName(attacker.officer.name), target: localizedName(target.officer.name), damage }')});`
  ],
  [
    /get\(\)\.addBattleLog\(`\$\{target\.officer\.name\} 全軍覆沒！`\);/g,
    `get().addBattleLog(${t('battle.unitDestroyed', '{ name: localizedName(target.officer.name) }')});`
  ],
  [
    /get\(\)\.addBattleLog\(`\$\{target\.officer\.name\} 被俘虜！`\);/g,
    `get().addBattleLog(${t('battle.unitCaptured', '{ name: localizedName(target.officer.name) }')});`
  ],
  [
    /get\(\)\.addBattleLog\(`主將敗陣，\$\{target\.officer\.name\} 方全軍崩潰！`\);/g,
    `get().addBattleLog(${t('battle.commanderDefeated', '{ name: localizedName(target.officer.name) }')});`
  ],
  [
    /get\(\)\.addBattleLog\(`\$\{target\.officer\.name\} 潰走！`\);/g,
    `get().addBattleLog(${t('battle.unitRouted', '{ name: localizedName(target.officer.name) }')});`
  ],
  [
    /get\(\)\.addBattleLog\(`城門被攻破！`\);/g,
    `get().addBattleLog(${t('battle.gateBroken')});`
  ],
  [
    /get\(\)\.addBattleLog\(`\$\{attacker\.officer\.name\} 攻門，造成 \$\{damage\} 傷害（殘 \$\{newGates\[gateIndex\]\.hp\}）。`\);/g,
    `get().addBattleLog(${t('battle.gateAttack', '{ attacker: localizedName(attacker.officer.name), damage, remaining: newGates[gateIndex].hp }')});`
  ],
  [
    /get\(\)\.addBattleLog\(`\$\{unit\.officer\.name\} 施展「\$\{tactic\}」成功！`\);/g,
    `get().addBattleLog(${t('battle.tacticSuccess', "{ name: localizedName(unit.officer.name), tactic: i18next.t(`data:skill.${tactic}`) }")});`
  ],
  [
    /get\(\)\.addBattleLog\(`\$\{unit\.officer\.name\} 施展「\$\{tactic\}」失敗。`\);/g,
    `get().addBattleLog(${t('battle.tacticFail', "{ name: localizedName(unit.officer.name), tactic: i18next.t(`data:skill.${tactic}`) }")});`
  ],
  [
    /get\(\)\.addBattleLog\('── 敵方行動 ──'\);/g,
    `get().addBattleLog(${t('battle.enemyPhase')});`
  ],
  [
    /get\(\)\.addBattleLog\(`\$\{nextEnemy\.officer\.name\} 處於混亂狀態，無法行動。`\);/g,
    `get().addBattleLog(${t('battle.confused', '{ name: localizedName(nextEnemy.officer.name) }')});`
  ],
  [
    /get\(\)\.addBattleLog\(`已到第 \$\{state\.maxDays\} 日，攻方撤退，守方勝利！`\);/g,
    `get().addBattleLog(${t('battle.dayLimitReached', '{ maxDays: state.maxDays }')});`
  ],
  [
    /get\(\)\.addBattleLog\(`── 第 \$\{newDay\} 日 ──`\);/g,
    `get().addBattleLog(${t('battle.dayHeader', '{ day: newDay }')});`
  ],
];

for (const [regex, replacement] of bsReplacements) {
  bsContent = bsContent.replace(regex, replacement);
}

// Add i18next import at top of battleStore
if (!bsContent.includes("import i18next from 'i18next'")) {
  bsContent = bsContent.replace(
    "import { create } from 'zustand';",
    "import { create } from 'zustand';\nimport i18next from 'i18next';\nimport { localizedName } from '../i18n/dataNames';"
  );
}

fs.writeFileSync(bsPath, bsContent, 'utf-8');
console.log('battleStore.ts replacements done.');

// ─── Verify remaining Chinese in addLog calls ─────────────
console.log('\n--- Checking for remaining Chinese addLog calls ---');
const finalGs = fs.readFileSync(gsPath, 'utf-8');
const finalBs = fs.readFileSync(bsPath, 'utf-8');

const chineseRegex = /[\u4e00-\u9fff]/;
const gsLines = finalGs.split('\n');
const bsLines = finalBs.split('\n');

let remaining = 0;
gsLines.forEach((line, i) => {
  if ((line.includes('addLog(') || line.includes('addBattleLog(')) && chineseRegex.test(line)) {
    // Skip the line 550 case which logs d.description (dynamic data, not a hardcoded string)
    if (line.includes('d.description')) return;
    console.log(`  gameStore.ts:${i + 1}: ${line.trim()}`);
    remaining++;
  }
});
bsLines.forEach((line, i) => {
  if ((line.includes('addLog(') || line.includes('addBattleLog(')) && chineseRegex.test(line)) {
    console.log(`  battleStore.ts:${i + 1}: ${line.trim()}`);
    remaining++;
  }
});
console.log(`\nRemaining Chinese addLog lines: ${remaining}`);
