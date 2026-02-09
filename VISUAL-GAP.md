# Visual Gap Analysis: Original RTK IV vs Web Remake

## Overview

This document compares the original Romance of the Three Kingdoms IV (三國志IV) game screenshots against our current web implementation at localhost:5173, identifying visual and UX gaps with a prioritized plan to bridge them.

---

## Screen-by-Screen Comparison

### Screen 1: Title Screen

**Original**: Dark green **brocade/tapestry pattern** background (repeating dragon/phoenix medallions in gold-green on black). A single dialog box in the upper-right with a **blue interior, gold/bronze ornamental border frame**, containing three menu items: 開始新遊戲, 載入進度存檔, 登錄武將數值.

**Ours**: Dark navy gradient background (plain). A centered vertical layout with a glowing gold `三國志IV` title, subtitle, description text, and a single button. No patterned background, no ornamental border, no dialog-box style menu.

| Gap | Severity |
|-----|----------|
| **Missing brocade/tapestry tiled background** — the iconic green dragon medallion pattern | High |
| **Menu is not a framed dialog box** — original uses a decorative bordered panel (gold outer frame, blue interior); ours is just centered text + button | High |
| **Missing menu items** — no 載入進度存檔 or 登錄武將數值 on the title screen | Medium |
| **Title text placement** — original has no large title text on screen; the menu is the focal point. Ours dominates with a giant `三國志IV` | Low |

---

### Screen 2: Faction Select

**Original**: Full-width layout. Top bar: scenario name on left (`董卓廢少帝・火燒洛陽`), `選擇君主 0人` center, `決定 下頁 中止` buttons on right in distinct colored tabs (green/red). Left half: a painted parchment-style **map of China** with city markers as small colored squares. Right half: a **3x3 grid of ruler portraits** — each is a large hand-painted portrait in a thick frame, with the ruler's name below in a green label bar. The remaining background is the same green brocade pattern.

**Ours**: Similar split layout (minimap left, cards right) but visually very different.

| Gap | Severity |
|-----|----------|
| **Portrait style** — original has large, richly-painted KOEI-style portraits filling most of each card; ours shows small portraits (80x100px) in dark slate cards with text | High |
| **Card frames** — original uses ornate green-bordered frames around each portrait; ours uses minimal dark cards with thin borders | High |
| **Map style** — original map is a parchment/painted terrain map with rich colors; ours uses a semi-transparent SVG overlay on dark navy | Medium |
| **Header bar style** — original uses colored tab-style buttons (決定 in green, 中止 in red); ours uses flat dark buttons | Medium |
| **Background** — original continues the brocade pattern in empty areas; ours uses the dark green stripe pattern | Low |

---

### Screen 3: Settings Screen

**Original**: Same green brocade background. A centered **blue-interior dialog with gold ornamental border** (same frame style as title screen). Settings displayed as label-value rows: 選擇劇本, 選擇君主, then toggle options (戰爭方式, 遊戲方式, 登錄武將出場, 滑鼠靈敏度) with **red-on-dark toggle buttons**. 決定 and 中止 are colored tab buttons in the upper-right of the dialog.

**Ours**: Dark green striped background, centered dark indigo box with bronze border. Similar content but different visual treatment.

| Gap | Severity |
|-----|----------|
| **Dialog frame** — original has a distinctive ornamental gold/bronze multi-layered border; ours has a simple 2px bronze line | High |
| **Dialog interior** — original is blue (like a blue fabric); ours is dark indigo (#1a1a2e) | Medium |
| **Toggle button style** — original uses red characters on dark background in a more compact grid; ours uses amber-brown filled buttons | Low |
| **Button placement** — original puts 決定/中止 in the upper-right corner of the dialog as tabs; ours puts them at the bottom center | Low |

---

### Screen 4 & 5: Main Game Screen (Map View + City Info)

**Original**: The map fills almost the **entire screen** — a gorgeous **painted isometric terrain map** with mountains, rivers, forests, coastline, and sea in rich detail. Cities are shown as small **building/castle icons with colored faction banners** (flag poles with the ruler's surname character). The top-left has a small date badge (`189年 12月 / 劉備`). The top-right has a **minimap** (small version of China) plus a **command button grid** (軍/民/將/濟/情報/君主/功能/本國/休息/討世) in a compact bordered panel. When a city is clicked, a **right-side panel** appears showing the ruler portrait, a **city illustration** (birds-eye painting of the city), and category tabs (軍事/人事/外交/內政/商人/謀略/助言) with sub-buttons (城/內/軍/財/將).

**Ours**: Left panel is an SVG map with circle nodes and lines on a dark background. Right panel is a fixed 340px sidebar with scrolling city stats, officer lists, command categories, and a log.

| Gap | Severity |
|-----|----------|
| **Map quality** — original is a richly painted isometric terrain map; ours is abstract circles + lines on a dark background with a faint terrain SVG | Critical |
| **City representation** — original shows building icons with **faction banners/flags** bearing the ruler's surname; ours uses colored circles | Critical |
| **Minimap** — original has a small China overview map in the upper-right; ours has no minimap during gameplay | High |
| **Command grid layout** — original uses a compact **icon grid** (2-row, multi-column) in the upper-right; ours uses a text-based category bar in the sidebar | High |
| **City info panel** — original shows a **painted city bird's-eye illustration** with the ruler's portrait; ours has a procedural SVG (functional but not artistic) and small portraits | High |
| **Info panel overlay** — original panel overlays the map (right side); ours is a permanent fixed sidebar | Medium |
| **Date badge** — original is a small framed badge; ours is text in a full-width header bar | Low |

---

### Screen 6: Officer Selection / Command Execution

**Original**: When executing a command (e.g., 徵兵 — draft troops), a **table overlay** appears on the left side of the map showing: column headers (姓名/統/武/智/政/魅), officer stats in rows (關羽, 張飛, 劉備, 簡雍), with a `結束` button. The map remains visible behind. This is a compact, data-dense table with clear column alignment.

**Ours**: Commands are executed via button clicks in the sidebar. Officer selection is done through sub-menus in the CommandMenu component — no stat table overlay on the map.

| Gap | Severity |
|-----|----------|
| **No officer stat table overlay** — original shows a clear table with all 5 stats when selecting who executes a command; ours just lists names with inline stats in the sidebar | High |
| **Table appears over the map** — original overlays the table on the left half; ours confines everything to the right sidebar | Medium |
| **Column-aligned stat display** — original uses proper table formatting; ours uses inline text | Medium |

---

## Prioritized Implementation Plan

### Phase 1: Visual Foundation (High Impact)

**1.1 — Brocade Background Pattern**
Create a CSS tiled background that replicates the green dragon medallion brocade pattern. Use it on title, scenario, faction select, and settings screens. This single change transforms the feel of every non-gameplay screen.

**1.2 — Ornamental Dialog Frame**
Create a reusable dialog component with a multi-layered border: gold outer frame, inner blue background, matching the original's distinctive bordered panels. Apply to title menu, scenario select, and settings dialog.

**1.3 — Title Screen Rework**
Remove the large glowing title text. Replace with a simple framed dialog box (upper-right or center) containing 3 menu items as clickable rows: 開始新遊戲, 載入進度存檔, 登錄武將數值.

### Phase 2: Faction Select & Settings Polish

**2.1 — Large Portrait Cards**
Redesign faction cards to be portrait-dominant: large portrait image filling most of the card area, with a name label bar below. Use ornamental green frames around each portrait.

**2.2 — Settings Dialog Restyle**
Apply the ornamental frame. Move 決定/中止 to upper-right as tab-style buttons. Use blue interior background.

### Phase 3: Main Game Map (Highest Effort, Highest Impact)

**3.1 — City Banners/Flags**
Replace circle markers with flag/banner icons showing the ruler's surname character. Use faction colors. This is the single most impactful change for the gameplay screen.

**3.2 — Improved Terrain Map**
Either source/create a higher-quality painted terrain map image, or significantly enhance the current SVG with richer colors, better terrain rendering, and more detail.

**3.3 — Minimap in Gameplay**
Add a small China overview minimap to the upper-right of the game screen (reuse the SelectionMinimap component). Show current viewport position.

**3.4 — Command Grid**
Redesign the command menu as a compact icon/label grid (similar to the original's 2-row button grid) rather than a text-heavy sidebar list.

### Phase 4: Info Panel & Overlays

**4.1 — City Info as Map Overlay**
Make the city info panel appear as an overlay on the right side of the map (like the original) rather than a permanent sidebar. Include the ruler portrait and city illustration prominently.

**4.2 — Officer Stat Table Overlay**
When executing commands that require officer selection, show a proper stat table overlay on the left side of the map with aligned columns (姓名/統/武/智/政/魅).

**4.3 — City Illustration Enhancement**
Improve the procedural city SVG to be more detailed and closer to the original's painted bird's-eye style.

### Phase 5: Polish

**5.1 — Button/Tab Styling**
Restyle buttons to match the original's colored tabs (決定 in green, 中止 in red, category buttons with icon styling).

**5.2 — Font Choices**
Use a serif CJK font for headings/menus to match the classical feel.

**5.3 — Color Palette Tuning**
Shift the palette from dark navy/slate toward the original's warmer browns, greens, and blues.

---

## Effort Estimates

| Phase | Effort | Visual Impact |
|-------|--------|---------------|
| Phase 1 (Foundation) | 1-2 days | Very High — transforms all menu screens |
| Phase 2 (Select/Settings) | 1 day | Medium |
| Phase 3 (Map) | 3-5 days | Critical — the gameplay screen is where players spend most time |
| Phase 4 (Overlays) | 2-3 days | High — matches the original's UX flow |
| Phase 5 (Polish) | 1-2 days | Medium — fine-tuning |

---

## Key Takeaway

The biggest single gap is the **map**. The original's hand-painted isometric terrain with city flag banners is the visual centerpiece of RTK IV. Our abstract circle-and-line map is the most obvious divergence. However, Phase 1 (brocade background + ornamental frames) delivers the most visual improvement per unit of effort.
