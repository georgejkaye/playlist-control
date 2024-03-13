from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Playlist:
    id: str
    name: str
    art: str


@dataclass
class Session:
    id: int
    name: str
    playlist: Playlist


@dataclass
class Artist:
    id: str
    name: str


@dataclass
class Album:
    id: str
    name: str
    artists: list[Artist]
    art: str


@dataclass
class Track:
    id: str
    name: str
    album: Album
    artists: list[Artist]
    duration: int
    queued_at: Optional[datetime] = None
