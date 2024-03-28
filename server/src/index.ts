import express from "express"
import dotenv from "dotenv"
import { Server } from "socket.io"
import cors from "cors"
import multer from "multer"

import {
  checkUserExists,
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
  let decoded = await verifyToken(token)
  return decoded["sub"]
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
  console.log(token)
  const tracks = await getTracks([])
  const currentTrack = await getCurrentTrack(token)
  console.log(currentTrack)
  return { currentTrack }
}

io.on("connection", async (socket) => {
  console.log("A user connected")
  let data = await getData()
  socket.emit("data", data)
})

setInterval(async () => {
  io.emit("update", "Hello!")
  let data = await getData()
  io.emit("data", data)
}, 10000)
