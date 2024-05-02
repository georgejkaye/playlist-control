import { io } from "socket.io-client"

const URL = `${process.env.NEXT_PUBLIC_SERVER_HOST}` || "http://localhost:8000"
export const socket = io(URL)
