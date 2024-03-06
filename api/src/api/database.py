from typing import Any, Callable
from api.structs import Album, Artist, Track

import psycopg2

from api.auth import get_env_variable, get_secret


def connect() -> tuple[Any, Any]:
    conn = psycopg2.connect(
        dbname=get_env_variable("DB_NAME"),
        user=get_env_variable("DB_USER"),
        password=get_secret("DB_PASSWORD"),
        host=get_env_variable("DB_HOST"),
    )
    cur = conn.cursor()
    return (conn, cur)


def disconnect(conn: Any, cur: Any) -> None:
    conn.close()
    cur.close()


select_tracks_and_artists = """
    SELECT
        track_id,
        json_agg(json_build_object('artist_id', Artist.artist_id, 'artist_name', Artist.artist_name)) AS Artists
    FROM ArtistTrack
    INNER JOIN Artist ON Artist.artist_id = ArtistTrack.artist_id
    GROUP BY track_id
"""

select_albums_and_artists = """
    SELECT
        album_id,
        json_agg(json_build_object('artist_id', Artist.artist_id, 'artist_name', Artist.artist_name)) AS Artists
    FROM AlbumArtist
    INNER JOIN Artist ON Artist.artist_id = AlbumArtist.artist_id
    GROUP BY album_id
"""


def get_artists_from_agg(artists: list[dict]) -> list[Artist]:
    return [Artist(artist["artist_id"], artist["artist_name"]) for artist in artists]


def select_tracks() -> list[Track]:
    (conn, cur) = connect()
    statement = f"""
        SELECT
            Track.track_id, Track.track_name,
            TrackArtists.artists AS track_artists,
            Album.album_id, Album.album_name, Album.album_art,
            AlbumArtists.artists AS album_artists,
            Track.track_duration
        FROM Track
        INNER JOIN ({select_tracks_and_artists}) TrackArtists ON Track.track_id = TrackArtists.track_id
        INNER JOIN AlbumTrack ON Track.track_id = AlbumTrack.track_id
        INNER JOIN Album ON AlbumTrack.album_id = Album.album_id
        INNER JOIN ({select_albums_and_artists}) AlbumArtists ON Album.album_id = AlbumArtists.album_id
    """
    cur.execute(statement)
    rows = cur.fetchall()
    conn.close()
    tracks = []
    for row in rows:
        (
            track_id,
            track_name,
            track_artists,
            album_id,
            album_name,
            album_art,
            album_artists,
            track_duration,
        ) = row
        track = Track(
            track_id,
            track_name,
            Album(album_id, album_name, get_artists_from_agg(album_artists), album_art),
            get_artists_from_agg(track_artists),
            track_duration,
        )
        tracks.append(track)
    return tracks
