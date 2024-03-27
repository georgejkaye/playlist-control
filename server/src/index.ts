import express, { Express, Request, Response } from "express"
import dotenv from "dotenv"
import { Server } from "socket.io"
import cors from "cors"
import multer from "multer"

import { getTracks } from "./database.js"
import {
  authenticateUser,
  generateToken,
  tokenExpiresMinutes,
  verifyToken,
} from "./auth.js"

dotenv.config()

const port = process.env.SERVER_PORT || 8090

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded())

const SPOTIFY_APP_ID = process.env.SPOTIFY_APP_ID || ""
const SPOTIFY_SECRET_FILE = process.env.SPOTIFY_SECRET || ""

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
    res.send({
      access_token: token,
      token_type: "bearer",
    })
  }
})

app.get("/test", (req, res) => {
  const decoded: any = verifyToken(req.body.token)
  if (decoded.sub === "admin") {
    console.log("Yes!")
  }
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
