"use client"

import { createContext, useEffect, useState } from "react"
import { Session, SetState, SpotifyUser, Track } from "./structs"
import TopBar from "./components/bar"
import { usePathname } from "next/navigation"
import { socket } from "./socket"
import { getAuthData } from "./api"

interface AppData {
  token: string | undefined
  setToken: SetState<string | undefined>
  spotifyUser: SpotifyUser | undefined
  setSpotifyUser: SetState<SpotifyUser | undefined>
  session: Session | undefined
  setSession: SetState<Session | undefined>
  tracks: Track[]
  setTracks: SetState<Track[]>
}

const defaultAppData: AppData = {
  token: undefined,
  setToken: () => {},
  spotifyUser: undefined,
  setSpotifyUser: () => {},
  session: undefined,
  setSession: () => {},
  tracks: [],
  setTracks: () => {},
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
  const [session, setSession] = useState<Session | undefined>(undefined)
  const [tracks, setTracks] = useState<Track[]>([])
  const path = usePathname()
  const value: AppData = {
    token,
    setToken,
    spotifyUser,
    setSpotifyUser,
    session,
    setSession,
    tracks,
    setTracks,
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
  }, [])
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token)
    } else {
      localStorage.removeItem("token")
    }
  }, [token])
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
