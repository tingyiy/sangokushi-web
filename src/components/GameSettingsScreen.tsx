import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';
import {
  getEndpoint, setEndpoint,
  getApiKey, setApiKey, clearApiKey,
  getModelId, setModelId,
  isLLMEnabled, setLLMEnabled,
  getActivePreset, fetchModels,
  PRESETS,
} from '../llm/config';
import type { LLMModel } from '../llm/config';
import { validateApiKey } from '../llm/openrouter';

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
 * LLM Settings Section — generic endpoint + API key + model + preset buttons.
 */
function LLMSettingsSection() {
  const { t } = useTranslation();
  const [endpointInput, setEndpointInput] = useState(getEndpoint());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState(getModelId());
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>(
    getApiKey() ? 'valid' : 'idle'
  );
  const [llmEnabled, setLlmEnabledLocal] = useState(isLLMEnabled());
  const [models, setModels] = useState<LLMModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const hasKey = !!getApiKey();

  // Detect active preset for highlighting
  const activePreset = getActivePreset();

  const handlePresetClick = useCallback((presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setEndpointInput(preset.endpoint);
    setEndpoint(preset.endpoint);
    setModelInput(preset.defaultModel);
    setModelId(preset.defaultModel);
    setModels([]);  // clear model list since endpoint changed
  }, []);

  const handleEndpointBlur = useCallback(() => {
    setEndpoint(endpointInput.trim());
  }, [endpointInput]);

  const handleSaveKey = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) return;

    setKeyStatus('validating');
    const valid = await validateApiKey(key);
    if (valid) {
      setApiKey(key);
      setKeyStatus('valid');
      setApiKeyInput('');
    } else {
      setKeyStatus('invalid');
    }
  }, [apiKeyInput]);

  const handleClearKey = useCallback(() => {
    clearApiKey();
    setKeyStatus('idle');
    setApiKeyInput('');
    setLlmEnabledLocal(false);
    setLLMEnabled(false);
  }, []);

  const handleToggleLLM = useCallback((enabled: boolean) => {
    setLlmEnabledLocal(enabled);
    setLLMEnabled(enabled);
  }, []);

  const handleModelInputBlur = useCallback(() => {
    setModelId(modelInput.trim());
  }, [modelInput]);

  const handleFetchModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const fetched = await fetchModels();
      setModels(fetched);
    } catch {
      setModels([]);
    }
    setModelsLoading(false);
  }, []);

  // When user selects from the fetched model dropdown
  const handleModelSelect = useCallback((id: string) => {
    setModelInput(id);
    setModelId(id);
  }, []);

  // Auto-fetch models when endpoint is one that supports listing
  useEffect(() => {
    const ep = getEndpoint();
    if (ep.includes('openrouter.ai') || ep.includes('generativelanguage.googleapis.com')) {
      handleFetchModels();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledLabel = t('settings.llmEnabled');
  const disabledLabel = t('settings.llmDisabled');

  const inputStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '4px',
    color: '#e5e7eb',
    fontSize: '0.85rem',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    maxWidth: '280px',
  };

  return (
    <div className="settings-section">
      {/* Enable / Disable toggle */}
      <div className="settings-row" style={{ borderBottom: '1px solid #4a4a6a', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
        <span className="settings-label" style={{ color: '#a78bfa', fontWeight: 'bold' }}>
          {t('settings.llm')}
        </span>
        <ToggleButton
          options={[enabledLabel, disabledLabel]}
          value={llmEnabled ? enabledLabel : disabledLabel}
          onChange={(v) => handleToggleLLM(v === enabledLabel)}
        />
      </div>

      {/* Preset buttons */}
      <div className="settings-row">
        <span className="settings-label">{t('settings.llmPreset')}</span>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className="btn"
              onClick={() => handlePresetClick(p.id)}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.8rem',
                background: activePreset?.id === p.id ? '#4c1d95' : '#1e293b',
                border: activePreset?.id === p.id ? '1px solid #a78bfa' : '1px solid #334155',
                color: '#e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoint URL */}
      <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.3rem' }}>
        <span className="settings-label">{t('settings.llmEndpoint')}</span>
        <input
          type="text"
          value={endpointInput}
          onChange={(e) => setEndpointInput(e.target.value)}
          onBlur={handleEndpointBlur}
          placeholder={t('settings.llmEndpointPlaceholder')}
          style={{ ...inputStyle, width: '100%' }}
        />
      </div>

      {/* API Key */}
      <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="settings-label">{t('settings.llmApiKey')}</span>
          <span style={{
            fontSize: '0.8rem',
            color: keyStatus === 'valid' ? '#34d399'
              : keyStatus === 'invalid' ? '#f87171'
              : keyStatus === 'validating' ? '#fbbf24'
              : '#6b7280',
          }}>
            {keyStatus === 'valid' && (hasKey ? t('settings.llmApiKeyValid') : t('settings.llmApiKeySet'))}
            {keyStatus === 'invalid' && t('settings.llmApiKeyInvalid')}
            {keyStatus === 'validating' && t('settings.llmApiKeyValidating')}
            {keyStatus === 'idle' && t('settings.llmApiKeyMissing')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="password"
            className="llm-api-key-input"
            placeholder={hasKey ? '••••••••' : (activePreset?.keyPlaceholder ?? 'API key')}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            className="btn btn-confirm"
            onClick={handleSaveKey}
            disabled={!apiKeyInput.trim() || keyStatus === 'validating'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            {t('settings.llmSave')}
          </button>
          {hasKey && (
            <button
              className="btn btn-abort"
              onClick={handleClearKey}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              {t('settings.llmClear')}
            </button>
          )}
        </div>
      </div>

      {/* Model */}
      <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="settings-label">{t('settings.llmModel')}</span>
          <button
            className="btn"
            onClick={handleFetchModels}
            disabled={modelsLoading}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: '#1e293b', border: '1px solid #334155', color: '#e5e7eb', borderRadius: '4px', cursor: 'pointer' }}
          >
            {modelsLoading ? '...' : t('settings.llmFetchModels')}
          </button>
        </div>
        <input
          type="text"
          value={modelInput}
          onChange={(e) => setModelInput(e.target.value)}
          onBlur={handleModelInputBlur}
          placeholder={t('settings.llmModelPlaceholder')}
          style={{ ...inputStyle, width: '100%' }}
        />
        {models.length > 0 && (
          <select
            value={modelInput}
            onChange={(e) => handleModelSelect(e.target.value)}
            style={selectStyle}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}{m.contextLength >= 100000 ? ` (${Math.round(m.contextLength / 1000)}k)` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

/**
 * GameSettingsScreen Component - Phase 0.5
 * Pre-game settings screen with RTK IV options + LLM player configuration.
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
              {scenario ? t(`data:scenario.${scenario.id}.name`) : ''}・{scenario ? t(`data:scenario.${scenario.id}.subtitle`) : ''}
            </span>
          </div>
          <div className="settings-row readonly">
            <span className="settings-label">{t('settings.selectedRuler')}</span>
            <span className="settings-value">{localizedName(playerFaction?.name ?? '')}</span>
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

        {/* LLM Player Settings */}
        <LLMSettingsSection />

      </div>
    </div>
  );
}
