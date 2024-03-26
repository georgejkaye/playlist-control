import express, { Express, Request, Response } from "express"
import dotenv from "dotenv"
import { Server } from "socket.io"
import { createServer } from "http"
import cors from "cors"
import { SpotifyApi } from "@spotify/web-api-ts-sdk"
import { readFile, readFileSync } from "fs"
import { getTracks } from "./database"

dotenv.config()

const port = process.env.SERVER_PORT

const app: Express = express()
app.use(cors())

const SPOTIFY_APP_ID = process.env.SPOTIFY_APP_ID || ""
const SPOTIFY_SECRET_FILE = process.env.SPOTIFY_SECRET || ""

const getSecret = async (callBackFn: (data: string) => void) => {
  return readFile(SPOTIFY_SECRET_FILE, "utf8", (err, data) => {
    if (err) {
      throw err
    }
    callBackFn(data)
  })
}

app.get("/", (req, res) => {
  res.send("Hello!")
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

io.on("connection", async (socket) => {
  console.log("A user connected")
  const tracks = await getTracks([])
  socket.emit("data", tracks)
})

setInterval(() => {
  io.emit("update", "Hello!")
}, 10000)
