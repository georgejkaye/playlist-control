
CREATE TABLE LocalUser (
    user_id SERIAL PRIMARY KEY,
    user_name TEXT NOT NULL,
    user_password_hash TEXT NOT NULL,
    spotify_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    session_name TEXT,
    playlist_id TEXT
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
    user_id INT NOT NULL,
    CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES LocalUser(user_id) ON DELETE CASCADE
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

INSERT INTO LocalUser (user_name, user_password_hash) VALUES ('admin', '$2a$10$Y/tdZWiBvQlb2u9bN5bYruxSvUZJ2XQtoJYGDldfj5t7FwXI.OAkO');