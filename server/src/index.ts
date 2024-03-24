import express, { Express, Request, Response } from "express"
import dotenv from "dotenv"
import { Server } from "socket.io"
import { createServer } from "http"
import cors from "cors"
import { randomBytes } from "crypto"
import { stringify } from "querystring"
import { readFile } from "fs"
import axios from "axios"
import { SpotifyApi } from "@spotify/web-api-ts-sdk"

dotenv.config()

const port = process.env.SERVER_PORT

const app: Express = express()
app.use(cors())

app.get("/", (req, res) => {
  res.send("Hello!")
})

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_APP_ID
const SPOTIFY_CLIENT_SECRET_FILE = process.env.SPOTIFY_SECRET

if (!SPOTIFY_CLIENT_SECRET_FILE) {
  console.log("Could not read variable SPOTIFY_SECRET")
  process.exit(1)
}

var SPOTIFY_CLIENT_SECRET: string

readFile(SPOTIFY_CLIENT_SECRET_FILE, "utf8", (err, data) => {
  if (err) {
    console.log("Could not read spotify secret")
    return
  }
  SPOTIFY_CLIENT_SECRET = data
})

const REDIRECT_URI = "http://localhost:7000/callback"

app.get("/auth", (req, res) => {
  var state = randomBytes(20).toString("hex")
  var scope = "user-read-private user-read-email"
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      stringify({
        response_type: "code",
        client_id: SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        state: state,
      })
  )
})

let sdk

app.post("/callback", (req, res) => {
  console.log("HELLO")
  let data = req.body
  sdk = SpotifyApi.withAccessToken("client-id", data) // SDK now authenticated as client-side user
  console.log(sdk)
})

const server = app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

io.on("connection", (socket) => {
  console.log("A user connected")
})

setInterval(() => {
  io.emit("update", "Hello!")
}, 10000)
