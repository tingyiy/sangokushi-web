import { useState } from 'react';
import { GameHeader } from './GameHeader';
import { GameMap } from './map/GameMap';
import { MapToolbar } from './map/MapToolbar';
import { CityPanel } from './CityPanel';
import { CommandMenu } from './menu/CommandMenu';
import { GameLog } from './GameLog';
import { GovernorAssignmentModal } from './GovernorAssignmentModal';
import { DomesticStatusPanel } from './DomesticStatusPanel';
import { EventDialog } from './EventDialog';

export function GameScreen() {
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  return (
    <div className="game-screen">
      <GameHeader onShowStatus={() => setShowStatusPanel(true)} />
      <div className="game-body">
        <div className="game-left" style={{ position: 'relative' }}>
          <GameMap />
          <MapToolbar onShowStatus={() => setShowStatusPanel(true)} />
        </div>
        <div className="game-right">
          <CityPanel />
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
    </div>
  );
}
