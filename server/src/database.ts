import { Client, connect } from "ts-postgres"
import { Track } from "./structs.js"
import { getSecret } from "./utils.js"
import { SpotifyTokens, getSpotifyUser, refreshTokens } from "./spotify.js"

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

export const checkUserExists = async (username: string) => {
  const queryText = "SELECT user_name FROM LocalUser WHERE user_name = $1"
  const query = { text: queryText }
  const result = await client.query(query, [username])
  if (result.rows.length !== 1) {
    return false
  } else {
    return true
  }
}

export const getPasswordHash = async (username: string) => {
  const queryText =
    "SELECT user_password_hash FROM LocalUser WHERE user_name = $1"
  const query = { text: queryText }
  const result = await client.query(query, [username])
  if (result.rows.length !== 1) {
    return undefined
  } else {
    let hashedPassword: string = result.rows[0].get("user_password_hash")
    return hashedPassword
  }
}

export const getAuthData = async (username: string) => {
  const queryText =
    "SELECT spotify_id, access_token, refresh_token, expires_at FROM LocalUser WHERE user_name = $1"
  const query = { text: queryText }
  let result = await client.query(query, [username])
  let rows = result.rows
  if (rows.length !== 1) {
    return undefined
  } else {
    let row = rows[0]
    let spotifyId = row.get("spotify_id")
    if (!spotifyId) {
      return undefined
    } else {
      var accessToken: string = row.get("access_token")
      let refreshToken: string = row.get("refresh_token")
      let expiresAt: Date = row.get("expires_at")
      if (expiresAt < new Date()) {
        let tokens = await refreshTokens(refreshToken)
        if (!tokens) {
          return undefined
        } else {
          await updateTokens(username, tokens)
          accessToken = tokens.access
        }
      }
      let user = await getSpotifyUser(accessToken)
      return user
    }
  }
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

export const updateTokens = async (username: string, tokens: SpotifyTokens) => {
  let user = await getSpotifyUser(tokens.access)
  if (user) {
    const queryText = `
      UPDATE LocalUser
      SET spotify_id = $1, access_token = $2, refresh_token = $3, expires_at = $4
      WHERE user_name = $5
    `
    const query = { text: queryText }
    await client.query(query, [
      user.id,
      tokens.access,
      tokens.refresh,
      tokens.expires,
      username,
    ])
  }
}

export const discardTokens = async (username: string) => {
  const queryText = `
    UPDATE LocalUser
    SET
      spotify_id = NULL, access_token = NULL,
      refresh_token = NULL, expires_at = NULL
    WHERE
      username = $1
  `
  const query = { text: queryText }
  await client.query(query, [username])
}
