import type { SpotifyTrackItem, Track } from "../types/track";

export function formatTrack(item: SpotifyTrackItem, isPlaying: boolean): Track {
  return {
    title: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    album: item.album.name,
    image: item.album.images[0]?.url,
    isPlaying,
    url: item.external_urls.spotify,
  };
}
