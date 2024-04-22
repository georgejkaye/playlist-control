"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { sendAuthCode } from "../api"

const Page = () => {
  const params = useSearchParams()
  const router = useRouter()
  useEffect(() => {
    var ignore = false
    const state = localStorage.getItem("state")
    const redirect = localStorage.getItem("redirect")
    const stateParam = params.get("state")
    const code = params.get("code")
    const token = localStorage.getItem(`token-${redirect}`)
    if (!ignore && redirect && code && token && state === stateParam) {
      const sendSpotifyAuth = async () => {
        console.log(code)
        let user = await sendAuthCode(redirect, token, code)

        console.log("user", user)
        if (user) {
          router.push(`/session/${redirect}`)
        }
      }
      sendSpotifyAuth()
    }
    ignore = true
    return () => {
      ignore = true
    }
  })

  return <div>Redirecting...</div>
}

export default Page
