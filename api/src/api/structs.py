from dataclasses import dataclass


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
