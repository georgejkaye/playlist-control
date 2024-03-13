from dataclasses import dataclass
import uvicorn
from datetime import timedelta
from typing import Annotated, Optional
from api.database import (
    connect,
    delete_all_tracks,
    disconnect,
    get_session,
    insert_session,
    insert_tracks,
    select_tracks,
)
from api.spotify import (
    CurrentTrack,
    add_to_queue,
    authorise_access,
    get_track,
    get_tracks_from_playlist,
)
import api.spotify as spotify
from spotipy.exceptions import SpotifyException
from api.structs import Session, Track
from api.utils import get_env_variable
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from api.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    validate_token,
)


app = FastAPI(
    title="Party playlist API",
    summary="API for interacting with the party playlist",
    version="1.0.0",
    contact={
        "name": "George Kaye",
        "email": "georgejkaye@gmail.com",
        "url": "https://georgejkaye.com",
    },
    license_info={
        "name": "GNU General Public License v3.0",
        "url": "https://www.gnu.org/licenses/gpl-3.0.en.html",
    },
)


@app.post("/token", summary="Get an auth token")
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    # Check the username and password
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Create an access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@dataclass
class Data:
    session: Optional[Session]
    tracks: list[Track]
    current: Optional[CurrentTrack]
    queue: Optional[list[Track]]


@app.get("/data", summary="Get all the current data")
async def get_data() -> Data:
    sp = authorise_access()
    (conn, cur) = connect()
    session = get_session(cur)
    current = spotify.get_current_track(sp)
    queue = spotify.get_queue(sp)
    if session:
        tracks = select_tracks(cur)
    else:
        tracks = []
    disconnect(conn, cur)
    return Data(session, tracks, current, queue)


@dataclass
class SessionAndTracks:
    session: Session
    tracks: list[Track]


@app.post("/session", summary="Set the current session")
async def post_session(
    session_name: str,
    playlist_id: str,
    token: Annotated[str, Depends(validate_token)],
) -> SessionAndTracks:
    (conn, cur) = connect()
    sp = authorise_access()
    playlist = spotify.get_playlist(sp, playlist_id)
    if playlist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Playlist id does not exist"
        )
    session = insert_session(conn, cur, session_name, playlist)
    tracks = get_tracks_from_playlist(sp, playlist_id)
    if tracks is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Playlist id does not exist"
        )
    delete_all_tracks(conn, cur)
    insert_tracks(conn, cur, tracks)
    tracks = select_tracks(cur)
    disconnect(conn, cur)
    return SessionAndTracks(session, tracks)


@app.get("/current", summary="Get the currently playing track")
async def get_current_track() -> CurrentTrack:
    sp = authorise_access()
    track = spotify.get_current_track(sp)
    if track is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No track currently playing"
        )
    return track


@dataclass
class CurrentAndQueue:
    current: CurrentTrack
    queue: list[Track]


@app.get("/queue", summary="Get the current queue")
async def get_queue() -> CurrentAndQueue:
    sp = authorise_access()
    current = spotify.get_current_track(sp)
    queue = spotify.get_queue(sp)
    if current and queue:
        return CurrentAndQueue(current, queue)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No queue found")


@app.post("/queue", summary="Add a track to the queue")
async def queue_track(track_id: str) -> list[Track]:
    sp = authorise_access()
    track = select_tracks([track_id])
    if len(track) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track id does not exist in playlist",
        )
    try:
        add_to_queue(sp, track_id)
    except SpotifyException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No active device found"
        )
    queue = spotify.get_queue(sp)
    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Track id does not exist"
        )
    return queue


@app.get("/tracks", summary="Get available tracks")
async def get_tracks() -> list[Track]:
    (conn, cur) = connect()
    tracks = select_tracks(cur)
    disconnect(conn, cur)
    return tracks


@app.post("/track", summary="Add a track to the playlist")
async def post_track(track_id: str, token: Annotated[str, Depends(validate_token)]):
    sp = authorise_access()
    track = get_track(sp, track_id)
    if track is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Track id does not exist"
        )
    (conn, cur) = connect()
    insert_tracks(conn, cur, [track])
    disconnect(conn, cur)


@app.post("/playlist", summary="Set the playlist")
async def post_playlist(
    playlist_id: str, token: Annotated[str, Depends(validate_token)]
):
    sp = authorise_access()
    tracks = get_tracks_from_playlist(sp, playlist_id)
    if tracks is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Playlist id does not exist"
        )
    (conn, cur) = connect()
    delete_all_tracks(conn, cur)
    insert_tracks(conn, cur, tracks)
    disconnect(conn, cur)


def start():
    if get_env_variable("API_ENV") == "prod":
        reload = False
    elif get_env_variable("API_ENV") == "dev":
        reload = True
    else:
        print("Invalid environment set")
        exit(1)
    authorise_access()
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=int(get_env_variable("API_PORT")),
        reload=reload,
    )


if __name__ == "__main__":
    start()
