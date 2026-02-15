/**
 * LLM configuration — generic OpenAI-compatible endpoint.
 *
 * All providers (OpenRouter, Gemini, Bedrock, Ollama, etc.) expose an
 * OpenAI-compatible /chat/completions endpoint. We just store:
 *   - Endpoint URL
 *   - API key (bearer token)
 *   - Model ID
 *
 * Presets provide quick-fill for common providers.
 *
 * localStorage keys:
 *   rtk4_llm_endpoint  — chat completions URL
 *   rtk4_llm_api_key   — API key / bearer token
 *   rtk4_llm_model     — model ID
 *   rtk4_llm_enabled   — whether LLM player is active ('true' / 'false')
 */

// ── Presets ─────────────────────────────────────────────

export interface ProviderPreset {
  id: string;
  name: string;
  endpoint: string;
  keyPlaceholder: string;
  defaultModel: string;
}

export const PRESETS: ProviderPreset[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyPlaceholder: 'sk-or-...',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    keyPlaceholder: 'AIza...',
    defaultModel: 'gemini-2.5-flash-preview-05-20',
  },
  {
    id: 'bedrock',
    name: 'AWS Bedrock',
    endpoint: 'https://bedrock-runtime.us-west-2.amazonaws.com/openai/v1/chat/completions',
    keyPlaceholder: 'Bearer token...',
    defaultModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
  },
  {
    id: 'ollama',
    name: 'Ollama (local)',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    keyPlaceholder: '(not required)',
    defaultModel: 'llama3.2',
  },
];

// ── localStorage keys ───────────────────────────────────

const KEY_ENDPOINT = 'rtk4_llm_endpoint';
const KEY_API_KEY = 'rtk4_llm_api_key';
const KEY_MODEL = 'rtk4_llm_model';
const KEY_ENABLED = 'rtk4_llm_enabled';

const DEFAULT_ENDPOINT = PRESETS[0].endpoint;
const DEFAULT_MODEL = PRESETS[0].defaultModel;

// ── Endpoint ────────────────────────────────────────────

export function getEndpoint(): string {
  if (typeof window === 'undefined') return DEFAULT_ENDPOINT;
  return localStorage.getItem(KEY_ENDPOINT) || DEFAULT_ENDPOINT;
}

export function setEndpoint(url: string): void {
  localStorage.setItem(KEY_ENDPOINT, url.trim());
}

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
  if (typeof window === 'undefined') return DEFAULT_MODEL;
  return localStorage.getItem(KEY_MODEL) || DEFAULT_MODEL;
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

// ── Preset detection ────────────────────────────────────

/** Find which preset matches the current endpoint, if any. */
export function getActivePreset(): ProviderPreset | null {
  const endpoint = getEndpoint();
  return PRESETS.find(p => p.endpoint === endpoint) ?? null;
}

// ── Model types ─────────────────────────────────────────

export interface LLMModel {
  id: string;
  name: string;
  contextLength: number;
  free: boolean;
}

// ── Fetch models ────────────────────────────────────────

const REASONING_PATTERNS = ['-r1', 'thinking', '-reasoner'];

function isReasoningModel(id: string): boolean {
  const lower = id.toLowerCase();
  return REASONING_PATTERNS.some((p) => lower.includes(p));
}

const MIN_CONTEXT_LENGTH = 16000;

interface OpenRouterModelInfo {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
}

/**
 * Fetch models for the current endpoint.
 * Currently only supports OpenRouter and Gemini model listing.
 * Returns empty array for unknown endpoints.
 */
export async function fetchModels(): Promise<LLMModel[]> {
  const endpoint = getEndpoint();

  // OpenRouter
  if (endpoint.includes('openrouter.ai')) {
    return fetchOpenRouterModels();
  }

  // Gemini — use the native models endpoint with the stored API key
  if (endpoint.includes('generativelanguage.googleapis.com')) {
    return fetchGeminiModels();
  }

  return [];
}

async function fetchOpenRouterModels(): Promise<LLMModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data = await res.json();
  const all = data.data as OpenRouterModelInfo[];

  return all
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
      const aR = isReasoningModel(a.id);
      const bR = isReasoningModel(b.id);
      if (aR !== bR) return aR ? 1 : -1;
      return b.contextLength - a.contextLength;
    });
}

async function fetchGeminiModels(): Promise<LLMModel[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as {
      models: { name: string; displayName: string; supportedGenerationMethods: string[]; inputTokenLimit?: number }[];
    };
    return data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        name: m.displayName,
        contextLength: m.inputTokenLimit ?? 0,
        free: true,
      }))
      .sort((a, b) => b.contextLength - a.contextLength);
  } catch {
    return [];
  }
}
