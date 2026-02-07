import { useGameStore } from './store/gameStore';
import { TitleScreen } from './components/TitleScreen';
import { ScenarioSelect } from './components/ScenarioSelect';
import { GameScreen } from './components/GameScreen';
import { DuelScreen } from './components/DuelScreen';
import './App.css';

function App() {
  const phase = useGameStore(s => s.phase);

  return (
    <div className="app">
      {phase === 'title' && <TitleScreen />}
      {(phase === 'scenario' || phase === 'faction') && <ScenarioSelect />}
      {phase === 'playing' && <GameScreen />}
      {phase === 'duel' && <DuelScreen />}
    </div>
  );
}

export default App;
