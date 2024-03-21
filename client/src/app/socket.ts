import { io } from "socket.io-client"

const URL = "localhost:7000"
export const socket = io(URL)
