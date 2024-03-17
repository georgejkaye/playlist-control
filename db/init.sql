CREATE TABLE Session (
    session_id SERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    playlist_id TEXT NOT NULL,
    session_start TIMESTAMP WITHOUT TIME ZONE NOT NULL
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
    track_id TEXT PRIMARY KEY,
    track_name TEXT NOT NULL,
    track_duration INT NOT NULL,
    queued_at TIMESTAMP WITHOUT TIME ZONE,
    session_id INT NOT NULL,
    CONSTRAINT fk_session_id FOREIGN KEY(session_id) REFERENCES session(session_id) ON DELETE CASCADE
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
)