import { GameHeader } from './GameHeader';
import { GameMap } from './map/GameMap';
import { CityPanel } from './CityPanel';
import { CommandMenu } from './menu/CommandMenu';
import { GameLog } from './GameLog';

export function GameScreen() {
  return (
    <div className="game-screen">
      <GameHeader />
      <div className="game-body">
        <div className="game-left">
          <GameMap />
        </div>
        <div className="game-right">
          <CityPanel />
          <CommandMenu />
          <GameLog />
        </div>
      </div>
    </div>
  );
}
