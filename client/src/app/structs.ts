import { Dispatch, SetStateAction } from "react"

export type SetState<T> = Dispatch<SetStateAction<T>>

export interface Token {
  token: string
  expires: Date
}

export interface SpotifyUser {
  name: string
  image: string
  id: string
}

export const responseToSpotifyUser = (response: any) => ({
  name: response["name"],
  image: response["image"],
  id: response["id"],
})

export interface Artist {
  id: string
  name: string
}

export const getMultipleArtistsString = (artists: Artist[]) =>
  artists.map((artist) => artist.name).join(", ")

const responseToArtist = (response: any) => ({
  id: response["id"],
  name: response["name"],
})

export interface Album {
  id: string
  name: string
  artists: Artist[]
  art: string
}

const responseToAlbum = (response: any) => ({
  id: response["id"],
  name: response["name"],
  artists: response["artists"].map(responseToArtist),
  art: response["art"],
})

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

export const responseToTrack = (response: any) => ({
  id: response["id"],
  name: response["name"],
  album: responseToAlbum(response["album"]),
  artists: response["artists"].map(responseToArtist),
  duration: response["duration"],
  queued:
    response["queued_at"] === null
      ? undefined
      : new Date(Date.parse(response["queued_at"])),
})

export const responseToCurrentTrack = (response: any) => ({
  track: responseToTrack(response["track"]),
  start: response["start"],
})

export interface Playlist {
  id: string
  url: string
  name: string
  art: string
  tracks: Track[]
}

export const responseToPlaylist = (response: any) => ({
  id: response["id"],
  url: response["url"],
  name: response["name"],
  art: response["art"],
  tracks: response["tracks"].map(responseToTrack),
})

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
  slug: string
  host: string
  playlist: string | undefined
}

export const responseToSessionOverview = (raw: any): SessionOverview => ({
  id: raw["id"],
  name: raw["name"],
  slug: raw["slug"],
  host: raw["host"],
  playlist: raw["playlist"],
})

export interface Session {
  id: string
  name: string
  slug: string
  host: string
  playlist: Playlist | undefined
  current: Track | undefined
  spotify: SpotifyUser | undefined
}

export const responseToSession = (raw: any): Session => ({
  id: raw["id"],
  name: raw["name"],
  slug: raw["slug"],
  host: raw["host"],
  playlist: !raw["playlist"] ? undefined : responseToPlaylist(raw["playlist"]),
  current: !raw["track"] ? undefined : responseToTrack(raw["track"]),
  spotify: !raw["spotify"] ? undefined : responseToSpotifyUser(raw["spotify"]),
})
