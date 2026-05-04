import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { StoredSpotifyTokens } from "./types";

export async function writeStoredTokens(
  tokenPath: string,
  tokens: StoredSpotifyTokens,
): Promise<void> {
  const dir = dirname(tokenPath);
  if (dir && dir !== ".") {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(tokenPath, JSON.stringify(tokens, null, 2), "utf8");
}
