/**
 * Google OAuth integration for Gemini API access.
 *
 * Uses Google Identity Services (GIS) Token Model for browser-based
 * OAuth 2.0 implicit grant flow. No backend server required.
 *
 * The user clicks "Sign in with Google", sees a consent screen,
 * and gets an access token that works as a Bearer token for the
 * Gemini API (same endpoint, same headers as API key flow).
 */

import { registerOAuthTokenGetter } from './config';

// ── Constants ───────────────────────────────────────────

const GOOGLE_CLIENT_ID = '153518349107-f0phcbe6aop8povri2hvkgncbcjodlbk.apps.googleusercontent.com';
const GEMINI_OAUTH_SCOPE = 'https://www.googleapis.com/auth/generative-language.retriever';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// ── Token State (in-memory, not persisted) ──────────────

let _accessToken: string | null = null;
let _tokenExpiry = 0; // Unix timestamp in ms
let _tokenClient: google.accounts.oauth2.TokenClient | null = null;
let _gisLoaded = false;
let _gisLoadPromise: Promise<void> | null = null;

// ── Subscribers for reactivity ──────────────────────────

type OAuthListener = () => void;
const _listeners: Set<OAuthListener> = new Set();

function notifyListeners(): void {
  _listeners.forEach(fn => fn());
}

/** Subscribe to OAuth state changes (sign in, sign out, token refresh) */
export function subscribeOAuth(listener: OAuthListener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

// ── GIS Script Loader ───────────────────────────────────

/** Dynamically load the Google Identity Services library */
function loadGIS(): Promise<void> {
  if (_gisLoaded) return Promise.resolve();
  if (_gisLoadPromise) return _gisLoadPromise;

  _gisLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google OAuth is only available in browser'));
      return;
    }

    // Check if already loaded (e.g., by another script)
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      _gisLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      _gisLoaded = true;
      resolve();
    };
    script.onerror = () => {
      _gisLoadPromise = null;
      reject(new Error('Failed to load Google Identity Services script'));
    };
    document.head.appendChild(script);
  });

  return _gisLoadPromise;
}

// ── Public API ──────────────────────────────────────────

/** Check if user is signed in with a valid (non-expired) OAuth token */
export function isGoogleSignedIn(): boolean {
  return _accessToken !== null && Date.now() < _tokenExpiry;
}

/** Get the current access token if valid, or null */
export function getGoogleAccessToken(): string | null {
  if (isGoogleSignedIn()) return _accessToken;
  return null;
}

/** Get token expiry time (for UI display) */
export function getTokenExpiry(): number {
  return _tokenExpiry;
}

/**
 * Request a Google OAuth access token via popup consent flow.
 * Returns the access token on success.
 * Throws on user cancellation or error.
 */
export async function requestGoogleToken(): Promise<string> {
  await loadGIS();

  return new Promise<string>((resolve, reject) => {
    if (!_tokenClient) {
      _tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GEMINI_OAUTH_SCOPE,
        callback: (response) => {
          if (response.error) {
            reject(new Error(`Google OAuth error: ${response.error_description || response.error}`));
            return;
          }
          _accessToken = response.access_token;
          _tokenExpiry = Date.now() + (response.expires_in * 1000);
          notifyListeners();
          resolve(response.access_token);
        },
        error_callback: (error) => {
          reject(new Error(`Google OAuth error: ${error.message || error.type}`));
        },
      });
    }

    // If user already granted consent, prompt='' may skip the popup
    _tokenClient.requestAccessToken({
      prompt: isGoogleSignedIn() ? '' : 'consent',
    });
  });
}

/**
 * Ensure we have a valid token. If expired, request a new one.
 * Call this before each API request.
 */
export async function ensureGoogleToken(): Promise<string> {
  if (isGoogleSignedIn()) return _accessToken!;
  return requestGoogleToken();
}

/** Sign out: revoke the token and clear state */
export function googleSignOut(): void {
  if (_accessToken) {
    try {
      google.accounts.oauth2.revoke(_accessToken);
    } catch {
      // Revoke may fail if GIS not loaded or token already expired
    }
  }
  _accessToken = null;
  _tokenExpiry = 0;
  notifyListeners();
}

/** Check if the GIS library is available (loaded or loadable) */
export function isGISAvailable(): boolean {
  return typeof window !== 'undefined';
}

// ── Register with config.ts so getAccessToken() can read OAuth tokens ──
registerOAuthTokenGetter(getGoogleAccessToken);
