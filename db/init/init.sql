CREATE TABLE Playlist (
    playlist_id TEXT PRIMARY KEY,
    playlist_name TEXT NOT NULL,
    playlist_url TEXT NOT NULL,
    playlist_art TEXT NOT NULL
);

CREATE TABLE Session (
    session_id SERIAL PRIMARY KEY,
    session_host TEXT NOT NULL,
    session_name TEXT NOT NULL,
    session_name_slug TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    spotify_id TEXT,
    spotify_user TEXT,
    spotify_user_art TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    playlist_id TEXT,
    session_start TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_playlist_id FOREIGN KEY(playlist_id) REFERENCES playlist(playlist_id) ON DELETE SET NULL
);

CREATE TABLE Artist (
    artist_id TEXT PRIMARY KEY,
    artist_name TEXT NOT NULL
);

CREATE TABLE Album (
    album_id TEXT PRIMARY KEY,
    album_name TEXT NOT NULL,
    album_art TEXT NOT NULL
);

CREATE TABLE AlbumArtist (
    album_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    CONSTRAINT fk_album_id FOREIGN KEY(album_id) REFERENCES album(album_id) ON DELETE CASCADE,
    CONSTRAINT fk_artist_id FOREIGN KEY(artist_id) REFERENCES artist(artist_id) ON DELETE CASCADE,
    UNIQUE (album_id, artist_id)
);

CREATE TABLE Track (
    track_id TEXT NOT NULL PRIMARY KEY,
    track_name TEXT NOT NULL,
    track_album TEXT NOT NULL,
    track_duration INT NOT NULL,
    CONSTRAINT fk_track_album FOREIGN KEY(track_album) REFERENCES album(album_id) ON DELETE CASCADE,
    UNIQUE (track_id, track_album)
);

CREATE TABLE SessionTrack (
    session_slug TEXT NOT NULL,
    track_id TEXT NOT NULL,
    CONSTRAINT fk_session_slug FOREIGN KEY(session_slug) REFERENCES session(session_name_slug) ON DELETE CASCADE,
    CONSTRAINT fk_track_id FOREIGN KEY(track_id) REFERENCES track(track_id) ON DELETE CASCADE
);

CREATE TABLE PlaylistTrack (
    playlist_id TEXT,
    track_id TEXT,
    CONSTRAINT fk_track_id FOREIGN KEY(track_id) REFERENCES track(track_id) ON DELETE CASCADE
);

CREATE TABLE TrackArtist (
    track_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    CONSTRAINT fk_track_id FOREIGN KEY(track_id) REFERENCES track(track_id) ON DELETE CASCADE,
    CONSTRAINT fk_artist_id FOREIGN KEY(artist_id) REFERENCES artist(artist_id) ON DELETE CASCADE
);

CREATE TABLE QueuedTrack (
    track_id TEXT PRIMARY KEY,
    queued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    session_name_slug TEXT NOT NULL,
    requested BOOLEAN NOT NULL,
    CONSTRAINT fk_track_id FOREIGN KEY(track_id) REFERENCES Track(track_id) ON DELETE CASCADE,
    CONSTRAINT fk_session_slug FOREIGN KEY(session_name_slug) REFERENCES Session(session_name_slug) ON DELETE CASCADE
);

CREATE TABLE ArtistTrack (
    artist_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    CONSTRAINT fk_artist_id FOREIGN KEY(artist_id) REFERENCES artist(artist_id) ON DELETE CASCADE,
    CONSTRAINT fk_track_id FOREIGN KEY(track_id) REFERENCES track(track_id) ON DELETE CASCADE,
    UNIQUE (artist_id, track_id)
);

CREATE TABLE AlbumTrack (
    album_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    CONSTRAINT fk_album_id FOREIGN KEY(album_id) REFERENCES album(album_id) ON DELETE CASCADE,
    CONSTRAINT fk_track_id FOREIGN KEY(track_id) REFERENCES track(track_id) ON DELETE CASCADE,
    UNIQUE (album_id, track_id)
);

CREATE TABLE Request (
    request_id SERIAL PRIMARY KEY,
    track_id TEXT NOT NULL UNIQUE,
    session_name_slug TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    successful BOOLEAN,
    CONSTRAINT fk_track_id FOREIGN KEY(track_id) REFERENCES track(track_id) ON DELETE CASCADE,
    CONSTRAINT fk_session_name FOREIGN KEY(session_name_slug) REFERENCES session(session_name_slug) ON DELETE CASCADE
);