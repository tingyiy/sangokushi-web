# ROADMAP.md — Future Enhancements

---

## Internationalization (i18n)

Currently all text is hardcoded in Traditional Chinese (繁體中文). Target: support English and Japanese as additional languages.

### Scope (~1,100 translatable strings)

| Category | Location | Count | Templated? | Difficulty |
|---|---|---|---|---|
| UI Components | 22 `.tsx` files | ~200 | ~40% | Medium |
| Game Store Logs | `gameStore.ts` `addLog()` | ~100 | ~90% | High |
| Battle Store Logs | `battleStore.ts` `addBattleLog()` | ~14 | 100% | Medium |
| CLI Text | `cli/play.ts` | ~150 | ~80% | Medium (low priority) |
| Game Data (names) | `data/*.ts`, `systems/*.ts` | ~580 | ~10% | High (proper nouns) |
| Type Definitions | `types/index.ts` | ~35 | 0% | High (refactor needed) |
| Debug API | `debug/rtk-api.ts` | ~20 | ~70% | Low priority |

### Key Challenges

1. **Template literals with interpolation** — Most log messages use `` `${officer.name} 商業發展 +${bonus}（花費 500 金）` ``. Word order differs across languages; need ICU MessageFormat or i18next interpolation.

2. **Type literals as display values** — `CommandCategory` (`'內政' | '軍事'`...) and `OfficerRank` (`'太守' | '將軍'`...) are used both as type discriminators AND rendered text. Must decouple into English keys + translation lookup.

3. **Proper nouns** — Officer names (曹操), city names (洛陽), skill names (火計), treasure names (方天畫戟) are historical terms with established romanized forms. Decision: translate city names and game terms; offer romanization for officer names (Cao Cao) but keep Chinese as default.

4. **Store logs called outside React** — `gameStore.ts` and `battleStore.ts` are plain Zustand stores used by both browser and CLI. i18next works standalone in Node.js, so `i18next.t()` can be called directly in store actions.

### Recommended Stack

**`react-i18next` + `i18next`** — React `useTranslation()` hook for components, standalone `i18next.t()` for stores and CLI. Supports namespaces, interpolation, plurals.

### File Structure

```
src/i18n/
  index.ts              # i18next init config, language detection
  locales/
    zh-TW/
      ui.json           # UI component strings (~200)
      logs.json         # Store log messages (~114)
      data.json         # Officer names, city names, skills, treasures (~580)
      battle.json       # Battle UI and battle log strings
    en/
      ui.json
      logs.json
      data.json
      battle.json
    ja/
      ...
```

### Implementation Phases

**Phase 1: Foundation (1-2 days)**
- Install `react-i18next` + `i18next`
- Create `src/i18n/index.ts` with config, `zh-TW` as default locale
- Extract current Chinese strings into `zh-TW/*.json` namespace files
- Wire `<I18nextProvider>` in `App.tsx`
- Zero user-visible change — all strings come from `zh-TW` files

**Phase 2: Decouple Type Literals (1 day)**
- Refactor `CommandCategory` from `'內政' | '軍事'` to `'domestic' | 'military' | ...`
- Refactor `OfficerRank` from `'太守' | '將軍'` to `'governor' | 'general' | ...`
- Refactor `RTK4_SKILLS` array to English keys
- Add translation lookup maps; update all store comparisons and component renders
- This is the riskiest step — touches types, stores, and components

**Phase 3: UI Components (2-3 days)**
- Replace hardcoded strings in all 22 `.tsx` files with `t()` calls
- Handle interpolated strings: `t('develop.commerce', { city, bonus, cost })`
- Add language switcher in settings menu
- Bulk of the mechanical work

**Phase 4: Store Logs (1-2 days)**
- Replace all `addLog()` template literals in `gameStore.ts` with `i18next.t()` calls
- Replace all `addBattleLog()` in `battleStore.ts`
- Pass interpolation values as objects instead of embedding in template strings

**Phase 5: Game Data (1-2 days)**
- Create English name tables for officers (450), cities (43), factions, skills (27), treasures (24)
- Decide: translate officer names to romanized (Cao Cao) or keep Chinese with tooltip
- Scenario names, descriptions, historical event text

**Phase 6: CLI (1 day, optional)**
- Extract help text and display strings to translation files
- CLI could default to English, use `--lang zh-TW` to switch

### Example: Before/After

```typescript
// BEFORE (gameStore.ts)
get().addLog(`${city.name}：${executor.name} 商業發展 +${bonus}（花費 500 金，體力 -20）`);

// AFTER
get().addLog(i18next.t('logs:commerce.develop', {
  city: t('data:city.' + city.id),
  officer: t('data:officer.' + executor.id),
  bonus, cost: 500, stamina: 20,
}));

// en/logs.json
{ "commerce.develop": "{{city}}: {{officer}} developed commerce +{{bonus}} (cost {{cost}} gold, stamina -{{stamina}})" }

// zh-TW/logs.json
{ "commerce.develop": "{{city}}：{{officer}} 商業發展 +{{bonus}}（花費 {{cost}} 金，體力 -{{stamina}}）" }
```

---

## Battle System

### Multi-City Attack
RTK IV allows attacking from multiple cities simultaneously. Attackers from different cities spawn on different edges of the battle map based on their approach direction.

### Allied Reinforcements
Both attacker and defender can have allied factions join the battle. Allied units spawn separately and are AI-controlled even during the player phase.

### Spawn Point Selection
RTK IV lets both sides pick spawn positions from ~10 predefined locations before battle starts. Fewer options than total officers — adds a tactical layer to deployment.

### Per-City Battle Maps
Each of the 43 cities should have a unique battle map reflecting its geography and historical significance:
- 赤壁 — river-heavy, naval elements
- 街亭 — mountain passes
- 漢中 — valleys and ridges
- 虎牢關 — narrow pass with fortifications
- 長安 — large walled city
- etc.

### Tactic Target Selection
Allow player to choose which enemy unit to target with tactics via map click, instead of auto-targeting the nearest enemy.

### Enemy Phase Animation
Improve enemy turn visual feedback — camera follows active enemy unit, brief pause on attacks, damage numbers.

### Undo Move
Allow canceling a move before committing to an attack/tactic (RTK IV supports this).

---

## Strategic Layer

### Officer Relationships
Deepen the officer relationship system — sworn brothers, rivalries, mentor/student bonds affecting loyalty, recruitment, and duel outcomes.

### Historical Events
More scripted historical events tied to specific scenarios and years (e.g., 赤壁之戰 fire attack event, 三顧茅廬 recruitment event).

### City Specialization
Cities with unique bonuses based on geography (e.g., 洛陽 gives political bonuses, 荊州 gives agriculture bonuses).

---

## CLI Improvements

### New Player Onboarding
- `tutorial` command that walks through a first turn (develop, draft, attack, end)
- Suggested first moves printed after game start for new players
- Brief stat legend in the status output header (L=Leadership, W=War, etc.)

### Quality of Life
- `undo` command to reverse the last action within a turn
- `save` / `load` commands for interactive mode (currently exec-mode only)
- Tab completion for city/officer names (readline completer)
- Colored output with chalk (faction colors, damage in red, etc.)
- `map` command showing ASCII territory overview

---

## Technical

### Per-City Battle Maps (Data)
Define 43 battle map JSON files in `data/battlemaps/` — each with hand-crafted terrain grids, gate positions, and spawn point options. Maps should be reviewed for historical accuracy.

### AI Improvements
- Smarter battle AI (flanking, focus fire, retreat when losing)
- Strategic AI long-term planning (alliance timing, when to attack vs develop)
- Difficulty levels affecting AI decision quality

### StorageAdapter Interface
Unify browser `localStorage` and CLI filesystem-based saves behind a common `StorageAdapter` interface. Would allow tests to use an in-memory adapter. See AGENTS.md for details.
