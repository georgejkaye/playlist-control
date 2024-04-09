import express from "express"
import dotenv from "dotenv"
import { Server } from "socket.io"
import cors from "cors"
import multer from "multer"

import {
  checkUserExists,
  createSession,
  deleteSession,
  discardTokens,
  getAccessToken,
  getAuthData,
  getTracks,
  updateTokens,
} from "./database.js"
import { authenticateUser, generateToken, verifyToken } from "./auth.js"
import {
  exchangeAccessCodeForTokens,
  getCurrentTrack,
  getPlaylistDetails,
  getPlaylists,
  getQueue,
  getSpotifyUser,
} from "./spotify.js"

dotenv.config()

const port = process.env.SERVER_PORT || 8090

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded())

app.get("/", (req, res) => {
  res.send("Hello!")
})

app.post("/token", multer().single("file"), async (req, res) => {
  const body = req.body
  let username = body.username
  let password = body.password
  let isValid = await authenticateUser(username, password)
  if (!isValid) {
    res
      .status(400)
      .header({ "WWW-Authenticate": "Bearer" })
      .send("Invalid credentials")
  } else {
    let token = await generateToken(username)
    let user = await getAuthData(username)
    res.send({
      access_token: token,
      token_type: "bearer",
      user: user,
    })
  }
})

const getUserFromToken = async (token: string) => {
  try {
    let decoded = await verifyToken(token)
    return decoded["sub"]
  } catch (e) {
    console.log(e)
    return undefined
  }
}

app.use("/auth", async (req, res, next) => {
  let authorizationHeader = req.header("Authorization")
  if (!authorizationHeader) {
    res.status(401).send("Authorization failed")
  } else {
    let token = authorizationHeader.split(" ")[1]
    let user = await getUserFromToken(token)
    if (!user) {
      res.status(401).send("Authorization failed")
    } else {
      let exists = await checkUserExists(user)
      if (!exists) {
        res.status(401).send("Authorization failed")
      } else {
        res.locals["user"] = user
        next()
      }
    }
  }
})

app.get("/auth/data", async (req, res) => {
  let username = res.locals["user"]
  let spotifyUserData = await getAuthData(username)
  res.send(spotifyUserData)
})

app.post("/auth/spotify", async (req, res) => {
  let body = req.body
  let code = body.code
  let username = res.locals["user"]
  try {
    let tokens = await exchangeAccessCodeForTokens(code)
    if (!tokens) {
      res.sendStatus(400)
    } else {
      updateTokens(username, tokens)
      let spotifyUser = await getSpotifyUser(tokens.access)
      res.send(spotifyUser)
    }
  } catch (e) {
    res.sendStatus(400)
  }
})

app.delete("/auth/spotify", async (req, res) => {
  let user = res.locals["user"]
  await discardTokens(user)
  res.sendStatus(200)
})

app.use("/auth/spotify", async (req, res, next) => {
  let user = res.locals["user"]
  let token = await getAccessToken(user)
  if (!token) {
    res.status(401).send("No spotify access token")
  } else {
    res.locals["spotify"] = token
    next()
  }
})

app.get("/auth/spotify/playlists", async (req, res) => {
  let token = res.locals["spotify"]
  let playlists = await getPlaylists(token)
  res.send(playlists)
})

app.post("/auth/spotify/session", async (req, res) => {
  let user = res.locals["user"]
  let token = res.locals["spotify"]
  let playlistId = req.query.playlist_id
  let name = req.query.session_name
  if (typeof playlistId !== "string" || typeof name !== "string") {
    res.status(400).send("Query parameters must be string")
  } else {
    let playlist = await getPlaylistDetails(token, playlistId)
    if (playlist) {
      let session = { name, playlist }
      createSession(user, session)
      res.send(session)
    } else {
      res.status(404).send("Playlist not found")
    }
  }
})

app.delete("/auth/spotify/session", async (req, res) => {
  let user = res.locals["user"]
  deleteSession(user)
  res.send(200)
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

const getData = async () => {
  let token = await getAccessToken("admin")
  if (!token) {
    return undefined
  }
  const tracks = await getTracks([])
  const response = await getQueue(token)
  return response
}

io.on("connection", async (socket) => {
  console.log("A user connected")
  let data = await getData()
  console.log(data)
  socket.emit("data", data)
})

setInterval(async () => {
  let data = await getData()
  io.emit("data", data)
}, 10000)
