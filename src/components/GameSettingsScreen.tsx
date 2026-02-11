import { useTranslation } from 'react-i18next';
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
 * - 滑鼠靈敏度 (Mouse Sensitivity)
 */
export function GameSettingsScreen() {
  const { t, i18n } = useTranslation();
  const {
    gameSettings,
    setGameSettings,
    confirmSettings,
    setPhase,
    scenario,
    playerFaction,
  } = useGameStore();

  const watchLabel = t('settings.battleModeWatch');
  const skipLabel = t('settings.battleModeSkip');
  const historicalLabel = t('settings.gameModeHistorical');
  const fictionalLabel = t('settings.gameModeFictional');
  const allLabel = t('settings.customOfficersAll');
  const chooseLabel = t('settings.customOfficersChoose');
  const onLabel = t('settings.musicOn');
  const offLabel = t('settings.musicOff');

  return (
    <div className="settings-screen brocade-bg">
      <div className="settings-box rtk-frame">
        <div className="settings-top-bar">
          <h2 className="settings-title">{t('settings.title')}</h2>
          <div className="settings-buttons">
            <button className="btn btn-confirm" onClick={confirmSettings}>
              {t('common.confirm')}
            </button>
            <button className="btn btn-abort" onClick={() => setPhase('faction')}>
              {t('common.abort')}
            </button>
          </div>
        </div>

        {/* Read-only summary */}
        <div className="settings-section">
          <div className="settings-row readonly">
            <span className="settings-label">{t('settings.selectedScenario')}</span>
            <span className="settings-value">
              {scenario?.name}・{scenario?.subtitle}
            </span>
          </div>
          <div className="settings-row readonly">
            <span className="settings-label">{t('settings.selectedRuler')}</span>
            <span className="settings-value">{playerFaction?.name}</span>
          </div>
        </div>

        {/* Configurable options */}
        <div className="settings-section">
          {/* Battle Mode */}
          <div className="settings-row">
            <span className="settings-label">{t('settings.battleMode')}</span>
            <ToggleButton
              options={[watchLabel, skipLabel]}
              value={gameSettings.battleMode === 'watch' ? watchLabel : skipLabel}
              onChange={(v) =>
                setGameSettings({ battleMode: v === watchLabel ? 'watch' : 'skip' })
              }
            />
          </div>

          {/* Game Mode */}
          <div className="settings-row">
            <span className="settings-label">{t('settings.gameMode')}</span>
            <ToggleButton
              options={[historicalLabel, fictionalLabel]}
              value={gameSettings.gameMode === 'historical' ? historicalLabel : fictionalLabel}
              onChange={(v) =>
                setGameSettings({ gameMode: v === historicalLabel ? 'historical' : 'fictional' })
              }
            />
          </div>

          {/* Custom Officers */}
          <div className="settings-row">
            <span className="settings-label">{t('settings.customOfficers')}</span>
            <ToggleButton
              options={[allLabel, chooseLabel]}
              value={gameSettings.customOfficers === 'all' ? allLabel : chooseLabel}
              onChange={(v) =>
                setGameSettings({ customOfficers: v === allLabel ? 'all' : 'choose' })
              }
            />
          </div>

          {/* Intelligence Sensitivity */}
          <div className="settings-row">
            <span className="settings-label">{t('settings.mouseSensitivity')}</span>
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

          {/* Music Toggle */}
          <div className="settings-row">
            <span className="settings-label">{t('settings.music')}</span>
            <ToggleButton
              options={[onLabel, offLabel]}
              value={gameSettings.musicEnabled ? onLabel : offLabel}
              onChange={(v) =>
                setGameSettings({ musicEnabled: v === onLabel })
              }
            />
          </div>

          {/* Language */}
          <div className="settings-row">
            <span className="settings-label">{t('settings.language')}</span>
            <ToggleButton
              options={['繁體中文', 'English']}
              value={i18n.language === 'en' ? 'English' : '繁體中文'}
              onChange={(v) => i18n.changeLanguage(v === 'English' ? 'en' : 'zh-TW')}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
