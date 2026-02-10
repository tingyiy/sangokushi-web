import { useGameStore } from '../../store/gameStore';

/**
 * MapToolbar Component - Phase 7.8
 * Floating toolbar over the map area for quick access to views and settings.
 */
interface Props {
  onShowStatus: () => void;
  onShowSave: () => void;
  onShowLoad: () => void;
}

export function MapToolbar({ onShowStatus, onShowSave, onShowLoad }: Props) {
  const { setPhase } = useGameStore();

  return (
    <div className="map-toolbar">
      <button className="toolbar-btn" title="查看全勢力" onClick={onShowStatus}>
        📊
      </button>
      <button className="toolbar-btn" title="儲存" onClick={onShowSave}>
        💾
      </button>
      <button className="toolbar-btn" title="載入" onClick={onShowLoad}>
        📂
      </button>
      <button className="toolbar-btn" title="設定" onClick={() => setPhase('settings')}>
        ⚙️
      </button>
      <button className="toolbar-btn" title="返回標題" onClick={() => setPhase('title')}>
        🏠
      </button>

      <style>{`
        .map-toolbar {
          position: absolute;
          top: 90px;
          left: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 50;
        }
        .toolbar-btn {
          width: 40px;
          height: 40px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid #475569;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 1.2rem;
          backdrop-filter: blur(4px);
          transition: all 0.2s;
        }
        .toolbar-btn:hover {
          background: #334155;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
