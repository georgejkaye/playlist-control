import { io } from "socket.io-client"

const URL = process.env.NEXT_PUBLIC_SERVER_URL || "localhost:8000"
export const socket = io(URL)
