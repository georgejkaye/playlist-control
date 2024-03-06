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


def get_args_statement(cur, tups: set[tuple]) -> str:
    columns = len(list(tups)[0])
    percents = ["%s" for i in range(0, columns)]
    placeholders = f"({','.join(percents)})"
    args_str = ",".join(cur.mogrify(placeholders, x).decode("utf-8") for x in tups)
    return args_str


def get_insert_artist_statement(cur, artists: set[tuple[str, str]]) -> str:
    return f"""
            INSERT INTO Artist (artist_id, artist_name) VALUES {get_args_statement(cur, artists)}
            ON CONFLICT (artist_id) DO NOTHING
    """


def get_insert_album_statement(cur, albums: set[tuple[str, str, str]]) -> str:
    return f"""
            INSERT INTO Album (album_id, album_name, album_art) VALUES {get_args_statement(cur, albums)}
            ON CONFLICT (album_id) DO NOTHING
    """


def get_insert_track_statement(cur, tracks: set[tuple[str, str, str]]) -> str:
    return f"""
            INSERT INTO Track (track_id, track_name, track_duration) VALUES {get_args_statement(cur, tracks)}
            ON CONFLICT (track_id) DO NOTHING
    """


def get_insert_album_track_statement(cur, album_tracks: set[tuple[str, str]]):
    return f"""
            INSERT INTO AlbumTrack (album_id, track_id) VALUES {get_args_statement(cur, album_tracks)}
    """


def get_insert_artist_track_statement(cur, artist_tracks: set[tuple[str, str]]):
    return f"""
        INSERT INTO ArtistTrack (artist_id, track_id) VALUES {get_args_statement(cur, artist_tracks)}
    """


def get_insert_album_artist_statement(cur, album_artists: set[tuple[str, str]]):
    return f"""
        INSERT INTO AlbumArtist (album_id, artist_id) VALUES {get_args_statement(cur, album_artists)}
    """


def execute_many(cur, fn: Callable, tups: set[tuple]):
    statement = fn(cur, tups)
    cur.execute(statement)


def insert_tracks(tracks: list[Track]):
    (conn, cur) = connect()
    artists = set()
    albums = set()
    album_tracks = set()
    artist_tracks = set()
    album_tracks = set()
    album_artists = set()
    track_tuples = set()
    for track in tracks:
        album = track.album
        albums.add((album.id, album.name, album.art))
        for artist in album.artists:
            artists.add((artist.id, artist.name))
            album_artists.add((album.id, artist.id))
        album_tracks.add((album.id, track.id))
        for artist in track.artists:
            artists.add((artist.id, artist.name))
            artist_tracks.add((artist.id, track.id))
        track_tuples.add((track.id, track.name, track.duration))
    execute_many(cur, get_insert_artist_statement, artists)
    execute_many(cur, get_insert_album_statement, albums)
    execute_many(cur, get_insert_track_statement, track_tuples)
    execute_many(cur, get_insert_album_artist_statement, album_artists)
    execute_many(cur, get_insert_artist_track_statement, artist_tracks)
    execute_many(cur, get_insert_album_track_statement, album_tracks)
    conn.commit()
    conn.close()
