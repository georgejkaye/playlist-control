from dataclasses import dataclass


@dataclass
class Artist:
    name: str


@dataclass
class Album:
    name: str
    artists: list[Artist]
    art: str


@dataclass
class Song:
    name: str
    album: Album
    artists: list[Artist]
