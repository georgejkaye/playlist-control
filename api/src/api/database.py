from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional
from api.structs import Track
from fastapi import HTTPException

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


# def get_tracks() -> list[Track]:
#     (conn, cur) = connect()
#     statement = """
#         SELECT
#             Track.track_id, Track.track_name,
#             array_agg(Artist.artist_id), array_agg(Artist.artist_name),
#             Album.album_id, Album.album_name, Album.album_art, Track.track_duration
#         FROM Track
#         INNER JOIN TrackArtist ON Track.track_id = TrackArtist.track_id
#         INNER JOIN


#     """


def insert_track(tracks: list[Track]):
    (conn, cur) = connect()
    artist_statement = """
            INSERT INTO Artist (artist_id, artist_name) (%s, %s)
            WHERE NOT EXISTS (SELECT artist_id FROM Artist WHERE artist_id = ANY (unnest(%(ids)))
    """
    artists = []

    cur.execute()
    statement = """
        INSERT INTO Track (track_id)
    """
