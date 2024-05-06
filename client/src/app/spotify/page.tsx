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
    const stateParam = params.get("state")
    const code = params.get("code")
    const token = localStorage.getItem(`token-${redirect}`)
    const expires = localStorage.getItem(`expires-${redirect}`)
    console.log(redirect, code, token, expires, state)
    localStorage.removeItem("state")
    localStorage.removeItem("redirect")
    if (
      !ignore &&
      redirect &&
      code &&
      token &&
      expires &&
      state === stateParam
    ) {
      const sendSpotifyAuth = async () => {
        let user = await sendAuthCode(
          redirect,
          { token, expires: new Date(expires) },
          code
        )
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
