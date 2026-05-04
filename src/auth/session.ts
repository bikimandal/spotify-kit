import type { SpotifyOAuthCredentials } from "./types";
import { readStoredTokens } from "./loadTokens";
import { writeStoredTokens } from "./persistTokens";
import { refreshAccessToken } from "./oauth";

const SKEW_MS = 60_000;

export async function getValidAccessToken(
  creds: SpotifyOAuthCredentials,
): Promise<string> {
  let stored = await readStoredTokens(creds.tokenPath);
  if (!stored) {
    throw new Error(
      `No Spotify tokens at ${creds.tokenPath}. Run login() once (or \`npm run login\`) to authorize this app.`,
    );
  }

  if (stored.expires_at > Date.now() + SKEW_MS) {
    return stored.access_token;
  }

  stored = await refreshAccessToken(creds, stored);
  await writeStoredTokens(creds.tokenPath, stored);
  return stored.access_token;
}
