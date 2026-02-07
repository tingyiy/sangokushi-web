# RTK IV (三國志IV) Feature Gap Analysis

## Overview

The project has a solid TypeScript foundation but is still in **early prototype** stage relative to the original RTK IV. Below is a systematic comparison organized by game system.

---

## 1. Scenarios (劇本/時期)

| Feature | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| Number of scenarios | **6 時期** | **1** (反董卓聯盟 190年) | **Missing 5 scenarios** |

The 6 original scenarios:
1. 董卓廢少帝，火燒洛陽 (190) -- **implemented**
2. 群雄爭中原，曹操掘起 (194) -- missing
3. 河北風暴起，春臨荊州 (200) -- missing
4. 孔明借東風，赤壁鏖兵 (208) -- missing
5. 曹丕廢漢帝，三足鼎立 (220) -- missing
6. 星落五丈原，姜維繼志 (234) -- missing

Each scenario has different faction distributions, playable rulers, and officer placements.

---

## 2. Officers (武將)

| Feature | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| Officer count | **454+** officers | **49** | ~400 officers missing |
| Skills (特殊技能) | 22 distinct skills | 5 generic tags | Skill system too simplified |

**RTK IV has 22 special skills (特異功能) in 4 groups:**

- **Group 1:** 外交, 情報, 人才, 製造, 做敵(反間), 驅虎(煽動), 流言, 燒討(火攻)
- **Group 2:** 諜報, 步兵, 騎兵, 弓兵, 海戰
- **Group 3:** 火計, 落石, 同討(內鬨), 天變, 風變, 混亂, 連環, 落雷
- **Group 4:** 修復, 罵聲, 虛報(謊報)

Current implementation only has: `步兵, 騎兵, 弓兵, 水軍, 計略` as string tags with no mechanical effect. The skill system needs to be a **bitmask or structured object** with specific skills that gate specific commands.

---

## 3. Treasures / Items (寶物)

| Feature | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| Item system | **24 named treasures** | **None** | Entirely missing |

RTK IV treasures include:
- **Books:** 孫子兵法 (+5知力/+8政治), 孟德新書 (+3知力/+5政治), 遁甲天書, 太平要術
- **Swords:** 倚天劍 (+10武力), 青釭劍 (+9), 七星劍 (+8)
- **Weapons:** 方天畫戟 (+7), 青龍偃月刀 (+6), 丈八蛇矛 (+5), etc.
- **Horses:** 赤兔馬, 的蘆, 爪黃飛電 (affect duel pursuit/escape)
- **Imperial Seal:** 玉璽 (統率/魅力 to 100)

Treasures are found via search, captured from defeated officers, or awarded. This is a significant gameplay system.

---

## 4. City Attributes

| Feature | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| 人口 (population) | Yes | Yes | -- |
| 金 (gold) | Yes | Yes | -- |
| 兵糧 (food) | Yes | Yes | -- |
| 兵士 (troops) | Yes | Yes | -- |
| 商業 (commerce) | Yes | Yes | -- |
| 開發 (development/agriculture) | Yes | Yes (agriculture) | -- |
| 治水 (flood control) | **Yes** | **No** | Missing |
| 技術 (technology) | **Yes** | **No** | **Missing -- critical for weapon manufacturing** |
| 民忠 (people loyalty) | **Yes** | **No** | Missing |
| 士氣 (morale) | **Yes** | **No** | Missing |
| 訓練 (training) | **Yes** | **No** | Missing |
| 弩/強弩/連弩 (crossbows) | **Yes** | **No** | Missing -- weapon inventory |
| 軍馬 (war horses) | **Yes** | **No** | Missing |
| 衝車 (battering rams) | **Yes** | **No** | Missing |
| 投石機 (catapults) | **Yes** | **No** | Missing |

The project is missing **7+ city attributes** that are core to RTK IV gameplay, especially 技術 (technology) which gates weapon manufacturing, and 訓練 (training) which affects battle effectiveness.

---

## 5. Commands

### 5.1 內政 (Internal Affairs)

| Command | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| 商業開發 | Yes | Yes | -- |
| 農業開發 | Yes | Yes | -- |
| 城防強化 | Yes | Yes | -- |
| 治水 (flood control) | **Yes** | **No** | Missing |
| 技術開發 (technology) | **Yes** | **No** | Missing |
| 訓練 (train troops) | **Yes** | **No** | Missing |
| 製造 (manufacture weapons) | **Yes** | **No** | Missing -- requires 製造 skill + 技術 level |
| 徵兵 (draft) | In 內政 in some versions | In 軍事 | Different categorization |
| 賑災 (disaster relief) | **Yes** | **No** | Missing |

### 5.2 軍事 (Military)

| Command | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| 出征 (campaign/attack) | Yes | Yes (basic) | Needs completion |
| 徵兵 (draft troops) | Yes | Yes | -- |
| 單挑 (duel) | Sort of (in battle) | Yes (standalone) | Original has duels during battle, not from menu |
| 輸送 (transport troops/supplies) | **Yes** | **No** | Missing |
| 軍團編成 (army formation) | **Yes** | **No** | Missing |
| 配備 (equip weapons) | **Yes** | **No** | Missing |
| 出陣 (sortie/deploy) | **Yes** | **No** | Missing |

### 5.3 人事 (Personnel)

| Command | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| 招攬 (recruit unaffiliated) | Yes | Yes | -- |
| 搜索 (search for hidden officers) | **Yes** | **No** | Missing |
| 登用 (recruit enemy/captured officers) | **Yes** | **No** | Missing |
| 褒賞 (reward/increase loyalty) | **Yes** | **No** | Missing |
| 處斬 (execute) | **Yes** | **No** | Missing |
| 追放 (dismiss/banish) | **Yes** | **No** | Missing |
| 移動 (transfer officers between cities) | **Yes** | **No** | Missing |
| 太守任命 (appoint governor) | **Yes** | **No** | Missing (governor is set at scenario start only) |
| 軍師任命 (appoint advisor) | **Yes** | **No** | Missing |
| 侍中/武將 rank promotion | **Yes** | **No** | Missing |

### 5.4 外交 (Diplomacy)

| Command | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| 贈呈 (gift/improve relations) | Yes | Yes | -- |
| 結盟 (form alliance) | Yes | Yes | -- |
| 共同作戰 (joint attack) | **Yes** | **No** | Missing |
| 停戰 (ceasefire) | **Yes** | **No** | Missing |
| 勸降 (demand surrender) | **Yes** | **No** | Missing |
| 破棄 (break alliance) | **Yes** | **No** | Missing |
| 人質 (hostage exchange) | **Yes** | **No** | Missing |

### 5.5 謀略 (Strategy)

| Command | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| 流言 (rumor) | Yes | Yes | -- |
| 反間 (counter-espionage/bribery) | **Yes** | **No** | Missing -- requires 做敵 skill |
| 煽動 (incite rebellion) | **Yes** | **No** | Missing -- requires 驅虎 skill |
| 放火 / 燒討 (arson) | **Yes** | **No** | Missing -- requires 燒討 skill |
| 諜報 (espionage/steal tech) | **Yes** | Coded but **not integrated** | `SpyingSystem.ts` exists but not wired in |
| 密偵 (intelligence gathering) | **Yes** | **No** | Missing -- requires 情報 skill |

---

## 6. Battle System

| Feature | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| **城門攻防戰 (siege battle)** | Core battle type | Not implemented | **Major gap** -- RTK IV's primary battle mode |
| **野戰 (field battle)** | Yes | Basic hex combat | Partially done |
| **海戰 (naval battle)** | Yes | No | Missing |
| Unit types matter | Infantry/cavalry/archer differ | All units = infantry | Types have no effect |
| Siege weapons (衝車/投石機) | Critical for sieges | None | Missing |
| Duels during battle | Yes (challenge during battle) | Only standalone | Should happen mid-battle |
| Battle tactics (火計, 落石, etc.) | 13+ battle tactics | None | Missing |
| Fire attacks in battle | Yes (fire計, 連環+火計) | Coded but not integrated | `FireAttackSystem.ts` exists |
| Weather effects | Rain/wind affect tactics | Weather field exists but no effect | Not functional |
| Wind direction | Affects fire spread | Not implemented | Missing |
| Terrain elevation (落石) | Walls/mountains enable 落石 | No | Missing |
| City gate HP / 修復 | Gate must be broken to enter | No gate mechanic | Missing |
| 武力/兵力決勝 on gate break | Choose single combat or army clash | No | Missing |
| Reinforcements (援軍) | Can send reinforcements mid-battle | No | Missing |
| Unit retreat / flee | Yes | Only full retreat | No per-unit retreat |
| Morale collapse | Units flee at low morale | Not implemented | Missing |
| Capture/POW (俘虜) | Capture enemy officers on defeat | No | Missing |
| Battle consequences | Officers captured, troops lost, city changes hands | **City ownership NOT transferred on victory** | Critical bug |
| Max battle days | 30 turns then defender wins | 30 days (implemented) | OK |

---

## 7. AI System

| Feature | RTK IV | Current | Gap |
|---------|--------|---------|-----|
| AI develops cities | Yes | **No** (comment exists but no code) | Missing |
| AI drafts troops | Yes | No | Missing |
| AI attacks player/others | Yes | No | Missing |
| AI recruits officers | Yes | No | Missing |
| AI diplomacy | Yes | No | Missing |
| AI uses strategy | Yes | No | Missing |
| AI manages officers | Yes | No | Missing |
| AI manufactures weapons | Yes | No | Missing |

The AI currently only applies income and restores stamina. It makes **zero decisions**.

---

## 8. Other Major Systems

| System | RTK IV | Current | Gap |
|--------|--------|---------|-----|
| **Advisor (軍師) system** | Advisor gives strategic suggestions | Not implemented | Missing |
| **Officer ranks (官位)** | 軍師, 侍中, 武將 etc. | Not implemented | Missing |
| **Historical events** | Scripted events (e.g. 赤壁) | Not implemented | Missing |
| **Random events** | Disasters, plagues, harvests | Not implemented | Missing |
| **Save/Load game** | Yes | Not implemented | Missing |
| **New ruler creation** | Up to 3 custom rulers per scenario | Not implemented | Missing |
| **Multiplayer** | Multiple human players | Not implemented | Missing |
| **Victory conditions** | Unify all of China | No win condition check | Missing |
| **Fog of war / intelligence** | Need 情報 skill + 密偵 to see enemy cities | All info visible | Missing |
| **Officer loyalty decay** | Loyalty decreases over time / events | No decay mechanics | Missing |
| **Officer illness/death** | Officers can get sick, age, die | Not implemented | Missing |
| **Marriage / blood relations** | Affect loyalty and recruitment | Not implemented | Missing |
| **Population growth** | Population grows/shrinks based on governance | Not implemented | Missing |
| **Disasters (水害/蝗害)** | Floods, locusts reduce food/population | Not implemented | Missing |
| **Tax rate** | Adjustable tax rate | Not implemented | Missing |

---

## Summary: Priority Gaps

### Critical (core gameplay broken without these)
1. **Battle consequences** -- victory doesn't transfer city ownership
2. **5 more scenarios** -- only 1 of 6 時期 exists
3. **AI decision-making** -- AI does nothing; game has no challenge
4. **400+ missing officers** -- need full officer roster
5. **城門攻防戰** -- RTK IV's primary battle type is missing entirely

### High Priority (major gameplay systems)
6. **City attributes**: 技術, 治水, 訓練, 民忠, 士氣 -- missing
7. **Weapon manufacturing** (製造) and weapon inventory (弩, 衝車, 投石機)
8. **Treasure/item system** (24 寶物)
9. **Personnel commands**: 搜索, 登用, 褒賞, 處斬, 移動, 太守任命
10. **Battle tactics**: fire計, 落石, 混亂, 連環, 天變, 風變, etc.
11. **Save/Load game**
12. **Officer skill system** -- 22 specific skills gating specific commands

### Medium Priority (significant features)
13. **Diplomacy expansion**: 共同作戰, 停戰, 勸降, 破棄
14. **Strategy expansion**: 反間, 煽動, 放火, 諜報, 密偵
15. **Advisor (軍師) system**
16. **Officer ranks and promotion**
17. **Unit type effects in battle** (cavalry/archer/infantry differences)
18. **Naval battles**
19. **Victory conditions**
20. **Fog of war**

### Lower Priority (polish and depth)
21. Historical/random events
22. New ruler creation
23. Multiplayer support
24. Officer illness/death/aging
25. Marriage/blood relations
26. Population growth/disasters
27. Duels during battle (instead of standalone)
