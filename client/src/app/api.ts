import axios, { AxiosError } from "axios"
import { CurrentTrack, Playlist, Session, SetState, Track } from "./structs"

const responseToPlaylist = (response: any) => ({
  id: response["id"],
  url: response["url"],
  name: response["name"],
  art: response["art"],
  tracks: response["tracks"],
})

const responseToSession = (response: any) => ({
  id: response["id"],
  name: response["name"],
  playlist: responseToPlaylist(response["playlist"]),
})

const responseToArtist = (response: any) => ({
  id: response["id"],
  name: response["name"],
})

const responseToAlbum = (response: any) => ({
  id: response["id"],
  name: response["name"],
  artists: response["artists"].map(responseToArtist),
  art: response["art"],
})

const responseToTrack = (response: any) => ({
  id: response["id"],
  name: response["name"],
  album: responseToAlbum(response["album"]),
  artists: response["artists"].map(responseToArtist),
  duration: response["duration"],
  queued:
    response["queued_at"] === null
      ? undefined
      : new Date(Date.parse(response["queued_at"])),
})

const responseToCurrentTrack = (response: any) => ({
  track: responseToTrack(response["track"]),
  start: response["start"],
})

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

export const postQueue = async (
  track: Track,
  tracks: Track[],
  setTracks: SetState<Track[]>,
  setQueue: SetState<Track[]>
) => {
  const endpoint = "/api/queue"
  const config = {
    params: {
      track_id: track.id,
    },
  }
  try {
    const response = await axios.post(endpoint, null, config)
    if (response.status === 200) {
      const data = response.data
      const queued = responseToTrack(data["queued"])
      const queue = data["queue"].map(responseToTrack)
      setQueue(queue)
      setTracks(tracks.map((t) => (t.id !== track.id ? t : queued)))
    }
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
  setError: SetState<string>
) => {
  const endpoint = "/api/token"
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
      return 0
    } catch (err) {
      setError("Could not log in...")
      return 1
    }
  }
}

export const postPlaylist = async (
  token: string,
  sessionName: string,
  playlistId: string,
  setError: SetState<string>,
  setSession: SetState<Session | undefined>,
  setTracks: SetState<Track[]>
) => {
  const endpoint = "/api/session"
  const config = {
    headers: getHeaders(token),
    params: {
      session_name: sessionName,
      playlist_id: playlistId,
    },
  }
  try {
    let response = await axios.post(endpoint, null, config)
    let data = response.data
    let session = responseToSession(data["session"])
    let tracks = data["tracks"].map(responseToTrack)
    setSession(session)
    setTracks(tracks)
    return 0
  } catch (err) {
    if (err instanceof AxiosError && err.response) {
      if (err.response.status === 404) {
        setError("Could not find playlist")
      } else {
        setError("Something went wrong")
      }
      return 1
    }
  }
}
export const stopSession = async (token: string, sessionId: number) => {
  const endpoint = `/api/session/${sessionId}`
  const config = {
    headers: getHeaders(token),
  }
  await axios.delete(endpoint, config)
}
export const getPlaylists = async (setPlaylists: SetState<Playlist[]>) => {
  const endpoint = "/api/playlists"
  try {
    let response = await axios.get(endpoint)
    let data = response.data
    let playlists = data.map(responseToPlaylist)
    setPlaylists(playlists)
  } catch (err) {
    setPlaylists([])
  }
}
