/**
 * LLM configuration — API key management, model selection, localStorage persistence.
 *
 * localStorage keys:
 *   rtk4_llm_api_key   — OpenRouter API key
 *   rtk4_llm_model     — selected model ID
 *   rtk4_llm_enabled   — whether LLM player is active ('true' / 'false')
 */

// ── localStorage keys ───────────────────────────────────
const KEY_API_KEY = 'rtk4_llm_api_key';
const KEY_MODEL = 'rtk4_llm_model';
const KEY_ENABLED = 'rtk4_llm_enabled';

// ── Model types ─────────────────────────────────────────
export interface LLMModel {
  id: string;
  name: string;
  contextLength: number;
  free: boolean;
}

/**
 * Fallback list used only when the API fetch fails.
 * These are meta-models that are always available.
 */
export const FALLBACK_MODELS: LLMModel[] = [
  {
    id: 'openrouter/auto',
    name: 'Auto (OpenRouter picks)',
    contextLength: 128000,
    free: false,
  },
];

/**
 * Default model — a fast instruction-following model, NOT a reasoning model.
 * Reasoning models (deepseek-r1, qwen-thinking, etc.) are too slow for
 * real-time game play due to long chain-of-thought output.
 */
export const DEFAULT_MODEL_ID = 'meta-llama/llama-3.3-70b-instruct:free';

// ── API Key ─────────────────────────────────────────────

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_API_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_API_KEY, key.trim());
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY_API_KEY);
}

// ── Model ───────────────────────────────────────────────

export function getModelId(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL_ID;
  return localStorage.getItem(KEY_MODEL) || DEFAULT_MODEL_ID;
}

export function setModelId(modelId: string): void {
  localStorage.setItem(KEY_MODEL, modelId);
}

// ── LLM Enabled ─────────────────────────────────────────

export function isLLMEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY_ENABLED) === 'true';
}

export function setLLMEnabled(enabled: boolean): void {
  localStorage.setItem(KEY_ENABLED, enabled ? 'true' : 'false');
}

// ── Validate key format ─────────────────────────────────

/** Basic check — OpenRouter keys start with 'sk-or-' */
export function isValidKeyFormat(key: string): boolean {
  return key.trim().startsWith('sk-or-') && key.trim().length > 20;
}

// ── Fetch models from OpenRouter API ────────────────────

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
}

/**
 * Minimum context length for a model to be useful as a game agent.
 * The strategic prompt + state can be 4-8k tokens.
 */
const MIN_CONTEXT_LENGTH = 16000;

/**
 * Patterns that identify reasoning/thinking models.
 * These are slow for real-time game play and should be listed last.
 */
const REASONING_PATTERNS = ['-r1', 'thinking', '-reasoner'];

function isReasoningModel(id: string): boolean {
  const lower = id.toLowerCase();
  return REASONING_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Fetch available free models from the OpenRouter API.
 * Fast instruction-following models are sorted first.
 * Reasoning/thinking models are sorted last (marked with label).
 * Filters out models with tiny context windows.
 */
export async function fetchFreeModels(): Promise<LLMModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data = await res.json();
  const all = data.data as OpenRouterModelInfo[];

  const free = all
    .filter(
      (m) =>
        (m.pricing.prompt === '0' || parseFloat(m.pricing.prompt) === 0) &&
        m.context_length >= MIN_CONTEXT_LENGTH
    )
    .map((m): LLMModel => {
      const reasoning = isReasoningModel(m.id);
      return {
        id: m.id,
        name: reasoning ? `${m.name} [slow]` : m.name,
        contextLength: m.context_length,
        free: true,
      };
    })
    .sort((a, b) => {
      // Non-reasoning first, then reasoning
      const aReasoning = isReasoningModel(a.id);
      const bReasoning = isReasoningModel(b.id);
      if (aReasoning !== bReasoning) return aReasoning ? 1 : -1;
      // Within each group, sort by context length descending
      return b.contextLength - a.contextLength;
    });

  return free;
}
