"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { SetState } from "./structs"
import TopBar from "./components/bar"
import { useRouter } from "next/router"
import { usePathname } from "next/navigation"

interface AppData {
  token: string | undefined
  setToken: SetState<string | undefined>
}

const defaultAppData: AppData = {
  token: undefined,
  setToken: () => {},
}

export const AppContext = createContext(defaultAppData)

interface AppContextProps {}

export const AppContextWrapper = (
  props: React.PropsWithChildren<AppContextProps>
) => {
  const [token, setToken] = useState<string | undefined>(undefined)
  const path = usePathname()
  const value: AppData = { token, setToken }
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      setToken(token)
    }
  }, [])
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token)
      console.log("The token is", localStorage.getItem("token"))
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
