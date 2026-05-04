import type { SpotifyOAuthCredentials, StoredSpotifyTokens } from "./types";

const TOKEN_URL = "https://accounts.spotify.com/api/token";

export const DEFAULT_OAUTH_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
] as const;

function basicAuthHeader(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

export function buildAuthorizationUrl(
  creds: Pick<SpotifyOAuthCredentials, "clientId" | "redirectUri">,
  options: { scopes?: string[]; state: string },
): string {
  const scopes = options.scopes ?? [...DEFAULT_OAUTH_SCOPES];
  const state = options.state;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: creds.clientId,
    scope: scopes.join(" "),
    redirect_uri: creds.redirectUri,
    state,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function tokenResponseToStored(
  body: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  },
  previousRefreshToken?: string,
): StoredSpotifyTokens {
  const refresh =
    body.refresh_token ?? previousRefreshToken;
  if (!refresh) {
    throw new Error("Spotify token response missing refresh_token");
  }
  const expiresAt =
    Date.now() + Math.max(0, body.expires_in) * 1000 - 60_000;
  return {
    access_token: body.access_token,
    refresh_token: refresh,
    expires_at: expiresAt,
  };
}

export async function exchangeAuthorizationCode(
  creds: SpotifyOAuthCredentials,
  code: string,
): Promise<StoredSpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: creds.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(creds.clientId, creds.clientSecret),
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Spotify token exchange failed (${res.status}): ${text || res.statusText}`,
    );
  }
  const json = JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return tokenResponseToStored(json);
}

export async function refreshAccessToken(
  creds: Pick<SpotifyOAuthCredentials, "clientId" | "clientSecret">,
  current: StoredSpotifyTokens,
): Promise<StoredSpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: current.refresh_token,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(creds.clientId, creds.clientSecret),
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Spotify token refresh failed (${res.status}): ${text || res.statusText}. Run login() again.`,
    );
  }
  const json = JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return tokenResponseToStored(json, current.refresh_token);
}
