import type { SpotifyOAuthCredentials } from "./types";

const DEFAULT_TOKEN_FILE = ".spotify-kit-tokens.json";

export function defaultTokenPath(): string {
  return process.env.SPOTIFY_TOKEN_PATH?.trim() || DEFAULT_TOKEN_FILE;
}

/**
 * Read OAuth settings from the environment.
 * `SPOTIFY_REDIRECT_URI` is required: it must match a Redirect URI allowlisted in the Spotify Developer Dashboard.
 */
export function loadOAuthConfigFromEnv(): SpotifyOAuthCredentials | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    tokenPath: defaultTokenPath(),
  };
}

export function requireOAuthConfigFromEnv(): SpotifyOAuthCredentials {
  const c = loadOAuthConfigFromEnv();
  if (!c) {
    throw new Error(
      "Missing Spotify OAuth env. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI (and optionally SPOTIFY_TOKEN_PATH).",
    );
  }
  return c;
}

export function toCredentials(
  partial: Partial<SpotifyOAuthCredentials> & {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  },
): SpotifyOAuthCredentials {
  return {
    clientId: partial.clientId,
    clientSecret: partial.clientSecret,
    redirectUri: partial.redirectUri.trim(),
    tokenPath: partial.tokenPath ?? defaultTokenPath(),
  };
}
