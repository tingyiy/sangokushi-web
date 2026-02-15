/**
 * Unified OpenAI-compatible chat completions client.
 *
 * Works with any provider that exposes a /chat/completions endpoint:
 * OpenRouter, Gemini, Bedrock, Ollama, etc.
 *
 * Reads endpoint URL, API key, and model from config.ts (localStorage).
 */

import { getApiKey, getModelId, getEndpoint } from './config';
import { llmLog } from './log';

// ── Types ───────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionError {
  error: {
    code: number;
    message: string;
  };
}

// ── Client ──────────────────────────────────────────────

/**
 * Send a chat completion request to the configured endpoint.
 * Returns the assistant's response text.
 * Throws on network errors or API errors.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ text: string; model: string; usage?: ChatCompletionResponse['usage'] }> {
  const apiKey = getApiKey();
  const endpoint = getEndpoint();

  if (!apiKey) {
    throw new Error('API key not set. Go to Settings to configure it.');
  }

  const model = options?.model ?? getModelId();
  const temperature = options?.temperature ?? 0.7;

  llmLog('api', `Requesting ${model} (${messages.length} messages, temp=${temperature})`);

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
  };
  if (options?.maxTokens) {
    body.max_tokens = options.maxTokens;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMessage = `API error: ${res.status}`;
    try {
      const errorBody = await res.json() as ChatCompletionError;
      if (errorBody.error?.message) {
        errorMessage = errorBody.error.message;
      }
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errorMessage);
  }

  const data = await res.json() as ChatCompletionResponse;
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('API returned empty response');
  }

  llmLog('api', `Response from ${data.model}: ${choice.message.content.length} chars, ${data.usage?.total_tokens ?? '?'} tokens`);

  return {
    text: choice.message.content,
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Validate an API key by making a lightweight request to the configured endpoint.
 * Returns true if the key is valid (not 401/403).
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  const endpoint = getEndpoint();
  const model = getModelId();

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    });
    // 401/403 = invalid key, anything else means the key works
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}
