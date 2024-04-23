"use client"

import { createContext, useEffect, useState } from "react"
import {
  Session,
  SessionOverview,
  SetState,
  SpotifyUser,
  Track,
  responseToSession,
  responseToSessionOverview,
  responseToTrack,
} from "./structs"
import TopBar from "./components/bar"
import { usePathname } from "next/navigation"
import { socket } from "./socket"
import { getAuthData } from "./api"

export const Line = () => <hr className="h-px my-4 bg-lines border-0" />

interface AppData {
  token: string | undefined
  setToken: SetState<string | undefined>
  spotifyUser: SpotifyUser | undefined
  setSpotifyUser: SetState<SpotifyUser | undefined>
  sessions: SessionOverview[] | undefined
  setSessions: SetState<SessionOverview[] | undefined>
  session: Session | undefined
  setSession: SetState<Session | undefined>
  tracks: Track[]
  setTracks: SetState<Track[]>
  queue: Track[]
  setQueue: SetState<Track[]>
  current: Track | undefined
  setCurrent: SetState<Track | undefined>
  queuedTracks: Set<string>
  setQueuedTracks: SetState<Set<string>>
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
  tracks: [],
  setTracks: () => {},
  queue: [],
  setQueue: () => {},
  current: undefined,
  setCurrent: () => {},
  queuedTracks: new Set(),
  setQueuedTracks: () => {},
}

export const AppContext = createContext(defaultAppData)

interface AppContextProps {}

export const AppContextWrapper = (
  props: React.PropsWithChildren<AppContextProps>
) => {
  const [token, setToken] = useState<string | undefined>(undefined)
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | undefined>(
    undefined
  )
  const [sessions, setSessions] = useState<SessionOverview[] | undefined>(
    undefined
  )
  const [session, setSession] = useState<Session | undefined>(undefined)
  const [tracks, setTracks] = useState<Track[]>([])
  const [current, setCurrent] = useState<Track | undefined>(undefined)
  const [queue, setQueue] = useState<Track[]>([])
  const [queuedTracks, setQueuedTracks] = useState<Set<string>>(new Set())
  const [isConnected, setIsConnected] = useState(socket.connected)
  const path = usePathname()
  const value: AppData = {
    token,
    setToken,
    spotifyUser,
    setSpotifyUser,
    sessions,
    setSessions,
    session,
    setSession,
    tracks,
    setTracks,
    queue,
    setQueue,
    current,
    setCurrent,
    queuedTracks,
    setQueuedTracks,
  }
  useEffect(() => {
    const initToken = async (token: string) => {
      let data = await getAuthData(token)
      console.log("The data is", data)
      if (data) {
        setToken(token)
        if (data.user) {
          setSpotifyUser(data.user)
        }
      } else {
        setToken(undefined)
        setSpotifyUser(undefined)
        localStorage.removeItem("token")
      }
    }
    const token = localStorage.getItem("token")
    if (token !== null) {
      initToken(token)
    }
    const onConnect = () => {
      setIsConnected(true)
    }
    const onDisconnect = () => {
      setIsConnected(false)
    }
    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("data", (data) => {
      console.log(data)
      let current = data.current
      let queue = data.queue
      let queueds = data.queueds
      setQueuedTracks(new Set(queueds))
      setCurrent(current)
      setQueue(queue)
    })
    socket.on("session", (msg) => {
      console.log(msg)
    })
    socket.on("sessions", (data) => {
      let sessions = data.map(responseToSessionOverview)
      setSessions(sessions)
    })
    socket.on("session_created", (data) => {
      let { session, password } = data
      let sessionObject = responseToSession(session)
      setSession(sessionObject)
    })
    socket.on("queue", (data) => {
      let currentTrack = data.current
      let upcomingQueue = data.queue
      if (currentTrack) {
        setCurrent(responseToTrack(currentTrack))
      } else {
        setCurrent(undefined)
      }
      setQueue(upcomingQueue.map(responseToTrack))
    })
    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
    }
  }, [])
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token)
    } else {
      localStorage.removeItem("token")
    }
  }, [token])
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
