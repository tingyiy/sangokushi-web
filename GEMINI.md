# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based Romance of the Three Kingdoms (三國志) strategy game inspired by RTK IV (三國志IV), built with React + TypeScript + Vite. The game uses Traditional Chinese (繁體中文) for all in-game text, UI labels, and command categories.

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint across the project
- `npm run preview` — Preview production build locally

No test framework is currently configured.

## Architecture

### State Management

Single Zustand store (`src/store/gameStore.ts`, ~577 lines) holds all game state and actions. Accessed via `useGameStore` hook. This is the core of the application — all game logic (domestic development, recruitment, drafting, diplomacy, duels, rumors, turn advancement) lives here as store actions.

### Game Phases

The app renders different screens based on `GamePhase` (defined in `src/types/index.ts`):
- `title` → `TitleScreen`
- `scenario` / `faction` → `ScenarioSelect`
- `playing` → `GameScreen` (main gameplay with map, city panel, command menu, log)
- `duel` → `DuelScreen`

Phase transitions are driven by `setPhase()` in the store.

### Data Layer

- `data/officers.json`, `data/cities.json` — Raw historical data (JSON)
- `src/data/officers.ts`, `src/data/cities.ts` — TypeScript base data arrays imported from JSON
- `src/data/scenarios.ts` — Scenario definitions using `makeCity()` / `makeOfficer()` helpers that compose base data with scenario-specific overrides (faction assignment, stats)

### Types

All core types are in `src/types/index.ts`: `Officer`, `City`, `Faction`, `Scenario`, `GamePhase`, `CommandCategory`, `TurnCommand`. Command categories use Chinese labels: `'內政' | '軍事' | '人事' | '外交' | '謀略' | '結束'`.

### Component Structure

- `src/components/GameScreen.tsx` — Main game layout composing map, city panel, command menu, and log
- `src/components/map/GameMap.tsx` — Map rendering with city nodes
- `src/components/menu/CommandMenu.tsx` — Turn-based command menu (domestic, military, personnel, diplomacy, plots)
- `src/components/CityPanel.tsx` — Selected city details
- `src/components/GameLog.tsx` — Game event log
- `src/components/DuelScreen.tsx` — One-on-one duel combat UI

### Key Design Patterns

- Game mechanics aim to faithfully replicate RTK IV (三國志IV) systems — when implementing new features, reference the original game's mechanics
- The store pattern: mutable copies of scenario data (`cities`, `officers`, `factions`) are created at game start and mutated via store actions
- Faction relations use a hostility scale (0-100) stored in `Faction.relations`; alliances tracked in `Faction.allies`
- Officers have stamina that depletes on actions and recovers on turn end
- `tsconfig.app.json` uses `verbatimModuleSyntax` — use `import type` for type-only imports
