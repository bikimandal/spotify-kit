import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { writeFile, unlink } from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { getNowPlaying } from "../src/index";

const sampleTrack = {
  name: "Live Song",
  artists: [{ name: "Solo" }],
  album: {
    name: "Album",
    images: [{ url: "https://i.scdn.co/image/x" }],
  },
  external_urls: { spotify: "https://open.spotify.com/track/abc" },
};

describe("getNowPlaying (OAuth + refresh)", () => {
  const mockFetch = jest.fn<typeof fetch>();
  let tokenFile: string;

  beforeEach(async () => {
    clearEnv();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
    tokenFile = path.join(os.tmpdir(), `spotify-kit-oauth-${Date.now()}.json`);
    await writeFile(
      tokenFile,
      JSON.stringify({
        access_token: "EXPIRED",
        refresh_token: "REFRESH_X",
        expires_at: 0,
      }),
      "utf8",
    );
    process.env.SPOTIFY_CLIENT_ID = "app_id";
    process.env.SPOTIFY_CLIENT_SECRET = "app_secret";
    process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:9/cb";
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    clearEnv();
    await unlink(tokenFile).catch(() => {});
  });

  function clearEnv() {
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
    delete process.env.SPOTIFY_REDIRECT_URI;
    delete process.env.SPOTIFY_TOKEN_PATH;
  }

  it("refreshes access token then calls currently playing", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "FRESH",
            expires_in: 3600,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            is_playing: true,
            item: sampleTrack,
          }),
          { status: 200 },
        ),
      );

    const track = await getNowPlaying({ tokenPath: tokenFile });

    expect(track?.title).toBe("Live Song");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const refreshCall = mockFetch.mock.calls[0]!;
    expect(refreshCall[0]).toBe("https://accounts.spotify.com/api/token");

    const apiCall = mockFetch.mock.calls[1]!;
    expect(apiCall[0]).toBe(
      "https://api.spotify.com/v1/me/player/currently-playing",
    );
    const h = (apiCall[1] as RequestInit).headers;
    const auth =
      h instanceof Headers
        ? h.get("Authorization")
        : (h as Record<string, string>)?.Authorization;
    expect(auth).toBe("Bearer FRESH");
  });
});
