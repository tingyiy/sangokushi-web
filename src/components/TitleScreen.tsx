import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';

interface TitleScreenProps {
  onShowLoad: () => void;
}

export function TitleScreen({ onShowLoad }: TitleScreenProps) {
  const { t } = useTranslation();
  const { setPhase, getSaveSlots } = useGameStore();
  const saveSlots = getSaveSlots();
  const hasSaves = saveSlots.some(slot => slot.date);

  return (
    <div className="title-screen brocade-bg">
      <div className="title-menu rtk-frame">
        <button className="title-menu-item" onClick={() => setPhase('scenario')}>
          {t('title.newGame')}
        </button>
        <button
          className="title-menu-item"
          disabled={!hasSaves}
          onClick={onShowLoad}
        >
          {t('title.loadGame')}
        </button>
        <button
          className="title-menu-item"
          onClick={() => setPhase('rulerCreation')}
        >
          {t('title.registerOfficer')}
        </button>
      </div>
    </div>
  );
}
