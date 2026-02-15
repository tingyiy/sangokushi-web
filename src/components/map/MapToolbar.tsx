import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { isLLMEnabled, getApiKey } from '../../llm/config';
import { startAgent, stopAgent, isAgentRunning } from '../../llm/agent';

/**
 * MapToolbar Component - Phase 7.8
 * Floating toolbar over the map area for quick access to views and settings.
 * Includes LLM agent start/stop button when LLM mode is enabled.
 */
interface Props {
  onShowStatus: () => void;
  onShowSave: () => void;
  onShowLoad: () => void;
}

export function MapToolbar({ onShowStatus, onShowSave, onShowLoad }: Props) {
  const { t } = useTranslation();
  const { setPhase } = useGameStore();
  const [agentRunning, setAgentRunning] = useState(false);
  const [llmReady, setLlmReady] = useState(false);
  /** True once we've auto-started OR user manually stopped. Prevents re-auto-start. */
  const autoStartDone = useRef(false);

  // Poll localStorage + agent state every 500ms.
  // Auto-start once when LLM first becomes ready.
  useEffect(() => {
    const check = () => {
      const ready = isLLMEnabled() && !!getApiKey();
      setLlmReady(ready);
      const running = isAgentRunning();
      setAgentRunning(running);
      // Auto-start exactly once
      if (ready && !running && !autoStartDone.current) {
        autoStartDone.current = true;
        startAgent();
        setAgentRunning(true);
      }
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAgent = () => {
    if (agentRunning) {
      autoStartDone.current = true; // prevent re-auto-start
      stopAgent();
      setAgentRunning(false);
    } else {
      startAgent();
      setAgentRunning(true);
    }
  };

  return (
    <div className="map-toolbar">
      <button className="toolbar-btn" title={t('toolbar.viewStatus')} onClick={onShowStatus}>
        📊
      </button>
      <button className="toolbar-btn" title={t('toolbar.save')} onClick={onShowSave}>
        💾
      </button>
      <button className="toolbar-btn" title={t('toolbar.load')} onClick={onShowLoad}>
        📂
      </button>
      <button className="toolbar-btn" title={t('toolbar.settings')} onClick={() => setPhase('settings')}>
        ⚙️
      </button>
      <button className="toolbar-btn" title={t('toolbar.returnToTitle')} onClick={() => setPhase('title')}>
        🏠
      </button>

      {/* LLM Agent Toggle */}
      {llmReady && (
        <button
          className={`toolbar-btn ${agentRunning ? 'toolbar-btn-active' : ''}`}
          title={agentRunning ? t('settings.llmStop') : t('settings.llmStart')}
          onClick={handleToggleAgent}
        >
          🤖
        </button>
      )}

      <style>{`
        .map-toolbar {
          position: absolute;
          top: 90px;
          left: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 50;
        }
        .toolbar-btn {
          width: 40px;
          height: 40px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid #475569;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 1.2rem;
          backdrop-filter: blur(4px);
          transition: all 0.2s;
        }
        .toolbar-btn:hover {
          background: #334155;
          transform: scale(1.05);
        }
        .toolbar-btn-active {
          background: rgba(167, 139, 250, 0.3);
          border-color: #a78bfa;
          animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 4px rgba(167, 139, 250, 0.3); }
          50% { box-shadow: 0 0 12px rgba(167, 139, 250, 0.6); }
        }
      `}</style>
    </div>
  );
}
