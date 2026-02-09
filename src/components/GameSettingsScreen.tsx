import { useGameStore } from '../store/gameStore';

/**
 * ToggleButton Component
 * A button that toggles between two options
 */
interface ToggleButtonProps {
  options: [string, string];
  value: string;
  onChange: (value: string) => void;
}

function ToggleButton({ options, value, onChange }: ToggleButtonProps) {
  return (
    <div className="toggle-button">
      {options.map((option) => (
        <button
          key={option}
          className={`toggle-option ${value === option ? 'active' : ''}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/**
 * GameSettingsScreen Component - Phase 0.5
 * Pre-game settings screen with RTK IV options:
 * - 戰爭方式 (Battle Mode)
 * - 遊戲方式 (Game Mode)
 * - 登錄武將出場 (Custom Officers)
 * - 清信靈敏度 (Intelligence Sensitivity)
 */
export function GameSettingsScreen() {
  const {
    gameSettings,
    setGameSettings,
    confirmSettings,
    setPhase,
    scenario,
    playerFaction,
  } = useGameStore();

  return (
    <div className="settings-screen brocade-bg">
      <div className="settings-box rtk-frame">
        <div className="settings-top-bar">
          <h2 className="settings-title">遊戲設定</h2>
          <div className="settings-buttons">
            <button className="btn btn-confirm" onClick={confirmSettings}>
              決定
            </button>
            <button className="btn btn-abort" onClick={() => setPhase('faction')}>
              中止
            </button>
          </div>
        </div>

        {/* Read-only summary */}
        <div className="settings-section">
          <div className="settings-row readonly">
            <span className="settings-label">選擇劇本</span>
            <span className="settings-value">
              {scenario?.name}・{scenario?.subtitle}
            </span>
          </div>
          <div className="settings-row readonly">
            <span className="settings-label">選擇君主</span>
            <span className="settings-value">{playerFaction?.name}</span>
          </div>
        </div>

        {/* Configurable options */}
        <div className="settings-section">
          {/* Battle Mode */}
          <div className="settings-row">
            <span className="settings-label">戰爭方式</span>
            <ToggleButton
              options={['看', '不看']}
              value={gameSettings.battleMode === 'watch' ? '看' : '不看'}
              onChange={(v) =>
                setGameSettings({ battleMode: v === '看' ? 'watch' : 'skip' })
              }
            />
          </div>

          {/* Game Mode */}
          <div className="settings-row">
            <span className="settings-label">遊戲方式</span>
            <ToggleButton
              options={['史實', '虛構']}
              value={gameSettings.gameMode === 'historical' ? '史實' : '虛構'}
              onChange={(v) =>
                setGameSettings({ gameMode: v === '史實' ? 'historical' : 'fictional' })
              }
            />
          </div>

          {/* Custom Officers */}
          <div className="settings-row">
            <span className="settings-label">登錄武將出場</span>
            <ToggleButton
              options={['全', '選']}
              value={gameSettings.customOfficers === 'all' ? '全' : '選'}
              onChange={(v) =>
                setGameSettings({ customOfficers: v === '全' ? 'all' : 'choose' })
              }
            />
          </div>

          {/* Intelligence Sensitivity */}
          <div className="settings-row">
            <span className="settings-label">清信靈敏度</span>
            <div className="sensitivity-slider">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  className={`sensitivity-level ${
                    gameSettings.intelligenceSensitivity === level ? 'active' : ''
                  }`}
                  onClick={() =>
                    setGameSettings({
                      intelligenceSensitivity: level as 1 | 2 | 3 | 4 | 5,
                    })
                  }
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
