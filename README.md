# Sangokushi Web (三國志IV Web)

A browser-based strategy game faithfully recreating **Romance of the Three Kingdoms IV** (三國志IV), built with React, TypeScript, and Vite.

以瀏覽器重現經典策略遊戲**三國志IV**，使用 React、TypeScript 及 Vite 開發。

---

## Why This Project Exists / 專案緣起

Romance of the Three Kingdoms IV (1994, Koei) remains one of the most beloved entries in the series among Chinese and Japanese strategy game fans. However, the original only runs on legacy platforms (SNES, DOS, PS1), and no official browser port exists.

三國志IV（1994年，光榮）至今仍是系列作中最受華人及日本策略遊戲玩家喜愛的作品之一。然而原版僅能在舊平台（超級任天堂、DOS、PS1）上執行，官方從未推出瀏覽器版本。

This project aims to bring RTK IV's core gameplay -- its officer management, turn-based hex battles, diplomatic maneuvering, and strategic depth -- to the modern web, preserving the original game mechanics as faithfully as possible while making them accessible to anyone with a browser. All in-game text uses Traditional Chinese (繁體中文), matching the original release.

本專案旨在將三國志IV的核心玩法——武將管理、回合制六角格戰鬥、外交周旋、戰略縱深——帶到現代瀏覽器上，盡可能忠實保留原作的遊戲機制，讓任何人只要有瀏覽器就能遊玩。遊戲內所有文字採用繁體中文，與原版一致。

---

## Current Status / 目前進度

Phases 0 through 5 of the [implementation plan](./IMPL-INDEX.md) are complete. The game is playable with:

實作計畫第 0 至第 5 階段已完成，目前可遊玩的內容包括：

- **6 historical scenarios** spanning 189-234 AD (董卓亂政 through 星落五丈原)
  **6 個歷史劇本**，橫跨西元 189-234 年（從董卓亂政到星落五丈原）
- **400+ officers** with 22 distinct skills across 4 skill groups
  **400 餘名武將**，擁有 4 大類共 22 種特殊技能
- **25 commands** across 5 categories: 內政, 軍事, 人事, 外交, 謀略
  **25 項指令**，涵蓋內政、軍事、人事、外交、謀略五大類
- **Hex-based tactical battles** with unit type differentiation (infantry/cavalry/archer), siege warfare, 13 battle tactics, morale/routing, and POW capture
  **六角格戰術戰鬥**，含兵種分化（步兵/騎兵/弓兵）、攻城戰、13 種戰術、士氣潰敗、俘虜系統
- **AI system** with subsystems for development, military, personnel, diplomacy, and strategy
  **AI 系統**，包含開發、軍事、人事、外交、謀略五大子系統
- **24 treasures**, duel system, save/load (3 slots), victory/defeat detection
  **24 件寶物**、一騎討、存讀檔（3 個存檔欄）、勝敗判定

Remaining work (Phases 6-7): advisor system, officer ranks, fog of war, random/historical events, new ruler creation, sound, and UI polish. See [IMPL-4-7.md](./IMPL-4-7.md) for details.

尚未完成的部分（第 6-7 階段）：軍師助言、官職系統、戰場迷霧、隨機/歷史事件、新君主建立、音效及介面美化。詳見 [IMPL-4-7.md](./IMPL-4-7.md)。

---

## Scenarios / 收錄劇本

| # | Year / 年代 | Name / 劇本名稱 | Subtitle / 副題 |
|---|------------|----------------|-----------------|
| 1 | 189 | 反董卓聯盟 | 董卓廢少帝 |
| 2 | 194 | 群雄爭中原 | 曹操擴張 |
| 3 | 200 | 官渡之戰 | 河北爭雄 |
| 4 | 208 | 赤壁之戰 | 臥龍出山 |
| 5 | 219 | 三國鼎立 | 漢中王 |
| 6 | 234 | 星落五丈原 | 諸葛歸天 |

---

## Tech Stack

- **React 19** -- UI components
- **TypeScript** -- strict mode, `verbatimModuleSyntax`
- **Zustand** -- single-store state management
- **Vite** -- dev server and build tooling
- **Vitest** -- unit and component tests (200+ tests)

## Getting Started

```bash
npm install
npm run dev       # Start dev server at http://localhost:5173
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm test` | Run all tests once |
| `npm run coverage` | Generate test coverage report |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
  ai/              # AI decision engine (6 subsystem files)
  components/      # React components (screens, dialogs, map)
  data/            # Static game data (officers, cities, scenarios, treasures)
  game/            # Game systems (fire attacks, spying)
  store/           # Zustand stores (gameStore, battleStore)
  types/           # TypeScript type definitions
  utils/           # Utilities (skills, pathfinding, hex math, siege maps)
```

## Documentation

- [PLAN.md](./PLAN.md) -- High-level feature roadmap / 功能開發路線圖
- [GAP.md](./GAP.md) -- Feature gap analysis vs RTK IV / 與原作差異分析
- [IMPL-INDEX.md](./IMPL-INDEX.md) -- Detailed implementation plan index / 詳細實作計畫索引
- [AGENTS.md](./AGENTS.md) -- Guidelines for AI coding assistants / AI 程式助手指引

## License / 授權聲明

This is a fan project for educational and preservation purposes. Romance of the Three Kingdoms is a trademark of Koei Tecmo. This project is not affiliated with or endorsed by Koei Tecmo.

本專案為粉絲自製的教育及經典保存計畫。三國志為光榮特庫摩（Koei Tecmo）之註冊商標，本專案與光榮特庫摩無任何關聯或授權關係。
