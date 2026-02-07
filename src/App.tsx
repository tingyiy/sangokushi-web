import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { TitleScreen } from './components/TitleScreen';
import { ScenarioSelect } from './components/ScenarioSelect';
import { GameScreen } from './components/GameScreen';
import { DuelScreen } from './components/DuelScreen';
import BattleScreen from './components/BattleScreen';
import VictoryScreen from './components/VictoryScreen';
import DefeatScreen from './components/DefeatScreen';
import './App.css';

/**
 * Main App Component
 * Routes between different game screens based on current phase.
 * Phase 0.3: Integrated victory/defeat condition checking.
 */
function App() {
  const { phase, checkVictoryCondition, setPhase, addLog } = useGameStore();

  // Phase 0.3: Check victory/defeat conditions when in playing phase
  useEffect(() => {
    if (phase === 'playing') {
      const result = checkVictoryCondition();
      if (result) {
        addLog(result.message);
        if (result.type === 'victory') {
          setPhase('victory');
        } else if (result.type === 'defeat') {
          setPhase('defeat');
        }
      }
    }
  }, [phase, checkVictoryCondition, setPhase, addLog]);

  return (
    <div className="app">
      {phase === 'title' && <TitleScreen />}
      {(phase === 'scenario' || phase === 'faction') && <ScenarioSelect />}
      {phase === 'playing' && <GameScreen />}
      {phase === 'duel' && <DuelScreen />}
      {phase === 'battle' && <BattleScreen />}
      {phase === 'victory' && <VictoryScreen />}
      {phase === 'defeat' && <DefeatScreen />}
    </div>
  );
}

export default App;
