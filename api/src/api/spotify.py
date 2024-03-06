from dataclasses import dataclass
from typing import Optional
from api.structs import Album, Artist, Track
from api.utils import get_env_variable, get_secret
from spotipy import Spotify, SpotifyOAuth

scope = [
    "user-library-read",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "user-read-playback-state",
]


def authorise_access() -> Spotify:
    client_id = get_env_variable("SPOTIFY_ID")
    client_secret = get_secret("SPOTIFY_SECRET")
    redirect_uri = get_env_variable("SPOTIFY_REDIRECT")
    sp = Spotify(
        auth_manager=SpotifyOAuth(
            scope=scope,
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        )
    )
    user = sp.current_user()
    if user:
        print(f"Thank you for authorising, {user['display_name']}!")
    return sp


def get_artist_object(raw_artist: dict) -> Artist:
    artist_id = raw_artist["id"]
    artist_name = raw_artist["name"]
    return Artist(artist_id, artist_name)


def get_track_object(raw_track: dict) -> Track:
    raw_artists = raw_track["artists"]
    artists = [get_artist_object(raw_artist) for raw_artist in raw_artists]
    raw_album = raw_track["album"]
    album_name = raw_album["name"]
    album_art = raw_album["images"][0]["url"]
    raw_album_artists = raw_album["artists"]
    album_artists = [
        get_artist_object(raw_album_artist) for raw_album_artist in raw_album_artists
    ]
    album_id = raw_album["id"]
    album = Album(album_id, album_name, album_artists, album_art)
    track_name = raw_track["name"]
    track_duration = raw_track["duration_ms"]
    track_id = raw_track["id"]
    track = Track(track_id, track_name, album, artists, track_duration)
    return track


@dataclass
class CurrentTrack:
    track: Track
    start: int


def get_current_track(sp: Spotify) -> Optional[CurrentTrack]:
    raw_track = sp.current_playback()
    if raw_track is not None:
        return CurrentTrack(get_track_object(raw_track["item"]), raw_track["timestamp"])
    return None


def get_track(sp: Spotify, track_id: str) -> Optional[Track]:
    raw_track = sp.track(track_id)
    if raw_track is not None:
        return get_track_object(raw_track)
    return None


def get_queue(sp: Spotify) -> Optional[list[Track]]:
    queue = sp.queue()
    if queue is None:
        return None
    else:
        raw_queue = queue["queue"]
        tracks = [get_track_object(raw_track) for raw_track in raw_queue]
        return tracks


def add_to_queue(sp: Spotify, track_id: str):
    sp.add_to_queue(track_id)


def get_tracks_from_playlist_page(sp: Spotify, page: dict) -> list[Track]:
    return [get_track_object(raw_track["track"]) for raw_track in page]


def get_tracks_from_playlist(sp: Spotify, playlist_id: str) -> Optional[list[Track]]:
    next_page = True
    page = sp.playlist_tracks(playlist_id)
    if page is None:
        return None
    tracks = []
    while next_page:
        if page is not None:
            raw_tracks = page["items"]
            tracks.extend(get_tracks_from_playlist_page(sp, raw_tracks))
            if page["next"] is None:
                next_page = False
            else:
                page = sp.next(page)
    return tracks


if __name__ == "__main__":
    authorise_access()
