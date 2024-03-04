from api.utils import get_env_variable, get_secret

import spotipy
from spotipy.oauth2 import SpotifyOAuth
from spotipy import Spotify

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
    sp = spotipy.Spotify(
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


if __name__ == "__main__":
    authorise_access()
