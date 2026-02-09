import { GameHeader } from './GameHeader';
import { GameMap } from './map/GameMap';
import { MapToolbar } from './map/MapToolbar';
import { CityPanel } from './CityPanel';
import { CommandMenu } from './menu/CommandMenu';
import { GameLog } from './GameLog';
import { GovernorAssignmentModal } from './GovernorAssignmentModal';

export function GameScreen() {
  return (
    <div className="game-screen">
      <GameHeader />
      <div className="game-body">
        <div className="game-left" style={{ position: 'relative' }}>
          <GameMap />
          <MapToolbar />
        </div>
        <div className="game-right">
          <CityPanel />
          <CommandMenu />
          <GameLog />
        </div>
      </div>
      <GovernorAssignmentModal />
    </div>
  );
}
