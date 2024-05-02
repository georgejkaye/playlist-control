import axios, { AxiosError } from "axios"
import {
  CurrentTrack,
  PlaylistOverview,
  Session,
  SetState,
  SpotifyUser,
  Track,
  responseToCurrentTrack,
  responseToPlaylist,
  responseToPlaylistOverview,
  responseToSession,
  responseToSessionOverview,
  responseToTrack,
} from "./structs"

const getHeaders = (token: string | undefined) =>
  !token
    ? { accept: "application/json" }
    : {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      }

export const getData = async (
  setSession: SetState<Session | undefined>,
  setTracks: SetState<Track[]>,
  setCurrent: SetState<CurrentTrack | undefined>,
  setQueue: SetState<Track[]>
) => {
  const endpoint = "/api/data"
  const response = await axios.get(endpoint)
  if (response.status === 200) {
    const data = response.data
    const session =
      data["session"] === null ? undefined : responseToSession(data["session"])
    const tracks = data["tracks"].map(responseToTrack)
    const current = !data["current"]
      ? undefined
      : responseToCurrentTrack(data["current"])
    const queue = data["queue"].map(responseToTrack)
    setSession(session)
    setTracks(tracks)
    setCurrent(current)
    setQueue(queue)
  }
}

export const getQueue = async (
  setCurrent: SetState<CurrentTrack | undefined>,
  setQueue: SetState<Track[]>
) => {
  const endpoint = "/api/queue"
  const response = await axios.get(endpoint)
  if (response.status === 200) {
    const data = response.data
    const current = responseToCurrentTrack(data["current"])
    const queue = data["queue"].map(responseToTrack)
    setCurrent(current)
    setQueue(queue)
  }
}

export const postQueue = async (sessionSlug: string, track: Track) => {
  const endpoint = `http://server:8000/${sessionSlug}/queue`
  const config = {
    params: {
      track_id: track.id,
    },
  }
  try {
    await axios.post(endpoint, null, config)
  } catch (err) {
    if (err instanceof AxiosError && err.response) {
      if (err.response.status !== 400) {
        throw err
      }
    }
  }
}

export const login = async (
  username: string,
  password: string,
  setToken: SetState<string | undefined>,
  setSpotifyUser: SetState<SpotifyUser | undefined>,
  setError: SetState<string>
) => {
  const endpoint = "http://server:8000/token"
  let data = new FormData()
  data.append("username", username)
  data.append("password", password)
  data.append("grant_type", "")
  data.append("client_id", "")
  data.append("client_secret", "")
  if (username === "") {
    setError("Username cannot be empty")
    return 1
  } else if (password === "") {
    setError("Password cannot be empty")
    return 1
  } else {
    try {
      let response = await axios.post(endpoint, data)
      let responseData = response.data
      setToken(responseData.access_token)
      setSpotifyUser(responseData.user)
      return 0
    } catch (err) {
      setError("Could not log in...")
      return 1
    }
  }
}

export const postPlaylist = async (
  token: string,
  slug: string,
  playlistId: string
) => {
  const endpoint = `http://server:8000/${slug}/auth/spotify/playlist`
  const config = {
    headers: getHeaders(token),
    params: {
      playlist_id: playlistId,
    },
  }
  try {
    let response = await axios.post(endpoint, null, config)
    let data = response.data
    let session = responseToSession(data)
    return { result: session, error: undefined }
  } catch (err) {
    if (err instanceof AxiosError && err.response) {
      let error =
        err.response.status === 404
          ? "Could not find playlist"
          : "Something went wrong"
      return { result: undefined, error }
    } else {
      throw err
    }
  }
}
export const deauthenticateSpotify = async (slug: string, token: string) => {
  const endpoint = `http://server:8000/${slug}/auth/spotify`
  const config = {
    headers: getHeaders(token),
  }
  try {
    let response = await axios.delete(endpoint, config)
    let data = response.data
    return responseToSession(data)
  } catch (e) {
    return undefined
  }
}
export const getPlaylists = async (token: string, slug: string) => {
  const endpoint = `http://server:8000/${slug}/auth/spotify/playlists`
  const config = {
    headers: getHeaders(token),
  }
  try {
    let response = await axios.get(endpoint, config)
    let data = response.data
    let playlists = data.map(responseToPlaylistOverview)
    return playlists
  } catch (err) {
    console.log("getPlaylists", err)
    return []
  }
}

export const sendAuthCode = async (
  slug: string,
  token: string,
  code: string
) => {
  const endpoint = `http://server:8000/${slug}/auth/spotify`
  const config = {
    headers: getHeaders(token),
  }
  try {
    let response = await axios.post(endpoint, { code: code }, config)
    let data = response.data
    return {
      name: data.name,
      image: data.image,
      id: data.id,
    }
  } catch (e) {
    console.log("sendAuthCode", e)
    return undefined
  }
}

export const getAuthData = async (token: string) => {
  const endpoint = `http://server:8000/auth/data`
  const config = {
    headers: getHeaders(token),
  }
  try {
    let response = await axios.get(endpoint, config)
    let data = response.data
    let user = !data
      ? undefined
      : {
          name: data.name,
          image: data.image,
          id: data.id,
        }

    return {
      user,
    }
  } catch (e) {
    return undefined
  }
}

export const createSession = async (
  sessionName: string,
  sessionHost: string,
  password: string
) => {
  const endpoint = `http://server:8000/session`
  try {
    let response = await axios.post(endpoint, {
      name: sessionName,
      host: sessionHost,
      password,
    })
    let data = response.data
    let session = responseToSession(data.session)
    let token: string = data.token
    let expires: Date = new Date(data.expires)
    return { session, password, token, expires }
  } catch (e) {
    console.log("createSession", e)
    return undefined
  }
}

export const getSessions = async () => {
  const endpoint = `http://server:8000/sessions`
  try {
    let response = await axios.get(endpoint)
    let data = response.data
    if (!data) {
      return undefined
    } else {
      return data.map(responseToSessionOverview)
    }
  } catch {
    return undefined
  }
}

export const getSession = async (
  sessionSlug: string,
  token: string | undefined
) => {
  const endpoint = `http://server:8000/${sessionSlug}`
  const config = {
    headers: getHeaders(token),
  }
  try {
    let response = await axios.get(endpoint, config)
    let data = response.data
    if (!data) {
      return undefined
    } else {
      let session = responseToSession(data)
      let queued = data.queued
      let queue = data.queue
      return { session, queued, queue }
    }
  } catch (e) {
    return undefined
  }
}
