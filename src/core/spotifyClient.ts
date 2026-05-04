const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  readonly status: number;
  readonly body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.body = body;
  }
}

export type SpotifyRequestResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: true; status: 204; data: null };

export class SpotifyClient {
  constructor(private readonly accessToken: string) {}

  async request<T>(endpoint: string): Promise<SpotifyRequestResult<T>> {
    const url = `${SPOTIFY_API_BASE}${endpoint}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    if (res.status === 204) {
      return { ok: true, status: 204, data: null };
    }

    const text = await res.text();
    if (!res.ok) {
      throw new SpotifyApiError(
        `Spotify API error (${res.status})`,
        res.status,
        text || undefined,
      );
    }

    if (!text) {
      return { ok: true, status: res.status, data: null as T };
    }

    try {
      const data = JSON.parse(text) as T;
      return { ok: true, status: res.status, data };
    } catch {
      throw new SpotifyApiError("Invalid JSON from Spotify API", res.status, text);
    }
  }
}
