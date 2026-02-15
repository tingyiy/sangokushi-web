/**
 * LLM Agent Status — reactive state that the UI can subscribe to.
 *
 * The agent writes status updates here; React components subscribe
 * via useLLMStatus() hook. This decouples the agent from React.
 */

export type LLMAgentStatus = 'idle' | 'thinking' | 'executing' | 'error';

export interface LLMStatusState {
  status: LLMAgentStatus;
  /** Current action being executed, or last error message */
  message: string;
  /** Error message (persists until cleared) */
  error: string | null;
  /** Which turn the agent is on */
  turn: string;
}

type Listener = (state: LLMStatusState) => void;

let _state: LLMStatusState = {
  status: 'idle',
  message: '',
  error: null,
  turn: '',
};

const _listeners = new Set<Listener>();

function notify(): void {
  for (const fn of _listeners) {
    fn(_state);
  }
}

// ── Mutations (called by the agent) ─────────────────────

export function setLLMStatus(status: LLMAgentStatus, message: string): void {
  _state = { ..._state, status, message };
  if (status === 'error') {
    _state.error = message;
  }
  notify();
}

export function setLLMTurn(turn: string): void {
  _state = { ..._state, turn };
  notify();
}

export function clearLLMError(): void {
  _state = { ..._state, error: null };
  notify();
}

export function resetLLMStatus(): void {
  _state = { status: 'idle', message: '', error: null, turn: '' };
  notify();
}

// ── Subscription (called by React) ──────────────────────

export function getLLMStatus(): LLMStatusState {
  return _state;
}

export function subscribeLLMStatus(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
