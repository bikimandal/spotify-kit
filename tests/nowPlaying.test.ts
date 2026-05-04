import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  clearNowPlayingCache,
  getNowPlaying,
  SpotifyApiError,
} from "../src/index";

const sampleTrack = {
  name: "Test Song",
  artists: [{ name: "Artist One" }, { name: "Artist Two" }],
  album: {
    name: "Test Album",
    images: [{ url: "https://i.scdn.co/image/abc" }],
  },
  external_urls: { spotify: "https://open.spotify.com/track/xyz" },
};

describe("getNowPlaying", () => {
  const mockFetch = jest.fn<typeof fetch>();

  beforeEach(() => {
    clearNowPlayingCache();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a normalized track on success", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          is_playing: true,
          item: sampleTrack,
        }),
        { status: 200 },
      ),
    );

    const track = await getNowPlaying({ accessToken: "token" });

    expect(track).toEqual({
      title: "Test Song",
      artist: "Artist One, Artist Two",
      album: "Test Album",
      image: "https://i.scdn.co/image/abc",
      isPlaying: true,
      url: "https://open.spotify.com/track/xyz",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.spotify.com/v1/me/player/currently-playing",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("returns null when nothing is playing (204)", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const track = await getNowPlaying({ accessToken: "token" });
    expect(track).toBeNull();
  });

  it("returns null when item is missing", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ is_playing: false, item: null }), {
        status: 200,
      }),
    );

    const track = await getNowPlaying({ accessToken: "token" });
    expect(track).toBeNull();
  });

  it("throws SpotifyApiError on invalid token", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    await expect(getNowPlaying({ accessToken: "bad" })).rejects.toMatchObject({
      name: "SpotifyApiError",
      status: 401,
    });
  });

  it("throws on API failure (4xx other than handled)", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Forbidden", { status: 403 }),
    );

    await expect(getNowPlaying({ accessToken: "token" })).rejects.toBeInstanceOf(
      SpotifyApiError,
    );
  });

  it("retries on 5xx then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("err", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ is_playing: false, item: sampleTrack }),
          { status: 200 },
        ),
      );

    const track = await getNowPlaying({
      accessToken: "token",
      retries: 2,
      retryBaseDelayMs: 1,
    });

    expect(track?.title).toBe("Test Song");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("uses cache when cacheTtlMs is set", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ is_playing: true, item: sampleTrack }),
        { status: 200 },
      ),
    );

    const a = await getNowPlaying({ accessToken: "t1", cacheTtlMs: 60_000 });
    const b = await getNowPlaying({ accessToken: "t1", cacheTtlMs: 60_000 });
    expect(a).toEqual(b);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("SpotifyApiError", () => {
  it("exposes status and body", () => {
    const err = new SpotifyApiError("msg", 400, "{}");
    expect(err.message).toBe("msg");
    expect(err.status).toBe(400);
    expect(err.body).toBe("{}");
  });
});
