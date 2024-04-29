import express from "express"
import dotenv from "dotenv"
import { Server, Socket } from "socket.io"
import cors from "cors"
import multer from "multer"

import {
  addSpotifyUserToSession,
  checkUserExists,
  createSession,
  deleteSession,
  discardTokens,
  getQueuedTracks,
  getSession,
  getSessionOverviews,
  getSessions,
  getTracks,
  insertPlaylist,
  setPlaylist,
  updateTokens,
  validateSessionSlug,
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
import {
  Listener,
  PlayingStatus,
  Session,
  Track,
  getNewListener,
  printListeners,
} from "./structs.js"
import { setIntervalAsync } from "set-interval-async"

dotenv.config()

const port = process.env.SERVER_PORT || 8090

const app = express()

const corsOptions = {
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST"],
}
app.use(express.json())
app.use(express.urlencoded())

const server = app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})

const io = new Server(server, { cors: corsOptions })

app.get("/", (req, res) => {
  res.send("Hello!")
})

app.get("/sessions", async (req, res) => {
  let sessions = await getSessionOverviews()
  res.status(200).send(sessions)
})

const getSessionFromToken = async (token: string) => {
  try {
    let decoded = await verifyToken(token)
    if (!decoded["sub"]) {
      return undefined
    } else {
      return decoded["sub"]
    }
  } catch (e) {
    console.log("getSessionFromToken", e)
    return undefined
  }
}

const authSessionHost = async (
  sessionSlug: string,
  authHeader: string | undefined
) => {
  if (!authHeader) {
    return false
  } else {
    let token = authHeader.split(" ")[1]
    let tokenSession = await getSessionFromToken(token)
    if (sessionSlug === tokenSession) {
      return true
    } else {
      return false
    }
  }
}

app.use("/:sessionSlug", async (req, res, next) => {
  let sessionSlugString = req.params["sessionSlug"]
  try {
    let sessionSlug = sessionSlugString
    if (!validateSessionSlug(sessionSlug)) {
      res.status(400).send("Invalid session id")
    } else {
      res.locals["sessionSlug"] = sessionSlug
      let authorizationHeader = req.header("Authorization")
      res.locals["isAdmin"] = await authSessionHost(
        sessionSlug,
        authorizationHeader
      )
      next()
    }
  } catch {
    res.status(400).send("Invalid session id")
  }
})

app.get("/:sessionSlug", async (req, res) => {
  let sessionSlugString = res.locals["sessionSlug"]
  let isAdmin = res.locals["isAdmin"]
  let session = await getSession(
    "session_name_slug",
    sessionSlugString,
    isAdmin
  )
  if (!session) {
    res.status(404).send("No session with that slug found")
  } else {
    res.status(200).send(session)
  }
})

app.post("/:sessionSlug/token", multer().single("file"), async (req, res) => {
  const body = req.body
  const sessionSlug = req.params["sessionSlug"]
  let password = body.password
  let isValid = await authenticateSessionAdmin(sessionSlug, password)
  if (!isValid) {
    res
      .status(400)
      .header({ "WWW-Authenticate": "Bearer" })
      .send("Invalid credentials")
  } else {
    let token = await generateToken(sessionSlug)
    let user = await getSpotifyUser(sessionSlug)
    res.send({
      access_token: token.token,
      expires_at: token.expiresAt,
      token_type: "bearer",
      user: user,
    })
  }
})

app.use("/:sessionSlug/auth", async (req, res, next) => {
  let isAdmin = res.locals["isAdmin"]
  if (!isAdmin) {
    res.status(401).send("Invalid authorisation")
  } else {
    next()
  }
})

app.post("/:sessionSlug/auth/spotify", async (req, res) => {
  let body = req.body
  let code = body.code
  let sessionSlug: string = res.locals["sessionSlug"]
  try {
    let tokens = await exchangeAccessCodeForTokens(code)
    if (!tokens) {
      res.sendStatus(400)
    } else {
      updateTokens(sessionSlug, tokens)
      let spotifyUser = await getSpotifyUser(sessionSlug)
      if (spotifyUser) {
        addSpotifyUserToSession(sessionSlug, spotifyUser)
        res.send(spotifyUser)
      } else {
        res.status(404).send("Spotify user not found")
      }
    }
  } catch (e) {
    console.log("auth/spotify", e)
    res.sendStatus(400)
  }
})

app.delete("/:sessionSlug/auth", async (req, res) => {
  let sessionSlug: string = res.locals["sessionSlug"]
  let isAdmin = res.locals["isAdmin"]
  await deleteSession(sessionSlug)
  res.sendStatus(200)
})

app.delete("/:sessionSlug/auth/spotify", async (req, res) => {
  let sessionSlug: string = res.locals["sessionSlug"]
  let isAdmin = res.locals["isAdmin"]
  await discardTokens(sessionSlug)
  let session = await getSession("session_name_slug", sessionSlug, isAdmin)
  console.log(session)
  res.status(200).send(session)
})

app.get("/:sessionSlug/auth/spotify/playlists", async (req, res) => {
  console.log("HELLO!")
  let sessionSlug = res.locals["sessionSlug"]
  let playlists = await getPlaylists(sessionSlug)
  res.send(playlists)
})

app.post("/:sessionSlug/auth/spotify/playlist", async (req, res) => {
  let sessionSlug: string = res.locals["sessionSlug"]
  let playlistId = req.query.playlist_id
  if (typeof playlistId !== "string") {
    res.status(400).send("Query parameters must be string")
  } else {
    let playlist = await getPlaylistDetails(sessionSlug, playlistId)
    if (playlist) {
      await insertPlaylist(playlist)
      await setPlaylist(sessionSlug, playlistId)
      let session = await getSession("session_name_slug", sessionSlug, false)
      if (session) {
        io.to(sessionSlug).emit("new_playlist", session)
        console.log(session.playlist?.tracks.length)
        res.status(200).send(session)
      } else {
        res.status(500)
      }
    } else {
      res.status(404).send("Playlist not found")
    }
  }
})

app.delete("/auth/spotify/session", async (req, res) => {
  let user = res.locals["user"]
  deleteSession(user)
  res.sendStatus(200)
})

const emitData = async (
  socket: Socket | Server,
  sessionId: string | undefined
) => {
  if (sessionId) {
    socket.emit("session", `You are connected to session ${sessionId}`)
  } else {
    socket.emit("session", "You are not connected to a session")
  }
}

const listeners = new Map<number, Listener>()
const sessionStatuses = new Map<string, PlayingStatus>()
const sessions = new Map<Session, Listener[]>()

const queueChanged = (oldQueue: Track[], newQueue: Track[]) => {
  if (oldQueue.length !== newQueue.length) {
    return true
  }
  for (let i = 0; i < oldQueue.length; i++) {
    if (oldQueue[i].id !== newQueue[i].id) {
      return false
    }
  }
}

const updateSessionStatus = async () => {
  let sessions = await getSessions()
  sessions.forEach((session) => {
    let sessionStatus = {
      current: session.current,
      queue: session.queue,
    }
    let oldSessionStatus = sessionStatuses.get(session.slug)
    if (
      !oldSessionStatus ||
      !oldSessionStatus.current ||
      !sessionStatus.current ||
      oldSessionStatus.current.id !== sessionStatus.current.id ||
      queueChanged(oldSessionStatus.queue, sessionStatus.queue)
    ) {
      sessionStatuses.set(session.slug, sessionStatus)
      io.to(session.slug).emit("playback", sessionStatus)
    }
  })
}

// updateSessionStatus()

io.on("connection", async (socket) => {
  let listener = getNewListener(socket)
  listeners.set(listener.id, listener)
  console.log(`User #${listener.id} connected`)
  var sessionSlug: string | undefined = undefined
  emitData(socket, sessionSlug)
  socket.on("join_session", async (newSessionId: string) => {
    console.log(socket.id, "is joining", newSessionId)
    sessionSlug = newSessionId
    socket.join(sessionSlug)
    const session = await getSession("session_name_slug", sessionSlug, false)
    if (session) {
      listener.session = session
      socket.emit("queue", {
        current: session.current,
        queue: session.queue,
      })
    }
  })
  socket.on("leave_session", () => {
    sessionSlug = undefined
  })
  socket.on("disconnect", () => {
    listeners.delete(listener.id)
  })
})

app.post("/session", async (req, res) => {
  const body = req.body
  const sessionName = body["name"]
  const sessionHost = body["host"]
  const password = body["password"]
  if (!sessionName || !sessionHost) {
    res.status(400).send("Session initialisation needs both name and host")
  } else {
    let session = await createSession(sessionName, sessionHost, password)
    if (!session) {
      res.status(400).send("Slug already exists")
    } else {
      console.log("creating session", session.slug)
      let token = await generateToken(session.slug)
      res.status(200).send({
        session,
        token: token.token,
        expires: token.expiresAt,
      })
    }
  }
})
