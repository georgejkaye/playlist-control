"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"
import { sendAuthCode } from "../api"
import { Loader } from "../loader"

const SpotifyRedirect = () => {
  const params = useSearchParams()
  const router = useRouter()
  useEffect(() => {
    var ignore = false
    const state = localStorage.getItem("state")
    const redirect = localStorage.getItem("redirect")
    localStorage.removeItem("state")
    localStorage.removeItem("redirect")
    const stateParam = params.get("state")
    const code = params.get("code")
    const token = localStorage.getItem(`token-${redirect}`)
    if (!ignore && redirect && code && token && state === stateParam) {
      const sendSpotifyAuth = async () => {
        let user = await sendAuthCode(redirect, token, code)
        if (user) {
          router.push(`/session/${redirect}`)
        } else {
          router.push("/")
        }
      }
      sendSpotifyAuth()
    } else {
      router.push("/")
    }
    ignore = true
    return () => {
      ignore = true
    }
  })

  return <Loader />
}

const Page = () => (
  <Suspense>
    <SpotifyRedirect />
  </Suspense>
)

export default Page
