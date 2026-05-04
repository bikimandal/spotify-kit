export { getNowPlaying, clearNowPlayingCache } from "./features/nowPlaying";
export type { GetNowPlayingOptions } from "./features/nowPlaying";
export type { Track, SpotifyTrackItem, SpotifyCurrentlyPlayingResponse } from "./types/track";
export { SpotifyClient, SpotifyApiError } from "./core/spotifyClient";
export type { SpotifyRequestResult } from "./core/spotifyClient";
export { ENDPOINTS } from "./core/endpoints";
export { formatTrack } from "./utils/formatters";

export { login } from "./auth/login";
export {
  loadOAuthConfigFromEnv,
  requireOAuthConfigFromEnv,
  toCredentials,
  defaultTokenPath,
} from "./auth/config";
export {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
  DEFAULT_OAUTH_SCOPES,
} from "./auth/oauth";
export { getValidAccessToken } from "./auth/session";
export { readStoredTokens } from "./auth/loadTokens";
export { writeStoredTokens } from "./auth/persistTokens";
export type { StoredSpotifyTokens, SpotifyOAuthCredentials } from "./auth/types";
