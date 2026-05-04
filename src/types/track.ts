/** Normalized track returned by `getNowPlaying`. */
export interface Track {
  title: string;
  artist: string;
  album: string;
  image?: string;
  isPlaying: boolean;
  url: string;
}

/** Spotify Web API track object (subset used by this package). */
export interface SpotifyTrackItem {
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  external_urls: {
    spotify: string;
  };
}

/** Response shape for GET /v1/me/player/currently-playing */
export interface SpotifyCurrentlyPlayingResponse {
  is_playing: boolean;
  item: SpotifyTrackItem | null;
}
