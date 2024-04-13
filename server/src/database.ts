import { Client, connect } from "ts-postgres"
import { Playlist, Session, SessionOverview, Track } from "./structs.js"
import { getSecret } from "./utils.js"
import {
  SpotifyTokens,
  getPlaylistDetails,
  getPlaylistOverview,
  getSessionOverview,
  getSpotifyUser,
  refreshTokens,
} from "./spotify.js"
import { generatePassword } from "./auth.js"

const DB_HOST = process.env.DB_HOST || "georgejkaye.com"
const DB_USER = process.env.DB_USER || "playlist"
const DB_PORT = process.env.DB_PORT || "5432"
const DB_NAME = process.env.DB_NAME || "playlist"
const DB_PASSWORD_FILE = process.env.DB_PASSWORD || "db.secret"

const DB_PASSWORD = await getSecret(DB_PASSWORD_FILE)

var client: Client

const init = async () =>
  (client = await connect({
    host: DB_HOST,
    port: Number.parseInt(DB_PORT),
    user: DB_USER,
    database: DB_NAME,
    password: DB_PASSWORD,
  }))

init()

export const validateSessionId = async (sessionId: number) => {
  const queryText = "SELECT session_id FROM Session WHERE session_id = $1"
  const query = { text: queryText }
  const result = await client.query(query, [sessionId])
  if (result.rows.length !== 1) {
    return false
  } else {
    return true
  }
}

export const checkUserExists = async (sessionId: string) => {
  const queryText = "SELECT session_host FROM Session WHERE session_id = $1"
  const query = { text: queryText }
  const result = await client.query(query, [sessionId])
  if (result.rows.length !== 1) {
    return false
  } else {
    return true
  }
}

export const getPasswordHash = async (sessionId: number) => {
  const queryText = "SELECT password_hash FROM Session WHERE session_id = $1"
  const query = { text: queryText }
  const result = await client.query(query, [sessionId])
  if (result.rows.length !== 1) {
    return undefined
  } else {
    let hashedPassword: string = result.rows[0].get("user_password_hash")
    return hashedPassword
  }
}

export const getQueuedTracks = async (session_id: number) => {
  const queryText =
    "SELECT track_id, queued_at FROM Track WHERE session_id = $1"
  const query = { text: queryText }
  let result = await client.query(query, [session_id])
  let rows = result.rows
  let queueds = rows.map((row) => ({
    id: row.get("track_id"),
    time: row.get("queued_at"),
  }))
  return queueds
}

const selectTracksAndArtists = `
    SELECT
        track_id,
        json_agg(json_build_object('artist_id', Artist.artist_id, 'artist_name', Artist.artist_name)) AS Artists
    FROM ArtistTrack
    INNER JOIN Artist ON Artist.artist_id = ArtistTrack.artist_id
    GROUP BY track_id
`

const selectAlbumsAndArtists = `
    SELECT
        album_id,
        json_agg(json_build_object('artist_id', Artist.artist_id, 'artist_name', Artist.artist_name)) AS Artists
    FROM AlbumArtist
    INNER JOIN Artist ON Artist.artist_id = AlbumArtist.artist_id
    GROUP BY album_id
`

export const getTracks = async (trackIds: String[]) => {
  const whereStatement =
    trackIds.length === 0 ? "" : "WHERE Track.track_id = ANY($1)"
  const queryText = `
    SELECT
        Track.track_id, Track.track_name,
        TrackArtists.artists AS track_artists,
        Album.album_id, Album.album_name, Album.album_art,
        AlbumArtists.artists AS album_artists,
        Track.track_duration, Track.queued_at
    FROM Track
    INNER JOIN (${selectTracksAndArtists}) TrackArtists ON Track.track_id = TrackArtists.track_id
    INNER JOIN AlbumTrack ON Track.track_id = AlbumTrack.track_id
    INNER JOIN Album ON AlbumTrack.album_id = Album.album_id
    INNER JOIN (${selectAlbumsAndArtists}) AlbumArtists ON Album.album_id = AlbumArtists.album_id
    ${whereStatement}
  `
  const query = { text: queryText }
  const result = await client.query<Track>(query, [trackIds])
  return result
}

export const getSpotifyTokens = async (sessionId: number) => {
  const queryText = `
    SELECT access_token, refresh_token, expires_at
    FROM Session
    WHERE session_id = $1
  `
  const query = { text: queryText }
  let result = await client.query(query, [sessionId])
  let rows = result.rows
  if (rows.length !== 1) {
    return undefined
  } else {
    let row = rows[0]
    let access = row.get("access_token")
    if (!access) {
      return undefined
    } else {
      let refresh = row.get("refresh_token")
      let expires = row.get("expires_at")
      let oldTokens = { access, refresh, expires }
      // Amount of remaining time to prompt refreshing
      const expiryRange = 60 * 1000
      if (oldTokens.expires >= new Date(new Date().getTime() + expiryRange)) {
        return oldTokens
      }
      let newTokens = await refreshTokens(sessionId, oldTokens)
      if (!newTokens) {
        return undefined
      }
      return newTokens
    }
  }
}

export const updateTokens = async (
  sessionId: number,
  tokens: SpotifyTokens
) => {
  const queryText = `
      UPDATE Session
      SET access_token = $2, refresh_token = $3, expires_at = $4
      WHERE session_host = $5
    `
  const query = { text: queryText }
  await client.query(query, [
    tokens.access,
    tokens.refresh,
    tokens.expires,
    sessionId,
  ])
}

export const discardTokens = async (username: string) => {
  const queryText = `
    UPDATE Session
    SET
      spotify_id = NULL, access_token = NULL,
      refresh_token = NULL, expires_at = NULL
    WHERE
      username = $1
  `
  const query = { text: queryText }
  await client.query(query, [username])
}

const makeParameters = (params: string[][]) => {
  let columnCount = params[0].length
  return params
    .map((row, rowNo) =>
      row.map((col, colNo) => `$${rowNo * columnCount + colNo}`).join(",")
    )
    .join(",")
}

export const createSession = async (
  sessionHost: string,
  sessionName: string
) => {
  const { password, hashedPassword } = await generatePassword()
  const queryText = `
    INSERT INTO Session (session_host, session_name, password_hash, session_start)
    VALUES ($1, $2, $3, NOW())
    RETURNING session_id
  `
  const query = { text: queryText }
  let result = await client.query(query, [
    sessionHost,
    sessionName,
    hashedPassword,
  ])
  let sessionId = result.rows[0].get("session_id")
  return {
    session: {
      id: sessionId,
      name: sessionName,
      host: sessionHost,
      playlist: undefined,
      current: undefined,
    },
    password,
  }
}

export const getSessions = async () => {
  const queryText = `
    SELECT session_id, session_host, session_name, playlist_id, access_token, refresh_token, expires_at
    FROM Session
  `
  const query = { text: queryText }
  let result = await client.query(query)
  let sessions = result.rows.map(async (row) => {
    let id = row.get("session_id")
    let host = row.get("session_host")
    let name = row.get("session_name")
    let playlistId = row.get("playlist_id")
    return await getSessionOverview(id, name, host, playlistId)
  })
  return sessions
}

export const getSession = async (sessionId: number) => {
  const queryText = `
    WITH queued_tracks AS (
      SELECT track_id, queued_at
      FROM Track
      WHERE session_id = $1
    )
    SELECT session_name, playlist_id, ARRAY_AGG(playlist_track.track_id, playlist_track.queued_at) AS queued_tracks
    FROM Session
    WHERE session_id = $1
  `
  const query = { text: queryText }
  const result = await client.query(query, [sessionId])
  const rows = result.rows
  if (rows.length !== 1) {
    return undefined
  } else {
    let row = rows[0]
    let sessionName = row.get("session_name")
    let playlistId = row.get("playlist_id")
    let queuedTracks = row.get("queued_tracks").map((track: any) => ({
      id: track["track_id"],
      time: track["queued_at"],
    }))
    let playlist = await getPlaylistDetails(sessionId, playlistId)
    if (!playlist) {
      return undefined
    } else {
      return {
        name: sessionName,
        playlist,
        queuedTracks,
      }
    }
  }
}

export const deleteSession = async (sessionId: string) => {
  const queryText = `
    DELETE FROM Session WHERE session_id = $1
  `
  const query = { text: queryText }
  client.query(query, [sessionId])
}

export const setPlaylist = async (sessionId: number, playlistId: string) => {
  const queryText = `
    UPDATE Session
    SET playlist_id = $1
    WHERE session_id = $2
  `
  const query = { text: queryText }
  client.query(query, [playlistId, sessionId])
}
