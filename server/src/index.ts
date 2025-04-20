import express from "express"
import dotenv from "dotenv"
import { Server, Socket } from "socket.io"
import cors from "cors"

import {
  addSpotifyUserToSession,
  addToQueuedTracks,
  createSession,
  deleteSession,
  discardTokens,
  getSession,
  getSessionOverviews,
  getSessions,
  insertPlaylist,
  insertRequest,
  updateRequestDecision,
  setPlaylist,
  updateTokens,
  validateSessionSlug,
  checkApprovalRequired,
  removePlaylist,
} from "./database.ts"
import {
  authenticateUser as authenticateSessionAdmin,
  generateToken,
  verifyToken,
} from "./auth.ts"
import {
  addToQueue,
  exchangeAccessCodeForTokens,
  getPlaylistDetails,
  getPlaylists,
  getQueue,
  getSpotifyUser,
  getTrack,
  searchTracks,
} from "./spotify.ts"
import {
  type Listener,
  type PlayingStatus,
  type Session,
  type Track,
  getNewListener,
} from "./structs.ts"
import { createServer } from "http"

dotenv.config()

const port = process.env.SERVER_PORT || 8000

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: { origin: "*" },
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})

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

const authSessionToken = async (sessionSlug: string, token: string) => {
  let tokenSession = await getSessionFromToken(token)
  if (sessionSlug === tokenSession) {
    return true
  } else {
    return false
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
    return authSessionToken(sessionSlug, token)
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

app.post("/:sessionSlug/token", async (req, res) => {
  const body = req.body
  const sessionSlug = req.params["sessionSlug"]
  let password = body.password
  let isValid = await authenticateSessionAdmin(sessionSlug, password)
  if (!isValid) {
    res
      .status(401)
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

const queueTrack = async (
  sessionSlug: string,
  trackId: string,
  requested: boolean
) => {
  let response = await addToQueue(sessionSlug, trackId)
  if (response) {
    let queuedAt = await addToQueuedTracks(sessionSlug, trackId, requested)
    await new Promise((r) => setTimeout(r, 1000))
    let queue = await getQueue(sessionSlug)
    io.to(sessionSlug).emit("queued_track", {
      id: trackId,
      queued_at: queuedAt,
      queue: queue.queue,
      current: queue.current,
    })
    return true
  } else {
    return false
  }
}

app.post("/:sessionSlug/queue", async (req, res) => {
  const query = req.query
  const trackId = query.track_id
  if (typeof trackId !== "string") {
    res.status(400).send("Query parameters must be string")
  } else {
    let isAdmin: boolean = res.locals["isAdmin"]
    let sessionSlug: string = res.locals["sessionSlug"]
    let approvalRequired = await checkApprovalRequired(sessionSlug, trackId)
    if (approvalRequired && !isAdmin) {
      let track = await getTrack(sessionSlug, trackId)
      if (track) {
        let requestId = await insertRequest(sessionSlug, track)
        if (requestId != undefined) {
          io.emit("new_request", {
            session: sessionSlug,
            requestId,
            track,
          })
          res.status(200).send("Track requested successfully")
        } else {
          res.status(200).send("Track already requested")
        }
      } else {
        res.status(404).send("Track not found")
      }
    } else {
      let response = await queueTrack(sessionSlug, trackId, approvalRequired)
      if (!response) {
        res.status(400).send("Could not add track to queue")
      } else {
        res.status(200).send("Queued successfully")
      }
    }
  }
})

app.post("/:sessionSlug/search", async (req, res) => {
  const query = req.query
  const searchString = query.search
  if (typeof searchString !== "string") {
    res.status(400).send("Query parameters must be string")
  } else {
    let tracks = await searchTracks(res.locals["sessionSlug"], searchString)
    if (!tracks) {
      res.status(500).send("Could not search tracks")
    } else {
      res.status(200).send(tracks)
    }
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
  res.status(200).send(session)
})

app.get("/:sessionSlug/auth/spotify/playlists", async (req, res) => {
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
        res.status(200).send(session)
      } else {
        res.status(500)
      }
    } else {
      res.status(404).send("Playlist not found")
    }
  }
})

app.delete("/:sessionSlug/auth/playlist", async (req, res) => {
  let sessionSlug: string = res.locals["sessionSlug"]
  await removePlaylist(sessionSlug)
  io.to(sessionSlug).emit("playlist_removed")
})

app.post("/:sessionSlug/auth/decision", async (req, res) => {
  let sessionSlug: string = res.locals["sessionSlug"]
  let trackId = req.query.track
  let decision = req.query.decision
  if (typeof trackId !== "string" || typeof decision !== "string") {
    res.status(400).send("Query parameters must be string")
  } else {
    if (decision === "true") {
      queueTrack(sessionSlug, trackId, true)
    }
    updateRequestDecision(sessionSlug, trackId, decision === "true")
    res.status(200).send("Decision acknowledged")
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
const admins = new Map<Session, Listener[]>()

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

io.on("connection", async (socket) => {
  let listener = getNewListener(socket)
  listeners.set(listener.id, listener)
  console.log(`User #${listener.id} connected`)
  var sessionSlug: string | undefined = undefined
  emitData(socket, sessionSlug)
  socket.on("token", async (token: string) => {
    if (sessionSlug) {
      if (await authSessionToken(sessionSlug, token)) {
        socket.emit("Valid token")
        socket.join(`${sessionSlug}-admin`)
      } else {
        socket.emit("Invalid token")
      }
    } else {
      socket.emit("No session")
    }
  })
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
      io.emit("new_session", session)
      res.status(200).send({
        session,
        token: token.token,
        expires: token.expiresAt,
      })
    }
  }
})
