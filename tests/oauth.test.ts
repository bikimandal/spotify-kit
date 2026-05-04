import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
} from "../src/auth/oauth";
import type { SpotifyOAuthCredentials } from "../src/auth/types";
import type { StoredSpotifyTokens } from "../src/auth/types";

const creds: SpotifyOAuthCredentials = {
  clientId: "cid",
  clientSecret: "sec",
  redirectUri: "http://127.0.0.1:8888/callback",
  tokenPath: "/tmp/ignored.json",
};

describe("oauth", () => {
  const mockFetch = jest.fn<typeof fetch>();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("exchanges authorization code for stored tokens", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "ACCESS",
          refresh_token: "REFRESH",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    const stored = await exchangeAuthorizationCode(creds, "CODE123");
    expect(stored.access_token).toBe("ACCESS");
    expect(stored.refresh_token).toBe("REFRESH");
    expect(stored.expires_at).toBeGreaterThan(Date.now());

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("https://accounts.spotify.com/api/token");
    expect(init?.method).toBe("POST");
    const body = String(init?.body);
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=CODE123");
  });

  it("refreshes and keeps prior refresh_token if omitted", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "NEW",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    const current: StoredSpotifyTokens = {
      access_token: "OLD",
      refresh_token: "KEEP_ME",
      expires_at: 0,
    };

    const next = await refreshAccessToken(creds, current);
    expect(next.access_token).toBe("NEW");
    expect(next.refresh_token).toBe("KEEP_ME");

    const [, init] = mockFetch.mock.calls[0]!;
    expect(String(init?.body).includes("grant_type=refresh_token")).toBe(true);
  });
});
