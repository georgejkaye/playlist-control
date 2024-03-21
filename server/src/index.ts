import express, { Express, Request, Response } from "express"
import dotenv from "dotenv"
import { Server } from "socket.io"
import { createServer } from "http"
import cors from "cors"

dotenv.config()

const port = process.env.SERVER_PORT

const app: Express = express()
app.use(cors())

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

io.on("connection", (socket) => {
  console.log("A user connected")
})

setInterval(() => {
  io.emit("update", "Hello!")
}, 10000)
