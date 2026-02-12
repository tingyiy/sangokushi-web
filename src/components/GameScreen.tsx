import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { GameHeader } from './GameHeader';
import { GameMap } from './map/GameMap';
import { GameMinimap } from './map/GameMinimap';
import { MapToolbar } from './map/MapToolbar';
import { CityPanel } from './CityPanel';
import { CommandMenu } from './menu/CommandMenu';
import { GameLog } from './GameLog';
import { GovernorAssignmentModal } from './GovernorAssignmentModal';
import { DomesticStatusPanel } from './DomesticStatusPanel';
import { EventDialog } from './EventDialog';
import SaveLoadMenu from './SaveLoadMenu';

export function GameScreen() {
  const { t } = useTranslation();
  const { cities, officers, playerFaction } = useGameStore();
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);

  const ownCities = cities.filter(c => c.factionId === playerFaction?.id);
  const totalTroops = ownCities.reduce((s, c) => s + c.troops, 0);
  const totalGold = ownCities.reduce((s, c) => s + c.gold, 0);
  const totalFood = ownCities.reduce((s, c) => s + c.food, 0);
  const officerCount = officers.filter(o => o.factionId === playerFaction?.id).length;

  return (
    <div className="game-screen">
      <div className="game-body">
        <div className="game-left" style={{ position: 'relative' }}>
          <GameMap />
          <GameHeader />
          <GameMinimap />
          <CityPanel />
          <MapToolbar
            onShowStatus={() => setShowStatusPanel(true)}
            onShowSave={() => setShowSaveMenu(true)}
            onShowLoad={() => setShowLoadMenu(true)}
          />
        </div>
        <div className="game-right">
          <div className="sidebar-summary">
            <span>{t('sidebar.cityCount', { count: ownCities.length })}</span>
            <span>{t('sidebar.officerCount', { count: officerCount })}</span>
            <span>{t('sidebar.troopCount', { value: totalTroops.toLocaleString() })}</span>
            <span>{t('sidebar.goldCount', { value: totalGold.toLocaleString() })}</span>
            <span>{t('sidebar.foodCount', { value: totalFood.toLocaleString() })}</span>
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
      <SaveLoadMenu
        isOpen={showSaveMenu}
        onClose={() => setShowSaveMenu(false)}
        mode="save"
      />
      <SaveLoadMenu
        isOpen={showLoadMenu}
        onClose={() => setShowLoadMenu(false)}
        mode="load"
      />
    </div>
  );
}
