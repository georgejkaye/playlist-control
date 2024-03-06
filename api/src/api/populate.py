import sys
from api.database import insert_tracks
from api.spotify import authorise_access, get_tracks_from_playlist

sp = authorise_access()
tracks = get_tracks_from_playlist(sp, sys.argv[1])
insert_tracks(tracks)
