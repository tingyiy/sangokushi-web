import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { TitleScreen } from './components/TitleScreen';
import { ScenarioSelect } from './components/ScenarioSelect';
import { FactionSelect } from './components/FactionSelect';
import { GameSettingsScreen } from './components/GameSettingsScreen';
import { RulerCreation } from './components/RulerCreation';
import { GameScreen } from './components/GameScreen';
import { DuelScreen } from './components/DuelScreen';
import BattleScreen from './components/BattleScreen';
import VictoryScreen from './components/VictoryScreen';
import DefeatScreen from './components/DefeatScreen';
import { audioSystem } from './systems/audio';
import { LLMStatusOverlay } from './components/LLMStatusOverlay';
import './App.css';

/**
 * Main App Component
 * Routes between different game screens based on current phase.
 * Phase 0.3: Integrated victory/defeat condition checking.
 * Phase 0.5: Added FactionSelect and GameSettingsScreen routes.
 * Phase 7.1: Added RulerCreation route.
 * Phase 7.4: Integrated Audio System.
 */
function App() {
  const { phase, checkVictoryCondition, setPhase, addLog, gameSettings } = useGameStore();

  // Sync audio mute state with game settings
  useEffect(() => {
    audioSystem.setMute(!gameSettings.musicEnabled);
  }, [gameSettings.musicEnabled]);

  // Phase 7.4: Update BGM based on phase
  useEffect(() => {
    switch (phase) {
      case 'title':
      case 'scenario':
      case 'faction':
      case 'settings':
      case 'rulerCreation':
        audioSystem.playBGM('title');
        break;
      case 'playing':
        audioSystem.playBGM('strategy');
        break;
      case 'battle':
        audioSystem.playBGM('battle');
        break;
      case 'duel':
        audioSystem.playBGM('duel');
        break;
      default:
        audioSystem.stopBGM();
    }
  }, [phase]);

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
      {phase === 'scenario' && <ScenarioSelect />}
      {phase === 'faction' && <FactionSelect />}
      {phase === 'settings' && <GameSettingsScreen />}
      {phase === 'rulerCreation' && <RulerCreation />}
      {phase === 'playing' && <GameScreen />}
      {phase === 'duel' && <DuelScreen />}
      {phase === 'battle' && <BattleScreen />}
      {phase === 'victory' && <VictoryScreen />}
      {phase === 'defeat' && <DefeatScreen />}
      <LLMStatusOverlay />
    </div>
  );
}

export default App;
