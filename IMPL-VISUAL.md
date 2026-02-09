# Implementation Plan: RTK IV Visual Overhaul

This document provides step-by-step implementation instructions for each phase identified in VISUAL-GAP.md. Each task specifies exactly which files to modify, what CSS/JSX to change, and the expected visual result.

---

## Phase 1: Visual Foundation

### 1.1 — Brocade Background Pattern

**Goal**: Replace all dark green stripe backgrounds with an authentic-looking brocade/tapestry tile pattern resembling the green dragon medallions from RTK IV.

**Approach**: Generate a procedural SVG tile pattern using CSS. The original uses a repeating grid of circular medallions (dragon/phoenix motifs) in muted gold-green on a dark background.

**Files to modify**:
- `src/App.css` — replace `.scenario-screen`, `.faction-select-screen`, `.settings-screen`, and `.title-screen` backgrounds

**Implementation**:

1. Create `public/brocade-tile.svg` — a 100x100 SVG tile containing:
   - Dark background (#0a1a0a)
   - A centered circular medallion border (muted gold-green stroke, ~80px diameter)
   - An abstract dragon/phoenix motif inside (simplified geometric curves in #3a5a2a)
   - Corner ornaments connecting adjacent tiles

2. In `src/App.css`, define a shared class:
   ```css
   .brocade-bg {
     background-color: #0a1a0a;
     background-image: url('/brocade-tile.svg');
     background-repeat: repeat;
     background-size: 120px 120px;
   }
   ```

3. Replace background rules for these classes:
   - `.title-screen` — remove `linear-gradient`, add `.brocade-bg`
   - `.scenario-screen` — remove all three gradient layers, add `.brocade-bg`
   - `.faction-select-screen` — same
   - `.settings-screen` — same

4. Update corresponding TSX files to add `brocade-bg` class:
   - `TitleScreen.tsx` — `<div className="title-screen brocade-bg">`
   - `ScenarioSelect.tsx` — the container div
   - `FactionSelect.tsx` — `.faction-select-screen`
   - `GameSettingsScreen.tsx` — `.settings-screen`

**Verification**: All four menu screens should show the same tiled medallion pattern. The pattern should tile seamlessly.

---

### 1.2 — Ornamental Dialog Frame

**Goal**: Create a reusable multi-layered border component matching RTK IV's gold outer frame / blue interior style.

**Approach**: A CSS-only ornamental border using layered box-shadows, gradients, and border-image. No images needed.

**Files to modify**:
- `src/App.css` — add `.rtk-frame` class
- `src/components/ScenarioSelect.tsx` — apply to `.scenario-box`
- `src/components/GameSettingsScreen.tsx` — apply to `.settings-box`
- `src/components/TitleScreen.tsx` — apply to the new menu box

**Implementation**:

1. Add `.rtk-frame` to `App.css`:
   ```css
   .rtk-frame {
     /* Inner blue background */
     background: linear-gradient(135deg, #1a2444 0%, #1e2d50 50%, #162040 100%);
     /* Multi-layer ornamental border */
     border: 3px solid #c4a44a;
     outline: 3px solid #8b6914;
     outline-offset: 3px;
     box-shadow:
       inset 0 0 0 2px #1a2444,
       inset 0 0 0 4px #6b5520,
       0 0 0 7px #0a1a0a,
       0 8px 32px rgba(0, 0, 0, 0.6);
     border-radius: 2px;
     padding: 1.5rem 2rem;
   }
   ```

2. Replace `.scenario-box` styles:
   - Remove `background`, `border`, `border-radius`, `box-shadow`
   - Add `@extend`-like approach: apply `.rtk-frame` class in HTML

3. Similarly for `.settings-box`.

4. In each TSX, add `rtk-frame` class:
   - `<div className="scenario-box rtk-frame">`
   - `<div className="settings-box rtk-frame">`

**Verification**: Scenario select and settings dialogs should have a gold outer frame, darker gold inner border, and blue-tinted interior.

---

### 1.3 — Title Screen Rework

**Goal**: Replace the large centered title+subtitle layout with a simple framed menu dialog, matching the original's upper-right dialog with 3 menu items.

**Files to modify**:
- `src/components/TitleScreen.tsx` — complete rewrite of JSX
- `src/App.css` — update `.title-screen`, `.title-content` styles
- `src/store/gameStore.ts` — may need a `loadGame` check for the "載入" option

**Implementation**:

1. Rewrite `TitleScreen.tsx`:
   ```tsx
   export function TitleScreen() {
     const { setPhase, getSaveSlots, loadGame } = useGameStore();
     const hasSaves = getSaveSlots().some(s => s !== null);

     return (
       <div className="title-screen brocade-bg">
         <div className="title-menu rtk-frame">
           <button className="title-menu-item" onClick={() => setPhase('scenario')}>
             開始新遊戲
           </button>
           <button
             className="title-menu-item"
             disabled={!hasSaves}
             onClick={() => { /* open save slot picker or load most recent */ }}
           >
             載入進度存檔
           </button>
           <button className="title-menu-item" onClick={() => setPhase('rulerCreation')}>
             登錄武將數值
           </button>
         </div>
       </div>
     );
   }
   ```

2. Update CSS:
   ```css
   .title-screen {
     min-height: 100vh;
     display: flex;
     /* Position menu in upper-right quadrant like original */
     justify-content: center;
     align-items: flex-start;
     padding-top: 10vh;
   }

   .title-menu {
     /* Inherits .rtk-frame */
     min-width: 280px;
   }

   .title-menu-item {
     display: block;
     width: 100%;
     padding: 0.8rem 1.5rem;
     background: transparent;
     border: none;
     color: #e5e7eb;
     font-size: 1.3rem;
     text-align: center;
     cursor: pointer;
     letter-spacing: 0.15em;
   }

   .title-menu-item:hover {
     color: #fbbf24;
     background: rgba(251, 191, 36, 0.1);
   }

   .title-menu-item:disabled {
     color: #4b5563;
     cursor: not-allowed;
   }
   ```

3. Remove old `.title-main`, `.title-sub`, `.title-desc`, `.title-buttons`, `.title-footer` CSS rules (dead code after rewrite).

**Verification**: Title screen shows the brocade background with a centered ornamental-bordered dialog containing 3 vertically stacked Traditional Chinese menu items.

---

## Phase 2: Faction Select & Settings Polish

### 2.1 — Large Portrait Cards

**Goal**: Make faction cards portrait-dominant — the portrait should fill most of the card, with a small name label bar at the bottom, similar to the original's thick-framed portrait grid.

**Files to modify**:
- `src/App.css` — rewrite `.faction-card`, `.faction-cards-grid`, `.faction-portrait` styles
- `src/components/FactionSelect.tsx` — adjust card JSX structure
- `src/components/Portrait.tsx` — may need a new "large" size variant or let it fill its container

**Implementation**:

1. Update `.faction-cards-grid`:
   ```css
   .faction-cards-grid {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     grid-template-rows: repeat(3, 1fr);
     gap: 0.75rem;
     width: 100%;
     height: 100%;
   }
   ```

2. Redesign `.faction-card`:
   ```css
   .faction-card {
     background: #1e293b;
     border: 3px solid #5a7a4a;
     border-radius: 4px;
     cursor: pointer;
     display: flex;
     flex-direction: column;
     overflow: hidden;
     transition: all 0.2s;
   }

   .faction-card:hover {
     border-color: #8baa6a;
   }

   .faction-card.selected {
     border-color: #fbbf24;
     box-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
   }
   ```

3. Portrait section fills most of the card:
   ```css
   .faction-portrait {
     flex: 1;
     min-height: 0;
     display: flex;
     align-items: center;
     justify-content: center;
     overflow: hidden;
   }

   .faction-portrait .portrait {
     width: 100%;
     height: 100%;
     border: none;
     border-radius: 0;
   }
   ```

4. Name label bar at bottom:
   ```css
   .faction-label {
     padding: 0.4rem;
     background: #2a4a2a;
     text-align: center;
     border-top: 2px solid #5a7a4a;
   }

   .faction-label .faction-name {
     font-size: 1rem;
     font-weight: bold;
     color: #e5e7eb;
     letter-spacing: 0.1em;
   }
   ```

5. Update `FactionSelect.tsx` card structure:
   ```tsx
   <div className="faction-card ...">
     <div className="faction-portrait">
       <Portrait portraitId={ruler.portraitId} name={ruler.name} size="large" />
     </div>
     <div className="faction-label">
       <span className="faction-name">{ruler?.name ?? faction.name}</span>
     </div>
   </div>
   ```

6. Remove the color banner `<div className="faction-banner">` — not in the original.

**Verification**: Each card shows a large portrait (ideally filling the card) with a small green-tinted name bar at the bottom. The 3x3 grid should feel more like a portrait gallery.

---

### 2.2 — Settings Dialog Restyle

**Goal**: Apply ornamental frame, blue interior, move buttons to upper-right.

**Files to modify**:
- `src/components/GameSettingsScreen.tsx` — restructure button placement
- `src/App.css` — update `.settings-box` to use `.rtk-frame`, adjust toggle styles

**Implementation**:

1. Already handled by Phase 1.2 — `.settings-box` gets `.rtk-frame` class.

2. Move 決定/中止 from bottom center to the upper-right of the dialog:
   ```tsx
   <div className="settings-box rtk-frame">
     <div className="settings-top-bar">
       <h2 className="settings-title">遊戲設定</h2>
       <div className="settings-buttons">
         <button className="btn btn-confirm" onClick={confirmSettings}>決定</button>
         <button className="btn btn-abort" onClick={() => setPhase('faction')}>中止</button>
       </div>
     </div>
     {/* rest of settings... */}
   </div>
   ```

3. CSS:
   ```css
   .settings-top-bar {
     display: flex;
     justify-content: space-between;
     align-items: center;
     margin-bottom: 1.5rem;
     padding-bottom: 0.75rem;
     border-bottom: 1px solid #4a4a6a;
   }

   .settings-title {
     font-size: 1.3rem;
     color: #fbbf24;
     margin: 0;
   }
   ```

4. Style toggle buttons to use red text on dark background (matching original):
   ```css
   .toggle-option.active {
     background: #2a1a1a;
     color: #cc3333;
     border: 1px solid #663333;
   }
   ```

**Verification**: Settings dialog has the ornamental frame, blue-ish interior. 決定/中止 are in the upper-right. Toggle buttons use red active states.

---

## Phase 3: Main Game Map

### 3.1 — City Banners/Flags

**Goal**: Replace circle markers on the game map with faction banner/flag icons showing the ruler's surname character.

**Files to modify**:
- `src/components/map/GameMap.tsx` — replace `<circle>` with flag SVG group
- `src/App.css` — optional animation classes

**Implementation**:

1. In `GameMap.tsx`, create a `CityFlag` component rendered inside the SVG:
   ```tsx
   function CityFlag({ city, faction, ruler, isSelected, onClick }) {
     const color = faction?.color ?? '#6b7280';
     const surname = ruler?.name?.charAt(0) ?? '';
     const flagWidth = 4;
     const flagHeight = 5;

     return (
       <g onClick={onClick} style={{ cursor: 'pointer' }}>
         {/* Flag pole */}
         <line
           x1={city.x} y1={city.y - 0.5}
           x2={city.x} y2={city.y - flagHeight - 1}
           stroke="#5a4a3a"
           strokeWidth="0.3"
         />
         {/* Flag rectangle */}
         <rect
           x={city.x} y={city.y - flagHeight - 1}
           width={flagWidth} height={flagHeight}
           fill={color}
           stroke={isSelected ? '#fbbf24' : '#2a2a2a'}
           strokeWidth={isSelected ? 0.4 : 0.2}
           rx="0.2"
         />
         {/* Ruler surname on flag */}
         <text
           x={city.x + flagWidth / 2}
           y={city.y - flagHeight / 2 - 0.5}
           textAnchor="middle"
           dominantBaseline="central"
           fill="#fff"
           fontSize="2.5"
           fontWeight="bold"
           style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
         >
           {surname}
         </text>
         {/* City name below */}
         <text
           x={city.x + flagWidth / 2}
           y={city.y + 1.5}
           textAnchor="middle"
           fill="#e5e7eb"
           fontSize="1.5"
           fontWeight={isSelected ? 'bold' : 'normal'}
         >
           {city.name}
         </text>
         {/* Small building/dot at base */}
         <rect
           x={city.x - 1} y={city.y - 1}
           width={2} height={1.5}
           fill="#8b7355"
           stroke="#5a4a3a"
           strokeWidth="0.15"
         />
       </g>
     );
   }
   ```

2. In the main SVG, replace the `<circle>` + `<text>` groups with `<CityFlag>`:
   ```tsx
   {cities.map(city => {
     const faction = city.factionId !== null ? factions.find(f => f.id === city.factionId) : null;
     const ruler = faction ? officers.find(o => o.id === faction.rulerId) : null;
     return (
       <CityFlag
         key={city.id}
         city={city}
         faction={faction}
         ruler={ruler}
         isSelected={city.id === selectedCityId}
         onClick={() => selectCity(city.id)}
       />
     );
   })}
   ```

3. Update `GameMap` to also consume `officers` from the store:
   ```tsx
   const { cities, factions, officers, selectedCityId, selectCity } = useGameStore();
   ```

4. For empty/neutral cities (no faction), render a simpler marker — a small gray square without a flag.

**Verification**: Each faction-owned city shows a colored banner with the ruler's surname (曹, 劉, 孫, etc.). Neutral cities show small gray squares. The selected city's flag has a gold border.

---

### 3.2 — Improved Terrain Map

**Goal**: Make the terrain map more vivid — increase its visibility and potentially enhance the SVG.

**Files to modify**:
- `src/components/map/GameMap.tsx` — increase terrain opacity, adjust colors
- Potentially `public/terrain-map.svg` — enhance if possible

**Implementation**:

1. In `GameMap.tsx`, increase terrain opacity from 0.4 to 0.7-0.8:
   ```tsx
   <image href="/terrain-map.svg" x="0" y="0" width="100" height="85" opacity="0.75" />
   ```

2. Add a water/sea background behind the terrain:
   ```tsx
   <rect x="0" y="0" width="100" height="85" fill="#1a3a5a" />
   <image href="/terrain-map.svg" ... />
   ```

3. Reduce the visibility of adjacency lines — make them thinner or remove them (the original doesn't show explicit connections):
   ```tsx
   stroke="#3a4a3a" strokeWidth="0.15" opacity={0.3}
   ```
   Or remove adjacency lines entirely, since cities are connected contextually.

4. Change the map container background from `#0f172a` to a sea-blue:
   ```css
   .game-left {
     background: #1a3a5a;
   }
   ```

**Verification**: Map should appear more colorful with visible terrain. The background should be ocean-blue. Lines should be subtle or absent.

---

### 3.3 — Minimap in Gameplay

**Goal**: Add a small overview minimap to the upper-right corner of the game map during gameplay.

**Files to modify**:
- `src/components/GameScreen.tsx` — add minimap component to `.game-left`
- `src/components/map/GameMinimap.tsx` — **new file** (small variant of SelectionMinimap)
- `src/App.css` — position the minimap

**Implementation**:

1. Create `src/components/map/GameMinimap.tsx`:
   ```tsx
   export function GameMinimap() {
     const { cities, factions, selectedCityId, selectCity } = useGameStore();

     return (
       <div className="game-minimap">
         <svg viewBox="0 0 100 85">
           <image href="/terrain-map.svg" width="100" height="85" opacity="0.5" />
           {cities.map(city => {
             const color = getFactionColor(city.factionId, factions);
             return (
               <circle
                 key={city.id}
                 cx={city.x} cy={city.y}
                 r={city.id === selectedCityId ? 2 : 1}
                 fill={color}
                 stroke={city.id === selectedCityId ? '#fbbf24' : 'none'}
                 strokeWidth="0.5"
                 onClick={() => selectCity(city.id)}
                 style={{ cursor: 'pointer' }}
               />
             );
           })}
         </svg>
       </div>
     );
   }
   ```

2. Style it as a small overlay:
   ```css
   .game-minimap {
     position: absolute;
     top: 12px;
     right: 12px;
     width: 180px;
     height: 150px;
     border: 2px solid #8b7355;
     border-radius: 4px;
     background: #0a1a0a;
     z-index: 10;
     opacity: 0.9;
   }

   .game-minimap svg {
     width: 100%;
     height: 100%;
   }
   ```

3. In `GameScreen.tsx`, add to `.game-left`:
   ```tsx
   <div className="game-left" style={{ position: 'relative' }}>
     <GameMap />
     <GameMinimap />
     <MapToolbar onShowStatus={...} />
   </div>
   ```

**Verification**: A small bordered minimap appears in the upper-right of the map area, showing all cities as colored dots. Clicking a city on the minimap selects it.

---

### 3.4 — Command Grid

**Goal**: Redesign the command menu from a sidebar text list to a compact icon/label grid in the upper-right area (below the minimap), matching the original's 2-row button grid.

**Files to modify**:
- `src/components/menu/CommandMenu.tsx` — restructure the category buttons
- `src/App.css` — update `.command-categories` layout

**Implementation**:

1. Redesign `.command-categories` as a compact grid:
   ```css
   .command-categories {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     grid-template-rows: repeat(2, 1fr);
     gap: 2px;
   }

   .btn-cmd {
     padding: 0.3rem 0.4rem;
     font-size: 0.8rem;
     border-radius: 2px;
     text-align: center;
     background: #2a3a2a;
     border: 1px solid #5a7a4a;
     color: #c8d8c0;
   }

   .btn-cmd:hover {
     background: #3a4a3a;
     color: #fbbf24;
   }

   .btn-cmd.active {
     background: #5a3a1a;
     border-color: #c4a44a;
     color: #fbbf24;
   }
   ```

2. The 6 categories map to a 3×2 grid:
   ```
   [ 內政 ] [ 軍事 ] [ 人事 ]
   [ 外交 ] [ 謀略 ] [ 結束 ]
   ```

3. The sub-actions remain in the sidebar as a popup/dropdown when a category is selected.

**Verification**: Command categories appear as a compact 3×2 grid of green-bordered buttons at the top of the right panel.

---

## Phase 4: Info Panel & Overlays

### 4.1 — City Info as Map Overlay

**Goal**: When clicking a city, show the info panel as a semi-transparent overlay on the right side of the map, rather than a permanent sidebar.

**Files to modify**:
- `src/components/GameScreen.tsx` — restructure layout
- `src/components/CityPanel.tsx` — style as an overlay
- `src/App.css` — overlay positioning

**Implementation**:

1. Move `CityPanel` from `.game-right` into `.game-left` as a positioned overlay:
   ```tsx
   <div className="game-left" style={{ position: 'relative' }}>
     <GameMap />
     <GameMinimap />
     {selectedCityId && <CityPanel />}
     <MapToolbar ... />
   </div>
   <div className="game-right">
     <CommandMenu />
     <GameLog />
   </div>
   ```

2. Style CityPanel as an overlay:
   ```css
   .city-panel-overlay {
     position: absolute;
     top: 0;
     right: 0;
     width: 340px;
     height: 100%;
     background: rgba(26, 26, 46, 0.92);
     border-left: 2px solid #8b7355;
     overflow-y: auto;
     z-index: 20;
     backdrop-filter: blur(4px);
   }
   ```

3. Add a close button (×) in the upper-right of the panel, or close on clicking the map background.

4. Narrow the `.game-right` sidebar since it no longer contains the city panel — just commands + log:
   ```css
   .game-right {
     width: 260px;
   }
   ```

**Verification**: Map fills more of the screen. Clicking a city opens a translucent panel overlaying the right side of the map. The sidebar only shows commands and log. Clicking the map or pressing Escape closes the panel.

---

### 4.2 — Officer Stat Table Overlay

**Goal**: When a command requires officer selection (e.g., 徵兵, 開發), show a proper stat table overlaying the left side of the map.

**Files to modify**:
- `src/components/OfficerSelectionOverlay.tsx` — **new file**
- `src/components/menu/CommandMenu.tsx` — trigger the overlay for relevant commands
- `src/App.css` — table styling

**Implementation**:

1. Create `OfficerSelectionOverlay.tsx`:
   ```tsx
   interface Props {
     officers: Officer[];
     title: string;
     onSelect: (officerId: number) => void;
     onClose: () => void;
   }

   export function OfficerSelectionOverlay({ officers, title, onSelect, onClose }: Props) {
     return (
       <div className="officer-overlay">
         <div className="officer-overlay-header">
           <span>{title}</span>
           <button className="btn btn-cmd" onClick={onClose}>結束</button>
         </div>
         <table className="officer-table">
           <thead>
             <tr>
               <th>姓名</th><th>統</th><th>武</th><th>智</th><th>政</th><th>魅</th>
             </tr>
           </thead>
           <tbody>
             {officers.map(o => (
               <tr key={o.id} onClick={() => onSelect(o.id)} style={{ cursor: 'pointer' }}>
                 <td>{o.name}</td>
                 <td>{o.leadership}</td>
                 <td>{o.war}</td>
                 <td>{o.intelligence}</td>
                 <td>{o.politics}</td>
                 <td>{o.charisma}</td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     );
   }
   ```

2. Style:
   ```css
   .officer-overlay {
     position: absolute;
     top: 20px;
     left: 20px;
     background: rgba(10, 10, 30, 0.9);
     border: 2px solid #8b7355;
     border-radius: 4px;
     padding: 0.75rem;
     z-index: 30;
     min-width: 320px;
     backdrop-filter: blur(4px);
   }

   .officer-table {
     width: 100%;
     border-collapse: collapse;
     font-size: 0.85rem;
   }

   .officer-table th {
     color: #fbbf24;
     font-weight: bold;
     text-align: center;
     padding: 0.3rem 0.5rem;
     border-bottom: 1px solid #5a5a7a;
   }

   .officer-table td {
     text-align: center;
     padding: 0.3rem 0.5rem;
     border-bottom: 1px solid #2a2a3a;
     color: #e5e7eb;
   }

   .officer-table tr:hover td {
     background: rgba(251, 191, 36, 0.1);
     color: #fbbf24;
   }
   ```

3. In `CommandMenu.tsx`, for commands like 徵兵, instead of directly calling `draftTroops(city.id, 1000)`, open the overlay first to let the player pick which officer executes the command.

**Verification**: Clicking a command like 徵兵 shows a stat table overlay on the left side of the map. Columns are aligned. Clicking an officer row selects them and executes the command.

---

### 4.3 — City Illustration Enhancement

**Goal**: Improve the procedural city SVG to be more detailed with a birds-eye perspective.

**Files to modify**:
- `src/components/CityIllustration.tsx` — enhance the drawing

**Implementation**:

1. Increase the viewBox size for more detail: `0 0 400 200`
2. Add:
   - Gradient sky with clouds
   - Textured ground (multiple green shades)
   - More detailed walls: crenellations (battlement teeth) on top
   - Multiple gate layers (outer gate, inner courtyard)
   - More building types (pagodas, residences, barracks) based on city stats
   - Road/path leading to the gate
   - River if the city is near water (check adjacency or add a flag)
   - More trees (various sizes, scattered)
3. Scale detail level by city prosperity:
   - High commerce: many market buildings with banners
   - High agriculture: layered rice paddies
   - High defense: thick walls with multiple towers
   - High troops: visible barracks/training grounds

**Verification**: The city illustration should look richer and more like a simplified bird's-eye painting. Each city's illustration should visually differ based on its stats.

---

## Phase 5: Polish

### 5.1 — Button/Tab Styling

**Goal**: Restyle 決定/中止 buttons as colored tabs matching the original.

**Files to modify**:
- `src/App.css` — update `.btn-confirm`, `.btn-abort`

**Implementation**:
```css
.btn-confirm {
  background: #2a6a3a;
  border: 2px solid #4a9a5a;
  color: #e5ffe5;
  font-weight: bold;
  padding: 0.4rem 1.2rem;
  border-radius: 2px;
}

.btn-abort {
  background: #6a2a2a;
  border: 2px solid #9a4a4a;
  color: #ffe5e5;
  font-weight: bold;
  padding: 0.4rem 1.2rem;
  border-radius: 2px;
}
```

**Verification**: 決定 is distinctly green, 中止 is distinctly red, matching the original's color-coded tabs.

---

### 5.2 — Serif CJK Font

**Goal**: Use a serif font for Traditional Chinese text in menus and headings.

**Files to modify**:
- `src/index.css` or `src/App.css` — font-family

**Implementation**:
```css
body {
  font-family: 'Noto Serif TC', 'PMingLiU', '新細明體', serif;
}

/* Or selectively for headings/menus */
.rtk-frame, .title-menu-item, .btn-cmd, .settings-label, .faction-name {
  font-family: 'Noto Serif TC', 'PMingLiU', serif;
}
```

Add Google Fonts import in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&display=swap" rel="stylesheet">
```

**Verification**: Menu text and headings render in a serif font, giving a classical feel.

---

### 5.3 — Color Palette Tuning

**Goal**: Shift the overall palette warmer (from navy/slate toward the original's browns, greens, golds).

**Files to modify**:
- `src/App.css` — global adjustments

**Key shifts**:
| Current | Target | Where |
|---------|--------|-------|
| `#0f172a` (dark navy) | `#0a1a0a` (dark green-black) | Map bg, inputs |
| `#1e293b` (slate) | `#1a2a1a` (dark green) | Sidebar, cards |
| `#334155` (gray border) | `#3a4a3a` (green-gray border) | All borders |
| `#1a1a2e` (dark indigo) | Use `.rtk-frame` blue instead | Dialog interiors |
| `#92400e` (amber-brown) | `#5a3a1a` (darker brown) | Active buttons |

Apply gradually; test each change to ensure readability.

---

### 5.4 — Date Badge (GameHeader Restyle)

**Goal**: Replace the full-width header bar with a small framed badge in the upper-left of the map.

**Files to modify**:
- `src/components/GameHeader.tsx` — simplify to a compact badge
- `src/components/GameScreen.tsx` — move header into the map area
- `src/App.css` — position as overlay

**Implementation**:

1. Reduce GameHeader to just the date + faction name:
   ```tsx
   <div className="date-badge rtk-frame">
     <span className="badge-date">{year}年 {month}月</span>
     <span className="badge-faction" style={{ color: playerFaction?.color }}>
       {playerFaction?.name}
     </span>
   </div>
   ```

2. Position as overlay:
   ```css
   .date-badge {
     position: absolute;
     top: 12px;
     left: 12px;
     padding: 0.5rem 1rem;
     z-index: 10;
     font-size: 0.9rem;
   }
   ```

3. Move save/load/info buttons into the MapToolbar or the command sidebar.

4. Move the resource summary (城/將/兵/金/糧) into the sidebar header.

**Verification**: A small ornamental-framed badge shows the date and faction in the upper-left of the map. No full-width header bar.

---

## Implementation Order & Dependencies

```
Phase 1.1 (Brocade BG) ─────────────────────────┐
Phase 1.2 (Ornamental Frame) ───────────┐        │
Phase 1.3 (Title Screen) ─── depends on 1.1, 1.2 ┘
                                        │
Phase 2.1 (Portrait Cards) ─────────────┤
Phase 2.2 (Settings Restyle) ── depends on 1.2
                                        │
Phase 3.1 (City Flags) ────────────────independent
Phase 3.2 (Terrain Map) ──────────────independent
Phase 3.3 (Gameplay Minimap) ─────────independent
Phase 3.4 (Command Grid) ─────────────independent
                                        │
Phase 4.1 (City Info Overlay) ─────────independent
Phase 4.2 (Officer Table Overlay) ─────independent
Phase 4.3 (City Illustration) ────────independent
                                        │
Phase 5.1 (Button Tabs) ──────────────independent
Phase 5.2 (Serif Font) ───────────────independent
Phase 5.3 (Color Palette) ─────── do last (affects everything)
Phase 5.4 (Date Badge) ─── depends on 4.1 (layout change)
```

Recommended order within each phase: Start with 1.1 → 1.2 → 1.3, then 3.1 → 3.2 → 3.3 (map is highest impact), then 2.1, then 4.1 → 4.2, then 5.x polish.

---

## New Files Summary

| File | Purpose |
|------|---------|
| `public/brocade-tile.svg` | Tiled medallion background pattern |
| `src/components/map/GameMinimap.tsx` | Gameplay minimap overlay |
| `src/components/OfficerSelectionOverlay.tsx` | Officer stat table overlay for commands |

## Estimated Line Changes

| Phase | New Lines | Modified Lines | Files Touched |
|-------|-----------|---------------|---------------|
| 1 (Foundation) | ~80 CSS, ~30 TSX | ~60 CSS removed/changed | 5 files |
| 2 (Select/Settings) | ~40 CSS | ~30 CSS, ~20 TSX | 4 files |
| 3 (Map) | ~150 TSX (minimap + flags) | ~80 TSX, ~40 CSS | 5 files |
| 4 (Overlays) | ~120 TSX (new components) | ~40 TSX (layout) | 5 files |
| 5 (Polish) | ~30 CSS | ~60 CSS, ~30 TSX | 4 files |
| **Total** | **~450** | **~360** | **~12 unique files** |
