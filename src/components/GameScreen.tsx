import { useState } from 'react';
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
            <span>城{ownCities.length}</span>
            <span>將{officerCount}</span>
            <span>兵{totalTroops.toLocaleString()}</span>
            <span>金{totalGold.toLocaleString()}</span>
            <span>糧{totalFood.toLocaleString()}</span>
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
