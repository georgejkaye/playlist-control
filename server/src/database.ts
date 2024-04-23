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
import { generatePassword, hashPassword } from "./auth.js"
import slugify from "@sindresorhus/slugify"

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

export const validateSessionSlug = async (sessionSlug: string) => {
  const queryText =
    "SELECT session_name_slug FROM Session WHERE session_name_slug = $1"
  const query = { text: queryText }
  const result = await client.query(query, [sessionSlug])
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

export const getPasswordHash = async (sessionSlug: string) => {
  const queryText = "SELECT password_hash FROM Session WHERE session_id = $1"
  const query = { text: queryText }
  const result = await client.query(query, [sessionSlug])
  if (result.rows.length !== 1) {
    return undefined
  } else {
    let hashedPassword: string = result.rows[0].get("user_password_hash")
    return hashedPassword
  }
}

export const getQueuedTracks = async (sessionSlug: string) => {
  const queryText =
    "SELECT track_id, queued_at FROM Track WHERE session_name_slug = $1"
  const query = { text: queryText }
  let result = await client.query(query, [sessionSlug])
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

export const getSpotifyTokens = async (sessionSlug: string) => {
  const queryText = `
    SELECT access_token, refresh_token, expires_at
    FROM Session
    WHERE session_name_slug = $1
  `
  const query = { text: queryText }
  let result = await client.query(query, [sessionSlug])
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
      let newTokens = await refreshTokens(sessionSlug, oldTokens)
      if (!newTokens) {
        return undefined
      }
      return newTokens
    }
  }
}

export const updateTokens = async (
  sessionSlug: string,
  tokens: SpotifyTokens
) => {
  const queryText = `
      UPDATE Session
      SET access_token = $1, refresh_token = $2, expires_at = $3
      WHERE session_name_slug = $4
    `
  const query = { text: queryText }
  await client.query(query, [
    tokens.access,
    tokens.refresh,
    tokens.expires,
    sessionSlug,
  ])
}

export const discardTokens = async (sessionSlug: string) => {
  const queryText = `
    UPDATE Session
    SET
      spotify_id = NULL, access_token = NULL,
      refresh_token = NULL, expires_at = NULL
    WHERE
      session_name_slug = $1
  `
  const query = { text: queryText }
  await client.query(query, [sessionSlug])
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
  sessionName: string,
  sessionHost: string,
  password: string
) => {
  const hashedPassword = hashPassword(password)
  const sessionSlug = slugify(sessionName)
  const queryText = `
    INSERT INTO Session (session_host, session_name, session_name_slug, password_hash, session_start)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING session_id
  `
  const query = { text: queryText }
  try {
    let result = await client.query(query, [
      sessionHost,
      sessionName,
      sessionSlug,
      hashedPassword,
    ])
    let sessionId = result.rows[0].get("session_id")
    return {
      id: sessionId,
      name: sessionName,
      slug: sessionSlug,
      host: sessionHost,
      playlist: undefined,
      current: undefined,
      spotify: undefined,
    }
  } catch (e) {
    console.log(e)
    // Error can occur if slug is not unique
    return undefined
  }
}

export const getSessions = async () => {
  const queryText = `
    SELECT session_id, session_host, session_name, session_name_slug, playlist_id, access_token, refresh_token, expires_at
    FROM Session
  `
  const query = { text: queryText }
  let result = await client.query(query)
  let sessions = await Promise.all(
    result.rows.map(async (row) => {
      let id = row.get("session_id")
      let host = row.get("session_host")
      let name = row.get("session_name")
      let slug = row.get("session_name_slug")
      let playlistId = row.get("playlist_id")
      return await getSessionOverview(id, name, slug, host, playlistId)
    })
  )
  return sessions
}

export const getSession = async (
  param: string,
  value: string,
  isAdmin: boolean
): Promise<Session | undefined> => {
  const queryText = `
    SELECT
      session.session_name,
      session.session_host,
      session.session_id,
      session.session_name_slug,
      session.playlist_id,
      session.access_token,
      coalesce(
        json_agg(
          json_build_object(
            'track_id', track.track_id,
            'queued_at', track.queued_at
          )
        ) FILTER (
          WHERE track.track_id IS NOT NULL
        ),
        '[]'
      )
      AS queued_tracks
    FROM Session
    LEFT JOIN Track
    ON Session.session_id = Track.session_id
    WHERE Session.${param} = $1
    GROUP BY session.session_id
  `
  const query = { text: queryText }
  const result = await client.query(query, [value])
  const rows = result.rows
  if (rows.length !== 1) {
    return undefined
  } else {
    let row = rows[0]
    let sessionName = row.get("session_name")
    let sessionHost = row.get("session_host")
    let sessionId = row.get("session_id")
    let sessionSlug = row.get("session_name_slug")
    let playlistId = row.get("playlist_id")
    let queued = row.get("queued_tracks").map((track: any) => ({
      id: track["track_id"],
      time: track["queued_at"],
    }))
    let user = await getSpotifyUser(sessionSlug)
    let playlist = await getPlaylistDetails(sessionId, playlistId)
    return {
      name: sessionName,
      id: sessionId,
      host: sessionHost,
      slug: sessionSlug,
      playlist,
      queued,
      spotify: user,
    }
  }
}

export const deleteSession = async (sessionSlug: string) => {
  const queryText = `
    DELETE FROM Session WHERE session_name_slug = $1
  `
  const query = { text: queryText }
  client.query(query, [sessionSlug])
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
