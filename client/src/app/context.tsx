"use client"

import { createContext, useEffect, useState } from "react"
import { SetState, SpotifyUser } from "./structs"
import TopBar from "./components/bar"
import { usePathname } from "next/navigation"
import { socket } from "./socket"
import { getAuthData } from "./api"

interface AppData {
  token: string | undefined
  setToken: SetState<string | undefined>
  spotifyUser: SpotifyUser | undefined
  setSpotifyUser: SetState<SpotifyUser | undefined>
}

const defaultAppData: AppData = {
  token: undefined,
  setToken: () => {},
  spotifyUser: undefined,
  setSpotifyUser: () => {},
}

export const UserContext = createContext(defaultAppData)

interface UserContextProps {}

export const UserContextWrapper = (
  props: React.PropsWithChildren<UserContextProps>
) => {
  const [token, setToken] = useState<string | undefined>(undefined)
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | undefined>(
    undefined
  )
  const [isConnected, setIsConnected] = useState(socket.connected)
  const path = usePathname()
  const value: AppData = { token, setToken, spotifyUser, setSpotifyUser }
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
        alert("Invalid token")
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
    socket.on("update", () => console.log("HELLO!"))
    socket.on("data", (data) => console.log(data))
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
  return (
    <UserContext.Provider value={value}>
      <TopBar
        isAdminPanel={path === "/settings"}
        isLoggedIn={token !== undefined}
      />
      <main>
        <div className="mx-4 my-6 desktop:mx-auto desktop:w-desktop">
          {props.children}
        </div>
      </main>
    </UserContext.Provider>
  )
}
