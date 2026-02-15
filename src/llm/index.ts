/**
 * LLM Player Module — barrel export.
 *
 * Architecture:
 *   config.ts     — Generic endpoint + API key + model, localStorage, presets
 *   openrouter.ts — Unified OpenAI-compatible chat completions client
 *   memory.ts     — Turn journal, strategy notes, battle context
 *   prompts.ts    — System prompts and state summarization
 *   agent.ts      — Main agent loop (strategic + tactical)
 *   status.ts     — Reactive status store for UI overlay
 *   log.ts        — [RTK-LLM] console logging utility
 */

export { startAgent, stopAgent, isAgentRunning, runStrategicTurn } from './agent';
export {
  getEndpoint, setEndpoint,
  getApiKey, setApiKey, clearApiKey,
  getModelId, setModelId,
  isLLMEnabled, setLLMEnabled,
  getActivePreset, fetchModels,
  PRESETS,
} from './config';
export type { ProviderPreset, LLMModel } from './config';
export { chatCompletion, validateApiKey } from './openrouter';
export type { ChatMessage } from './openrouter';
export { getMemory, resetMemory } from './memory';
export { llmLog } from './log';
export {
  getLLMStatus, subscribeLLMStatus, setLLMStatus,
  clearLLMError, resetLLMStatus,
} from './status';
