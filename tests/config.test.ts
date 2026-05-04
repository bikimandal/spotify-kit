import { afterEach, describe, expect, it } from "@jest/globals";
import { loadOAuthConfigFromEnv } from "../src/auth/config";

describe("OAuth config", () => {
  afterEach(() => {
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
    delete process.env.SPOTIFY_REDIRECT_URI;
  });

  it("returns null if redirect URI is missing", () => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
    expect(loadOAuthConfigFromEnv()).toBeNull();
  });

  it("loads when client id, secret, and redirect are set", () => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
    process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:8888/callback";
    const c = loadOAuthConfigFromEnv();
    expect(c).toEqual({
      clientId: "id",
      clientSecret: "secret",
      redirectUri: "http://127.0.0.1:8888/callback",
      tokenPath: ".spotify-kit-tokens.json",
    });
  });
});
