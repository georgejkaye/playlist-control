import express from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import cors from "cors";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { readFileSync } from "fs";
dotenv.config();
const port = process.env.SERVER_PORT;
const app = express();
app.use(cors());
var SPOTIFY_SECRET = "";
const getSpotifyApi = () => {
    const SPOTIFY_APP_ID = process.env.SPOTIFY_APP_ID || "";
    const SPOTIFY_SECRET_FILE = process.env.SPOTIFY_SECRET || "";
    const SPOTIFY_SECRET = readFileSync(SPOTIFY_SECRET_FILE, "utf8").replace("\n", "");
    return SpotifyApi.withClientCredentials(SPOTIFY_APP_ID, SPOTIFY_SECRET);
};
const api = getSpotifyApi();
const items = await api.search("The Beatles", ["artist"]);
console.table(items.artists.items.map((item) => ({
    name: item.name,
    followers: item.followers.total,
    popularity: item.popularity,
})));
app.get("/", (req, res) => {
    res.send("Hello!");
});
const server = app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log("A user connected");
});
setInterval(() => {
    io.emit("update", "Hello!");
}, 10000);
