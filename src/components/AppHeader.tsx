import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { LLMSettingsPanel } from './LLMSettingsPanel';
import { isLLMEnabled, getAccessToken } from '../llm/config';
import { startAgent, stopAgent, isAgentRunning } from '../llm/agent';
import type { GamePhase } from '../types';

const GITHUB_URL = 'https://github.com/tingyiy/sangokushi-web';

/** Phases where a game is active (save meaningful) */
const IN_GAME_PHASES = new Set<GamePhase>(['playing', 'battle', 'duel']);

/**
 * AppHeader — persistent top bar across all screens.
 *
 * Contains:
 *   - Game title (localized)
 *   - Save / Load buttons (save: in-game only; load: always)
 *   - LLM agent toggle (in-game, when LLM configured)
 *   - LLM settings popup
 *   - Return to title
 *   - GitHub badge
 */
interface AppHeaderProps {
  phase: GamePhase;
  onShowSave: () => void;
  onShowLoad: () => void;
}

export function AppHeader({ phase, onShowSave, onShowLoad }: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const { setPhase } = useGameStore();
  const [showLLMModal, setShowLLMModal] = useState(false);

  // LLM agent state (polled)
  const [agentRunning, setAgentRunning] = useState(false);
  const [llmReady, setLlmReady] = useState(false);
  const autoStartDone = useRef(false);

  useEffect(() => {
    const check = () => {
      const ready = isLLMEnabled() && !!getAccessToken();
      setLlmReady(ready);
      const running = isAgentRunning();
      setAgentRunning(running);
      // Auto-start once when entering gameplay with LLM ready
      if (ready && !running && !autoStartDone.current && IN_GAME_PHASES.has(phase)) {
        autoStartDone.current = true;
        startAgent();
        setAgentRunning(true);
      }
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [phase]);

  const handleToggleAgent = () => {
    if (agentRunning) {
      autoStartDone.current = true;
      stopAgent();
      setAgentRunning(false);
    } else {
      startAgent();
      setAgentRunning(true);
    }
  };

  const isInGame = IN_GAME_PHASES.has(phase);

  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-header-title">{t('app.title')}</span>
          <span className="app-header-subtitle">{t('app.subtitle')}</span>
        </div>
        <div className="app-header-right">
          {/* Save — only when a game is active */}
          {isInGame && (
            <button className="app-header-btn" onClick={onShowSave} title={t('toolbar.save')}>
              {t('toolbar.save')}
            </button>
          )}

          {/* Load — always available */}
          <button className="app-header-btn" onClick={onShowLoad} title={t('toolbar.load')}>
            {t('toolbar.load')}
          </button>

          {/* LLM Agent Toggle — in-game when LLM configured */}
          {isInGame && llmReady && (
            <button
              className={`app-header-btn ${agentRunning ? 'app-header-btn-active' : ''}`}
              onClick={handleToggleAgent}
              title={agentRunning ? t('settings.llmStop') : t('settings.llmStart')}
            >
              {agentRunning ? t('settings.llmStop') : t('settings.llmStart')}
            </button>
          )}

          {/* LLM Config */}
          <button
            className="app-header-btn app-header-btn-llm"
            onClick={() => setShowLLMModal(true)}
            title={t('app.llmSettings')}
          >
            {t('app.llmSettings')}
          </button>

          {/* Return to title — from in-game or settings screens */}
          {(isInGame || phase === 'settings') && (
            <button className="app-header-btn" onClick={() => setPhase('title')} title={t('toolbar.returnToTitle')}>
              {t('toolbar.returnToTitle')}
            </button>
          )}

          {/* Language toggle */}
          <button
            className="app-header-btn app-header-btn-lang"
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'zh-TW' : 'en')}
            title={i18n.language === 'en' ? '繁體中文' : 'English'}
          >
            {i18n.language === 'en' ? '中' : 'EN'}
          </button>

          {/* GitHub */}
          <a
            className="app-header-github"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
          >
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </header>

      {/* LLM Settings Modal */}
      {showLLMModal && (
        <div className="llm-modal-overlay" onClick={() => setShowLLMModal(false)}>
          <div className="llm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="llm-modal-header">
              <h3 className="llm-modal-title">{t('app.llmSettings')}</h3>
              <button
                className="llm-modal-close"
                onClick={() => setShowLLMModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="llm-modal-body">
              <LLMSettingsPanel />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .app-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: rgba(10, 15, 26, 0.92);
          border-bottom: 1px solid #2a2a3a;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 900;
          backdrop-filter: blur(8px);
        }
        .app-header-left {
          display: flex;
          align-items: baseline;
          gap: 10px;
          min-width: 0;
        }
        .app-header-title {
          color: #fbbf24;
          font-size: 0.95rem;
          font-weight: bold;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }
        .app-header-subtitle {
          color: #6b7280;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .app-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .app-header-btn {
          padding: 4px 10px;
          font-size: 0.78rem;
          background: #1e293b;
          border: 1px solid #334155;
          color: #9ca3af;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .app-header-btn:hover {
          background: #334155;
          color: #e5e7eb;
          border-color: #475569;
        }
        .app-header-btn-llm {
          color: #a78bfa;
        }
        .app-header-btn-llm:hover {
          border-color: #a78bfa;
        }
        .app-header-btn-active {
          background: rgba(167, 139, 250, 0.2);
          border-color: #a78bfa;
          color: #a78bfa;
          animation: header-pulse 2s infinite;
        }
        @keyframes header-pulse {
          0%, 100% { box-shadow: 0 0 2px rgba(167, 139, 250, 0.3); }
          50% { box-shadow: 0 0 8px rgba(167, 139, 250, 0.5); }
        }
        .app-header-btn-lang {
          font-weight: bold;
          min-width: 32px;
          text-align: center;
        }
        .app-header-github {
          color: #6b7280;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .app-header-github:hover {
          color: #e5e7eb;
        }

        /* LLM Settings Modal */
        .llm-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
        }
        .llm-modal-content {
          background: #1a1a2e;
          border: 2px solid #4a4a6a;
          border-radius: 8px;
          width: 520px;
          max-width: 95vw;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }
        .llm-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #2a2a3a;
        }
        .llm-modal-title {
          color: #a78bfa;
          font-size: 1rem;
          font-weight: bold;
          margin: 0;
        }
        .llm-modal-close {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 1.4rem;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .llm-modal-close:hover {
          color: #e5e7eb;
        }
        .llm-modal-body {
          padding: 12px 16px 16px;
        }
      `}</style>
    </>
  );
}
