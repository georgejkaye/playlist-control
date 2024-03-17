import { Dispatch, SetStateAction } from "react"

export type SetState<T> = Dispatch<SetStateAction<T>>

export interface Playlist {
  id: string
  name: string
  art: string
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
