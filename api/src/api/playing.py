from typing import Optional
from api.structs import Album, Artist, Song
from spotipy import Spotify


def get_current_song(sp: Spotify) -> Optional[Song]:
    raw_song = sp.current_playback()
    if raw_song is not None:
        raw_item = raw_song["item"]
        raw_artists = raw_item["artists"]
        artists = []
        for raw_artist in raw_artists:
            artist = Artist(raw_artist["name"])
            artists.append(artist)
        raw_album = raw_item["album"]
        album_name = raw_album["name"]
        album_art = raw_album["images"][0]["url"]
        raw_album_artists = raw_album["artists"]
        album_artists = []
        for raw_album_artist in raw_album_artists:
            artist = Artist(raw_album_artist["name"])
            album_artists.append(artist)
        album = Album(album_name, album_artists, album_art)
        song_name = raw_item["name"]
        song = Song(song_name, album, artists)
        return song
    return None
