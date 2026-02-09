# Visual & Functional Gap Analysis v2: Original RTK IV vs Web Remake

Compared 13 original RTK IV screenshots (`reference_images/screen1-13.png`) against the live app at `localhost:5173`.

---

## Part A: Visual Gaps (Remaining After Phase 1-5 Overhaul)

### A1. Title Screen (screen1)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| Menu dialog position | Upper-right area, slightly off-center | `flex: justify-content: flex-end; padding: 10vh 12vw` | Close — may need minor position tuning |
| Brocade tile fidelity | Crisp circular medallions with dragon motifs, ~80px tiles, gold-green on black, evenly spaced | Our `brocade-tile.svg` is a procedural tile | Compare visually — the SVG tile quality is the main remaining gap |
| Menu text | White text on blue bg, centered, no decorative separators | `.title-menu-item` with letter-spacing | Close match |

**Remaining work**: Refine `brocade-tile.svg` to more closely replicate the circular medallion pattern seen in screen1.

---

### A2. Scenario Select (screen2)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| **6 scenarios** | 189, 194, 201, 208, 221, 235 with full name + subtitle per row | We have 6, but years differ (200, 219, 234 vs 201, 221, 235) | **Wrong years** |
| Dialog content | `請選擇劇本.` header, `中止` in upper-right, scenario rows with `西元` prefix | Matching | Close |
| Row layout | Year on left, `name・subtitle` on right, single line per scenario | Matching | Good |

**Remaining work**: Fix scenario years to match the original: 201, 221, 235.

---

### A3. Faction Select (screen3)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| Portrait cards | Large hand-painted portraits filling the card, ornate brownish/green frames, name bar below | Using `size="large"`, green frames, name label | Structurally matching — visual quality depends on portrait assets |
| Header bar | Scenario name left, count center, colored tab buttons right (`決定` green, `下頁` green, `中止` red) | Similar layout | Button colors now match |
| Minimap | Parchment-colored terrain with small colored squares for cities | Dark bg with terrain SVG overlay, colored circles | **Map bg color** — original is warmer (parchment), ours is dark |
| Below portraits | Each portrait has a small colored faction bar at bottom | We have `faction-label` with green bg | Close |

**Remaining work**: Minimap could use a warmer parchment tone instead of `#0a1a0a` dark background.

---

### A4. Settings Screen (screen4)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| `滑鼠靈敏度` | Original says `滑鼠靈敏度` (Mouse Sensitivity) | We say `清信靈敏度` | **Wrong text** |
| `出場`/`退場` toggle | Original uses these two options | We use `全`/`選` | **Wrong text** |
| `決定`/`中止` position | Upper-right of dialog | Upper-right via `.settings-top-bar` | Matching |
| Toggle style | Red active text on dark bg | `.toggle-option.active` uses red | Matching |

**Remaining work**: Fix two text errors (`清信靈敏度` → `滑鼠靈敏度`, `全`/`選` → `出場`/`退場`).

---

### A5. Main Map — No City Selected (screen5)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| **Map terrain** | Richly painted isometric terrain — mountains are 3D shaded peaks, rivers have realistic width and bends, forests are clustered tree sprites, coastline has beach transitions, sea is deep blue | Semi-transparent SVG terrain at 75% opacity on `#1a3a5a` | **Still the biggest gap** — terrain quality |
| **City icons** | Small building/castle sprites (3-4 building roofs, walls) with a flag pole and colored banner bearing surname character (曹, 劉, 孫) | `CityFlag` SVG with rect flag + surname text + small base rect | Structurally correct, but lacks the sprite-like building detail |
| **Flag shape** | Pennant/banner shape — slightly tapered bottom, flowing flag effect | Simple rectangle | **Shape gap** |
| **City labels** | City name in white below the buildings, small font | City name below flag, `fontSize="1.5"` | Matching |
| **Date badge** | Small framed badge, top-left, shows year/month and faction name, with a small terrain icon | `.date-badge.rtk-frame` with year/month/faction | Close — missing terrain icon |
| **Minimap** | Small bordered map top-right with colored city dots + terrain background, faction icons | `GameMinimap` 180×150px with terrain + dots | Structurally matching |
| **Command grid** | 2-row icon grid top-right: `軍/民/將/濟` (row1), `情報/君主/功能/本國/休息/討世` (row2) | 3×2 text grid in sidebar: `內政/軍事/人事/外交/謀略/結束` | **Different categories and location** (see B section) |

---

### A6. Main Map — City Selected (screen6)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| **Info panel** | Right-side overlay on map: ruler portrait (large), city illustration (birds-eye), command tabs (`軍事/人事/外交/內政/商人/謀略/助言`), sub-tabs (`城/內/軍/財/將`) | Right-side overlay: flat stat list, procedural city illustration, officer list | **Missing tabbed sub-views** |
| **Ruler portrait** | Large, prominent, in a bordered frame at top of panel | No ruler portrait in CityPanel (only small officer portraits in list) | **Missing** |
| **City illustration** | Detailed pixel-art birds-eye painting showing the actual city, walls, fields, buildings | Procedural SVG with basic shapes (rects, circles) | Enhanced in Phase 4.3, but still geometric vs pixel-art |
| **Sub-tabs** | `城` (城郭=overview), `內` (內政=domestic), `軍` (軍事=military), `財` (財政=finance), `將` (武將=officers) | No tabs — single flat panel | **Missing** |

---

### A7. Officer Selection Overlay (screen7)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| **Table layout** | Left side of map: `讓誰徵兵？` header + `結束` button, then columnar stat table: 姓名/統御/武力/智力/政治/魅力 with aligned numbers | `OfficerSelectionOverlay` with same column layout | Structurally matching |
| **Position** | Upper-left overlay on map | `position: fixed; top: 80px; left: 20px` | Close |
| **Question prompt** | `讓誰徵兵？` (Who should draft troops?) — dynamic per command | `title` prop passed to overlay | Matching |

**This is well-implemented.**

---

### A8. Command Sub-Menu (screen8)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| **Command categories** | 7-tab row below minimap: `軍事/人事/外交/內政/商人/謀略/助言` | 3×2 grid in sidebar | **Different layout & categories** |
| **Sub-actions** | Row of icon tiles below: `排備` (arrange), `登用` (recruit), `賞賜` (reward), `旌據` (assign) | Text-button list in sidebar | **Visual gap** — original uses icon tiles |
| **City detail tabs** | `城/內/軍/財/將` | Not implemented | **Missing** |

---

### A9. Personnel Search (screen9)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| **Search overlay** | Small table: `讓誰搜尋？` + officer names with 政治 stat | No stat-filtered search overlay | **Missing** — search just fires directly |
| **Stat shown** | Only shows 姓名 and 政治 (politics) — the relevant stat for search success | Our overlay shows all 5 stats | Could filter to relevant stat |

---

### A10. Region Selection (screen10)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| **Region picker** | `搜尋那個地方？` + `中止` button, list of regions: `幽・冀・并州`, `青`, `徐州`, `兗`, `豫州`, `揚州`, `司隸`, `雍`, `涼`, `荊州北部`, `荊州南部`, `益州` | **Completely missing** | **Major gap** |
| **Region confirmation** | Shows cities in selected region: `襄平 北平 代縣 晉陽 南皮 平原 鄴` then asks `在這個地方可以嗎？` with `可`/`否` | **Completely missing** | |

---

### A11. Region Confirmation Dialog (screen11)

This is the continuation of screen10 — region → city list → confirm dialog. All missing.

---

### A12-A13. Domestic Status Table (screen12, screen13)

| Element | Original | Ours | Gap |
|---------|----------|------|-----|
| **Header** | `平原 內政狀況表` (city name + "Domestic Status Table") with `變更`/`中止` buttons | `全勢力狀況一覽` (All Faction Overview) | **Wrong title and concept** |
| **Content (screen12)** | Row-based: shows domestic projects (開墾=develop, 治水=flood control, 商業/貿頂=commerce, 共衡=?) with their current values and 資金數 (allocated gold = 0) | Simple city stat columns | **Completely different data** |
| **Content (screen13)** | Same table but with officers assigned: 劉備→開墾力56 (資金數1367), 簡雍→治水力37 (資金數1775), etc. | No officer assignment concept | **Missing feature** — no concept of officers being "assigned" to ongoing domestic tasks with gold budgets |

---

## Part B: Functional Gaps

### B1. Missing Command Categories & Actions

| Original Command | Category | Description | Status |
|-----------------|----------|-------------|--------|
| **情報** | Top-level | Browse faction/city/officer information freely | **MISSING** |
| **功能** | Top-level | System settings, game speed, BGM | **MISSING** (partial via MapToolbar) |
| **本國** | Top-level | Center map on home territory | **MISSING** |
| **討世** | Diplomatic/Military | Publicly denounce a lord | **MISSING** |
| **休息** | Officer | Explicitly rest to recover stamina faster | **MISSING** |
| **商人** | Economic | Buy/sell gold↔food with merchants | **MISSING** |
| **助言** | Advisory | Proactively ask advisor for strategic suggestions | **INCOMPLETE** — passive-only at turn end |

### B2. Missing Systems

| System | Description | Status |
|--------|-------------|--------|
| **Region/Province data** | Cities grouped into named provinces (幽州, 冀州, etc.) | **MISSING** — no `region` field on City |
| **Region-based search** | Search for hidden officers across a province | **MISSING** |
| **Domestic task assignment** | Assign officers to ongoing domestic tasks (開墾, 治水, 商業) with gold budgets | **MISSING** — our commands are instant one-shot actions |
| **Merchant/Trade** | Random merchants appear, buy/sell gold↔food | **MISSING** |
| **City info tabs** | Tabbed detail view: 城/內/軍/財/將 | **MISSING** |

### B3. Data Corrections

| Item | Current | Should Be |
|------|---------|-----------|
| Scenario 3 year | 200 | **201** |
| Scenario 5 year | 219 | **221** |
| Scenario 6 year | 234 | **235** |
| Settings label `清信靈敏度` | `清信靈敏度` | **`滑鼠靈敏度`** |
| Settings toggle `全`/`選` | `全`/`選` | **`出場`/`退場`** |
| TSDoc comment `intelligenceSensitivity` | `情報敏感度` | Should match `滑鼠靈敏度` (mouse sensitivity) |
| DomesticStatusPanel title | `全勢力狀況一覽` | **`內政狀況表`** |

---

## Part C: Prioritized Implementation Plan

### Tier 1 — Quick Fixes (< 1 day, high fidelity improvement)

**C1.1 — Fix Text Errors**
- `GameSettingsScreen.tsx` line 116: `清信靈敏度` → `滑鼠靈敏度`
- `GameSettingsScreen.tsx` lines 106-107: `全`/`選` → `出場`/`退場`
- `types/index.ts` line 223: update comment
- `DomesticStatusPanel.tsx` line 50: `全勢力狀況一覽` → `內政狀況表`

**C1.2 — Fix Scenario Years**
- `scenarios.ts`: scenario 3 year `200` → `201`, scenario 5 year `219` → `221`, scenario 6 year `234` → `235`
- Update corresponding subtitles if needed

**C1.3 — Add Ruler Portrait to CityPanel**
- When a city is selected and has a faction, show the ruler's portrait prominently at the top of `CityPanel`, above the city illustration
- Use `Portrait` component with `size="medium"` or `size="large"`

### Tier 2 — Structural UI Features (2-3 days)

**C2.1 — City Info Tabs (城/內/軍/財/將)**
- Add a tab bar to `CityPanel` with 5 tabs:
  - `城` (Overview): city name, faction, illustration, population, defense
  - `內` (Domestic): commerce, agriculture, flood control, technology, people loyalty, training
  - `軍` (Military): troops, morale, weapons inventory
  - `財` (Finance): gold, food, tax rate
  - `將` (Officers): officer list with stats, skills, loyalty, stamina
- Current flat panel already has all this data — just need to partition into tabs
- Files: `CityPanel.tsx`, `App.css`

**C2.2 — Command Category Restructure**
- Add `情報` as a command category (read-only browsing of faction/city info)
- Split `結束` into explicit `休息` (rest current officer for stamina bonus) + `結束` (end turn)
- Consider adding `助言` as an invocable command (proactive advisor)
- Update `CommandCategory` type in `types/index.ts`
- Update `CommandMenu.tsx`

**C2.3 — Region Data & Province System**
- Add a `region` field to the `City` type
- Define region data mapping cities to provinces: `{ id: 'youzhou', name: '幽州', cityIds: [1,2,3] }`
- Create `src/data/regions.ts` with the 12-13 RTK IV provinces
- Update `cities.ts` or `cities.json` with region assignments

**C2.4 — Region-Based Search**
- Modify `searchOfficer` flow: show region picker first, then search all cities in that region
- Create a `RegionPickerOverlay` component (list of region names, `中止` button)
- Create a `RegionConfirmDialog` (shows cities in region, `可`/`否` buttons)
- Wire into `CommandMenu.tsx` under `人事` → `搜索`

### Tier 3 — Game System Additions (3-5 days)

**C3.1 — Domestic Task Assignment System**
- This is a fundamental change to how domestic commands work
- Original: officers are assigned to ongoing tasks (commerce dev, agriculture dev, flood control, etc.) with gold budgets. Progress accumulates over multiple turns based on the officer's politics stat and the gold allocated
- Current: commands are instant one-shot (click → immediate effect)
- Implementation:
  1. Add `activeTasks: { officerId: number, task: DomesticTask, goldAllocated: number }[]` to City type
  2. Add `assignDomesticTask(cityId, officerId, task, gold)` action
  3. Add `processDomesticTasks()` in `endTurn` to apply progress
  4. Create `DomesticStatusTable` component matching screen12/13 layout
  5. Convert existing instant domestic commands to assignment-based flow

**C3.2 — Merchant/Trade System**
- Add `merchantEvent` system: random chance each turn for a merchant to appear at a city
- Merchant offers gold↔food exchange at variable rates
- Add store action: `tradeWithMerchant(cityId, 'buyFood' | 'buyGold', amount)`
- Add `商人` command category or sub-menu under `內政`
- Create UI dialog for trade

**C3.3 — 休息 (Rest) Command**
- Add store action: `restOfficer(officerId)` — recovers +40 stamina (double the passive +20), consumes the officer's turn
- Add to `CommandMenu` under a new section or as a standalone button
- Simple to implement

**C3.4 — 助言 (Advisor) as Active Command**
- Move advisor suggestions from passive turn-end to an invocable command
- Add `requestAdvice()` store action that generates and displays suggestions
- Show in a dialog overlay, not just the log

**C3.5 — 本國 (Home Country) Quick View**
- Add store action: `goHome()` — sets `selectedCityId` to the faction's capital/first city, centers map
- Add button to command area or toolbar
- Simple implementation

### Tier 4 — Visual Polish (1-2 days)

**C4.1 — Brocade Tile Refinement**
- Compare `public/brocade-tile.svg` against screen1 more carefully
- The original pattern has:
  - Large circular medallions (~80px) with dragon/phoenix silhouettes
  - Smaller diamond/octagonal connectors between medallions
  - Dark background (#0a0a0a) with gold-green medallion strokes
- Refine the SVG to match more closely

**C4.2 — Flag Shape Enhancement**
- Change `CityFlag` from a simple `<rect>` to a pennant/banner shape using `<path>` (tapered bottom or triangular cutout)
- Add subtle "wave" effect via a curve

**C4.3 — Selection Minimap Warmth**
- Change minimap background from `#0a1a0a` to a warmer parchment tone like `#d4c4a0` at low opacity
- Matches the original's warm parchment map style in screen3

**C4.4 — Command Grid as Icon Tiles**
- Original uses small icon tiles with pictographic labels (not just text)
- Create simple SVG icons for each command category
- Render as icon+text tiles instead of text-only buttons

---

## Implementation Priority

```
Tier 1 (Day 1):
  C1.1 Text fixes
  C1.2 Scenario year fixes
  C1.3 Ruler portrait in CityPanel

Tier 2 (Days 2-4):
  C2.1 City info tabs ← highest visual impact
  C2.2 Command restructure ← adds missing categories
  C2.3 Region data ← prerequisite for C2.4
  C2.4 Region-based search ← key RTK IV mechanic

Tier 3 (Days 5-9):
  C3.1 Domestic task assignment ← deepest gameplay change
  C3.3 休息 command ← trivial
  C3.4 助言 active command ← small
  C3.5 本國 quick view ← trivial
  C3.2 Merchant system ← new system

Tier 4 (Days 10-11):
  C4.1 Brocade tile refinement
  C4.2 Flag shape
  C4.3 Minimap warmth
  C4.4 Command icon tiles
```

---

## Summary

| Category | Count | Effort |
|----------|-------|--------|
| Text/data fixes | 7 items | < 1 day |
| Missing UI features | 3 (tabs, regions, ruler portrait) | 2-3 days |
| Missing game systems | 5 (tasks, merchant, rest, advisor, home) | 3-5 days |
| Visual polish | 4 items | 1-2 days |
| **Total** | **19 items** | **~11 days** |

The biggest functional gap is the **domestic task assignment system** (C3.1) — the original RTK IV treats domestic development as an ongoing process where officers are assigned to tasks with gold budgets over multiple turns. Our current instant-action model is fundamentally different and the most visible gameplay divergence.

The biggest visual gap remains the **map terrain quality** — the original's hand-painted isometric terrain is irreplaceable without significant art assets, but our current implementation is structurally sound.
