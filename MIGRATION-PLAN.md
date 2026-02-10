# Officer & City ID Migration Plan: Custom IDs → RTK4 IDs

## Overview

Migrate all officer IDs from the current custom scheme (1-14 Shu, 20-36 Wei, 50-62 Wu, 70-114 others) to the canonical RTK4 IDs (1-449, alphabetical by English name, with a gap at 324). Also expand the roster from 89 officers to 455 (448 RTK4 entries + 7 custom/fictional officers).

Simultaneously migrate all city IDs from the current custom scheme to the canonical RTK4 city IDs (1-43).

**Source of truth:** `data/rtk4_officers_zh.json` — 448 entries (IDs 1-449, gap at 324) with `id`, `name_en`, `name_zh`, `leadership`, `war`, `intelligence`, `politics`, `charisma`, `birth_year`, `death_year`. Note: ID 449 = 花鬘 (Huaman) is an RTK4 officer, not custom.

**Known data quality issues in `rtk4_officers_zh.json`:**
- ID 19: `name_zh` is 曹蕤 but should be **曹叡** (Cao Rui, the Wei emperor). The character 蕤 is a transcription error for 叡.
- ID 19: `birth_year` is 175 but historically 曹叡 was born ~205. This may be a data source error.

---

## ID Mapping Table (Old → New)

The 82 officers that exist in both our game and RTK4, mapped by `name_zh`:

```
Old →  New   Name
  1 → 169    劉備
  2 → 100    關羽
  3 → 390    張飛
  4 → 443    諸葛亮
  5 → 421    趙雲
  6 → 204    馬超
  7 → 128    黃忠
  8 → 308    魏延
  9 → 229    龐統
 10 →  70    法正
 11 → 143    姜維
 12 →  96    關平
 13 → 388    張苞
 14 →  98    關興
 20 →  11    曹操
 21 → 326    夏侯惇
 22 → 334    夏侯淵
 23 → 398    張遼
 24 → 339    徐晃
 25 → 391    張郃
 26 → 347    許褚
 27 →  55    典韋
 28 → 350    荀彧
 29 → 349    荀攸
 30 → 103    郭嘉
 31 → 136    賈詡
 32 → 253    司馬懿
 33 →  18    曹仁
 34 →  17    曹丕
 35 → 372    于禁
 36 → 384    樂進
 50 → 264    孫堅
 51 → 258    孫策
 52 → 273    孫權
 53 → 430    周瑜
 54 → 199    陸遜
 55 → 194    呂蒙
 56 →  82    甘寧
 57 → 281    太史慈
 58 → 125    黃蓋
 59 → 196    魯肅
 60 → 415    張昭 (pick id=415, the famous Wu 張昭; id=416 is a different 張昭)
 61 →  44    程普
 62 → 108    韓當
 70 → 187    呂布
 71 →  66    董卓
 72 → 376    袁紹
 73 → 377    袁術
 74 → 170    劉表
 75 → 185    劉璋
 76 → 208    馬騰
 77 →  94    公孫瓚
 78 → 285    陶謙
 79 → 399    張魯
 80 → 219    孟獲
 85 → 123    華雄
 86 → 354    顏良
 87 → 309    文醜
 88 → 160    李儒
 89 → 396    張濟
 91 → 158    李傕
 92 → 104    郭汜
 93 → 288    田豐
 94 → 147    沮授
 95 → 244    審配
 96 →  75    逢紀
 97 →  84    高覽
 98 → 133    紀靈
 99 → 410    張勳
101 →   6    蔡瑁
102 → 151    蒯良
103 → 152    蒯越
104 → 310    文聘
106 → 353    嚴綱
107 → 223    糜竺
108 → 222    糜芳
109 →  32    陳登
110 → 228    龐德
111 → 205    馬岱
112 → 343    徐庶
113 → 402    張任
114 → 355    嚴顏
```

**花鬘 (孟獲's wife)** is already in RTK4 data as ID 449 in `rtk4_officers_zh.json`. She is NOT a custom officer and does not need a custom ID. She will be imported along with all other RTK4 officers.

**7 non-RTK4 officers** get new IDs 450+:

```
Old →  New   Name        Notes
 81 → 450    貂蟬        Fictional
 82 → 451    張角        Yellow Turbans
 83 → 452    張寶        Yellow Turbans
 84 → 453    張梁        Yellow Turbans
 90 → 454    牛輔        Dong Zhuo's army
100 → 455    楊弘        Yuan Shu's army
105 → 456    田楷        Gongsun Zan's army
```

Note: IDs 450-456 span 7 values for 7 non-RTK4 officers.

---

## Files to Modify

**Recommended execution order:** Step 6 (cities) → Step 1 (officers) → Step 2 (scenarios) → Step 3 (historicalEvents) → Step 4 (tests) → Step 5 (verify)

Step 6 must be done before Step 2 because scenarios reference city IDs. Steps 1 and 6 are independent of each other and can be done in parallel.

### Step 1: Rewrite `src/data/officers.ts`

**Current:** 89 officers in `baseOfficers` array with custom IDs and hand-assigned stats/skills.

**Target:** 455 officers (448 RTK4 entries + 7 custom) using RTK4 IDs. Stats from `data/rtk4_officers_zh.json`.

**How to generate:**
1. Read `data/rtk4_officers_zh.json` for all 448 RTK4 officer entries (IDs 1-449, gap at 324)
2. For each officer, generate a `BaseOfficer` entry:
   - `id` = RTK4 id
   - `name` = `name_zh`
   - `portraitId` = same as `id` (for now — portraits can be remapped later)
   - `birthYear` = `birth_year`
   - `deathYear` = `death_year`
   - `leadership`, `war`, `intelligence`, `politics`, `charisma` = from RTK4
   - `skills` = `[]` (placeholder — skill assignment is a separate task)
3. For the 7 non-RTK4 officers (450-456), preserve their current stats but with new IDs:
   - 450 貂蟬: { leadership: 15, war: 18, intelligence: 72, politics: 60, charisma: 98, skills: ['做敵'] }
   - 451 張角: { leadership: 80, war: 55, intelligence: 72, politics: 42, charisma: 95, skills: ['情報', '流言', '落雷'] }
   - 452 張寶: { leadership: 62, war: 58, intelligence: 55, politics: 32, charisma: 60, skills: ['流言'] }
   - 453 張梁: { leadership: 60, war: 62, intelligence: 45, politics: 28, charisma: 55, skills: [] }
   - 454 牛輔: { leadership: 65, war: 68, intelligence: 42, politics: 38, charisma: 45, skills: ['騎兵'] }
   - 455 楊弘: { leadership: 52, war: 35, intelligence: 78, politics: 72, charisma: 58, skills: ['外交'] }
   - 456 田楷: { leadership: 68, war: 72, intelligence: 58, politics: 55, charisma: 60, skills: ['騎兵'] }
4. For the 82 existing officers that ARE in RTK4, **preserve their current skills** from the old `officers.ts`. Map old ID → new RTK4 ID and carry the `skills` array over. All other RTK4 officers (including 花鬘 = RTK4 449, who is new) get `skills: []`.

**Important:** The `BaseOfficer` type is:
```typescript
type BaseOfficer = Omit<Officer, 'factionId' | 'cityId' | 'stamina' | 'loyalty' | 'isGovernor' | 'treasureId' | 'rank' | 'relationships'>;
```

Each entry must have: `id`, `name`, `portraitId`, `birthYear`, `deathYear`, `leadership`, `war`, `intelligence`, `politics`, `charisma`, `skills`.

**Skills type** is `RTK4Skill[]` where `RTK4Skill` is one of 27 values defined in `src/types/index.ts`:
```
'外交' | '情報' | '人才' | '製造' | '做敵' | '驅虎' | '流言' | '燒討' |
'諜報' | '步兵' | '騎兵' | '弓兵' | '海戰' |
'火計' | '落石' | '同討' | '天變' | '風變' | '混亂' | '連環' | '落雷' |
'修復' | '罵聲' | '虛報' | '鼓舞' | '伏兵'
```

### Step 2: Update `src/data/scenarios.ts`

Apply the ID mapping to every hardcoded officer ID AND city ID in this file.

**Scenario naming note:** The code uses variable name `scenario200` but `year: 201`. The actual scenario years are: **189, 194, 201, 208, 221, 235**.

There are two categories of officer ID changes:

#### A. Faction definitions — `rulerId` and `advisorId` fields

Replace all old IDs with RTK4 IDs. For example:

```
// BEFORE
{ id: 1, name: '曹操', rulerId: 20, advisorId: null, ... }
// AFTER
{ id: 1, name: '曹操', rulerId: 11, advisorId: null, ... }
```

Full list of faction officer references to update:

| Scenario | Field | Old ID | New ID | Officer |
|----------|-------|--------|--------|---------|
| 189 | rulerId | 20 | 11 | 曹操 |
| 189 | rulerId | 1 | 169 | 劉備 |
| 189 | rulerId | 50 | 264 | 孫堅 |
| 189 | rulerId | 71 | 66 | 董卓 |
| 189 | rulerId | 72 | 376 | 袁紹 |
| 189 | rulerId | 73 | 377 | 袁術 |
| 189 | rulerId | 74 | 170 | 劉表 |
| 189 | rulerId | 77 | 94 | 公孫瓚 |
| 189 | rulerId | 76 | 208 | 馬騰 |
| 189 | rulerId | 78 | 285 | 陶謙 |
| 194 | rulerId | 20 | 11 | 曹操 |
| 194 | advisorId | 28 | 350 | 荀彧 |
| 194 | rulerId | 1 | 169 | 劉備 |
| 194 | rulerId | 51 | 258 | 孫策 |
| 194 | advisorId | 53 | 430 | 周瑜 |
| 194 | rulerId | 70 | 187 | 呂布 |
| 194 | advisorId | 88 | 160 | 李儒 |
| 194 | rulerId | 72 | 376 | 袁紹 |
| 194 | advisorId | 93 | 288 | 田豐 |
| 194 | rulerId | 73 | 377 | 袁術 |
| 194 | rulerId | 74 | 170 | 劉表 |
| 194 | advisorId | 102 | 151 | 蒯良 |
| 194 | rulerId | 75 | 185 | 劉璋 |
| 194 | rulerId | 76 | 208 | 馬騰 |
| 194 | rulerId | 91 | 158 | 李傕 |
| 194 | advisorId | 31 | 136 | 賈詡 |
| 201 | rulerId | 20 | 11 | 曹操 |
| 201 | advisorId | 30 | 103 | 郭嘉 |
| 201 | rulerId | 1 | 169 | 劉備 |
| 201 | rulerId | 52 | 273 | 孫權 |
| 201 | advisorId | 53 | 430 | 周瑜 |
| 201 | rulerId | 72 | 376 | 袁紹 |
| 201 | advisorId | 93 | 288 | 田豐 |
| 201 | rulerId | 74 | 170 | 劉表 |
| 201 | advisorId | 102 | 151 | 蒯良 |
| 201 | rulerId | 75 | 185 | 劉璋 |
| 201 | rulerId | 76 | 208 | 馬騰 |
| 208 | rulerId | 20 | 11 | 曹操 |
| 208 | advisorId | 32 | 253 | 司馬懿 |
| 208 | rulerId | 1 | 169 | 劉備 |
| 208 | advisorId | 4 | 443 | 諸葛亮 |
| 208 | rulerId | 52 | 273 | 孫權 |
| 208 | advisorId | 53 | 430 | 周瑜 |
| 208 | rulerId | 75 | 185 | 劉璋 |
| 208 | rulerId | 79 | 399 | 張魯 |
| 221 | rulerId | 20 | 11 | 曹操 |
| 221 | advisorId | 32 | 253 | 司馬懿 |
| 221 | rulerId | 1 | 169 | 劉備 |
| 221 | advisorId | 4 | 443 | 諸葛亮 |
| 221 | rulerId | 52 | 273 | 孫權 |
| 221 | advisorId | 54 | 199 | 陸遜 |
| 235 | rulerId | 34 | 19 | 曹叡 (BUG FIX: was 曹丕(old 34), should be 曹叡. RTK4 ID 19, listed as 曹蕤 in data due to transcription error) |
| 235 | advisorId | 32 | 253 | 司馬懿 |
| 235 | rulerId | 11 | 171 | 劉禪 (BUG FIX: was 姜維(old 11), should be 劉禪. RTK4 ID 171) |
| 235 | advisorId | 4 | 443 | 諸葛亮 (NOTE: 諸葛亮 died 234, consider changing to 姜維=143) |
| 235 | rulerId | 52 | 273 | 孫權 |
| 235 | advisorId | 54 | 199 | 陸遜 |

**Scenario 235 bug fix (confirmed against original RTK4):**
- Faction 曹叡: `rulerId` was 34 (曹丕, wrong) → corrected to **19 (曹叡/曹蕤, RTK4 id for Cao Rui)**. Note: RTK4 data lists this officer as 曹蕤 (transcription error for 曹叡).
- Faction 劉禪: `rulerId` was 11 (姜維, wrong) → corrected to **171 (劉禪, RTK4 id for Liu Chan)**
- Faction 劉禪: `advisorId` should probably be **143 (姜維)** instead of 443 (諸葛亮), since 諸葛亮 died in 234. But keeping 諸葛亮 as advisor matches the scenario title "星落五丈原" (Star Falls at Wuzhang Plains) — the scenario starts just as 諸葛亮 is dying. **Recommendation:** Keep advisorId as 443 (諸葛亮) for narrative purposes.

#### B. `makeOfficer()` calls

Replace the first argument (officer ID) in every `makeOfficer()` call. Apply the mapping table above. Example:

```typescript
// BEFORE
makeOfficer(20, 1, 13, { loyalty: 100, isGovernor: true }),  // 曹操
makeOfficer(21, 1, 13, { loyalty: 95 }),                      // 夏侯惇

// AFTER
makeOfficer(11, 1, 13, { loyalty: 100, isGovernor: true }),   // 曹操
makeOfficer(326, 1, 13, { loyalty: 95 }),                      // 夏侯惇
```

**Full list of `makeOfficer()` replacements by scenario:**

**Scenario 189 (lines 156-243):**
```
makeOfficer(20, ...)  → makeOfficer(11, ...)   // 曹操
makeOfficer(21, ...)  → makeOfficer(326, ...)  // 夏侯惇
makeOfficer(22, ...)  → makeOfficer(334, ...)  // 夏侯淵
makeOfficer(26, ...)  → makeOfficer(347, ...)  // 許褚
makeOfficer(27, ...)  → makeOfficer(55, ...)   // 典韋
makeOfficer(28, ...)  → makeOfficer(350, ...)  // 荀彧
makeOfficer(30, ...)  → makeOfficer(103, ...)  // 郭嘉
makeOfficer(33, ...)  → makeOfficer(18, ...)   // 曹仁
makeOfficer(1, ...)   → makeOfficer(169, ...)  // 劉備
makeOfficer(2, ...)   → makeOfficer(100, ...)  // 關羽
makeOfficer(3, ...)   → makeOfficer(390, ...)  // 張飛
makeOfficer(50, ...)  → makeOfficer(264, ...)  // 孫堅
makeOfficer(51, ...)  → makeOfficer(258, ...)  // 孫策
makeOfficer(53, ...)  → makeOfficer(430, ...)  // 周瑜
makeOfficer(58, ...)  → makeOfficer(125, ...)  // 黃蓋
makeOfficer(61, ...)  → makeOfficer(44, ...)   // 程普
makeOfficer(71, ...)  → makeOfficer(66, ...)   // 董卓
makeOfficer(70, ...)  → makeOfficer(187, ...)  // 呂布 (keep treasureId: 9)
makeOfficer(85, ...)  → makeOfficer(123, ...)  // 華雄
makeOfficer(31, ...)  → makeOfficer(136, ...)  // 賈詡
makeOfficer(88, ...)  → makeOfficer(160, ...)  // 李儒
makeOfficer(89, ...)  → makeOfficer(396, ...)  // 張濟
makeOfficer(90, ...)  → makeOfficer(454, ...)  // 牛輔
makeOfficer(91, ...)  → makeOfficer(158, ...)  // 李傕
makeOfficer(92, ...)  → makeOfficer(104, ...)  // 郭汜
makeOfficer(72, ...)  → makeOfficer(376, ...)  // 袁紹
makeOfficer(86, ...)  → makeOfficer(354, ...)  // 顏良
makeOfficer(87, ...)  → makeOfficer(309, ...)  // 文醜
makeOfficer(29, ...)  → makeOfficer(349, ...)  // 荀攸
makeOfficer(93, ...)  → makeOfficer(288, ...)  // 田豐
makeOfficer(94, ...)  → makeOfficer(147, ...)  // 沮授
makeOfficer(95, ...)  → makeOfficer(244, ...)  // 審配
makeOfficer(96, ...)  → makeOfficer(75, ...)   // 逢紀
makeOfficer(97, ...)  → makeOfficer(84, ...)   // 高覽
makeOfficer(73, ...)  → makeOfficer(377, ...)  // 袁術
makeOfficer(98, ...)  → makeOfficer(133, ...)  // 紀靈
makeOfficer(99, ...)  → makeOfficer(410, ...)  // 張勳
makeOfficer(100, ...) → makeOfficer(455, ...)  // 楊弘
makeOfficer(74, ...)  → makeOfficer(170, ...)  // 劉表
makeOfficer(101, ...) → makeOfficer(6, ...)    // 蔡瑁
makeOfficer(102, ...) → makeOfficer(151, ...)  // 蒯良
makeOfficer(103, ...) → makeOfficer(152, ...)  // 蒯越
makeOfficer(104, ...) → makeOfficer(310, ...)  // 文聘
makeOfficer(77, ...)  → makeOfficer(94, ...)   // 公孫瓚
makeOfficer(5, ...)   → makeOfficer(421, ...)  // 趙雲
makeOfficer(105, ...) → makeOfficer(456, ...)  // 田楷
makeOfficer(106, ...) → makeOfficer(353, ...)  // 嚴綱
makeOfficer(76, ...)  → makeOfficer(208, ...)  // 馬騰
makeOfficer(6, ...)   → makeOfficer(204, ...)  // 馬超
makeOfficer(110, ...) → makeOfficer(228, ...)  // 龐德
makeOfficer(111, ...) → makeOfficer(205, ...)  // 馬岱
makeOfficer(78, ...)  → makeOfficer(285, ...)  // 陶謙
makeOfficer(107, ...) → makeOfficer(223, ...)  // 糜竺
makeOfficer(108, ...) → makeOfficer(222, ...)  // 糜芳
makeOfficer(109, ...) → makeOfficer(32, ...)   // 陳登
makeOfficer(4, ...)   → makeOfficer(443, ...)  // 諸葛亮
makeOfficer(9, ...)   → makeOfficer(229, ...)  // 龐統
makeOfficer(7, ...)   → makeOfficer(128, ...)  // 黃忠
makeOfficer(8, ...)   → makeOfficer(308, ...)  // 魏延
makeOfficer(10, ...)  → makeOfficer(70, ...)   // 法正
makeOfficer(32, ...)  → makeOfficer(253, ...)  // 司馬懿
makeOfficer(55, ...)  → makeOfficer(194, ...)  // 呂蒙
makeOfficer(54, ...)  → makeOfficer(199, ...)  // 陸遜
makeOfficer(59, ...)  → makeOfficer(196, ...)  // 魯肅
makeOfficer(81, ...)  → makeOfficer(450, ...)  // 貂蟬
makeOfficer(112, ...) → makeOfficer(343, ...)  // 徐庶
makeOfficer(113, ...) → makeOfficer(402, ...)  // 張任
makeOfficer(114, ...) → makeOfficer(355, ...)  // 嚴顏
```

**Scenarios 194-235:** Apply the same mapping table to all `makeOfficer()` calls. The first argument is always the officer ID.

**Special case — Scenario 235 `makeOfficer()` fixes:**
```
makeOfficer(34, 1, 10, ...)  → makeOfficer(19, 1, 10, ...)    // BUG FIX: 曹叡 (was 曹丕=34→17, corrected to 曹叡=19)
makeOfficer(32, 1, 11, ...)  → makeOfficer(253, 1, 11, ...)  // 司馬懿
makeOfficer(25, 1, 11, ...)  → makeOfficer(391, 1, 11, ...)  // 張郃
makeOfficer(11, 2, 28, ...)  → makeOfficer(171, 2, 28, ...)  // BUG FIX: 劉禪 (was 姜維=11→143, corrected to 劉禪=171)
makeOfficer(4,  2, 18, ...)  → makeOfficer(443, 2, 18, ...)  // 諸葛亮
makeOfficer(8,  2, 18, ...)  → makeOfficer(308, 2, 18, ...)  // 魏延
makeOfficer(5,  2, 28, ...)  → makeOfficer(421, 2, 28, ...)  // 趙雲
makeOfficer(52, 3, 22, ...)  → makeOfficer(273, 3, 22, ...)  // 孫權
makeOfficer(54, 3, 23, ...)  → makeOfficer(199, 3, 23, ...)  // 陸遜
```

### Step 3: Update `src/data/historicalEvents.ts`

Two hardcoded references:

1. **Line 38:** `f.id === 1 ? { ...f, rulerId: 34 }` → `f.id === 1 ? { ...f, rulerId: 17 }`
   - Officer 34 (曹丕) → RTK4 id 17
2. **Line 42:** `o.id === 34 ? { ...o, factionId: 1, isGovernor: true }` → `o.id === 17 ? { ...o, factionId: 1, isGovernor: true }`
   - Same: 34 → 17
3. **Line 36 (comment):** Update comment `// Change ruler of Cao Cao faction (id: 1) to Cao Pi (id: 34)` → `(id: 17)`

**Note:** `factionId === 1` in line 21 is a **faction** ID, not an officer ID. Faction IDs are NOT changing — only officer IDs change.

### Step 4: Update test files

Most test files use generic fixture IDs (1, 2, 3, etc.) that don't map to real officers. Only update tests that reference **specific named officers**:

#### `src/systems/systems.test.ts`

| Line | Old | New | Context |
|------|-----|-----|---------|
| 10 | `advisorId: 28` | `advisorId: 350` | 荀彧 |
| 10 | `rulerId: 20` | `rulerId: 11` | 曹操 |
| 15 | `id: 28, name: '荀彧'` | `id: 350, name: '荀彧'` | |
| 16 | `id: 20, name: '曹操'` | `id: 11, name: '曹操'` | |
| 17 | `id: 21, name: '夏侯惇'` | `id: 326, name: '夏侯惇'` | |
| 51 | `rulerId: 20` | `rulerId: 11` | 曹操 |
| 117 | `id: 20, name: '曹操'` | `id: 11, name: '曹操'` | |
| 118 | `id: 100, name: '在野'` | Keep as-is or change to any unused ID. This is a generic unaffiliated officer, not 楊弘. Since RTK4 id 100 = 關羽, change to a safe unused ID like `id: 999` |
| 175 | `rulerId: 20` | `rulerId: 11` | 曹操 |
| 176 | `id: 34` | `id: 17` | 曹丕 |
| 183 | `.rulerId).toBe(34)` | `.rulerId).toBe(17)` | 曹丕 |

#### `src/components/map/SelectionMinimap.test.tsx`
| Line | Old | New | Context |
|------|-----|-----|---------|
| 9 | `rulerId: 20` | `rulerId: 11` | 曹操 (if this is meant to be Cao Cao specifically) |

**Other test files** (`gameStore.test.ts`, `gameStore.commands.test.ts`, `aiEngine.test.ts`, `subsystems.test.ts`, `CommandMenu.test.tsx`, `GovernorAssignmentModal.test.tsx`, `FormationDialog.test.tsx`, `officers.test.ts`, `skills.test.ts`) use **generic numeric IDs** (1, 2, 3, 10, 20) as arbitrary test fixtures — these do NOT need to be updated as long as corresponding officers exist in the new `baseOfficers` array. Since the new array will have 455 officers covering IDs 1-449 (gap at 324) plus 450-456, most generic IDs will resolve correctly. **However**, if any test uses ID 324, it will fail since that ID doesn't exist in the RTK4 data.

**Exception:** `subsystems.test.ts` line 126 uses `id: 20` and calls the officer test data. After migration, id 20 = 曹爽. If the test relies on specific stats, it may need adjustment. Check if the test assertions depend on stat values.

### Step 5: Verify

After all changes:

```bash
npm run build    # TypeScript check + production build
npm test         # Run all tests
```

Fix any issues that arise. Common problems:
- `makeOfficer()` calls referencing IDs that don't exist in `baseOfficers` (typos in mapping)
- Test assertions that depend on specific stat values from old officers
- Scenario tests that validate officer counts or specific IDs

---

## Implementation Notes

### Generating `officers.ts`

The recommended approach is to write a Node.js script that:
1. Reads `data/rtk4_officers_zh.json`
2. Reads the current `src/data/officers.ts` to extract skills for existing 82 RTK4 officers
3. Generates the new file with all 455 officers

Example script structure:
```javascript
const rtk4 = require('./data/rtk4_officers_zh.json');
// ... extract skills from old officers using ID mapping ...
// ... generate new officers.ts content ...
```

### Skills Strategy

- The 82 officers currently in the game that match RTK4 keep their existing skills (mapped via ID table)
- The 7 non-RTK4 officers (450-456) keep their existing skills
- All ~366 new RTK4 officers (including 花鬘) get `skills: []` as placeholder
- A separate task will assign skills based on officer stats and role

### portraitId Strategy

- For now, set `portraitId = id` for all officers
- This means portrait images need to be provided for IDs 1-449 (gap at 324) plus 450-456
- Until portrait images exist, the UI should handle missing portraits gracefully

### Faction IDs are NOT changing

Only officer IDs change. Faction IDs (1=曹操, 2=劉備, 3=孫堅/策/權, etc.) remain the same across all scenarios.

---

## Checklist

- [ ] Rewrite `src/data/cities.ts` with correct RTK4 city IDs, names, connections, and coordinates (Step 6 — do FIRST, before scenarios)
- [ ] Generate new `src/data/officers.ts` with 455 officers using RTK4 IDs (Step 1)
- [ ] Fix `data/rtk4_officers_zh.json` ID 19: rename 曹蕤 → 曹叡 (transcription error)
- [ ] Update `src/data/scenarios.ts` — all `rulerId`, `advisorId`, `makeOfficer()` first args, `makeOfficer()` city ID 3rd args, AND all `makeCity()` city IDs + neutral filters (Step 2)
- [ ] Fix Scenario 235 rulers: 曹叡(19) and 劉禪(171) per original RTK4
- [ ] Handle removed cities (小沛, 上黨, etc.) — reassign officers to replacement cities
- [ ] Update `src/data/historicalEvents.ts` — officer ID 34 → 17 (曹丕) (Step 3)
- [ ] Update `src/systems/systems.test.ts` — named officer IDs (Step 4)
- [ ] Review other test files for city ID references that may need updating
- [ ] Run `npm run build` — zero errors
- [ ] Run `npm test` — all tests pass (currently 264)
- [ ] Manual smoke test: start each scenario, verify correct rulers, officers, and territories appear
- [ ] Expand scenario territory assignments to match original RTK4 (post-migration)
- [ ] Assign skills to ~366 new RTK4 officers (post-migration)

---

## Step 6: Rewrite City Data (`src/data/cities.ts`)

**This is a critical prerequisite that should be done FIRST (before the scenario update in Step 2), since scenarios reference city IDs.**

**Note:** `data/cities.json` already contains the correct RTK4 city data (43 cities, IDs 1-43, bidirectional connections). It is the source of truth. Only `src/data/cities.ts` needs to be rewritten to match it.

The current city data in `src/data/cities.ts` has **wrong IDs, wrong adjacencies, wrong cities**. It must be completely rewritten to match RTK4.

### RTK4 Official City Data (43 cities, IDs 1-43)

Source: Verified RTK4 game data. Canonical copy saved to `data/cities.json`.

```json
{
  "1":  { "name": "襄平", "connections": [2] },
  "2":  { "name": "北平", "connections": [1, 3, 5] },
  "3":  { "name": "薊",   "connections": [2, 4, 5] },
  "4":  { "name": "晉陽", "connections": [3, 8, 12] },
  "5":  { "name": "南皮", "connections": [2, 3, 6, 15] },
  "6":  { "name": "平原", "connections": [5, 7, 8, 16] },
  "7":  { "name": "北海", "connections": [6, 16, 18] },
  "8":  { "name": "鄴",   "connections": [4, 6, 12, 14] },
  "9":  { "name": "西涼", "connections": [10, 11, 21] },
  "10": { "name": "天水", "connections": [9, 11, 21, 22] },
  "11": { "name": "長安", "connections": [9, 10, 13, 22, 30] },
  "12": { "name": "洛陽", "connections": [4, 8, 13, 14, 30] },
  "13": { "name": "弘農", "connections": [11, 12] },
  "14": { "name": "許昌", "connections": [8, 12, 15, 17, 30, 31] },
  "15": { "name": "陳留", "connections": [5, 14, 16, 17] },
  "16": { "name": "濮陽", "connections": [6, 7, 15] },
  "17": { "name": "譙",   "connections": [14, 15, 18, 19, 31] },
  "18": { "name": "下邳", "connections": [7, 17, 19] },
  "19": { "name": "徐州", "connections": [17, 18, 20, 38] },
  "20": { "name": "壽春", "connections": [19, 31, 34, 38, 39] },
  "21": { "name": "涼州", "connections": [9, 10, 23] },
  "22": { "name": "漢中", "connections": [10, 11, 23, 24] },
  "23": { "name": "下卞", "connections": [21, 22, 24] },
  "24": { "name": "梓潼", "connections": [22, 23, 25] },
  "25": { "name": "成都", "connections": [24, 26, 28] },
  "26": { "name": "江州", "connections": [25, 27, 28, 33] },
  "27": { "name": "永安", "connections": [26, 33] },
  "28": { "name": "建寧", "connections": [25, 26, 29] },
  "29": { "name": "雲南", "connections": [28] },
  "30": { "name": "宛",   "connections": [11, 12, 14, 31, 32] },
  "31": { "name": "新野", "connections": [14, 17, 20, 30, 32] },
  "32": { "name": "襄陽", "connections": [30, 31, 33, 34] },
  "33": { "name": "江陵", "connections": [26, 27, 32, 35, 36] },
  "34": { "name": "江夏", "connections": [20, 32, 35, 39] },
  "35": { "name": "柴桑", "connections": [33, 34, 36, 41] },
  "36": { "name": "武陵", "connections": [33, 35, 37] },
  "37": { "name": "長沙", "connections": [36, 42, 43] },
  "38": { "name": "建業", "connections": [19, 20, 39, 40] },
  "39": { "name": "廬江", "connections": [20, 34, 38, 41] },
  "40": { "name": "吳",   "connections": [38, 41] },
  "41": { "name": "會稽", "connections": [35, 39, 40] },
  "42": { "name": "零陵", "connections": [37, 43] },
  "43": { "name": "桂陽", "connections": [37, 42] }
}
```

**43 cities total (IDs 1-43, all used).** All connections are bidirectional.

**Strategic note on ID 21 (涼州):** Acts as the northwestern frontier buffer between 西涼(9)/天水(10) and the path to Shu via 下卞(23). Controlling 西涼 + 涼州 locks down the entire Silk Road entrance.

### Changes from Current Data

**Cities to REMOVE (7):**
| Our ID | Name | Replacement |
|--------|------|-------------|
| 6 | 上黨 | No equivalent in RTK4 |
| 31 | 廬陵 | Covered by 柴桑/會稽 area |
| 33 | 漢嘉 | Replaced by 下卞 (RTK4 id 23) |
| 37 | 南海 | Not in RTK4 |
| 39 | 交趾 | Not in RTK4 |
| 41 | 安定 | Not in RTK4 |
| 43 | 小沛 | Replaced by 徐州 (RTK4 id 19) |

**Cities to ADD (6):**
| RTK4 ID | Name | Region | Key connections |
|---------|------|--------|-----------------|
| 13 | 弘農 | Central | Between 洛陽(12) and 長安(11) |
| 17 | 譙 | Central | Cao Cao's hometown, connects 許昌/陳留/下邳/徐州/新野 |
| 19 | 徐州 | East | Connects 譙/下邳/壽春/建業 |
| 23 | 下卞 | Shu | Between 漢中(22) and 梓潼(24) |
| 26 | 江州 | Shu | Key hub connecting 成都/永安/建寧/江陵 |
| 40 | 吳 | Wu | Near 建業(38) and 會稽(41) |

**Cities with ID changes (32 of 36 shared cities have wrong IDs):**
Almost every city ID needs to change. The full old→new mapping:

| Old ID | Old Name | New ID | New Name |
|--------|----------|--------|----------|
| 1 | 襄平 | 1 | 襄平 (same) |
| 2 | 北平 | 2 | 北平 (same) |
| 3 | 薊 | 3 | 薊 (same) |
| 4 | 南皮 | 5 | 南皮 |
| 5 | 晉陽 | 4 | 晉陽 |
| 7 | 鄴 | 8 | 鄴 |
| 8 | 平原 | 6 | 平原 |
| 9 | 濮陽 | 16 | 濮陽 |
| 10 | 洛陽 | 12 | 洛陽 |
| 11 | 長安 | 11 | 長安 (same) |
| 12 | 宛 | 30 | 宛 |
| 13 | 陳留 | 15 | 陳留 |
| 14 | 北海 | 7 | 北海 |
| 15 | 下邳 | 18 | 下邳 |
| 16 | 壽春 | 20 | 壽春 |
| 17 | 天水 | 10 | 天水 |
| 18 | 漢中 | 22 | 漢中 |
| 19 | 新野 | 31 | 新野 |
| 20 | 襄陽 | 32 | 襄陽 |
| 21 | 廬江 | 39 | 廬江 |
| 22 | 建業 | 38 | 建業 |
| 23 | 江陵 | 33 | 江陵 |
| 24 | 江夏 | 34 | 江夏 |
| 25 | 柴桑 | 35 | 柴桑 |
| 26 | 會稽 | 41 | 會稽 |
| 27 | 梓潼 | 24 | 梓潼 |
| 28 | 成都 | 25 | 成都 |
| 29 | 永安 | 27 | 永安 |
| 30 | 長沙 | 37 | 長沙 |
| 32 | 武陵 | 36 | 武陵 |
| 34 | 建寧 | 28 | 建寧 |
| 35 | 零陵 | 42 | 零陵 |
| 36 | 雲南 | 29 | 雲南 |
| 38 | 桂陽 | 43 | 桂陽 |
| 40 | 西涼 | 9 | 西涼 |
| 42 | 許昌 | 14 | 許昌 |

**IMPORTANT:** City IDs are referenced in `src/data/scenarios.ts` in both `makeCity()` calls and the neutral city filter arrays. ALL city ID references must be updated when city IDs change.

### x, y Coordinates

The x, y coordinates for existing cities can be kept approximately the same (adjusted for the new ID), but new cities need coordinates:
- **弘農 (13):** Between 洛陽 and 長安 → approximately x: 50, y: 29
- **譙 (17):** Between 陳留 and 下邳 → approximately x: 70, y: 38
- **徐州 (19):** Near 下邳 → approximately x: 76, y: 40
- **下卞 (23):** Between 漢中 and 梓潼 → approximately x: 35, y: 38
- **江州 (26):** Between 成都 and 永安 → approximately x: 38, y: 52
- **吳 (40):** Near 建業 → approximately x: 82, y: 52

### Impact on Scenarios

Since city IDs change, **every `makeCity()` call and neutral city filter in scenarios.ts must be updated**. This compounds with the officer ID changes in Step 2. It may be simplest to rewrite scenarios.ts from scratch.

**Scenario city ID mappings (using old→new table from above):**

All `makeCity(oldId, ...)` calls need the first arg updated. Additionally, `makeOfficer(id, factionId, cityId, ...)` calls have the city ID as the 3rd argument — these also need updating.

Example from Scenario 189:
```
makeCity(11, 4, ...)  → makeCity(11, 4, ...)   // 長安 (same ID)
makeCity(10, 4, ...)  → makeCity(12, 4, ...)   // 洛陽 (10→12)
makeCity(4, 5, ...)   → makeCity(5, 5, ...)    // 南皮 (4→5)
makeCity(7, 5, ...)   → makeCity(8, 5, ...)    // 鄴 (7→8)
makeCity(13, 1, ...)  → makeCity(15, 1, ...)   // 陳留 (13→15)
makeCity(43, 2, ...)  → REMOVED (小沛 not in RTK4 — need to reassign 劉備 to a different city)
makeCity(25, 3, ...)  → makeCity(35, 3, ...)   // 柴桑 (25→35)
makeCity(16, 6, ...)  → makeCity(20, 6, ...)   // 壽春 (16→20)
makeCity(20, 7, ...)  → makeCity(32, 7, ...)   // 襄陽 (20→32)
makeCity(23, 7, ...)  → makeCity(33, 7, ...)   // 江陵 (23→33)
makeCity(2, 8, ...)   → makeCity(2, 8, ...)    // 北平 (same ID)
makeCity(40, 9, ...)  → makeCity(9, 9, ...)    // 西涼 (40→9)
makeCity(15, 10, ...) → makeCity(18, 10, ...)  // 下邳 (15→18)
```

**IMPORTANT:** 小沛 (old ID 43) does not exist in RTK4 city data. 劉備's starting city needs to change — possible replacement: 徐州 (RTK4 ID 19) or 下邳 (RTK4 ID 18). Similar issues apply in other scenarios that use removed cities.

**All `makeOfficer(id, factionId, cityId, ...)` 3rd args** also need city ID mapping. For example in Scenario 189:
```
makeOfficer(20, 1, 13, ...)  → makeOfficer(11, 1, 15, ...)   // 曹操 in 陳留 (city 13→15)
makeOfficer(1,  2, 43, ...)  → makeOfficer(169, 2, ??, ...)   // 劉備 in 小沛 → needs new city
```

## Post-Migration Task: Scenario Territory Alignment

After the city data and officer data are migrated, each scenario's territory assignments need to be verified against the original RTK4 game:

- **Scenario 235 (星落五丈原):** Wei controls ~15+ northern cities, Shu has ~5-6 southwestern cities, Wu has ~8-10 southeastern cities. Our current version only assigns 8 cities total.
- **All 6 scenarios** need territory audits against the original game.
- This requires reference screenshots or data from RTK4 for each scenario's starting map.

## Post-Migration Task: Update `public/terrain-map.svg` (Low Priority)

The terrain SVG contains static decorative city markers (gray rects + text labels) and road lines that sit beneath the dynamic JS-rendered city overlays. **No code reads city data from the SVG** — all city positioning is driven by `x, y` in `cities.ts` via the Zustand store.

After the migration:
- 7 removed cities (小沛, 上黨, 廬陵, 漢嘉, 南海, 交趾, 安定) will have orphaned static markers in the SVG
- 6 new cities (弘農, 譙, 徐州, 下卞, 江州, 吳) will lack static markers
- HTML comments referencing old city IDs will be out of date

**This is cosmetic only and does not affect gameplay.** Update when convenient:
- [ ] Remove static markers for 7 deleted cities
- [ ] Add static markers for 6 new cities (using their `x * 10, y * 10` pixel positions)
- [ ] Update road/path lines to match new adjacency graph
- [ ] Update HTML comments with new RTK4 city IDs
