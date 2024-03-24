import { readFile } from "fs"
import { SpotifyApi } from "@spotify/web-api-ts-sdk"

var token: string
const TOKEN_FILE = process.env.SPOTIFY_ACCESS_TOKEN
