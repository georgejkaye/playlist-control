import axios, { AxiosError, AxiosResponse } from "axios"
import { getSecret } from "./utils.js"
import { SpotifyUser } from "./structs.js"

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_APP_ID || ""
const SPOTIFY_SECRET_FILE = process.env.SPOTIFY_SECRET || ""
const SPOTIFY_SECRET = await getSecret(SPOTIFY_SECRET_FILE)
const CLIENT_URL = process.env.CLIENT_URL || ""
const SPOTIFY_REDIRECT = `${CLIENT_URL}/settings`

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

export interface SpotifyTokens {
  access: string
  expires: Date
  refresh: string
}

const getTokensFromTokenResponse = (now: Date, response: AxiosResponse) => {
  let body = response.data
  let access = body.access_token
  let expires = new Date(now.getTime() + body.expires_in * 60000)
  let refresh = body.refresh_token
  let tokens: SpotifyTokens = { access, expires, refresh }
  return tokens
}

export const exchangeAccessCodeForTokens = async (code: string) => {
  const now = new Date()
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_SECRET).toString("base64"),
  }
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: SPOTIFY_REDIRECT,
    client_secret: SPOTIFY_SECRET,
    client_id: SPOTIFY_CLIENT_ID,
  })
  try {
    let response = await axios.post(SPOTIFY_TOKEN_URL, params, { headers })
    return getTokensFromTokenResponse(now, response)
  } catch (e) {
    return undefined
  }
}

export const refreshTokens = async (refreshToken: string) => {
  const now = new Date()
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  }
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  })
  try {
    let response = await axios.post(SPOTIFY_TOKEN_URL, params, { headers })
    return getTokensFromTokenResponse(now, response)
  } catch (e) {
    return undefined
  }
}

const getApiURLFromEndpoint = (endpoint: string) =>
  `https://api.spotify.com/v1${endpoint}`

const getAuthHeader = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
})

export const getSpotifyUser = async (accessToken: string) => {
  const url = getApiURLFromEndpoint("/me")
  const headers = getAuthHeader(accessToken)
  try {
    let response = await axios.get(url, { headers })
    let data = response.data
    return {
      name: data["display_name"],
      image: data["images"][0]["url"],
      id: data["id"],
    }
  } catch (e) {
    return undefined
  }
}
