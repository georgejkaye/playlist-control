import { Socket } from "socket.io"
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
  slug: string
  host: string
  playlist: Playlist | undefined
  queued: QueuedTrack[]
  spotify: SpotifyUser | undefined
  current: Track | undefined
  queue: Track[]
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

var nextSocket = 0

export interface Listener {
  id: number
  socket: Socket
  session: Session | undefined
}

export const getNewListener = (socket: Socket): Listener => {
  let listener = {
    id: nextSocket,
    socket,
    session: undefined,
  }
  nextSocket++
  return listener
}

export const listenerToString = (listener: Listener) => {
  let sessionString = listener.session ? ` (${listener.session.name})` : ""
  return `Listener #${listener.id}${sessionString}`
}

export const printListeners = (
  listeners: Map<number, Listener>,
  tab: number
) => {
  var string = ""
  var index = 0
  var tabString = ""
  for (let i = 0; i < tab; i++) {
    tabString = `${tabString} `
  }
  for (const listener of listeners.values()) {
    let listenerString = `${tabString}${listenerToString(listener)}`
    if (index == 0) {
      string = listenerString
    } else {
      string = `${string}\n${listenerString}`
    }
    index++
  }
  return string
}

export interface PlayingStatus {
  current: Track | undefined
  queue: Track[]
}
