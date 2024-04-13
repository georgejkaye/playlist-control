import express from "express"
import dotenv from "dotenv"
import { Server, Socket } from "socket.io"
import cors from "cors"
import multer from "multer"

import {
  checkUserExists,
  createSession,
  deleteSession,
  discardTokens,
  getQueuedTracks,
  getSession,
  getSessions,
  getTracks,
  setPlaylist,
  updateTokens,
  validateSessionId,
} from "./database.js"
import {
  authenticateUser as authenticateSessionAdmin,
  generateToken,
  verifyToken,
} from "./auth.js"
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

const server = app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

app.get("/", (req, res) => {
  res.send("Hello!")
})

app.post("/session", async (req, res) => {
  const body = req.body
  const sessionName = body["name"]
  const sessionHost = body["host"]
  if (!sessionName || !sessionHost) {
    res.status(400).send("Session initialisation needs both name and host")
  } else {
    let { session, password } = await createSession(sessionName, sessionHost)
    return {
      session,
      password,
    }
  }
})

app.get("/sessions", async (req, res) => {
  let sessions = await getSessions()
})

app.use("/:sessionId", async (req, res, next) => {
  let sessionIdString = req.params["sessionId"]
  try {
    let sessionId = Number.parseInt(sessionIdString)
    if (!validateSessionId(sessionId)) {
      res.status(400).send("Invalid session id")
    } else {
      res.locals["sessionId"] = sessionId
      next()
    }
  } catch {
    res.status(400).send("Invalid session id")
  }
})

app.post("/:sessionId/token", multer().single("file"), async (req, res) => {
  const body = req.body
  const sessionId = Number.parseInt(req.params["sessionId"])
  let password = body.password
  let isValid = await authenticateSessionAdmin(sessionId, password)
  if (!isValid) {
    res
      .status(400)
      .header({ "WWW-Authenticate": "Bearer" })
      .send("Invalid credentials")
  } else {
    let token = await generateToken(sessionId)
    let user = await getSpotifyUser(sessionId)
    res.send({
      access_token: token,
      token_type: "bearer",
      user: user,
    })
  }
})

const getSessionFromToken = async (token: string) => {
  try {
    let decoded = await verifyToken(token)
    if (!decoded["sub"]) {
      return undefined
    } else {
      return Number.parseInt(decoded["sub"])
    }
  } catch (e) {
    console.log(e)
    return undefined
  }
}

app.use("/:sessionId/auth", async (req, res, next) => {
  let sessionId: number = res.locals["sessionId"]
  let authorizationHeader = req.header("Authorization")
  if (!authorizationHeader) {
    res.status(401).send("Authorization failed")
  } else {
    let token = authorizationHeader.split(" ")[1]
    let tokenSession = await getSessionFromToken(token)
    if (sessionId !== tokenSession) {
      res.status(401).send("Authorization failed")
    } else {
      next()
    }
  }
})

app.post("/:sessionId/auth/spotify", async (req, res) => {
  let body = req.body
  let code = body.code
  let sessionId: number = res.locals["sessionId"]
  try {
    let tokens = await exchangeAccessCodeForTokens(code)
    if (!tokens) {
      res.sendStatus(400)
    } else {
      updateTokens(sessionId, tokens)
      let spotifyUser = await getSpotifyUser(sessionId)
      res.send(spotifyUser)
    }
  } catch (e) {
    res.sendStatus(400)
  }
})

app.delete("/:sessionId/auth/spotify", async (req, res) => {
  let user = res.locals["user"]
  await discardTokens(user)
  res.sendStatus(200)
})

app.get("/:sessionId/auth/playlists", async (req, res) => {
  let sessionId: number = res.locals["sessionId"]
  let playlists = await getPlaylists(sessionId)
  res.send(playlists)
})

app.post("/:sessionId/auth/playlist", async (req, res) => {
  let sessionId = res.locals["sessionId"]
  let playlistId = req.query.playlist_id
  let name = req.query.session_name
  if (typeof playlistId !== "string" || typeof name !== "string") {
    res.status(400).send("Query parameters must be string")
  } else {
    let playlist = await getPlaylistDetails(sessionId, playlistId)
    if (playlist) {
      setPlaylist(sessionId, playlistId)
      res.status(200).send(playlist)
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

const getSessionData = async (sessionId: number) => {
  const queue = await getQueue(sessionId)
  const queueds = await getQueuedTracks(sessionId)
  const session = await getSession(sessionId)
  return {
    current: queue ? queue.current : undefined,
    session,
    queue: queue ? queue.queue : undefined,
    queueds,
  }
}

const emitData = async (socket: Socket | Server, sessionId: number) => {
  console.log("Getting data")
  let data = await getSessionData(sessionId)
  if (data) {
    console.log("Sending data")
    socket.emit("data", data)
  } else {
    socket.emit("empty")
  }
}

io.on("connection", async (socket) => {
  console.log("A user connected")
  var sessionId: number | undefined = undefined
  socket.on("join_session", (newSessionId: number) => {
    sessionId = newSessionId
    emitData(socket, sessionId)
  })
  socket.on("leave_session", () => {
    sessionId = undefined
  })
  socket.on("new_session", async (data) => {
    try {
      let sessionHost = data.sessionHost
      let sessionName = data.sessionName
      let { session, password } = await createSession(sessionHost, sessionName)
      socket.emit("session_created", { session, password })
    } catch {
      socket.emit("error", "Session needs name and host")
    }
  })
  setInterval(async () => {
    let sessions = await getSessions()
    if (sessionId) {
      socket.emit("session", `You are connected to session ${sessionId}`)
    } else {
      socket.emit("session", "You are not connected to a session")
    }
    socket.emit("sessions", sessions)
  }, 5000)
})
