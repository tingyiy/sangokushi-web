import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { GameHeader } from './GameHeader';
import { GameMap } from './map/GameMap';
import { GameMinimap } from './map/GameMinimap';
import { CityPanel } from './CityPanel';
import { CommandMenu } from './menu/CommandMenu';
import { GameLog } from './GameLog';
import { GovernorAssignmentModal } from './GovernorAssignmentModal';
import { DomesticStatusPanel } from './DomesticStatusPanel';
import { EventDialog } from './EventDialog';

interface GameScreenProps {
  onShowSave: () => void;
  onShowLoad: () => void;
}

export function GameScreen({ onShowSave: _onShowSave, onShowLoad: _onShowLoad }: GameScreenProps) {
  const { t } = useTranslation();
  const { cities, officers, playerFaction, selectedCityId } = useGameStore();
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  const ownCities = cities.filter(c => c.factionId === playerFaction?.id);
  const totalTroops = ownCities.reduce((s, c) => s + c.troops, 0);
  const totalGold = ownCities.reduce((s, c) => s + c.gold, 0);
  const totalFood = ownCities.reduce((s, c) => s + c.food, 0);
  const officerCount = officers.filter(o => o.factionId === playerFaction?.id).length;

  return (
    <div className="game-screen">
      <div className="game-body">
        <div className={`game-left ${selectedCityId !== null ? 'panel-open' : ''}`} style={{ position: 'relative' }}>
          <GameMap />
          <GameHeader />
          <GameMinimap />
          <CityPanel />
        </div>
        <div className="game-right">
          <div className="sidebar-summary">
            <span>{t('sidebar.cityCount', { count: ownCities.length })}</span>
            <span>{t('sidebar.officerCount', { count: officerCount })}</span>
            <span>{t('sidebar.troopCount', { value: totalTroops.toLocaleString() })}</span>
            <span>{t('sidebar.goldCount', { value: totalGold.toLocaleString() })}</span>
            <span>{t('sidebar.foodCount', { value: totalFood.toLocaleString() })}</span>
            <button
              className="sidebar-status-btn"
              onClick={() => setShowStatusPanel(true)}
              title={t('toolbar.viewStatus')}
            >
              {t('toolbar.viewStatus')}
            </button>
          </div>
          <CommandMenu />
          <GameLog />
        </div>
      </div>
      <GovernorAssignmentModal />
      <DomesticStatusPanel
        isOpen={showStatusPanel}
        onClose={() => setShowStatusPanel(false)}
      />
      <EventDialog />

      <style>{`
        .sidebar-status-btn {
          padding: 2px 8px;
          font-size: 0.78rem;
          background: #1e293b;
          border: 1px solid #334155;
          color: #9ca3af;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .sidebar-status-btn:hover {
          background: #334155;
          color: #e5e7eb;
          border-color: #475569;
        }
      `}</style>
    </div>
  );
}
