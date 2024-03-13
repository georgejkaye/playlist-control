import axios from "axios"
import { CurrentTrack, Session, SetState, Track } from "./structs"

const responseToPlaylist = (response: any) => ({
  id: response["id"],
  name: response["name"],
  art: response["art"],
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
    console.log(data)
    const session =
      data["session"] === null ? undefined : responseToSession(data["session"])
    const tracks = data["tracks"].map(responseToTrack)
    const current = responseToCurrentTrack(data["current"])
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

export const postQueue = async (track: Track, setQueue: SetState<Track[]>) => {
  const endpoint = "/api/queue"
  const params = {
    track_id: track.id,
  }
  const response = await axios.post(endpoint, null, { params })
  if (response.status === 200) {
    const data = response.data
    const queue = data.map(responseToTrack)
    setQueue(queue)
  }
}
