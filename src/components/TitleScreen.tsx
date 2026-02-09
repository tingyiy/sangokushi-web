import { useGameStore } from '../store/gameStore';

export function TitleScreen() {
  const setPhase = useGameStore(s => s.setPhase);

  return (
    <div className="title-screen">
      <div className="title-content">
        <h1 className="title-main">三國志IV</h1>
        <h2 className="title-sub">Wall of Fire ─ 網頁重製版</h2>
        <p className="title-desc">
          靈感來自光榮《三國志IV》的開源策略遊戲
        </p>
        <div className="title-buttons">
          <button className="btn btn-primary" onClick={() => setPhase('scenario')}>
            開始新遊戲
          </button>
          <button className="btn btn-secondary" onClick={() => setPhase('rulerCreation')}>
            登錄新君主
          </button>
        </div>
        <p className="title-footer">繁體中文版 · Open Source</p>
      </div>
    </div>
  );
}
