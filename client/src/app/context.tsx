"use client"

import { createContext, useEffect, useState } from "react"
import {
  Playlist,
  RequestedTrack,
  Session,
  SessionOverview,
  SetState,
  SpotifyUser,
  Token,
  Track,
  responseToSession,
  responseToTrack,
} from "./structs"
import TopBar from "./components/bar"
import { usePathname } from "next/navigation"
import { socket } from "./api"

export const Line = () => <hr className="h-px my-4 bg-lines border-0" />

interface AppData {
  token: Token | undefined
  setToken: SetState<Token | undefined>
  spotifyUser: SpotifyUser | undefined
  setSpotifyUser: SetState<SpotifyUser | undefined>
  sessions: SessionOverview[] | undefined
  setSessions: SetState<SessionOverview[] | undefined>
  session: Session | undefined
  setSession: SetState<Session | undefined>
  queue: Track[]
  setQueue: SetState<Track[]>
  current: Track | undefined
  setCurrent: SetState<Track | undefined>
  queuedTracks: Map<string, Date>
  setQueuedTracks: SetState<Map<string, Date>>
  requestedTracks: RequestedTrack[]
  setRequestedTracks: SetState<RequestedTrack[]>
  emitLogin: (token: Token) => void
}

const defaultAppData: AppData = {
  token: undefined,
  setToken: () => {},
  spotifyUser: undefined,
  setSpotifyUser: () => {},
  sessions: [],
  setSessions: () => {},
  session: undefined,
  setSession: () => {},
  queue: [],
  setQueue: () => {},
  current: undefined,
  setCurrent: () => {},
  queuedTracks: new Map(),
  setQueuedTracks: () => {},
  requestedTracks: [],
  setRequestedTracks: () => {},
  emitLogin: (token: Token) => {},
}

export const AppContext = createContext(defaultAppData)

interface AppContextProps {}

export const AppContextWrapper = (
  props: React.PropsWithChildren<AppContextProps>
) => {
  const [token, setToken] = useState<Token | undefined>(undefined)
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | undefined>(
    undefined
  )
  const [sessions, setSessions] = useState<SessionOverview[] | undefined>(
    undefined
  )
  const [session, setSession] = useState<Session | undefined>(undefined)
  const [playlist, setPlaylist] = useState<Playlist | undefined>(undefined)
  const [current, setCurrent] = useState<Track | undefined>(undefined)
  const [queue, setQueue] = useState<Track[]>([])
  const [queuedTracks, setQueuedTracks] = useState<Map<string, Date>>(new Map())
  const [requestedTracks, setRequestedTracks] = useState<RequestedTrack[]>([])
  const [isConnected, setIsConnected] = useState(socket.connected)
  const path = usePathname()
  const emitLogin = (token: Token) => {
    socket.emit("token", token.token)
  }
  const value: AppData = {
    token,
    setToken,
    spotifyUser,
    setSpotifyUser,
    sessions,
    setSessions,
    session,
    setSession,
    queue,
    setQueue,
    current,
    setCurrent,
    queuedTracks,
    setQueuedTracks,
    requestedTracks,
    setRequestedTracks,
    emitLogin,
  }
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true)
    }
    const onDisconnect = () => {
      setIsConnected(false)
    }
    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("playback", (data) => {
      let { current, queue } = data
      setCurrent(current)
      setQueue(queue)
    })
    socket.on("queue", (data) => {
      let currentTrack = data.current
      let upcomingQueue = data.queue
      if (currentTrack) {
        setCurrent(responseToTrack(currentTrack, false))
      } else {
        setCurrent(undefined)
      }
      setQueue(upcomingQueue.map((t: any) => responseToTrack(t, false)))
    })
    socket.on("new_playlist", (data) => {
      let session = responseToSession(data)
      setSession(session)
      setPlaylist(session.playlist)
    })
    socket.on("queued_track", (data) => {
      let { id, queued_at, queue, current, requested } = data
      setCurrent(current)
      setQueue(queue)
      setQueuedTracks((map) => new Map(map.set(id, new Date(queued_at))))
    })
    socket.on("new_request", (data) => {
      if (session?.slug === data.sessionSlug) {
        setRequestedTracks((old) => [
          ...old,
          {
            requestId: data.requestId,
            track: responseToTrack(data.track, false),
          },
        ])
      }
    })
    socket.on("playlist_removed", (data) => {
      setSession(responseToSession(data))
    })
    socket.on("approval_required", (data) => {
      setSession(responseToSession(data))
    })
    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("playback")
      socket.off("queue")
      socket.off("new_playlist")
      socket.off("playlist_removed")
      socket.off("queued_track")
      socket.off("new_request")
      socket.off("approval_required")
    }
  }, [])
  useEffect(() => {
    if (session) {
      socket.emit("join_session", session.slug)
    } else {
      socket.emit("leave_session")
    }
  }, [session])
  return (
    <AppContext.Provider value={value}>
      <TopBar
        isAdminPanel={path === "/settings"}
        isLoggedIn={token !== undefined}
      />
      <main>
        <div className="mx-4 my-6 desktop:mx-auto desktop:w-desktop">
          {props.children}
        </div>
      </main>
    </AppContext.Provider>
  )
}
