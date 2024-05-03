import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios"
import { getSecret } from "./utils.js"
import { Playlist, PlaylistOverview, Session, Track } from "./structs.js"
import { getQueuedTracks, getSpotifyTokens, updateTokens } from "./database.js"

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_APP_ID || ""
const SPOTIFY_SECRET_FILE = process.env.SPOTIFY_SECRET || ""
const SPOTIFY_SECRET = await getSecret(SPOTIFY_SECRET_FILE)
const CLIENT_PROTOCOL = process.env.CLIENT_PROTOCOL || ""
const CLIENT_HOST = process.env.CLIENT_HOST || ""
const SPOTIFY_REDIRECT = `${CLIENT_PROTOCOL}://${CLIENT_HOST}/spotify`

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

export interface SpotifyTokens {
  access: string
  expires: Date
  refresh: string
}

const getTokensFromTokenResponse = (now: Date, response: AxiosResponse) => {
  let body = response.data
  console.log(body)
  let access = body.access_token
  let expires = new Date(now.getTime() + body.expires_in * 1000)
  let refresh = body.refresh_token
  let tokens: SpotifyTokens = { access, expires, refresh }
  return tokens
}

const getSpotifyHeaders = () => ({
  "content-type": "application/x-www-form-urlencoded",
  Authorization:
    "Basic " +
    Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_SECRET).toString("base64"),
})

export const exchangeAccessCodeForTokens = async (code: string) => {
  const now = new Date()
  const headers = getSpotifyHeaders()
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
    console.log("exchangeAccessCodeForTokens", e)
    return undefined
  }
}

export const refreshTokens = async (
  sessionSlug: string,
  tokens: SpotifyTokens
) => {
  const now = new Date()
  const config = {
    headers: getSpotifyHeaders(),
    params: { grant_type: "refresh_token", refresh_token: tokens.refresh },
  }
  try {
    let response = await axios.post(SPOTIFY_TOKEN_URL, null, config)
    let data = response.data
    if (data) {
      let access = data.access_token
      let expires = data.expires_in
      let refresh = tokens.refresh
      let newTokens = { access, expires, refresh }
      updateTokens(sessionSlug, newTokens)
      return tokens
    } else {
      return undefined
    }
  } catch (e) {
    let err = e as AxiosError
    console.log("refreshTokens:", err.message)
    console.log(e)
    return undefined
  }
}

const getApiURLFromEndpoint = (endpoint: string) =>
  `https://api.spotify.com/v1${endpoint}`

const getAuthHeader = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
})

const nameRegex =
  /(.+)(( - )(Radio Mix|Full Length Version|Radio Edit|Deluxe Edition)?((Remastered )?([0-9][0-9][0-9][0-9])?( Remastered( Version)?| Remaster| Mix)?)?()?)/

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
  return { id, name, album, artists, duration, queued: undefined }
}

const responseToPlaylist = (raw: any) => {
  let id = raw.id
  let name = raw.name
  let art = raw.images[0].url
  let url = raw.external_urls.spotify
  let tracks = raw.tracks.total
  return { id, url, name, art, tracks }
}

const doGet = async (
  url: string,
  config: AxiosRequestConfig<any> | undefined
) => {
  console.log(`Getting ${url}`)
  return axios.get(url, config)
}

const doPost = async (
  url: string,
  data: any,
  config: AxiosRequestConfig<any> | undefined
) => {
  console.log(`Posting ${url}`)
  return axios.post(url, data, config)
}

const getUrlAndHeaders = async (sessionSlug: string, endpoint: string) => {
  const url = getApiURLFromEndpoint(endpoint)
  let currentTokens = await getSpotifyTokens(sessionSlug)
  if (!currentTokens) {
    return { url, headers: undefined }
  } else {
    const headers = getAuthHeader(currentTokens.access)
    return { url, headers }
  }
}

const executeGetRequest = async <T>(
  sessionSlug: string,
  endpoint: string,
  dataCallback: (data: any) => T
) => {
  let { url, headers } = await getUrlAndHeaders(sessionSlug, endpoint)
  if (!headers) {
    return undefined
  } else {
    try {
      let response = await doGet(url, { headers })
      let data = response.data
      return dataCallback(data)
    } catch (e) {
      console.log("executeGetRequest", url, e)
      return undefined
    }
  }
}

const executePostRequest = async <T>(
  sessionSlug: string,
  endpoint: string,
  data: any,
  params: any,
  dataCallback: ((data: any) => T) | undefined
) => {
  let { url, headers } = await getUrlAndHeaders(sessionSlug, endpoint)
  if (!headers) {
    return undefined
  } else {
    try {
      let response = await doPost(url, data, { headers, params })
      if (dataCallback) {
        return dataCallback(response.data)
      }
    } catch (e) {
      console.log("executePostRequest", url, e)
      return undefined
    }
  }
}

const executePaginatedRequest = async <T, U>(
  sessionSlug: string,
  endpoint: string,
  outerCallback: (data: any, dataArray: U[]) => T,
  pageCallback: (
    dataArray: U[],
    data: any,
    pageNo: number
  ) => string | undefined
) => {
  const url = getApiURLFromEndpoint(endpoint)
  let tokens = await getSpotifyTokens(sessionSlug)
  if (!tokens) {
    return undefined
  } else {
    const headers = getAuthHeader(tokens.access)
    try {
      var next: string | undefined = url
      let pages = []
      let pageData: U[] = []
      var pageNo = 0
      while (next) {
        let response = await doGet(next, { headers })
        let data = response.data
        pages.push(data)
        next = pageCallback(pageData, data, pageNo)
        pageNo++
      }
      return outerCallback(pages, pageData)
    } catch (e) {
      let err = e as AxiosError
      console.log(`${err.status}: ${err.message}`)
      console.log(err)
      return undefined
    }
  }
}

export const getSpotifyUser = async (sessionSlug: string) => {
  return executeGetRequest(sessionSlug, "/me", (data) => {
    return {
      name: data["display_name"],
      image: data["images"][0]["url"],
      id: data["id"],
    }
  })
}

export const getCurrentTrack = async (sessionSlug: string) => {
  return executeGetRequest(
    sessionSlug,
    "/me/player/currently-playing",
    (data) => {
      let item = data.item
      if (item) {
        let track = responseToTrack(item)
        return track
      } else {
        return undefined
      }
    }
  )
}

export const getQueue = async (
  sessionSlug: string
): Promise<{ current: Track | undefined; queue: Track[] }> => {
  let result = await executeGetRequest(
    sessionSlug,
    "/me/player/queue",
    (data) => {
      let current = !data.currently_playing
        ? undefined
        : responseToTrack(data.currently_playing)
      let queue = data.queue.map(responseToTrack)
      return {
        current,
        queue,
      }
    }
  )
  return !result ? { current: undefined, queue: [] } : result
}

export const addToQueue = async (sessionSlug: string, trackId: string) => {
  const endpoint = "/me/player/queue"
  return executePostRequest(
    sessionSlug,
    endpoint,
    undefined,
    { uri: `spotify:track:${trackId}` },
    (data) => 1
  )
}

export const getPlaylists = async (sessionSlug: string) => {
  let playlists = await executePaginatedRequest<
    PlaylistOverview[],
    PlaylistOverview
  >(
    sessionSlug,
    "/me/playlists",
    (pages, pageData) => pageData,
    (dataArray, data) => {
      let items = data.items
      for (let item of items) {
        dataArray.push(responseToPlaylist(item))
      }
      return items.next ? items.next : undefined
    }
  )
  return playlists
}

export const getPlaylistOverview = async (
  sessionSlug: string,
  playlistId: string
) => {
  let playlist = await executeGetRequest<PlaylistOverview>(
    sessionSlug,
    `/playlists/${playlistId}`,
    (data) => {
      let id = data.id
      let art = data.images[0].url
      let name = data.name
      let url = data.external_urls.spotify
      let tracks = data.tracks.total
      return { id, url, name, art, tracks }
    }
  )
  return playlist
}

export const getPlaylistDetails = async (
  sessionSlug: string,
  playlistId: string
) => {
  let playlist = await executePaginatedRequest<Playlist, Track>(
    sessionSlug,
    `/playlists/${playlistId}`,
    (pages, pageData) => {
      let first = pages[0]
      let id = first.id
      let art = first.images[0].url
      let name = first.name
      let url = first.external_urls.spotify
      let tracks = pageData
      return { id, url, name, art, tracks }
    },
    (array, data, pageNo) => {
      const readTracks = (tracks: any[]) => {
        for (let track of tracks) {
          array.push(responseToTrack(track.track))
        }
      }
      if (pageNo === 0) {
        let tracks = data.tracks.items
        readTracks(tracks)
        return data.tracks.next ? data.tracks.next : undefined
      } else {
        let tracks = data.items
        readTracks(tracks)
        return data.next ? data.next : undefined
      }
    }
  )
  return playlist
}

export const getSessionOverview = async (
  sessionId: number,
  sessionName: string,
  sessionSlug: string,
  sessionHost: string,
  playlistId: string | undefined
) => {
  let playlist = !playlistId
    ? undefined
    : await getPlaylistOverview(sessionSlug, playlistId)
  let current = await getCurrentTrack(sessionSlug)
  return {
    id: sessionId,
    name: sessionName,
    slug: sessionSlug,
    host: sessionHost,
    playlist,
    current,
  }
}

export const getSessionObject = async (
  sessionId: number,
  sessionName: string,
  sessionSlug: string,
  sessionHost: string,
  playlistId: string | undefined
): Promise<Session> => {
  let playlist = !playlistId
    ? undefined
    : await getPlaylistDetails(sessionSlug, playlistId)
  let { current, queue } = await getQueue(sessionSlug)
  let queuedTracks = await getQueuedTracks(sessionSlug)
  let user = await getSpotifyUser(sessionSlug)
  return {
    id: sessionId,
    name: sessionName,
    slug: sessionSlug,
    host: sessionHost,
    playlist: playlist,
    queued: queuedTracks,
    spotify: user,
    current,
    queue,
  }
}
