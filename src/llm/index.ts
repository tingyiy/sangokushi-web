/**
 * LLM Player Module — barrel export.
 *
 * Architecture:
 *   config.ts      — Generic endpoint + API key + model, localStorage, presets
 *   openrouter.ts  — Unified OpenAI-compatible chat completions client
 *   googleAuth.ts  — Google OAuth for Gemini (browser-only)
 *   memory.ts      — Turn journal, strategy notes, battle context
 *   prompts.ts     — System prompts and state summarization
 *   agent.ts       — Main agent loop (strategic + tactical)
 *   status.ts      — Reactive status store for UI overlay
 *   log.ts         — [RTK-LLM] console logging utility
 */

export { startAgent, stopAgent, isAgentRunning, runStrategicTurn } from './agent';
export {
  getEndpoint, setEndpoint,
  getApiKey, setApiKey, clearApiKey,
  getAccessToken, getAuthMode, setAuthMode,
  getModelId, setModelId,
  isLLMEnabled, setLLMEnabled,
  clearAllRulerProviders,
  getActivePreset, fetchModels,
  PRESETS,
  // Per-provider APIs
  getProviderConfig, setProviderConfig,
  getDefaultProviderId, setDefaultProviderId,
  switchProvider, isProviderConfigured,
  getEffectiveProviderId, getEffectiveConfig,
  // Per-ruler assignment APIs
  getRulerProviderId, setRulerProviderId, getAllRulerProviders,
} from './config';
export type { ProviderPreset, ProviderConfig, LLMModel, AuthMode } from './config';
export { chatCompletion, validateApiKey } from './openrouter';
export type { ChatMessage } from './openrouter';
export {
  isGoogleSignedIn, requestGoogleToken, googleSignOut,
  getGoogleAccessToken, ensureGoogleToken, getTokenExpiry,
  subscribeOAuth,
} from './googleAuth';
export { getMemory, resetMemory } from './memory';
export { llmLog } from './log';
export {
  getLLMStatus, subscribeLLMStatus, setLLMStatus,
  clearLLMError, resetLLMStatus,
} from './status';
