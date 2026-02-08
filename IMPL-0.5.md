# Implementation Plan: Phase 0.5 -- Game Setup Flow & UI Foundation

> **Depends on:** Phase 0 (COMPLETED)
> **Estimated effort:** ~2 weeks
> **Priority:** Critical

---

## 0.5.1 Scenario Selection Screen Overhaul

### Current State
`src/components/ScenarioSelect.tsx:7-26` renders a plain vertical list of `<button>` elements with `.scenario-year`, `.scenario-name`, `.scenario-desc` spans. Styled via `src/App.css:109-139`. Only 1 scenario exists in `src/data/scenarios.ts:171`.

### Implementation Steps

#### Step 1: Add scenario metadata to Scenario type
**File:** `src/types/index.ts:118-127`

Add `subtitle` field to the `Scenario` interface:
```typescript
export interface Scenario {
  id: number;
  name: string;
  subtitle: string;   // NEW: e.g., "火燒洛陽"
  year: number;
  description: string;
  factions: Faction[];
  cities: City[];
  officers: Officer[];
}
```

Update `src/data/scenarios.ts:59-63`:
```typescript
const scenario190: Scenario = {
  id: 1,
  name: '董卓廢少帝',
  subtitle: '火燒洛陽',
  year: 189,   // Note: RTK IV uses 189, not 190
  description: '董卓廢少帝，立獻帝，遷都長安。各路諸侯起兵討伐，天下大亂。',
  // ...
};
```

#### Step 2: Redesign ScenarioSelect component (scenario phase)
**File:** `src/components/ScenarioSelect.tsx`

Replace the scenario list (lines 8-26) with RTK IV style:
```tsx
// New layout:
// - Dark green patterned background (CSS class .scenario-screen)
// - Centered modal box with title "請選擇劇本。" and 中止 button
// - Each row: "西元 {year}年　{name}・{subtitle}"
// - Rows are clickable, highlight on hover
```

Key changes:
- Replace `<div className="screen-center">` with `<div className="scenario-screen">`
- Replace button list with styled table/list rows
- Each row formatted as: `西元 {sc.year}年　{sc.name}・{sc.subtitle}`
- Add `中止` button top-right of the list box

#### Step 3: Add CSS for scenario screen
**File:** `src/App.css`

Add new styles after line 139:
```css
.scenario-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a2a1a;  /* dark green base */
  background-image: /* repeating pattern */;
}
.scenario-box {
  background: #1a1a2e;
  border: 2px solid #8b7355;
  padding: 1.5rem 2rem;
  min-width: 500px;
}
.scenario-row {
  padding: 0.6rem 1rem;
  color: #e5e7eb;
  cursor: pointer;
  border-bottom: 1px solid #333;
  font-size: 1rem;
}
.scenario-row:hover {
  background: #2a3a4a;
  color: #fbbf24;
}
.scenario-row .year { color: #fbbf24; }
```

#### Step 4: Tests
- Verify scenario selection still transitions to `phase='faction'`
- Verify `中止` returns to title screen
- Visual test: RTK IV-style appearance

---

## 0.5.2 Faction Selection Screen Overhaul

### Current State
`src/components/ScenarioSelect.tsx:29-48` renders a CSS grid (`.faction-grid`, 140px min columns) of buttons, each showing a colored circle + faction name. No minimap, no portraits.

### Implementation Steps

#### Step 1: Create FactionSelect component (extract from ScenarioSelect)
**New file:** `src/components/FactionSelect.tsx`

Extract lines 29-48 from `ScenarioSelect.tsx` into a dedicated component. This reduces complexity and allows independent development.

Update `src/App.tsx:38` to handle the new component:
```tsx
{phase === 'faction' && <FactionSelect />}
```

Keep `ScenarioSelect` for scenario phase only.

#### Step 2: Create SelectionMinimap component
**New file:** `src/components/map/SelectionMinimap.tsx`

A simplified version of `GameMap` that:
- Uses `public/terrain-map.svg` as background image
- Overlays city markers colored by faction (from scenario data)
- Highlights cities of the currently hovered faction
- No interactivity beyond hover highlighting
- ViewBox matches terrain-map.svg: `0 0 1000 850`

```tsx
export function SelectionMinimap({ 
  cities, factions, highlightFactionId 
}: Props) {
  return (
    <div className="selection-minimap">
      <svg viewBox="0 0 1000 850">
        <image href="/terrain-map.svg" width="1000" height="850" />
        {cities.map(city => (
          <circle 
            key={city.id}
            cx={city.x * 10} cy={city.y * 10} r={8}
            fill={getFactionColor(city.factionId, factions)}
            opacity={city.factionId === highlightFactionId ? 1 : 0.4}
          />
        ))}
      </svg>
    </div>
  );
}
```

#### Step 3: Build FactionSelect layout
**File:** `src/components/FactionSelect.tsx`

Layout (matching RTK IV screenshots):
```
┌─────────────────────────────────────────────────┐
│ {scenario.name}  選擇君主 {n}人  決定 下頁 中止 │ (header bar)
├──────────────────┬──────────────────────────────┤
│                  │  [Portrait] [Portrait] [Port]│
│    Minimap       │  [Portrait] [Portrait] [Port]│ (3x3 grid)
│                  │  [Portrait] [Portrait] [Port]│
│                  │                              │
└──────────────────┴──────────────────────────────┘
```

- Left 40%: `<SelectionMinimap />`
- Right 60%: 3x3 grid of faction cards
- Each card: portrait placeholder (colored rectangle with ruler name until portraits exist), faction-colored banner
- `下頁`/`上頁` pagination if >9 factions (slice factions array by page)
- `決定` confirms selection, `中止` goes back to scenario

#### Step 4: Add faction selection state
**File:** `src/store/gameStore.ts`

Add to state:
```typescript
selectedFactionId: number | null;  // for pre-confirm selection
```

Player clicks a faction card to select (highlighted border), then clicks `決定` to confirm.

#### Step 5: CSS for faction selection
**File:** `src/App.css`

```css
.faction-select-screen { /* same green background as scenario */ }
.faction-select-layout { display: flex; gap: 1rem; }
.faction-card {
  border: 2px solid #555;
  cursor: pointer;
  text-align: center;
  padding: 0.5rem;
}
.faction-card.selected { border-color: #fbbf24; }
.faction-card .ruler-portrait {
  width: 80px; height: 100px;
  background: #333; /* placeholder until portraits exist */
}
```

---

## 0.5.3 Pre-Game Settings Screen

### Current State
No settings screen exists. `selectFaction()` in `src/store/gameStore.ts` immediately transitions to `playing` phase.

### Implementation Steps

#### Step 1: Add 'settings' phase
**File:** `src/types/index.ts:130-138`

Add new phase:
```typescript
export type GamePhase =
  | 'title' | 'scenario' | 'faction'
  | 'settings'   // NEW
  | 'playing' | 'battle' | 'duel' | 'victory' | 'defeat';
```

#### Step 2: Add game settings to store state
**File:** `src/store/gameStore.ts`

Add to `GameState` interface (around line 20):
```typescript
gameSettings: {
  battleMode: 'watch' | 'skip';       // 戰爭方式
  gameMode: 'historical' | 'fictional'; // 遊戲方式
  customOfficers: 'all' | 'choose';    // 登錄武將出場
  intelligenceSensitivity: 1 | 2 | 3 | 4 | 5; // 清信靈敏度
};
```

Default values:
```typescript
gameSettings: {
  battleMode: 'watch',
  gameMode: 'historical',
  customOfficers: 'all',
  intelligenceSensitivity: 3,
},
```

Add action:
```typescript
setGameSettings: (settings: Partial<GameState['gameSettings']>) => void;
```

#### Step 3: Modify selectFaction to go to settings instead of playing
**File:** `src/store/gameStore.ts`

Change `selectFaction` (around line 110):
```typescript
// Before:
set({ phase: 'playing' });
// After:
set({ phase: 'settings' });
```

Add new action `confirmSettings` that transitions from `settings` to `playing`.

#### Step 4: Create GameSettingsScreen component
**New file:** `src/components/GameSettingsScreen.tsx`

```tsx
export function GameSettingsScreen() {
  const { gameSettings, setGameSettings, confirmSettings, setPhase, scenario, playerFaction } = useGameStore();
  
  return (
    <div className="settings-screen">
      <div className="settings-box">
        {/* Read-only summary */}
        <div className="settings-row">
          <span>選擇劇本</span>
          <span>{scenario?.name}・{scenario?.subtitle}</span>
        </div>
        <div className="settings-row">
          <span>選擇君主</span>
          <span>{playerFaction?.name}</span>
        </div>
        
        {/* Configurable options */}
        <div className="settings-row">
          <span>戰爭方式</span>
          <ToggleButton 
            options={['看', '不看']} 
            value={gameSettings.battleMode === 'watch' ? '看' : '不看'}
            onChange={v => setGameSettings({ battleMode: v === '看' ? 'watch' : 'skip' })}
          />
        </div>
        {/* ... similar for gameMode, customOfficers, intelligenceSensitivity */}
        
        <div className="settings-buttons">
          <button onClick={confirmSettings}>決定</button>
          <button onClick={() => setPhase('faction')}>中止</button>
        </div>
      </div>
    </div>
  );
}
```

#### Step 5: Wire into App.tsx
**File:** `src/App.tsx`

Add import and routing:
```tsx
import { GameSettingsScreen } from './components/GameSettingsScreen';
// ...
{phase === 'settings' && <GameSettingsScreen />}
```

#### Step 6: CSS
Same green-patterned background as scenario/faction screens. Centered settings box with RTK IV button styles (toggle buttons with active highlight).

---

## 0.5.4 Officer Portrait System

### Current State
No portrait images or portrait-related code exists anywhere. Officers have `id` and `name` but no `portraitId`. The `Officer` type in `src/types/index.ts:23-51` has no portrait field.

### Implementation Steps

#### Step 1: Add portraitId to Officer type
**File:** `src/types/index.ts:23`

```typescript
export interface Officer {
  id: number;
  name: string;
  portraitId: number;  // NEW: maps to portrait image filename
  // ... rest unchanged
}
```

#### Step 2: Add portraitId to base officer data
**File:** `src/data/officers.ts`

Update `BaseOfficer` type (line 10) to include `portraitId`:
```typescript
type BaseOfficer = Omit<Officer, 'factionId' | 'cityId' | 'stamina' | 'loyalty' | 'isGovernor'>;
```

Add `portraitId` to each officer entry. Convention: `portraitId` matches officer `id` by default.
```typescript
{ id: 1, name: '劉備', portraitId: 1, leadership: 78, ... },
```

#### Step 3: Create portrait placeholder assets
**Directory:** `public/portraits/`

Create placeholder portrait images (128x160 px, PNG or WebP):
- Generate programmatic placeholders: colored rectangles with officer name
- Or use AI-generated portraits (if available)
- Naming convention: `{portraitId}.png` (e.g., `1.png`, `20.png`)

For initial implementation, create a script or utility to generate colored placeholder images with the officer's name.

#### Step 4: Create Portrait component
**New file:** `src/components/Portrait.tsx`

```tsx
interface PortraitProps {
  portraitId: number;
  name: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Portrait({ portraitId, name, size = 'medium', className }: PortraitProps) {
  const sizeMap = { small: 48, medium: 80, large: 128 };
  const px = sizeMap[size];
  
  return (
    <div className={`portrait portrait-${size} ${className ?? ''}`}>
      <img
        src={`/portraits/${portraitId}.png`}
        alt={name}
        width={px}
        height={px * 1.25}
        onError={(e) => {
          // Fallback: hide image, show name placeholder
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="portrait-fallback">{name[0]}</div>
    </div>
  );
}
```

#### Step 5: CSS for portraits
**File:** `src/App.css`

```css
.portrait {
  position: relative;
  overflow: hidden;
  border: 1px solid #555;
  background: #2a2a3a;
}
.portrait img { display: block; object-fit: cover; }
.portrait-fallback {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; color: #666;
}
.portrait img:not([style*="display: none"]) + .portrait-fallback { display: none; }
.portrait-small { width: 48px; height: 60px; }
.portrait-medium { width: 80px; height: 100px; }
.portrait-large { width: 128px; height: 160px; }
```

#### Step 6: Integrate portraits into existing components

**CityPanel** (`src/components/CityPanel.tsx`):
- Add `<Portrait>` next to governor name in officer list (lines 62-78)
- Show medium portrait for governor, small for other officers

**FactionSelect** (new `src/components/FactionSelect.tsx`):
- Each faction card shows ruler portrait using `<Portrait portraitId={ruler.portraitId} />`

#### Step 7: Tests
- Verify `Portrait` renders with valid and invalid portraitId
- Verify fallback displays when image fails to load
- Verify CityPanel shows portraits alongside officer names

---

## 0.5.5 City Illustration System

### Current State
No city illustrations exist. `CityPanel` (`src/components/CityPanel.tsx`) shows only text-based city stats.

### Implementation Steps

#### Step 1: Create CityIllustration component
**New file:** `src/components/CityIllustration.tsx`

A procedural SVG illustration that renders a city scene based on city attributes:

```tsx
interface CityIllustrationProps {
  city: City;
}

export function CityIllustration({ city }: CityIllustrationProps) {
  // Calculate visual elements based on city stats
  const wallHeight = Math.min(city.defense / 100 * 60, 60);  // defense -> wall height
  const numMarketBuildings = Math.floor(city.commerce / 200); // commerce -> market count
  const farmRows = Math.floor(city.agriculture / 200);        // agriculture -> farm rows
  
  return (
    <svg viewBox="0 0 300 150" className="city-illustration">
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#87ceeb" />
          <stop offset="100%" stopColor="#e0f0ff" />
        </linearGradient>
      </defs>
      <rect width="300" height="80" fill="url(#sky)" />
      
      {/* Ground */}
      <rect y="80" width="300" height="70" fill="#5a8a4a" />
      
      {/* City walls (height based on defense) */}
      <rect x="80" y={80 - wallHeight} width="140" height={wallHeight} fill="#8B7355" stroke="#6b5540" />
      
      {/* Gate */}
      <rect x="140" y={80 - 20} width="20" height="20" fill="#4a3520" />
      
      {/* Buildings inside walls (based on population) */}
      {Array.from({ length: Math.min(Math.floor(city.population / 30000), 5) }).map((_, i) => (
        <rect key={`bld-${i}`} x={90 + i * 25} y={80 - wallHeight + 5} width={18} height={wallHeight - 10} fill="#c8a882" />
      ))}
      
      {/* Farmland (based on agriculture) */}
      {Array.from({ length: farmRows }).map((_, i) => (
        <rect key={`farm-${i}`} x="10" y={90 + i * 12} width="60" height="8" fill="#6b9a55" stroke="#4d7d42" rx="1" />
      ))}
      
      {/* Market stalls (based on commerce) */}
      {Array.from({ length: numMarketBuildings }).map((_, i) => (
        <rect key={`mkt-${i}`} x={230 + (i % 2) * 25} y={85 + Math.floor(i / 2) * 15} width="20" height="10" fill="#c8a96e" />
      ))}
    </svg>
  );
}
```

#### Step 2: Integrate into CityPanel
**File:** `src/components/CityPanel.tsx`

Insert `<CityIllustration city={city} />` after the city name heading (line 32), before city stats:
```tsx
<h3 className="city-name" ...>{city.name}...</h3>
<CityIllustration city={city} />  {/* NEW */}
<div className="city-stats">...</div>
```

#### Step 3: CSS
```css
.city-illustration {
  width: 100%;
  height: 120px;
  border: 1px solid #333;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
```

#### Step 4: Tests
- Verify illustration renders different visuals for cities with different stats
- Verify high-defense city shows taller walls
- Verify high-commerce city shows more market stalls

---

## File Change Summary

| Action | File | Description |
|--------|------|-------------|
| Modify | `src/types/index.ts` | Add `subtitle` to Scenario, `portraitId` to Officer, `'settings'` to GamePhase |
| Modify | `src/data/officers.ts` | Add `portraitId` to all officer entries |
| Modify | `src/data/scenarios.ts` | Add `subtitle` field, update year to 189 |
| Modify | `src/store/gameStore.ts` | Add `gameSettings`, `setGameSettings`, `confirmSettings`, `selectedFactionId` |
| Modify | `src/components/ScenarioSelect.tsx` | Redesign scenario list to RTK IV style |
| Modify | `src/components/CityPanel.tsx` | Add Portrait and CityIllustration integration |
| Modify | `src/App.tsx` | Add routing for `settings` phase, `FactionSelect` |
| Modify | `src/App.css` | Add styles for scenario, faction, settings, portrait, illustration |
| Create | `src/components/FactionSelect.tsx` | New faction selection screen |
| Create | `src/components/GameSettingsScreen.tsx` | New pre-game settings screen |
| Create | `src/components/map/SelectionMinimap.tsx` | Minimap for faction selection |
| Create | `src/components/Portrait.tsx` | Reusable officer portrait component |
| Create | `src/components/CityIllustration.tsx` | Procedural city illustration SVG |
| Create | `public/portraits/` | Portrait image directory (placeholders initially) |

---

## Verification Checklist

- [ ] Scenario selection shows RTK IV styled list with year/name/subtitle
- [ ] Faction selection shows minimap + portrait grid with pagination
- [ ] Pre-game settings screen shows all 4 RTK IV options
- [ ] Settings persist in store and are accessible during gameplay
- [ ] Portrait component renders with fallback for missing images
- [ ] CityIllustration reflects city attributes visually
- [ ] All transitions work: title -> scenario -> faction -> settings -> playing
- [ ] Back navigation works at each step (中止 / 返回)
- [ ] Build passes with `npm run build`
- [ ] No lint errors with `npm run lint`
