from typing import Optional
from api.structs import Album, Artist, Song
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


def get_song_object(raw_song: dict) -> Song:
    raw_artists = raw_song["artists"]
    artists = []
    for raw_artist in raw_artists:
        artist = Artist(raw_artist["name"])
        artists.append(artist)
    raw_album = raw_song["album"]
    album_name = raw_album["name"]
    album_art = raw_album["images"][0]["url"]
    raw_album_artists = raw_album["artists"]
    album_artists = []
    for raw_album_artist in raw_album_artists:
        artist = Artist(raw_album_artist["name"])
        album_artists.append(artist)
    album = Album(album_name, album_artists, album_art)
    song_name = raw_song["name"]
    song = Song(song_name, album, artists)
    return song


def get_current_song(sp: Spotify) -> Optional[Song]:
    raw_song = sp.current_playback()
    if raw_song is not None:
        return get_song_object(raw_song["item"])
    return None


def add_to_queue(sp: Spotify, song_id: str):
    sp.add_to_queue(song_id)


def get_songs_from_playlist_page(sp: Spotify, page: dict) -> list[Song]:
    return [get_song_object(raw_song["track"]) for raw_song in page]


def get_songs_from_playlist(sp: Spotify, playlist_id: str) -> list[Song]:
    next_page = True
    page = sp.playlist_tracks(playlist_id)
    songs = []
    while next_page:
        print("Iterating")
        if page is not None:
            raw_songs = page["items"]
            songs.extend(get_songs_from_playlist_page(sp, raw_songs))
            if page["next"] is None:
                next_page = False
            else:
                page = sp.next(page)
    return songs


if __name__ == "__main__":
    authorise_access()
