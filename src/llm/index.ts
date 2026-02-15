/**
 * LLM Player Module — barrel export.
 *
 * Architecture:
 *   config.ts     — API key, model, localStorage persistence
 *   openrouter.ts — Browser-compatible OpenRouter fetch client
 *   memory.ts     — Turn journal, strategy notes, battle context
 *   prompts.ts    — System prompts and state summarization
 *   agent.ts      — Main agent loop (strategic + tactical)
 *   status.ts     — Reactive status for UI overlay
 *   log.ts        — [RTK-LLM] console logging utility
 */

export { startAgent, stopAgent, isAgentRunning, runStrategicTurn } from './agent';
export {
  getApiKey, setApiKey, clearApiKey,
  getModelId, setModelId,
  isLLMEnabled, setLLMEnabled,
  isValidKeyFormat, FALLBACK_MODELS,
  fetchFreeModels,
} from './config';
export { chatCompletion, validateApiKey } from './openrouter';
export { getMemory, resetMemory } from './memory';
export { llmLog } from './log';
export {
  getLLMStatus, subscribeLLMStatus, setLLMStatus,
  clearLLMError, resetLLMStatus,
} from './status';
