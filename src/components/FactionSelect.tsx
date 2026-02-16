import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';
import { SelectionMinimap } from './map/SelectionMinimap';
import { Portrait } from './Portrait';
import {
  PRESETS, getProviderConfig,
  setRulerProviderId, clearAllRulerProviders,
} from '../llm/config';
import type { ProviderPreset } from '../llm/config';

/** Build the list of configured providers (have credentials). */
function getConfiguredProviders(): { preset: ProviderPreset; model: string }[] {
  const result: { preset: ProviderPreset; model: string }[] = [];
  for (const preset of PRESETS) {
    const cfg = getProviderConfig(preset.id);
    const hasKey = cfg.apiKey !== null && cfg.apiKey !== '';
    const hasOAuth = preset.id === 'gemini' && cfg.authMode === 'oauth';
    const noKeyNeeded = preset.id === 'ollama';
    if (hasKey || hasOAuth || noKeyNeeded) {
      result.push({ preset, model: cfg.model || preset.defaultModel });
    }
  }
  return result;
}

/**
 * FactionSelect Component
 * RTK IV style faction selection screen.
 * Each ruler card has a player mode dropdown: Human or LLM provider+model.
 */
export function FactionSelect() {
  const { t } = useTranslation();
  const {
    scenario,
    factions,
    cities,
    officers,
    selectFaction,
    setPhase,
  } = useGameStore();

  const [hoveredFactionId, setHoveredFactionId] = useState<number | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  // Per-faction player mode: factionId → 'human' | providerId
  const [factionModes, setFactionModes] = useState<Record<number, string>>({});

  const FACTIONS_PER_PAGE = 9;
  const totalPages = Math.ceil(factions.length / FACTIONS_PER_PAGE);
  const currentFactions = factions.slice(
    page * FACTIONS_PER_PAGE,
    (page + 1) * FACTIONS_PER_PAGE
  );

  const configuredProviders = getConfiguredProviders();

  const getRuler = (factionId: number) => {
    const faction = factions.find(f => f.id === factionId);
    if (!faction) return null;
    return officers.find(o => o.id === faction.rulerId);
  };

  const handleSelectFaction = useCallback((factionId: number) => {
    setSelectedFactionId(prev => {
      // When switching selection, set the new one to Human (if not explicitly changed)
      // and revert the old one back to gameAI (if it was still on the default human)
      setFactionModes(modes => {
        const updated = { ...modes };
        // Revert previous selection to gameAI if it was auto-set to human
        if (prev !== null && prev !== factionId && (updated[prev] === 'human' || updated[prev] === undefined)) {
          updated[prev] = 'gameAI';
        }
        // Set newly selected to human if not explicitly configured
        if (updated[factionId] === undefined || updated[factionId] === 'gameAI') {
          updated[factionId] = 'human';
        }
        return updated;
      });
      return factionId;
    });
  }, []);

  const handleModeChange = useCallback((factionId: number, mode: string) => {
    setFactionModes(prev => ({ ...prev, [factionId]: mode }));
  }, []);

  // Refresh configured providers when component regains focus (after AI Config modal)
  const [, setRefresh] = useState(0);
  useEffect(() => {
    const onFocus = () => setRefresh(n => n + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleConfirm = () => {
    if (selectedFactionId === null) return;
    const faction = factions.find(f => f.id === selectedFactionId);
    if (!faction) return;

    // Clear previous assignments, then set per-ruler provider
    clearAllRulerProviders();
    const mode = factionModes[selectedFactionId] ?? 'human';
    if (mode !== 'human') {
      setRulerProviderId(faction.rulerId, mode);
    }

    selectFaction(selectedFactionId);
  };

  return (
    <div className="faction-select-screen brocade-bg">
      {/* Header bar */}
      <div className="faction-header">
        <span className="scenario-name">{scenario ? t(`data:scenario.${scenario.id}.name`) : ''}</span>
        <span className="faction-count">{t('faction.selectRulerCount', { count: factions.length })}</span>
        <div className="header-buttons">
          <button
            className="btn btn-confirm"
            onClick={handleConfirm}
            disabled={selectedFactionId === null}
          >
            {t('common.confirm')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setPhase('rulerCreation')}
            style={{ background: '#2a4a6a', color: '#fff', border: '1px solid #4a6a8a', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}
          >
            {t('faction.registerNewRuler')}
          </button>
          {totalPages > 1 && (
            <button
              className="btn btn-page"
              onClick={() => setPage((p) => (p + 1) % totalPages)}
            >
              {t('common.nextPage')}
            </button>
          )}
          <button className="btn btn-abort" onClick={() => setPhase('scenario')}>
            {t('common.abort')}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="faction-select-layout">
        {/* Left: Minimap */}
        <div className="faction-minimap-container">
          <SelectionMinimap
            cities={cities}
            factions={factions}
            highlightFactionId={hoveredFactionId ?? selectedFactionId}
          />
        </div>

        {/* Right: Faction cards grid */}
        <div className="faction-cards-container">
          <div className="faction-cards-grid">
            {currentFactions.map((faction) => {
              const ruler = getRuler(faction.id);
              const isSelected = selectedFactionId === faction.id;
              const isHovered = hoveredFactionId === faction.id;
              const mode = factionModes[faction.id] ?? 'gameAI';

              return (
                <div
                  key={faction.id}
                  className={`faction-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => handleSelectFaction(faction.id)}
                  onMouseEnter={() => setHoveredFactionId(faction.id)}
                  onMouseLeave={() => setHoveredFactionId(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelectFaction(faction.id);
                    }
                  }}
                >
                  {/* Ruler portrait */}
                  <div className="faction-portrait">
                    {ruler ? (
                      <Portrait
                        portraitId={ruler.portraitId}
                        name={localizedName(ruler.name)}
                        size="large"
                      />
                    ) : (
                      <div className="portrait-placeholder">?</div>
                    )}
                  </div>
                  <div className="faction-label">
                    <span className="faction-name">{localizedName(ruler?.name ?? faction.name)}</span>
                  </div>
                  {/* Player mode dropdown — inside the card */}
                  <div
                    className="faction-card-mode"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      className="faction-card-mode-select"
                      value={mode}
                      onChange={(e) => handleModeChange(faction.id, e.target.value)}
                    >
                      <option value="human">{t('faction.playerModeHuman')}</option>
                      <option value="gameAI">{t('faction.playerModeGameAI')}</option>
                      {configuredProviders.map(({ preset, model }) => {
                        const shortModel = model.split('/').pop() ?? model;
                        const label = shortModel.length > 20
                          ? preset.name + ': ' + shortModel.slice(0, 18) + '...'
                          : preset.name + ': ' + shortModel;
                        return (
                          <option key={preset.id} value={preset.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .faction-card-mode {
          padding: 3px 4px;
          background: #0f172a;
          border-top: 1px solid #334155;
        }
        .faction-card-mode-select {
          width: 100%;
          padding: 2px 4px;
          font-size: 0.7rem;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 3px;
          color: #9ca3af;
          cursor: pointer;
        }
        .faction-card-mode-select:focus {
          outline: none;
          border-color: #a78bfa;
          color: #e5e7eb;
        }
        .faction-card-mode-select option {
          background: #1e293b;
          color: #e5e7eb;
        }
      `}</style>
    </div>
  );
}
