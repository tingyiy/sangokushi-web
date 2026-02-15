import { useState, useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLLMStatus, subscribeLLMStatus, clearLLMError,
} from '../llm/status';
import type { LLMStatusState } from '../llm/status';
import { isAgentRunning } from '../llm/agent';
import { isLLMEnabled, getApiKey } from '../llm/config';

/**
 * LLMStatusOverlay — floating indicator showing LLM agent status.
 * Shows: thinking spinner, current action, errors with dismiss.
 * Only renders when LLM is enabled and has a key.
 */
export function LLMStatusOverlay() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  // Subscribe to LLM status reactively
  const status: LLMStatusState = useSyncExternalStore(
    subscribeLLMStatus,
    getLLMStatus,
  );

  // Check if we should show at all
  useEffect(() => {
    const check = () => {
      setVisible(isLLMEnabled() && !!getApiKey() && isAgentRunning());
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  // Always show if there's an error, even if agent stopped
  const showError = status.error !== null;
  if (!visible && !showError) return null;

  return (
    <div className="llm-status-overlay">
      {/* Running status */}
      {visible && status.status !== 'error' && (
        <div className="llm-status-row">
          <span className="llm-status-indicator">
            {status.status === 'thinking' && <span className="llm-spinner" />}
            {status.status === 'executing' && <span className="llm-pulse" />}
            {status.status === 'idle' && null}
          </span>
          <span className="llm-status-text">
            {status.status === 'thinking' && (status.message || t('settings.llmRunning'))}
            {status.status === 'executing' && status.message}
            {status.status === 'idle' && t('settings.llmRunning')}
          </span>
          {status.turn && (
            <span className="llm-status-turn">{status.turn}</span>
          )}
        </div>
      )}

      {/* Error banner */}
      {showError && (
        <div className="llm-status-error">
          <span className="llm-error-text">{status.error}</span>
          <button className="llm-error-dismiss" onClick={clearLLMError}>
            ✕
          </button>
        </div>
      )}

      <style>{`
        .llm-status-overlay {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          pointer-events: none;
        }
        .llm-status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(30, 41, 59, 0.9);
          border: 1px solid #a78bfa;
          border-radius: 8px;
          backdrop-filter: blur(8px);
          pointer-events: auto;
          max-width: 500px;
        }
        .llm-status-text {
          color: #e5e7eb;
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 350px;
        }
        .llm-status-turn {
          color: #a78bfa;
          font-size: 0.75rem;
          font-weight: bold;
        }
        .llm-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid #a78bfa;
          border-top-color: transparent;
          border-radius: 50%;
          animation: llm-spin 0.8s linear infinite;
        }
        .llm-pulse {
          display: inline-block;
          width: 10px;
          height: 10px;
          background: #34d399;
          border-radius: 50%;
          animation: llm-pulse-anim 1.5s ease-in-out infinite;
        }
        @keyframes llm-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes llm-pulse-anim {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .llm-status-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: rgba(127, 29, 29, 0.9);
          border: 1px solid #f87171;
          border-radius: 8px;
          backdrop-filter: blur(8px);
          pointer-events: auto;
          max-width: 500px;
        }
        .llm-error-text {
          color: #fca5a5;
          font-size: 0.85rem;
          word-break: break-word;
        }
        .llm-error-dismiss {
          background: none;
          border: 1px solid #f87171;
          color: #f87171;
          cursor: pointer;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        .llm-error-dismiss:hover {
          background: rgba(248, 113, 113, 0.2);
        }
      `}</style>
    </div>
  );
}
