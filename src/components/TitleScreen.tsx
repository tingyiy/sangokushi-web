import { useGameStore } from '../store/gameStore';

export function TitleScreen() {
  const { setPhase, getSaveSlots, loadGame } = useGameStore();
  const saveSlots = getSaveSlots();
  const availableSlots = saveSlots.filter(slot => slot.date);
  const hasSaves = availableSlots.length > 0;

  const handleLoad = () => {
    if (!hasSaves) return;
    const latestSlot = availableSlots.reduce((latest, current) => {
      if (!latest) return current;
      const latestTime = latest.date ? Date.parse(latest.date) : 0;
      const currentTime = current.date ? Date.parse(current.date) : 0;
      return currentTime > latestTime ? current : latest;
    }, availableSlots[0]);
    if (latestSlot) {
      loadGame(latestSlot.slot);
    }
  };

  return (
    <div className="title-screen brocade-bg">
      <div className="title-menu rtk-frame">
        <button className="title-menu-item" onClick={() => setPhase('scenario')}>
          開始新遊戲
        </button>
        <button
          className="title-menu-item"
          disabled={!hasSaves}
          onClick={handleLoad}
        >
          載入進度存檔
        </button>
        <button
          className="title-menu-item"
          onClick={() => setPhase('rulerCreation')}
        >
          登錄武將數值
        </button>
      </div>
    </div>
  );
}
