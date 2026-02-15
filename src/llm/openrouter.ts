/**
 * OpenRouter API client — browser-compatible, fetch-based.
 * Uses the Chat Completions endpoint (OpenAI-compatible).
 *
 * Docs: https://openrouter.ai/docs/api-reference/chat-completion
 */

import { getApiKey, getModelId } from './config';
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

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Send a chat completion request to OpenRouter.
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
  if (!apiKey) {
    throw new Error('OpenRouter API key not set. Go to Settings to configure it.');
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

  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'RTK IV - Three Kingdoms Strategy Game',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMessage = `OpenRouter API error: ${res.status}`;
    try {
      const errorBody = await res.json() as ChatCompletionError;
      if (errorBody.error?.message) {
        errorMessage = `OpenRouter: ${errorBody.error.message}`;
      }
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errorMessage);
  }

  const data = await res.json() as ChatCompletionResponse;
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('OpenRouter returned empty response');
  }

  llmLog('api', `Response from ${data.model}: ${choice.message.content.length} chars, ${data.usage?.total_tokens ?? '?'} tokens`);

  return {
    text: choice.message.content,
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Validate an API key by making a lightweight request.
 * Returns true if the key is valid.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    });
    // 401 = invalid key, anything else means the key works
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}
