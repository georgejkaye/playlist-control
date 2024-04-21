import { SpotifyTokens } from "./spotify.js"

export interface SpotifyUser {
  name: string
  image: string
  id: string
}

export interface QueuedTrack {
  id: number
  time: Date
}

export interface Playlist {
  id: string
  url: string
  name: string
  art: string
  tracks: Track[]
}

export interface PlaylistOverview {
  id: string
  url: string
  name: string
  art: string
  tracks: number
}

export interface SessionOverview {
  id: number
  name: string
  slug: string
  host: string
  playlist: PlaylistOverview | undefined
  current: Track | undefined
}

export interface Session {
  id: number
  name: string
  host: string
  playlist: Playlist
}

export interface Artist {
  id: string
  name: string
}

export interface Album {
  id: string
  name: string
  artists: Artist[]
  art: string
}

export interface Track {
  id: string
  name: string
  album: Album
  artists: Artist[]
  duration: number
}

export interface CurrentTrack {
  track: Track
  start: number
}

export interface Data {
  currentTrack: Track
}
