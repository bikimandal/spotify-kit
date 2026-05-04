/** Persisted OAuth tokens (written to disk by `login()` / refresh). */
export interface StoredSpotifyTokens {
  access_token: string;
  refresh_token: string;
  /** Unix ms when access_token should be treated as expired (with refresh margin). */
  expires_at: number;
}

export interface SpotifyOAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** File path for StoredSpotifyTokens JSON. Default: `.spotify-kit-tokens.json` in cwd or `SPOTIFY_TOKEN_PATH`. */
  tokenPath: string;
}
