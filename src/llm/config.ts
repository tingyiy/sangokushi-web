/**
 * LLM configuration — per-provider credential storage.
 *
 * Each provider (OpenRouter, Gemini, Bedrock, Ollama, custom) stores its own
 * credentials independently. Multiple providers can be configured at once.
 * A "default provider" is used unless a per-ruler assignment overrides it.
 *
 * localStorage keys:
 *   rtk4_llm_providers        — JSON: { [providerId]: ProviderConfig }
 *   rtk4_llm_default_provider — default provider ID (used when no per-ruler override)
 *   rtk4_llm_ruler_providers  — JSON: { [rulerId]: providerId } per-ruler assignments
 *
 * Legacy flat keys (migrated on first access):
 *   rtk4_llm_endpoint, rtk4_llm_api_key, rtk4_llm_model, rtk4_llm_auth_mode
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

// ── Per-provider config type ────────────────────────────

export type AuthMode = 'apiKey' | 'oauth';

export interface ProviderConfig {
  endpoint: string;
  apiKey: string | null;
  model: string;
  authMode: AuthMode;
}

// ── localStorage keys ───────────────────────────────────

const KEY_PROVIDERS = 'rtk4_llm_providers';
const KEY_DEFAULT_PROVIDER = 'rtk4_llm_default_provider';
const KEY_RULER_PROVIDERS = 'rtk4_llm_ruler_providers';

// Legacy flat keys (for migration only)
const LEGACY_KEY_ENDPOINT = 'rtk4_llm_endpoint';
const LEGACY_KEY_API_KEY = 'rtk4_llm_api_key';
const LEGACY_KEY_MODEL = 'rtk4_llm_model';
const LEGACY_KEY_AUTH_MODE = 'rtk4_llm_auth_mode';
// Also check the old "active_provider" key from intermediate migration
const LEGACY_KEY_ACTIVE_PROVIDER = 'rtk4_llm_active_provider';

const FIRST_PRESET_ID = PRESETS[0].id;

// ── Migration ───────────────────────────────────────────

let _migrated = false;

/**
 * One-time migration from legacy flat keys to per-provider storage.
 * Detects which provider the legacy config belonged to (by matching endpoint
 * to a preset) and stores it under that provider ID.
 */
function migrateLegacyConfig(): void {
  if (_migrated) return;
  _migrated = true;
  if (typeof window === 'undefined') return;

  // Already migrated — providers blob exists
  if (localStorage.getItem(KEY_PROVIDERS)) {
    // But also rename active_provider → default_provider if needed
    const oldActive = localStorage.getItem(LEGACY_KEY_ACTIVE_PROVIDER);
    if (oldActive && !localStorage.getItem(KEY_DEFAULT_PROVIDER)) {
      localStorage.setItem(KEY_DEFAULT_PROVIDER, oldActive);
      localStorage.removeItem(LEGACY_KEY_ACTIVE_PROVIDER);
    }
    return;
  }

  const legacyEndpoint = localStorage.getItem(LEGACY_KEY_ENDPOINT);
  const legacyApiKey = localStorage.getItem(LEGACY_KEY_API_KEY);
  const legacyModel = localStorage.getItem(LEGACY_KEY_MODEL);
  const legacyAuthMode = localStorage.getItem(LEGACY_KEY_AUTH_MODE) as AuthMode | null;

  // No legacy config at all — nothing to migrate
  if (!legacyEndpoint && !legacyApiKey && !legacyModel) return;

  // Figure out which preset the legacy endpoint matches
  const matchedPreset = PRESETS.find(p => p.endpoint === legacyEndpoint);
  const providerId = matchedPreset?.id ?? 'custom';

  const config: ProviderConfig = {
    endpoint: legacyEndpoint ?? PRESETS[0].endpoint,
    apiKey: legacyApiKey ?? null,
    model: legacyModel ?? (matchedPreset?.defaultModel ?? PRESETS[0].defaultModel),
    authMode: legacyAuthMode ?? 'apiKey',
  };

  const providers: Record<string, ProviderConfig> = { [providerId]: config };
  localStorage.setItem(KEY_PROVIDERS, JSON.stringify(providers));
  localStorage.setItem(KEY_DEFAULT_PROVIDER, providerId);

  // Clean up legacy keys
  localStorage.removeItem(LEGACY_KEY_ENDPOINT);
  localStorage.removeItem(LEGACY_KEY_API_KEY);
  localStorage.removeItem(LEGACY_KEY_MODEL);
  localStorage.removeItem(LEGACY_KEY_AUTH_MODE);
}

// ── Provider storage helpers ────────────────────────────

function getAllProviders(): Record<string, ProviderConfig> {
  if (typeof window === 'undefined') return {};
  migrateLegacyConfig();
  try {
    const raw = localStorage.getItem(KEY_PROVIDERS);
    return raw ? JSON.parse(raw) as Record<string, ProviderConfig> : {};
  } catch {
    return {};
  }
}

function saveAllProviders(providers: Record<string, ProviderConfig>): void {
  localStorage.setItem(KEY_PROVIDERS, JSON.stringify(providers));
}

/** Get the config for a specific provider, or create a default from its preset. */
export function getProviderConfig(providerId: string): ProviderConfig {
  const providers = getAllProviders();
  if (providers[providerId]) return providers[providerId];

  // Return defaults from preset (or empty for custom/unknown)
  const preset = PRESETS.find(p => p.id === providerId);
  return {
    endpoint: preset?.endpoint ?? '',
    apiKey: null,
    model: preset?.defaultModel ?? '',
    authMode: 'apiKey',
  };
}

/** Save config for a specific provider (merges with existing). */
export function setProviderConfig(providerId: string, config: Partial<ProviderConfig>): void {
  const providers = getAllProviders();
  const existing = providers[providerId] ?? getProviderConfig(providerId);
  providers[providerId] = { ...existing, ...config };
  saveAllProviders(providers);
}

// ── Default provider ────────────────────────────────────

export function getDefaultProviderId(): string {
  if (typeof window === 'undefined') return FIRST_PRESET_ID;
  migrateLegacyConfig();
  return localStorage.getItem(KEY_DEFAULT_PROVIDER) ?? FIRST_PRESET_ID;
}

export function setDefaultProviderId(providerId: string): void {
  localStorage.setItem(KEY_DEFAULT_PROVIDER, providerId);
}

// ── Per-ruler provider assignment ───────────────────────

/** Get the provider assigned to a specific ruler, or null (= use default). */
export function getRulerProviderId(rulerId: number): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY_RULER_PROVIDERS);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[String(rulerId)] ?? null;
  } catch {
    return null;
  }
}

/** Assign a provider to a ruler. Pass null to clear (revert to default). */
export function setRulerProviderId(rulerId: number, providerId: string | null): void {
  let map: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(KEY_RULER_PROVIDERS);
    if (raw) map = JSON.parse(raw) as Record<string, string>;
  } catch { /* fresh map */ }
  if (providerId === null) {
    delete map[String(rulerId)];
  } else {
    map[String(rulerId)] = providerId;
  }
  localStorage.setItem(KEY_RULER_PROVIDERS, JSON.stringify(map));
}

/** Get all ruler→provider assignments. */
export function getAllRulerProviders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY_RULER_PROVIDERS);
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch {
    return {};
  }
}

// ── Effective provider for a ruler ──────────────────────

/**
 * Get the effective provider ID for a ruler.
 * Returns per-ruler override if set, otherwise the default provider.
 */
export function getEffectiveProviderId(rulerId?: number): string {
  if (rulerId !== undefined) {
    const override = getRulerProviderId(rulerId);
    if (override) return override;
  }
  return getDefaultProviderId();
}

/**
 * Get the full config for a ruler's effective provider.
 * Used by the agent loop to get the right credentials for the current ruler.
 */
export function getEffectiveConfig(rulerId?: number): ProviderConfig {
  return getProviderConfig(getEffectiveProviderId(rulerId));
}

// ── Public API (backward-compatible) ────────────────────
// These functions read/write the DEFAULT provider's config.
// The agent loop should prefer getEffectiveConfig(rulerId) instead.

export function getEndpoint(): string {
  if (typeof window === 'undefined') return PRESETS[0].endpoint;
  return getProviderConfig(getDefaultProviderId()).endpoint || PRESETS[0].endpoint;
}

export function setEndpoint(url: string): void {
  setProviderConfig(getDefaultProviderId(), { endpoint: url.trim() });
}

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return getProviderConfig(getDefaultProviderId()).apiKey;
}

export function setApiKey(key: string): void {
  setProviderConfig(getDefaultProviderId(), { apiKey: key.trim() });
}

export function clearApiKey(): void {
  setProviderConfig(getDefaultProviderId(), { apiKey: null });
}

export function getAuthMode(): AuthMode {
  if (typeof window === 'undefined') return 'apiKey';
  return getProviderConfig(getDefaultProviderId()).authMode;
}

export function setAuthMode(mode: AuthMode): void {
  setProviderConfig(getDefaultProviderId(), { authMode: mode });
}

/**
 * Get the current access token for API requests.
 * Checks both API key and OAuth token based on auth mode.
 * Returns null if no valid credential is available.
 */
export function getAccessToken(): string | null {
  const mode = getAuthMode();
  if (mode === 'oauth') {
    return _getOAuthToken?.() ?? null;
  }
  return getApiKey();
}

// OAuth token getter — set by googleAuth.ts when loaded (avoids circular import)
let _getOAuthToken: (() => string | null) | null = null;

/** Called by googleAuth.ts to register its token getter */
export function registerOAuthTokenGetter(getter: () => string | null): void {
  _getOAuthToken = getter;
}

export function getModelId(): string {
  if (typeof window === 'undefined') return PRESETS[0].defaultModel;
  return getProviderConfig(getDefaultProviderId()).model || PRESETS[0].defaultModel;
}

export function setModelId(modelId: string): void {
  setProviderConfig(getDefaultProviderId(), { model: modelId.trim() });
}

// ── LLM Enabled ─────────────────────────────────────────

/**
 * Check if LLM play is active for any ruler.
 * Returns true if at least one ruler has a provider assigned.
 */
export function isLLMEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const rulers = getAllRulerProviders();
  return Object.keys(rulers).length > 0;
}

/**
 * @deprecated Use setRulerProviderId / clearAllRulerProviders instead.
 * Kept for backward compatibility with existing callers.
 */
export function setLLMEnabled(_enabled: boolean): void {
  // No-op — enablement is now driven by per-ruler provider assignment.
  // Callers should migrate to setRulerProviderId().
}

/** Remove all ruler→provider assignments (disables LLM for everyone). */
export function clearAllRulerProviders(): void {
  localStorage.removeItem(KEY_RULER_PROVIDERS);
}

// ── Preset detection ────────────────────────────────────

/** Find which preset matches the default provider, if any. */
export function getActivePreset(): ProviderPreset | null {
  const id = getDefaultProviderId();
  return PRESETS.find(p => p.id === id) ?? null;
}

// ── Switching providers ─────────────────────────────────

/**
 * Switch the default provider. Loads that provider's stored credentials.
 * If the provider has no stored config yet, initializes from preset defaults.
 * Other providers' credentials remain untouched.
 */
export function switchProvider(providerId: string): void {
  // Ensure the provider has a config entry (creates from preset defaults if needed)
  const providers = getAllProviders();
  if (!providers[providerId]) {
    const preset = PRESETS.find(p => p.id === providerId);
    providers[providerId] = {
      endpoint: preset?.endpoint ?? '',
      apiKey: null,
      model: preset?.defaultModel ?? '',
      authMode: 'apiKey',
    };
    saveAllProviders(providers);
  }
  setDefaultProviderId(providerId);
}

// ── Provider status helpers ─────────────────────────────

/** Check if a provider has usable credentials (API key or OAuth). */
export function isProviderConfigured(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  if (config.authMode === 'oauth') {
    // OAuth — check if the getter returns a token
    // (only meaningful for the currently active OAuth session)
    return _getOAuthToken?.() !== null;
  }
  return config.apiKey !== null && config.apiKey !== '';
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
 * Fetch models for a given provider (or the default provider if not specified).
 * Currently only supports OpenRouter and Gemini model listing.
 * Returns empty array for unknown endpoints.
 */
export async function fetchModels(providerId?: string): Promise<LLMModel[]> {
  const config = getProviderConfig(providerId ?? getDefaultProviderId());
  const endpoint = config.endpoint;

  // OpenRouter
  if (endpoint.includes('openrouter.ai')) {
    return fetchOpenRouterModels();
  }

  // Gemini — use the native models endpoint with the stored API key
  if (endpoint.includes('generativelanguage.googleapis.com')) {
    return fetchGeminiModels(config);
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

async function fetchGeminiModels(config: ProviderConfig): Promise<LLMModel[]> {
  // Determine the token to use
  let token: string | null = null;
  if (config.authMode === 'oauth') {
    token = _getOAuthToken?.() ?? null;
  } else {
    token = config.apiKey;
  }
  if (!token) return [];

  try {
    // API key: pass as query param. OAuth: pass as Bearer header.
    const url = config.authMode === 'oauth'
      ? 'https://generativelanguage.googleapis.com/v1beta/models'
      : `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(token)}`;
    const headers: Record<string, string> = config.authMode === 'oauth'
      ? { 'Authorization': `Bearer ${token}` }
      : {};
    const res = await fetch(url, { headers });
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

// ── Test helpers ────────────────────────────────────────

/** Reset migration flag (for tests only). */
export function _resetMigration(): void {
  _migrated = false;
}
