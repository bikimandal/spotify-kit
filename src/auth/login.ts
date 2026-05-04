import * as http from "node:http";
import { randomBytes } from "node:crypto";
import { URL } from "node:url";
import type { SpotifyOAuthCredentials } from "./types";
import { buildAuthorizationUrl, exchangeAuthorizationCode } from "./oauth";
import { writeStoredTokens } from "./persistTokens";

function randomState(): string {
  return randomBytes(16).toString("hex");
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

/**
 * Opens a one-shot HTTP server on your redirect URI (must be loopback),
 * prints the Spotify authorize URL, waits for the browser redirect, exchanges the code,
 * and saves tokens to `credentials.tokenPath`.
 */
export async function login(
  credentials: SpotifyOAuthCredentials,
  options?: { scopes?: string[] },
): Promise<void> {
  const redirect = new URL(credentials.redirectUri);
  if (redirect.protocol !== "http:" && redirect.protocol !== "https:") {
    throw new Error("redirectUri must be http or https");
  }
  if (redirect.protocol === "https:") {
    throw new Error(
      "Automatic login() uses a plain HTTP server. Use an http://127.0.0.1:PORT/... redirect URI in the Spotify dashboard for local dev.",
    );
  }
  if (!isLoopbackHost(redirect.hostname)) {
    throw new Error(
      "Automatic login() only supports loopback redirect URIs (127.0.0.1, localhost, ::1). Use a hosted redirect and exchangeAuthorizationCode() for other hosts.",
    );
  }

  const port =
    redirect.port !== "" ? Number(redirect.port) : 80;

  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error("Invalid port in redirectUri");
  }

  const expectedPath = redirect.pathname || "/";
  const state = randomState();

  const authUrl = buildAuthorizationUrl(credentials, {
    scopes: options?.scopes,
    state,
  });

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const host = `http://${redirect.hostname}:${port}`;
        const reqUrl = new URL(req.url ?? "/", host);

        if (reqUrl.pathname !== expectedPath) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }

        const err = reqUrl.searchParams.get("error");
        if (err) {
          const desc = reqUrl.searchParams.get("error_description") ?? "";
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<p>Authorization failed: ${err}</p><p>${desc}</p>`);
          server.close();
          reject(new Error(`Spotify authorization denied: ${err} ${desc}`));
          return;
        }

        const returnedState = reqUrl.searchParams.get("state");
        if (returnedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<p>Invalid state parameter</p>");
          server.close();
          reject(new Error("OAuth state mismatch"));
          return;
        }

        const code = reqUrl.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<p>Missing code</p>");
          server.close();
          reject(new Error("Missing authorization code"));
          return;
        }

        const tokens = await exchangeAuthorizationCode(credentials, code);
        await writeStoredTokens(credentials.tokenPath, tokens);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<p>Spotify connected. You can close this tab and return to the terminal.</p>",
        );
        server.close();
        resolve();
      } catch (e) {
        try {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Server error");
        } catch {
          /* ignore */
        }
        server.close();
        reject(e);
      }
    });

    server.on("error", reject);
    server.listen(port, redirect.hostname, () => {
      console.log("\nOpen this URL in your browser to authorize:\n");
      console.log(authUrl);
      console.log("\nWaiting for redirect…\n");
    });
  });
}
