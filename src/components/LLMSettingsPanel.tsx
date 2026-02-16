import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getProviderConfig, setProviderConfig,
  getDefaultProviderId, setDefaultProviderId,
  fetchModels,
  PRESETS,
} from '../llm/config';
import type { LLMModel, AuthMode } from '../llm/config';
import { validateApiKey } from '../llm/openrouter';
import {
  isGoogleSignedIn, requestGoogleToken, googleSignOut,
  subscribeOAuth, getTokenExpiry,
} from '../llm/googleAuth';

// ── Per-provider credential editor ──────────────────────

interface ProviderEditorProps {
  providerId: string;
  isDefault: boolean;
  onSetDefault: () => void;
}

function ProviderEditor({ providerId, isDefault, onSetDefault }: ProviderEditorProps) {
  const { t } = useTranslation();
  const preset = PRESETS.find(p => p.id === providerId);
  const config = getProviderConfig(providerId);

  const [endpointInput, setEndpointInput] = useState(config.endpoint);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState(config.model);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>(
    config.apiKey ? 'valid' : 'idle'
  );
  const [models, setModels] = useState<LLMModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const hasKey = !!config.apiKey;

  // Google OAuth state (only relevant for gemini)
  const isGemini = providerId === 'gemini';
  const [authMode, setAuthModeLocal] = useState<AuthMode>(config.authMode);
  const [googleSignedIn, setGoogleSignedIn] = useState(isGoogleSignedIn());
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Subscribe to OAuth state changes
  useEffect(() => {
    return subscribeOAuth(() => {
      setGoogleSignedIn(isGoogleSignedIn());
    });
  }, []);

  // Reload local state when providerId changes (tab switch)
  useEffect(() => {
    const cfg = getProviderConfig(providerId);
    setEndpointInput(cfg.endpoint);
    setModelInput(cfg.model);
    setApiKeyInput('');
    setKeyStatus(cfg.apiKey ? 'valid' : 'idle');
    setAuthModeLocal(cfg.authMode);
    setModels([]);
  }, [providerId]);

  const handleEndpointBlur = useCallback(() => {
    setProviderConfig(providerId, { endpoint: endpointInput.trim() });
  }, [providerId, endpointInput]);

  const handleSaveKey = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setKeyStatus('validating');
    const valid = await validateApiKey(key);
    if (valid) {
      setProviderConfig(providerId, { apiKey: key, authMode: 'apiKey' });
      setAuthModeLocal('apiKey');
      setKeyStatus('valid');
      setApiKeyInput('');
    } else {
      setKeyStatus('invalid');
    }
  }, [providerId, apiKeyInput]);

  const handleClearKey = useCallback(() => {
    setProviderConfig(providerId, { apiKey: null });
    setKeyStatus('idle');
    setApiKeyInput('');
  }, [providerId]);

  const handleGoogleSignIn = useCallback(async () => {
    setOauthLoading(true);
    setOauthError(null);
    try {
      await requestGoogleToken();
      setProviderConfig(providerId, { authMode: 'oauth' });
      setAuthModeLocal('oauth');
      setOauthError(null);
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'Sign-in failed');
    }
    setOauthLoading(false);
  }, [providerId]);

  const handleGoogleSignOut = useCallback(() => {
    googleSignOut();
    setProviderConfig(providerId, { authMode: 'apiKey' });
    setAuthModeLocal('apiKey');
    setGoogleSignedIn(false);
  }, [providerId]);

  const handleModelInputBlur = useCallback(() => {
    setProviderConfig(providerId, { model: modelInput.trim() });
  }, [providerId, modelInput]);

  const handleFetchModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const fetched = await fetchModels(providerId);
      setModels(fetched);
    } catch {
      setModels([]);
    }
    setModelsLoading(false);
  }, [providerId]);

  const handleModelSelect = useCallback((id: string) => {
    setModelInput(id);
    setProviderConfig(providerId, { model: id });
  }, [providerId]);

  // Auto-fetch models for providers that support listing
  useEffect(() => {
    const ep = getProviderConfig(providerId).endpoint;
    if (ep.includes('openrouter.ai') || ep.includes('generativelanguage.googleapis.com')) {
      handleFetchModels();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

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
    <div style={{ marginTop: '0.5rem' }}>
      {/* Default provider badge + button */}
      <div className="settings-row" style={{ borderBottom: '1px solid #334155', paddingBottom: '0.4rem', marginBottom: '0.4rem' }}>
        <span className="settings-label" style={{ color: isDefault ? '#34d399' : '#6b7280', fontSize: '0.85rem' }}>
          {isDefault ? t('settings.llmDefaultProvider') : ''}
        </span>
        {!isDefault && (
          <button
            className="btn"
            onClick={onSetDefault}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: '#1e293b', border: '1px solid #334155', color: '#e5e7eb', borderRadius: '4px', cursor: 'pointer' }}
          >
            {t('settings.llmSetDefault')}
          </button>
        )}
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
          readOnly={!!preset}
        />
      </div>

      {/* API Key */}
      <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="settings-label">{t('settings.llmApiKey')}</span>
          <span style={{
            fontSize: '0.8rem',
            color: authMode === 'oauth' && googleSignedIn ? '#34d399'
              : keyStatus === 'valid' ? '#34d399'
              : keyStatus === 'invalid' ? '#f87171'
              : keyStatus === 'validating' ? '#fbbf24'
              : '#6b7280',
          }}>
            {authMode === 'oauth' && googleSignedIn && t('settings.llmOAuthActive')}
            {authMode !== 'oauth' && keyStatus === 'valid' && (hasKey ? t('settings.llmApiKeyValid') : t('settings.llmApiKeySet'))}
            {authMode !== 'oauth' && keyStatus === 'invalid' && t('settings.llmApiKeyInvalid')}
            {authMode !== 'oauth' && keyStatus === 'validating' && t('settings.llmApiKeyValidating')}
            {authMode !== 'oauth' && keyStatus === 'idle' && t('settings.llmApiKeyMissing')}
          </span>
        </div>

        {/* Google OAuth option (only for Gemini) */}
        {isGemini && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #334155', marginBottom: '0.3rem' }}>
            {googleSignedIn && authMode === 'oauth' ? (
              <>
                <span style={{ fontSize: '0.8rem', color: '#34d399', flex: 1 }}>
                  {t('settings.llmOAuthSignedIn')}
                  {getTokenExpiry() > 0 && (
                    <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                      ({t('settings.llmOAuthExpires', { minutes: Math.max(1, Math.round((getTokenExpiry() - Date.now()) / 60000)) })})
                    </span>
                  )}
                </span>
                <button
                  className="btn btn-abort"
                  onClick={handleGoogleSignOut}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                >
                  {t('settings.llmOAuthSignOut')}
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn"
                  onClick={handleGoogleSignIn}
                  disabled={oauthLoading}
                  style={{
                    padding: '0.35rem 0.8rem', fontSize: '0.85rem',
                    background: '#1a73e8', border: '1px solid #4285f4',
                    color: '#fff', borderRadius: '4px', cursor: oauthLoading ? 'wait' : 'pointer',
                  }}
                >
                  {oauthLoading ? t('settings.llmOAuthLoading') : t('settings.llmOAuthSignIn')}
                </button>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {t('settings.llmOAuthHint')}
                </span>
              </>
            )}
            {oauthError && (
              <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{oauthError}</span>
            )}
          </div>
        )}

        {/* API Key input (always available as fallback) */}
        {(!isGemini || authMode !== 'oauth' || !googleSignedIn) && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="password"
              className="llm-api-key-input"
              placeholder={hasKey ? '••••••••' : (preset?.keyPlaceholder ?? 'API key')}
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
        )}
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

// ── Main LLM Settings Panel ─────────────────────────────

/**
 * LLMSettingsPanel — standalone component for configuring LLM providers.
 *
 * Shows all providers as tabs. Each provider has its own independent
 * credentials (API key, model, auth mode). One provider is marked as
 * the default. Eventually, per-ruler assignment will override the default.
 *
 * Can be embedded in GameSettingsScreen, faction selection, or anywhere.
 */
export function LLMSettingsPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(getDefaultProviderId());
  const [defaultProvider, setDefaultProviderLocal] = useState(getDefaultProviderId());

  const handleSetDefault = useCallback((providerId: string) => {
    setDefaultProviderId(providerId);
    setDefaultProviderLocal(providerId);
  }, []);

  return (
    <div className="settings-section">
      {/* Provider tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        {PRESETS.map((p) => {
          const isActive = activeTab === p.id;
          const isDefault = defaultProvider === p.id;
          const cfg = getProviderConfig(p.id);
          const hasCredential = cfg.apiKey !== null && cfg.apiKey !== '';
          return (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.id)}
              style={{
                padding: '0.3rem 0.7rem',
                fontSize: '0.8rem',
                background: isActive ? '#4c1d95' : '#1e293b',
                border: isActive ? '1px solid #a78bfa' : '1px solid #334155',
                color: isActive ? '#e5e7eb' : (hasCredential ? '#9ca3af' : '#4b5563'),
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {isDefault && (
                <span style={{ marginRight: '0.3rem', color: '#fbbf24', fontSize: '0.7rem' }} title={t('settings.llmDefaultProvider')}>
                  ★
                </span>
              )}
              {p.name}
              {hasCredential && !isDefault && (
                <span style={{ marginLeft: '0.3rem', color: '#34d399', fontSize: '0.6rem' }}>●</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active provider editor */}
      <div style={{ border: '1px solid #334155', borderRadius: '0 4px 4px 4px', padding: '0.5rem 0.75rem', background: '#0f172a' }}>
        <ProviderEditor
          key={activeTab}
          providerId={activeTab}
          isDefault={defaultProvider === activeTab}
          onSetDefault={() => handleSetDefault(activeTab)}
        />
      </div>
    </div>
  );
}
