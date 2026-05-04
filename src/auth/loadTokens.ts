import { readFile } from "node:fs/promises";
import type { StoredSpotifyTokens } from "./types";

export async function readStoredTokens(
  tokenPath: string,
): Promise<StoredSpotifyTokens | null> {
  try {
    const raw = await readFile(tokenPath, "utf8");
    const data = JSON.parse(raw) as StoredSpotifyTokens;
    if (
      typeof data.access_token !== "string" ||
      typeof data.refresh_token !== "string" ||
      typeof data.expires_at !== "number"
    ) {
      return null;
    }
    return data;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw e;
  }
}
