export interface SpotifyUser {
  name: string
  image: string
  id: string
}

export interface Playlist {
  id: string
  url: string
  name: string
  art: string
  tracks: number
}

export interface Session {
  id: number
  name: string
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
  queued: Date | undefined
}

export interface CurrentTrack {
  track: Track
  start: number
}
