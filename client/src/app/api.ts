import axios, { AxiosError } from "axios"
import {
  CurrentTrack,
  Session,
  SetState,
  Token,
  Track,
  responseToCurrentTrack,
  responseToPlaylistOverview,
  responseToRequest,
  responseToSession,
  responseToSessionOverview,
  responseToTrack,
} from "./structs"
import { io } from "socket.io-client"

const host = process.env.NEXT_PUBLIC_SERVER_HOST || ""

const getEndpoint = (route: string) => `${host}${route}`

const getHeaders = (token: Token | undefined) =>
  !token
    ? { Accept: "application/json" }
    : {
        Accept: "application/json",
        Authorization: `Bearer ${token.token}`,
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
    const tracks = data["tracks"].map((t: any) => responseToTrack(t, false))
    const current = !data["current"]
      ? undefined
      : responseToCurrentTrack(data["current"], false)
    const queue = data["queue"].map((t: any) => responseToTrack(t, false))
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
    const current = responseToCurrentTrack(data["current"], false)
    const queue = data["queue"].map((t: boolean) => responseToTrack(t, false))
    setCurrent(current)
    setQueue(queue)
  }
}

export const postQueue = async (
  token: Token | undefined,
  session: Session,
  track: Track
) => {
  const endpoint = getEndpoint(`/${session.slug}/queue`)
  const config = {
    headers: getHeaders(token),
    params: {
      track_id: track.id,
    },
  }
  try {
    await axios.post(endpoint, null, config)
  } catch (e) {
    if (e instanceof AxiosError && e.response) {
      if (e.response.status !== 400) {
        throw e
      }
    }
  }
}

export const login = async (session: Session, password: string) => {
  const endpoint = getEndpoint(`/${session.slug}/token`)
  if (password === "") {
    return { error: "Password cannot be empty" }
  } else {
    try {
      let response = await axios.post(endpoint, {
        password,
      })
      let responseData = response.data
      let token = {
        token: responseData.access_token,
        expires: responseData.expires_at,
      }
      return { token, spotify: responseData.user }
    } catch (e) {
      console.error(e)
      return { error: "Could not log in..." }
    }
  }
}

export const postPlaylist = async (
  token: Token | undefined,
  slug: string,
  playlistId: string
) => {
  const endpoint = getEndpoint(`/${slug}/auth/spotify/playlist`)
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
  } catch (e) {
    if (e instanceof AxiosError && e.response) {
      let error =
        e.response.status === 404
          ? "Could not find playlist"
          : "Something went wrong"
      return { result: undefined, error }
    } else {
      throw e
    }
  }
}

export const deleteSession = async (session: Session, token: Token) => {
  const endpoint = getEndpoint(`/${session.slug}/auth`)
  const config = {
    headers: getHeaders(token),
  }
  try {
    await axios.delete(endpoint, config)
  } catch (e) {
    console.error(e)
  }
}

export const deletePlaylist = async (session: Session, token: Token) => {
  const endpoint = getEndpoint(`/${session.slug}/auth/playlist`)
  const config = {
    headers: getHeaders(token),
  }
  try {
    await axios.delete(endpoint, config)
  } catch (e) {
    console.error(e)
  }
}

export const deauthenticateSpotify = async (
  slug: string,
  token: Token | undefined
) => {
  const endpoint = getEndpoint(`/${slug}/auth/spotify`)
  const config = {
    headers: getHeaders(token),
  }
  try {
    let response = await axios.delete(endpoint, config)
    let data = response.data
    return responseToSession(data)
  } catch (e) {
    console.error(e)
    return undefined
  }
}
export const getPlaylists = async (token: Token | undefined, slug: string) => {
  const endpoint = getEndpoint(`/${slug}/auth/spotify/playlists`)
  const config = {
    headers: getHeaders(token),
  }
  try {
    let response = await axios.get(endpoint, config)
    let data = response.data
    let playlists = data.map(responseToPlaylistOverview)
    return playlists
  } catch (e) {
    console.error(e)
    return []
  }
}

export const sendAuthCode = async (
  slug: string,
  token: Token,
  code: string
) => {
  const endpoint = getEndpoint(`/${slug}/auth/spotify`)
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
    console.error(e)
    return undefined
  }
}

export const getAuthData = async (token: Token | undefined) => {
  const endpoint = getEndpoint(`/auth/data`)
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
    console.error(e)
    return undefined
  }
}

export const createSession = async (
  sessionName: string,
  sessionHost: string,
  password: string
) => {
  const endpoint = getEndpoint(`/session`)
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
    console.error(e)
    return undefined
  }
}

export const getSessions = async () => {
  const endpoint = getEndpoint(`/sessions`)
  try {
    let response = await axios.get(endpoint)
    let data = response.data
    if (!data) {
      return undefined
    } else {
      return data.map(responseToSessionOverview)
    }
  } catch (e) {
    console.error(e)
    return undefined
  }
}

export const getSession = async (
  sessionSlug: string,
  token: Token | undefined
) => {
  const endpoint = getEndpoint(`/${sessionSlug}`)
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
      let requests = data.requests.map(responseToRequest)
      return { session, queued, queue, requests }
    }
  } catch (e) {
    console.error(e)
    return undefined
  }
}

export const searchTracks = async (
  session: Session,
  searchString: string
): Promise<Track[]> => {
  const endpoint = getEndpoint(`/${session.slug}/search`)
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
      let tracks = data.map((t: any) => responseToTrack(t, true))
      return tracks
    }
  } catch (e) {
    console.error(e)
    return []
  }
}

export const requestTrack = async (session: Session, track: Track) => {
  const endpoint = getEndpoint(`/${session.slug}/queue`)
  const config = {
    params: {
      track_id: track.id,
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
    console.error(e)
    return false
  }
}

export const makeDecision = async (
  token: Token,
  session: Session,
  track: Track,
  decision: boolean
) => {
  const endpoint = getEndpoint(`/${session.slug}/auth/decision`)
  const config = {
    params: {
      track: track.id,
      decision,
    },
    headers: getHeaders(token),
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
    console.error(e)
    return false
  }
}

export const updateApprovalRequired = async (
  token: Token,
  session: Session,
  approvalRequired: boolean
) => {
  const endpoint = getEndpoint(`/${session.slug}/auth/approval`)
  const config = {
    params: { approvalRequired },
    headers: getHeaders(token),
  }
  try {
    let response = await axios.post(endpoint, null, config)
    return responseToSession(response.data)
  } catch (e) {
    console.error(e)
    return undefined
  }
}

export const socket = io(host)
