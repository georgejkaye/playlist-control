import { Client, connect } from "ts-postgres"
import {
  Album,
  Artist,
  Playlist,
  Session,
  SessionOverview,
  SpotifyUser,
  Track,
} from "./structs.js"
import { getSecret } from "./utils.js"
import {
  SpotifyTokens,
  getPlaylistDetails,
  getPlaylistOverview,
  getQueue,
  getSessionObject,
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

export var connected = false

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
connected = true

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

export const checkUserExists = async (sessionSlug: string) => {
  const queryText =
    "SELECT session_host FROM Session WHERE session_name_slug = $1"
  const query = { text: queryText }
  const result = await client.query(query, [sessionSlug])
  if (result.rows.length !== 1) {
    return false
  } else {
    return true
  }
}

export const getPasswordHash = async (sessionSlug: string) => {
  const queryText =
    "SELECT password_hash FROM Session WHERE session_name_slug = $1"
  const query = { text: queryText }
  const result = await client.query(query, [sessionSlug])
  if (result.rows.length !== 1) {
    return undefined
  } else {
    let hashedPassword: string = result.rows[0].get("password_hash")
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

const getInsertArtistsStatement = (artists: Artist[]) => {
  let values = artists
    .map((artist) => `('${artist.id}', '${artist.name.replaceAll("'", "''")}')`)
    .join(",")
  return `INSERT INTO Artist (artist_id, artist_name) VALUES ${values} ON CONFLICT DO NOTHING`
}

const getInsertAlbumsStatement = (albums: Album[]) => {
  let values = albums
    .map(
      (album) =>
        `('${album.id}', '${album.name.replaceAll("'", "''")}', '${album.art}')`
    )
    .join(",")
  return `INSERT INTO Album (album_id, album_name, album_art) VALUES ${values} ON CONFLICT DO NOTHING`
}

const getInsertTracksStatement = (tracks: Track[]) => {
  let values = tracks
    .map(
      (track) =>
        `('${track.id}', '${track.name.replaceAll("'", "''")}', '${
          track.duration
        }', '${track.album.id}')`
    )
    .join(",")
  return `INSERT INTO Track (track_id, track_name, track_duration, track_album) VALUES ${values} ON CONFLICT DO NOTHING`
}

const getInsertAlbumTracksStatement = (
  albumTracks: { album: Album; track: Track }[]
) => {
  let values = albumTracks
    .map(({ album, track }) => `('${album.id}', '${track.id}')`)
    .join(",")
  return `INSERT INTO AlbumTrack (album_id, track_id) VALUES ${values} ON CONFLICT DO NOTHING`
}

const getInsertArtistTracksStatement = (
  artistTracks: { artist: Artist; track: Track }[]
) => {
  let values = artistTracks
    .map(({ artist, track }) => `('${artist.id}', '${track.id}')`)
    .join(",")
  return `INSERT INTO ArtistTrack (artist_id, track_id) VALUES ${values} ON CONFLICT DO NOTHING`
}

const getInsertPlaylistTracksStatement = (
  playlistTracks: { playlist: Playlist; track: Track }[]
) => {
  let values = playlistTracks
    .map(({ playlist, track }) => `('${playlist.id}', '${track.id}')`)
    .join(",")
  return `INSERT INTO PlaylistTrack (playlist_id, track_id) VALUES ${values} ON CONFLICT DO NOTHING`
}

const getInsertAlbumArtistsStatement = (
  albumArtists: { album: Album; artist: Artist }[]
) => {
  let values = albumArtists
    .map(({ album, artist }) => `('${album.id}', '${artist.id}')`)
    .join(",")
  return `INSERT INTO AlbumArtist (album_id, artist_id) VALUES ${values} ON CONFLICT DO NOTHING`
}

const mapQueryOverSet = <T>(set: Set<T>, fn: (data: T[]) => string) =>
  fn(Array.from(set))

export const insertPlaylist = async (playlist: Playlist) => {
  const playlistQueryText = `
    INSERT INTO playlist
    (playlist_id, playlist_name, playlist_url, playlist_art)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (playlist_id) DO UPDATE
    SET playlist_name = $2, playlist_url = $3, playlist_art = $4
  `
  await client.query(playlistQueryText, [
    playlist.id,
    playlist.name,
    playlist.url,
    playlist.art,
  ])
  const playlistTrackQueryText = `
    DELETE FROM playlisttrack WHERE playlist_id = $1
  `
  await client.query(playlistTrackQueryText, [playlist.id])
  let artists = new Set<Artist>()
  let albums = new Set<Album>()
  let albumTracks = new Set<{ album: Album; track: Track }>()
  let artistTracks = new Set<{ artist: Artist; track: Track }>()
  let albumArtists = new Set<{ album: Album; artist: Artist }>()
  let tracks = new Set<Track>()
  let playlistTracks = new Set<{ playlist: Playlist; track: Track }>()
  for (let track of playlist.tracks) {
    let album = track.album
    albums.add(album)
    for (let artist of album.artists) {
      artists.add(artist)
      albumArtists.add({ album, artist })
    }
    albumTracks.add({ album, track })
    for (let artist of track.artists) {
      artists.add(artist)
      artistTracks.add({ artist, track })
    }
    tracks.add(track)
    playlistTracks.add({ playlist, track })
  }
  await client.query(mapQueryOverSet(artists, getInsertArtistsStatement))
  await client.query(mapQueryOverSet(albums, getInsertAlbumsStatement))
  await client.query(mapQueryOverSet(tracks, getInsertTracksStatement))
  client.query(mapQueryOverSet(albumArtists, getInsertAlbumArtistsStatement))
  client.query(mapQueryOverSet(artistTracks, getInsertArtistTracksStatement))
  client.query(mapQueryOverSet(albumTracks, getInsertAlbumTracksStatement))
  client.query(
    mapQueryOverSet(playlistTracks, getInsertPlaylistTracksStatement)
  )
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
  console.log(`Updating ${sessionSlug} with refresh ${tokens.refresh}`)
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
): Promise<Session | undefined> => {
  const hashedPassword = await hashPassword(password)
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
      spotify: undefined,
      queued: [],
      current: undefined,
      queue: [],
    }
  } catch (e) {
    console.log("createSession", e)
    // Error can occur if slug is not unique
    return undefined
  }
}

export const getSessions = async () => {
  const queryText = `
    SELECT
      session_id, session_host, session_name, session_name_slug, playlist_id,
      access_token, refresh_token, expires_at
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
      return await getSessionObject(id, name, slug, host, playlistId)
    })
  )
  return sessions
}

export const getSessionOverviews = async () => {
  const queryText = `
    SELECT
      session_id, session_host, session_name, session_name_slug,
      playlist.playlist_name, access_token, refresh_token, expires_at
    FROM Session
    LEFT JOIN Playlist
    ON session.playlist_id = playlist.playlist_id
  `
  const query = { text: queryText }
  let result = await client.query(query)
  let sessions = await Promise.all(
    result.rows.map(async (row) => {
      let id = row.get("session_id")
      let host = row.get("session_host")
      let name = row.get("session_name")
      let slug = row.get("session_name_slug")
      let playlist = row.get("playlist_name")
      return { id, host, name, slug, playlist }
    })
  )
  return sessions
}

export const getSessionPlaylist = async (sessionSlug: string) => {
  const queryText = `
    SELECT
      track.track_id, track.track_name,
      trackartists.artists AS track_artists,
      album.album_id, album.album_name, album.album_art,
      albumartists.artists AS album_artists,
      track.track_duration, sessiontracks.queued_at
    FROM track
    INNER JOIN albumtrack
    ON track.track_id = albumtrack.track_id
    INNER JOIN album
    ON albumtrack.album_id = album.album_id
    INNER JOIN (
      SELECT
      track_id,
      json_agg(json_build_object('artist_id', Artist.artist_id, 'artist_name', Artist.artist_name)) AS Artists
      FROM ArtistTrack
      INNER JOIN Artist ON Artist.artist_id = ArtistTrack.artist_id
      GROUP BY track_id
    ) trackartists
    ON track.track_id = trackartists.track_id
    INNER JOIN (
      SELECT
        album_id,
        json_agg(json_build_object('artist_id', Artist.artist_id, 'artist_name', Artist.artist_name)) AS Artists
      FROM AlbumArtist
      INNER JOIN Artist ON Artist.artist_id = AlbumArtist.artist_id
      GROUP BY album_id
    ) albumartists
    ON album.album_id = albumartists.album_id
    LEFT JOIN (
      SELECT *
      FROM queuedtrack
      WHERE session_name_slug = $1
    ) sessiontracks
    ON sessiontracks.track_id = track.track_id
    WHERE track.track_id
    IN (
      SELECT playlisttrack.track_id
      FROM playlisttrack
      WHERE playlisttrack.playlist_id IN (
        SELECT session.playlist_id
        FROM session
        WHERE session_name_slug = $1
      )
    )
  `
  const query = { text: queryText }
  let result = await client.query(query, [sessionSlug])
  if (!result) {
    return []
  } else {
    let rows = result.rows
    let tracks = rows.map((row) => {
      let track_id = row.get("track_id")
      let track_name = row.get("track_name")
      let track_artists = row.get("track_artists")
      let album_id = row.get("album_id")
      let album_name = row.get("album_name")
      let album_art = row.get("album_art")
      let album_artists = row.get("album_artists")
      let track_duration = row.get("track_duration")
      let queued_at = row.get("queued_at")
      let track_artist_objects: Artist[] = track_artists.map((artist: any) => ({
        id: artist.artist_id,
        name: artist.artist_name,
      }))
      let album_artist_objects: Artist[] = album_artists.map((artist: any) => ({
        id: artist.artist_id,
        name: artist.artist_name,
      }))
      let album: Album = {
        id: album_id,
        name: album_name,
        artists: album_artist_objects,
        art: album_art,
      }
      let track: Track = {
        id: track_id,
        name: track_name,
        album: album,
        artists: track_artist_objects,
        duration: track_duration,
        queued: queued_at,
      }
      return track
    })
    return tracks
  }
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
      playlist.playlist_id,
      playlist.playlist_name,
      playlist.playlist_url,
      playlist.playlist_art,
      sessionqueued.queued_tracks,
      session.access_token,
      session.spotify_user,
      session.spotify_user_art,
      session.spotify_id
    FROM Session
    LEFT JOIN (
      SELECT queuedtrack.session_name_slug, json_agg(json_build_object('track_id', queuedtrack.track_id, 'queued_at', queuedtrack.queued_at)) AS queued_tracks
      FROM queuedtrack
      GROUP BY session_name_slug
    ) SessionQueued
    ON sessionqueued.session_name_slug = session.session_name_slug
    LEFT JOIN Playlist
    ON Session.playlist_id = Playlist.playlist_id
    WHERE Session.session_name_slug = $1
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
    let playlistName = row.get("playlist_name")
    let playlistURL = row.get("playlist_url")
    let playlistArt = row.get("playlist_art")
    let spotifyId = row.get("spotify_id")
    let spotifyUser = !spotifyId
      ? undefined
      : {
          id: spotifyId,
          name: row.get("spotify_user"),
          image: row.get("spotify_user_art"),
        }
    let queuedTracks = row.get("queued_tracks")
    let queued = !queuedTracks
      ? []
      : queuedTracks.map((track: any) => ({
          id: track["track_id"],
          time: track["queued_at"],
        }))
    let tracks = await getSessionPlaylist(sessionSlug)
    let playlist = !playlistId
      ? undefined
      : {
          id: playlistId,
          name: playlistName,
          url: playlistURL,
          art: playlistArt,
          tracks,
        }
    let playing = await getQueue(sessionSlug)
    let { current, queue } = playing
      ? playing
      : { current: undefined, queue: [] }
    return {
      name: sessionName,
      id: sessionId,
      host: sessionHost,
      slug: sessionSlug,
      playlist,
      queued,
      spotify: spotifyUser,
      current,
      queue,
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

export const addSpotifyUserToSession = async (
  sessionSlug: string,
  spotifyUser: SpotifyUser
) => {
  const queryText = `
    UPDATE Session
    SET spotify_id = $1, spotify_user = $2, spotify_user_art = $3
    WHERE session_name_slug = $4
  `
  const query = { text: queryText }
  client.query(query, [
    spotifyUser.id,
    spotifyUser.name,
    spotifyUser.image,
    sessionSlug,
  ])
}

export const setPlaylist = async (sessionSlug: string, playlistId: string) => {
  const queryText = `
    UPDATE Session
    SET playlist_id = $1
    WHERE session_name_slug = $2
  `
  const query = { text: queryText }
  client.query(query, [playlistId, sessionSlug])
}

export const addListener = async (sessionSlug: string) => {
  const queryText = `
    INSERT INTO Listener (session_name_slug) VALUES ($1) RETURNING listener_id
  `
  const query = { text: queryText }
  let result = await client.query(query, [sessionSlug])
  let rows = result.rows
  let row = rows[0]
  return row.get("listener_id")
}

export const removeListener = async (listenerId: number) => {
  const queryText = `
    DELETE FROM Listener WHERE listener_id = $1
  `
  const query = { text: queryText }
  client.query(query, [listenerId])
}

export const addToQueuedTracks = async (
  sessionSlug: string,
  trackId: string
) => {
  const query = `
    INSERT INTO QueuedTrack (track_id, queued_at, session_name_slug)
    VALUES ($1, NOW(), $2)
    ON CONFLICT (track_id) DO NOTHING
    RETURNING queued_at
  `
  let response = await client.query(query, [trackId, sessionSlug])
  let row = response.rows[0]
  try {
    return row.get("queued_at")
  } catch (e) {
    return undefined
  }
}

export const insertRequest = async (sessionSlug: string, trackId: string) => {
  const query = `
    INSERT INTO Request (track_id, session_name_slug)
    VALUES ($1, $1)
  `
  client.query(query, [trackId, sessionSlug])
}
