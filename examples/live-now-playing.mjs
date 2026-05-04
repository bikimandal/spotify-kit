/**
 * Live test: OAuth env vars + token file (same as a normal app).
 *
 * See testing-in-dev.example.md in the repo for the full checklist.
 * Prerequisite: npm run login (once). Then: npm run test:live
 */

import { getNowPlaying, SpotifyApiError } from "../dist/index.js";

const required = [
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    "Missing env: " +
      missing.join(", ") +
      "\nSet them in your shell or a .env file (load .env yourself), then run `npm run login` once.\n" +
      "SPOTIFY_REDIRECT_URI must match a Redirect URI in your Spotify app settings (e.g. http://127.0.0.1:8888/callback).",
  );
  process.exit(1);
}

try {
  const track = await getNowPlaying();
  if (!track) {
    console.log("Nothing playing (204 or no item). Start playback in Spotify.");
  } else {
    console.log(JSON.stringify(track, null, 2));
  }
} catch (e) {
  if (e instanceof SpotifyApiError) {
    console.error("Spotify API error:", e.status, e.message);
    if (e.body) console.error(e.body);
  } else {
    console.error(e);
  }
  process.exit(1);
}
