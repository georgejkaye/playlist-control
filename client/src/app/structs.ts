import { Dispatch, SetStateAction } from "react"

export type SetState<T> = Dispatch<SetStateAction<T>>

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
  tracks: Track[]
}

export interface PlaylistOverview {
  id: string
  url: string
  name: string
  art: string
  tracks: number
}

export const responseToPlaylistOverview = (raw: any) => ({
  id: raw["id"],
  url: raw["url"],
  name: raw["name"],
  art: raw["art"],
  tracks: raw["tracks"],
})

export interface SessionOverview {
  id: string
  name: string
  host: string
  playlist: PlaylistOverview
  current: Track
}

export const responseToSessionOverview = (raw: any) => ({
  id: raw["id"],
  name: raw["name"],
  host: raw["host"],
  playlist: responseToPlaylistOverview(raw["playlist"]),
  current: raw["current"],
})

export interface Session {
  name: string
  playlist: Playlist
}

export interface Artist {
  id: string
  name: string
}

export const getMultipleArtistsString = (artists: Artist[]) =>
  artists.map((artist) => artist.name).join(", ")

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
