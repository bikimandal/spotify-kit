# Testing spotify-kit in development

Use this checklist when working in a **clone of this repo** or a project that depends on `spotify-kit`.  
For a personal copy you can edit freely, run:

```bash
cp testing-in-dev.example.md testing-in-dev.md
```

`testing-in-dev.md` is **gitignored** so it is never committed (safe for pasted tokens or notes).

---

## Prerequisites

- **Node.js 18+**
- A [Spotify Developer](https://developer.spotify.com/dashboard) app with:
  - **Client ID** and **Client secret**
  - Under **Redirect URIs**, an entry that **exactly** matches the URI you will export (e.g. `http://127.0.0.1:8888/callback`)

Built-in `login()` only supports **http** on **loopback** (`127.0.0.1`, `localhost`, `::1`). The port in the URI must match where the temporary server listens.

---

## 1. Unit tests (no Spotify, no secrets)

From the repository root:

```bash
npm install
npm test
```

Uses Jest with a mocked `fetch`. No `SPOTIFY_*` environment variables required.

---

## 2. Build

```bash
npm run build
```

Required before `npm run login` or `npm run test:live` (those use `dist/`).

---

## 3. Live test (real Spotify API)

### Set environment variables

In the same shell you use for `login` and `test:live`:

```bash
export SPOTIFY_CLIENT_ID="your_client_id"
export SPOTIFY_CLIENT_SECRET="your_client_secret"
export SPOTIFY_REDIRECT_URI="http://127.0.0.1:8888/callback"
# optional:
# export SPOTIFY_TOKEN_PATH="/absolute/or/relative/path/to/tokens.json"
```

`SPOTIFY_REDIRECT_URI` must match one of your app’s Redirect URIs **character-for-character**.

### One-time OAuth login

Writes the token file (default: `.spotify-kit-tokens.json` in the current working directory):

```bash
npm run login
```

1. Open the URL printed in the terminal.
2. Log in with Spotify and approve the app.
3. After redirect, you should see a short success message in the browser; the terminal returns to a prompt.

If the browser cannot connect, ensure nothing else is using the port from your redirect URI (e.g. `8888`).

### Call the API

Start playback in Spotify for the **same account** you authorized, then:

```bash
npm run test:live
```

This runs `examples/live-now-playing.mjs`, which calls `getNowPlaying()` with no arguments (env + token file + automatic refresh).

**`null` in output:** nothing playing or no active player for that user — not an error.

### After publishing to npm

From a consumer project:

```bash
npx spotify-kit-login
```

Same env vars; ensure `node_modules` / build is available per your setup.

---

## 4. Troubleshooting

| Symptom | What to try |
|---------|-------------|
| `Missing Spotify OAuth env` | Export all three: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`. |
| Redirect / state / `invalid_client` | Redirect URI in env must match the dashboard exactly; client id/secret must match the same app. |
| `No Spotify tokens` / login required | Run `npm run login` again. |
| `401` on `test:live` | Access token bad or expired; delete token file and `npm run login` again. |
| `403` on refresh | User revoked the app or refresh invalid — login again. |
| Jest / Watchman errors | This repo sets `watchman: false` in `jest.config.cjs`. Run `npm test` from the repo root. |

---

## 5. Optional: token file location

Default path: `.spotify-kit-tokens.json` (gitignored in this repo).  
Override with `SPOTIFY_TOKEN_PATH` if you want tokens outside the project directory.

Do **not** commit token files or `.env` files containing secrets.
