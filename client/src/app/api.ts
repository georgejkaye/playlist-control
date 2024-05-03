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

const host = `${process.env.NEXT_PUBLIC_SERVER_PROTOCOL}://${process.env.NEXT_PUBLIC_SERVER_HOST}`

const getHeaders = (token: string | undefined) =>
  !token
    ? { Accept: "application/json" }
    : {
        Accept: "application/json",
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
  const endpoint = `${host}/${sessionSlug}/queue`
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

export const login = async (session: Session, password: string) => {
  const endpoint = `${host}/${session.slug}/token`
  let data = new FormData()
  data.append("password", password)
  data.append("grant_type", "")
  data.append("client_id", "")
  data.append("client_secret", "")
  if (password === "") {
    return { error: "Password cannot be empty" }
  } else {
    try {
      let response = await axios.post(endpoint, data)
      let responseData = response.data
      let token = {
        token: responseData.access_token,
        expires: responseData.expires_at,
      }
      console.log(token)
      return { token, spotify: responseData.user }
    } catch (err) {
      console.log(err)
      return { error: "Could not log in..." }
    }
  }
}

export const postPlaylist = async (
  token: string,
  slug: string,
  playlistId: string
) => {
  const endpoint = `${host}/${slug}/auth/spotify/playlist`
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
  const endpoint = `${host}/${slug}/auth/spotify`
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
  const endpoint = `${host}/${slug}/auth/spotify/playlists`
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
  const endpoint = `${host}/${slug}/auth/spotify`
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
  const endpoint = `${host}/auth/data`
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
  const endpoint = `${host}/session`
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
  const endpoint = `${host}/sessions`
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
  const endpoint = `${host}/${sessionSlug}`
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

export const searchTracks = async (session: Session, searchString: string) => {
  const endpoint = `${host}/${session.slug}/search`
  const config = {
    params: {
      search: searchString,
    },
  }
  try {
    let response = await axios.post(endpoint, null, config)
    let data = response.data
    if (!data) {
      return []
    } else {
      let tracks = data.map(responseToTrack)
      return tracks
    }
  } catch (e) {
    return []
  }
}

export const requestTrack = async (session: Session, track: Track) => {
  const endpoint = `${host}/${session.slug}/request`
  const config = {
    params: {
      track: track.id,
    },
  }
  try {
    let response = await axios.post(endpoint, null, config)
    let data = response.data
    if (!data) {
      return false
    } else {
      return true
    }
  } catch (e) {
    return false
  }
}
