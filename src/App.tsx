import { useState, useEffect } from 'react';
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
import { AppHeader } from './components/AppHeader';
import SaveLoadMenu from './components/SaveLoadMenu';
import { audioSystem } from './systems/audio';
import { LLMStatusOverlay } from './components/LLMStatusOverlay';
import type { GamePhase } from './types';
import './App.css';

/**
 * Main App Component
 * Routes between different game screens based on current phase.
 */

/** Phases where the AppHeader is hidden (cinematic screens) */
const HEADER_HIDDEN = new Set<GamePhase>(['victory', 'defeat']);

function App() {
  const { phase, checkVictoryCondition, setPhase, addLog, gameSettings } = useGameStore();

  // Save/Load menu state — lifted to App level so header can open them from any phase
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);

  // Sync audio mute state with game settings
  useEffect(() => {
    audioSystem.setMute(!gameSettings.musicEnabled);
  }, [gameSettings.musicEnabled]);

  // Update BGM based on phase
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

  // Check victory/defeat conditions when in playing phase
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
      {!HEADER_HIDDEN.has(phase) && (
        <AppHeader
          phase={phase}
          onShowSave={() => setShowSaveMenu(true)}
          onShowLoad={() => setShowLoadMenu(true)}
        />
      )}
      {phase === 'title' && <TitleScreen onShowLoad={() => setShowLoadMenu(true)} />}
      {phase === 'scenario' && <ScenarioSelect />}
      {phase === 'faction' && <FactionSelect />}
      {phase === 'settings' && <GameSettingsScreen />}
      {phase === 'rulerCreation' && <RulerCreation />}
      {phase === 'playing' && (
        <GameScreen
          onShowSave={() => setShowSaveMenu(true)}
          onShowLoad={() => setShowLoadMenu(true)}
        />
      )}
      {phase === 'duel' && <DuelScreen />}
      {phase === 'battle' && <BattleScreen />}
      {phase === 'victory' && <VictoryScreen />}
      {phase === 'defeat' && <DefeatScreen />}

      {/* Save/Load menus — available from any phase via header */}
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
      <LLMStatusOverlay />
    </div>
  );
}

export default App;
