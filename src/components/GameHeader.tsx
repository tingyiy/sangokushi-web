import { useGameStore } from '../store/gameStore';

/**
 * GameHeader Component
 * Displays compact date badge overlay.
 */
export function GameHeader() {
  const { year, month, playerFaction } = useGameStore();

  return (
    <div className="date-badge rtk-frame">
      <span className="badge-date">{year}年 {month}月</span>
      <span className="badge-faction" style={{ color: playerFaction?.color ?? '#e5e7eb' }}>
        {playerFaction?.name}
      </span>
    </div>
  );
}
