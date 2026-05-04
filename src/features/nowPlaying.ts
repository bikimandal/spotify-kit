import { SpotifyClient } from "../core/spotifyClient";
import { ENDPOINTS } from "../core/endpoints";
import type { SpotifyCurrentlyPlayingResponse, Track } from "../types/track";
import { formatTrack } from "../utils/formatters";
import { requireOAuthConfigFromEnv, toCredentials } from "../auth/config";
import type { SpotifyOAuthCredentials } from "../auth/types";
import { getValidAccessToken } from "../auth/session";

export type GetNowPlayingOptions =
  | {
      /** Pass a token you manage yourself (no refresh in this package). */
      accessToken: string;
      cacheTtlMs?: number;
      retries?: number;
      retryBaseDelayMs?: number;
    }
  | {
      clientId: string;
      clientSecret: string;
      /** Must match a Redirect URI in your Spotify app settings (same rules as `SPOTIFY_REDIRECT_URI`). */
      redirectUri: string;
      tokenPath?: string;
      cacheTtlMs?: number;
      retries?: number;
      retryBaseDelayMs?: number;
    }
  | {
      /**
       * Use `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`,
       * and optional `SPOTIFY_TOKEN_PATH` from the environment.
       */
      fromEnv?: true;
      tokenPath?: string;
      cacheTtlMs?: number;
      retries?: number;
      retryBaseDelayMs?: number;
    };

interface CacheEntry {
  expiresAt: number;
  value: Track | null;
}

const cache = new Map<string, CacheEntry>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetry(status: number | undefined): boolean {
  if (status === undefined) return true;
  return status >= 500 && status < 600;
}

async function withRetries<T>(
  fn: () => Promise<T>,
  retries: number,
  baseDelayMs: number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const status =
        typeof e === "object" && e !== null && "status" in e
          ? (e as { status: number }).status
          : undefined;
      if (attempt === retries || !shouldRetry(status)) {
        throw e;
      }
      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
    }
  }
  throw lastError;
}

function isDirectToken(
  options: GetNowPlayingOptions | undefined,
): options is Extract<GetNowPlayingOptions, { accessToken: string }> {
  return (
    !!options &&
    "accessToken" in options &&
    typeof options.accessToken === "string" &&
    options.accessToken.length > 0
  );
}

function isExplicitOAuth(
  options: GetNowPlayingOptions | undefined,
): options is Extract<
  GetNowPlayingOptions,
  { clientId: string; clientSecret: string; redirectUri: string }
> {
  return (
    !!options &&
    "clientId" in options &&
    typeof options.clientId === "string" &&
    options.clientId.length > 0 &&
    "clientSecret" in options &&
    typeof options.clientSecret === "string" &&
    options.clientSecret.length > 0 &&
    "redirectUri" in options &&
    typeof options.redirectUri === "string" &&
    options.redirectUri.trim().length > 0
  );
}

function resolveOAuthCredentials(
  options?: GetNowPlayingOptions,
): SpotifyOAuthCredentials {
  if (isExplicitOAuth(options)) {
    return toCredentials({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      redirectUri: options.redirectUri,
      tokenPath: options.tokenPath,
    });
  }
  const fromEnv = requireOAuthConfigFromEnv();
  if (
    options &&
    "tokenPath" in options &&
    typeof options.tokenPath === "string" &&
    options.tokenPath.length > 0
  ) {
    return { ...fromEnv, tokenPath: options.tokenPath };
  }
  return fromEnv;
}

function cacheKeyForOAuth(creds: SpotifyOAuthCredentials): string {
  return `oauth:${creds.clientId}:${creds.tokenPath}`;
}

async function resolveAccessToken(
  options?: GetNowPlayingOptions,
): Promise<{ accessToken: string; cacheKey: string }> {
  if (isDirectToken(options)) {
    return { accessToken: options.accessToken, cacheKey: options.accessToken };
  }
  const creds = resolveOAuthCredentials(options);
  const accessToken = await getValidAccessToken(creds);
  return { accessToken, cacheKey: cacheKeyForOAuth(creds) };
}

async function getNowPlayingCore(
  accessToken: string,
  cacheKey: string,
  cacheTtlMs: number | undefined,
  retries: number,
  retryBaseDelayMs: number,
): Promise<Track | null> {
  if (cacheTtlMs !== undefined && cacheTtlMs > 0) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }
  }

  const client = new SpotifyClient(accessToken);

  const result = await withRetries(
    () => client.request<SpotifyCurrentlyPlayingResponse>(ENDPOINTS.NOW_PLAYING),
    retries,
    retryBaseDelayMs,
  );

  if (result.status === 204 || result.data === null) {
    if (cacheTtlMs !== undefined && cacheTtlMs > 0) {
      cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, value: null });
    }
    return null;
  }

  const data = result.data;
  if (!data.item) {
    if (cacheTtlMs !== undefined && cacheTtlMs > 0) {
      cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, value: null });
    }
    return null;
  }

  const track = formatTrack(data.item, Boolean(data.is_playing));

  if (cacheTtlMs !== undefined && cacheTtlMs > 0) {
    cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, value: track });
  }

  return track;
}

/**
 * Fetch the user’s currently playing track.
 *
 * - **No arguments / env mode**: uses `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`,
 *   reads tokens from disk (see `login()`), refreshes when needed.
 * - **Explicit OAuth**: pass `clientId`, `clientSecret`, `redirectUri`, optional `tokenPath`.
 * - **Direct token**: pass `accessToken` only (no automatic refresh).
 */
export async function getNowPlaying(
  options?: GetNowPlayingOptions,
): Promise<Track | null> {
  const retries = options?.retries ?? 0;
  const retryBaseDelayMs = options?.retryBaseDelayMs ?? 200;
  const cacheTtlMs = options?.cacheTtlMs;

  const { accessToken, cacheKey } = await resolveAccessToken(options);

  return getNowPlayingCore(
    accessToken,
    cacheKey,
    cacheTtlMs,
    retries,
    retryBaseDelayMs,
  );
}

/** Clears in-memory now-playing cache (not the OAuth token file). */
export function clearNowPlayingCache(): void {
  cache.clear();
}
