import axios, { AxiosError, AxiosResponse } from "axios"
import { getSecret } from "./utils.js"

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
  let expires = new Date(now.getTime() + body.expires_in * 1000)
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

const nameRegex =
  /(.+)(( - |())(Radio Mix|Full Length Version|Radio Edit|Deluxe Edition)?((Remastered )?([0-9][0-9][0-9][0-9])?( Remastered( Version)?| Remaster| Mix)?)?()?)/

const sanitiseName = (name: string) => {
  let match = name.match(nameRegex)
  if (!match) {
    return name
  } else {
    return match[1]
  }
}

const responseToArtist = (raw: any) => {
  let id = raw.id
  let name = raw.name
  return { id, name }
}

const responseToAlbum = (raw: any) => {
  let name = sanitiseName(raw.name)
  let art = raw.images.length > 0 ? raw.images[0].url : ""
  let artists = raw.artists.map(responseToArtist)
  let id = raw.id
  return { id, name, artists, art }
}

const responseToTrack = (raw: any) => {
  let id = raw.id
  let name = sanitiseName(raw.name)
  let album = responseToAlbum(raw.album)
  let artists = raw.artists.map(responseToArtist)
  let duration = raw.duration_ms
  return { id, name, album, artists, duration }
}

export const getCurrentTrack = async (accessToken: string) => {
  const url = getApiURLFromEndpoint("/me/player/currently-playing")
  const headers = getAuthHeader(accessToken)
  try {
    let response = await axios.get(url, { headers })
    let data = response.data
    let item = data.item
    if (item) {
      let track = responseToTrack(item)
      return track
    } else {
      return undefined
    }
  } catch (e) {
    return undefined
  }
}
