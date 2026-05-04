# spotify-kit

Fetch the authenticated user’s **currently playing** track from the [Spotify Web API](https://developer.spotify.com/documentation/web-api) as a small, typed object.

Set **Client ID**, **Client secret**, and **Redirect URI** in the environment, run **`login()`** once in the browser, and the library stores tokens on disk and **refreshes** them automatically. You can also pass a raw **`accessToken`** if you manage OAuth yourself.

**Node.js 18+** required.

---

## Install

```bash
npm install spotify-kit
```

---

## Example (end-to-end)

**1.** In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add this **exact** redirect URI under your app → **Redirect URIs** (adjust if you use another port):

`http://127.0.0.1:8888/callback`

**2.** Export credentials (same shell you use for login and your app):

```bash
export SPOTIFY_CLIENT_ID="your_client_id"
export SPOTIFY_CLIENT_SECRET="your_client_secret"
export SPOTIFY_REDIRECT_URI="http://127.0.0.1:8888/callback"
```

**3.** Log in once (saves `.spotify-kit-tokens.json` by default):

```bash
npx spotify-kit-login
# or, from a clone of this repo: npm run login
```

**4.** Use in code:

```ts
import { getNowPlaying } from "spotify-kit";

const track = await getNowPlaying();

if (track) {
  console.log(`${track.title} — ${track.artist}`);
  console.log(track.album);
  console.log(track.image ?? "(no art)");
  console.log(track.isPlaying ? "playing" : "paused");
  console.log(track.url);
} else {
  console.log("Nothing playing.");
}
```

**Sample JSON shape** when something is playing:

```json
{
  "title": "Midnight City",
  "artist": "M83",
  "album": "Hurry Up, We're Dreaming",
  "image": "https://i.scdn.co/image/...",
  "isPlaying": true,
  "url": "https://open.spotify.com/track/..."
}
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | App Client ID. |
| `SPOTIFY_CLIENT_SECRET` | Yes | App Client secret. |
| `SPOTIFY_REDIRECT_URI` | Yes | Must match a dashboard Redirect URI exactly. Used by `login()` (http + loopback for the built-in server). |
| `SPOTIFY_TOKEN_PATH` | No | Token JSON path. Default: `.spotify-kit-tokens.json` in `process.cwd()`. |

Do not commit secrets or token files.

---

## API overview

### `getNowPlaying(options?)` → `Promise<Track | null>`

| Mode | Usage |
|------|--------|
| **OAuth (env)** | `getNowPlaying()` or `{ fromEnv?: true, tokenPath?, cacheTtlMs?, retries?, retryBaseDelayMs? }` |
| **OAuth (explicit)** | `{ clientId, clientSecret, redirectUri, tokenPath?, … }` |
| **Raw token** | `{ accessToken, … }` — no token file, **no** refresh in this package |

Returns **`null`** when nothing is playing (Spotify **204** or missing `item`). Throws **`SpotifyApiError`** on failed Web API responses (`status`, optional `body`).

### `Track`

`title`, `artist` (comma-separated), `album`, `image?`, `isPlaying`, `url`.

### Other exports

`login`, `requireOAuthConfigFromEnv`, `loadOAuthConfigFromEnv`, `getValidAccessToken`, `clearNowPlayingCache`, `exchangeAuthorizationCode`, `buildAuthorizationUrl`, `refreshAccessToken`, `SpotifyClient`, `SpotifyApiError`, `ENDPOINTS`, `formatTrack`, and related types — see **`dist/index.d.ts`** after `npm run build`.

### Caching and retries

Optional `cacheTtlMs` (in-memory now-playing cache) and `retries` / `retryBaseDelayMs` (5xx / network only).

---

## Developing this package

```bash
npm install
npm test
npm run build
```

Full local testing steps (dashboard, env, `login`, live script, troubleshooting): **`testing-in-dev.example.md`**.  
You can copy it to **`testing-in-dev.md`** for personal notes; that filename is **gitignored** in this repo.

---

## Publish

```bash
npm run build && npm test
npm publish --access public
```

Set `repository` in `package.json` to your Git URL before publishing.

---

## License

MIT
