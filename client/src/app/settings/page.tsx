"use client"

import { useState, useEffect, useContext } from "react"
import { ColorRing } from "react-loader-spinner"
import {
  login,
  getPlaylists,
  postPlaylist,
  stopSession,
  sendAuthCode,
} from "../api"
import {
  SetState,
  PlaylistOverview,
  SpotifyUser,
  Session,
  Track,
} from "../structs"
import crypto from "crypto"
import querystring from "query-string"
import Image from "next/image"

import cd from "../../../public/cd.webp"
import { AppContext } from "../context"
import { useRouter, useSearchParams } from "next/navigation"

const LoginPanel = () => {
  const { setToken, setSpotifyUser } = useContext(AppContext)
  const [userText, setUserText] = useState("")
  const [passwordText, setPasswordText] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setLoading] = useState(false)
  const onLogin = async () => {
    setError("")
    setLoading(true)
    const result = await login(
      userText,
      passwordText,
      setToken,
      setSpotifyUser,
      setError
    )
    setLoading(false)
    if (result === 0) {
      setUserText("")
    }
    setPasswordText("")
  }
  const onUserTextChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setUserText(e.target.value)
  const onPasswordTextChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPasswordText(e.target.value)
  const onClickLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    onLogin()
  }
  const onLoginInputKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      onLogin()
    }
  }
  return (
    <div className="mx-4 my-6 desktop:mx-auto desktop:w-desktop">
      <div className="flex flex-col justify-start align-start items-start">
        <h2 className="text-2xl font-bold">Login</h2>
        <input
          autoFocus
          onChange={onUserTextChange}
          onKeyDown={onLoginInputKeyDown}
          value={userText}
          type="text"
          placeholder="User"
          className="p-4 my-2 text-black w-60 rounded"
        />
        <input
          onChange={onPasswordTextChange}
          onKeyDown={onLoginInputKeyDown}
          value={passwordText}
          type="password"
          placeholder="Password"
          className="p-4 my-2 text-black w-60 rounded"
        />
        {isLoading ? (
          <ColorRing
            visible={true}
            height="80"
            width="80"
            ariaLabel="color-ring-loading"
            wrapperStyle={{}}
            wrapperClass="color-ring-wrapper"
            colors={["#0f0765", "#0f0765", "#0f0765", "#0f0765", "#0f0765"]}
          />
        ) : (
          <div className="flex flex-row">
            <button
              onClick={onClickLogin}
              className="p-2 my-2 bg-accent-blue rounded hover:underline font-2xl font-bold"
            >
              Login
            </button>
            {error === "" ? (
              ""
            ) : (
              <div className="mx-2 my-2 p-2 bg-red-700 rounded font-bold">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const CustomPlaylistCard = (props: { onSubmit: (text: string) => void }) => {
  const [customPlaylistText, setCustomPlaylistText] = useState("")
  const onCustomPlaylistTextChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCustomPlaylistText(e.target.value)
  }
  const onCustomPlaylistKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      props.onSubmit(customPlaylistText)
    }
  }
  const onClickSubmitButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onSubmit(customPlaylistText)
  }
  return (
    <div className="p-4 rounded-xl w-full flex flex-row align-center items-center gap-4">
      <Image
        className="rounded-xl mr-2"
        src={cd}
        alt="Picture of a CD"
        width={100}
        height={100}
      />
      <div className="w-full flex flex-row gap-5 items-center">
        <input
          type="text"
          placeholder="Playlist URL"
          className="w-10/12 flex-1 p-4 text-black rounded"
          value={customPlaylistText}
          onChange={onCustomPlaylistTextChange}
          onKeyDown={onCustomPlaylistKeyDown}
        />
        <button
          onClick={onClickSubmitButton}
          className="p-2 bg-accent-blue rounded hover:underline font-2xl font-bold"
        >
          Submit
        </button>
      </div>
    </div>
  )
}

const PlaylistCard = (props: {
  playlist: PlaylistOverview
  onClickPlaylist: () => void
}) => {
  const onClickPlaylist = (e: React.MouseEvent<HTMLDivElement>) => {
    props.onClickPlaylist()
  }
  return (
    <div
      className="p-4 cursor-pointer rounded-xl hover:bg-accent-blue flex flex-row items-center w-full gap-5"
      onClick={onClickPlaylist}
    >
      <Image
        className="rounded-xl"
        src={props.playlist.art}
        width={100}
        height={100}
        alt={`Art for playlist ${props.playlist.name}`}
      />
      <div className="font-bold text-xl">{props.playlist.name}</div>
      <div>{props.playlist.tracks} tracks</div>
    </div>
  )
}

const SettingsPanel = () => {
  const {
    token,
    setToken,
    spotifyUser,
    setSpotifyUser,
    session,
    setSession,
    tracks,
    setTracks,
  } = useContext(AppContext)
  const params = useSearchParams()
  const router = useRouter()
  const [spotifyAuthenticated, setSpotifyAuthenticated] = useState(false)
  const [playlists, setPlaylists] = useState<PlaylistOverview[]>([])
  const [sessionNameText, setSessionNameText] = useState("")
  const [playlistText, setPlaylistText] = useState("")
  const [error, setError] = useState("")
  const [isLoadingSession, setLoadingSession] = useState(false)
  let clientURL = `${process.env.NEXT_PUBLIC_CLIENT_URL}/settings`
  let clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  useEffect(() => {
    let ignore = false
    if (token) {
      const state = localStorage.getItem("state")
      const code = params.get("code")
      const stateParam = params.get("state")
      const sendSpotifyAuth = async (code: string) => {
        let user = await sendAuthCode(token, code)
        if (user) {
          setSpotifyUser(user)
          getPlaylists(token, setPlaylists)
        }
      }
      if (!ignore && !spotifyUser && token && code && state === stateParam) {
        sendSpotifyAuth(code)
      }
      if (spotifyUser) {
        console.log("getting playlists")
        getPlaylists(token, setPlaylists)
      }
      console.log("Spotify user is", spotifyUser)
    }
    return () => {
      ignore = true
    }
  }, [])
  useEffect(() => {
    if (!spotifyUser || !token) {
      setPlaylists([])
    } else {
      getPlaylists(token, setPlaylists)
    }
  }, [spotifyUser])
  const onPlaylistSubmit = async (sessionName: string, playlistURL: string) => {
    if (token) {
      setLoadingSession(true)
      let result = await postPlaylist(
        token,
        sessionName,
        playlistURL,
        setError,
        setSession,
        setTracks
      )
      if (result === 0) {
        setPlaylistText("")
        setSessionNameText("")
      }
      setLoadingSession(false)
    }
  }
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onPlaylistSubmit(sessionNameText, playlistText)
    }
  }
  const onClickPlaylistSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    onPlaylistSubmit(sessionNameText, playlistText)
  }
  const onSessionNameTextChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSessionNameText(e.target.value)
  const onPlaylistTextChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPlaylistText(e.target.value)
  const onClickLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    setToken(undefined)
    router.replace("/")
  }
  const onClickPlaylistCard = (p: PlaylistOverview) => {
    onPlaylistSubmit(sessionNameText, p.id)
  }
  const onClickStopSession = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (session && token) {
      setLoadingSession(true)
      stopSession(token)
      setSession(undefined)
      setLoadingSession(false)
    }
  }
  const onClickSpotify = async (e: React.MouseEvent<HTMLButtonElement>) => {
    let redirectURI = clientURL
    const generateRandomString = () => {
      return new Promise<string>((resolve, reject) => {
        crypto.randomBytes(60, (err, buffer) => {
          if (err) {
            reject(err)
          } else {
            resolve(buffer.toString("hex"))
          }
        })
      })
    }
    let state = await generateRandomString()
    localStorage.setItem("state", state)
    let scopes =
      "playlist-read-private user-read-currently-playing user-read-playback-state"
    router.push(
      "https://accounts.spotify.com/authorize?" +
        querystring.stringify({
          response_type: "code",
          client_id: clientId,
          scope: scopes,
          redirect_uri: redirectURI,
          state: state,
        })
    )
  }
  const onClickDeauthoriseSpotify = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    setSpotifyUser(undefined)
  }
  return (
    <div>
      <h2 className="my-4 text-4xl font-bold">Settings</h2>
      <div className="flex flex-col desktop:flex-row items-start desktop:items-center desktop:gap-5">
        <div>Logged in as admin</div>
        <button
          onClick={onClickLogout}
          className="p-2 my-4 bg-accent-blue rounded hover:underline font-2xl font-bold"
        >
          Logout
        </button>
      </div>
      <div>
        {!spotifyUser ? (
          <div className="flex flex-col desktop:flex-row items-start desktop:items-center desktop:gap-5">
            <div>Not authenticated with Spotify</div>
            <button
              onClick={onClickSpotify}
              className="p-2 my-4 bg-accent-blue rounded hover:underline font-2xl font-bold"
            >
              Authenticate with Spotify
            </button>
          </div>
        ) : (
          <div className="flex flex-col desktop:flex-row items-start desktop:items-center desktop:gap-5">
            <div>Authenticated with Spotify as {spotifyUser.name}</div>
            <button
              onClick={onClickDeauthoriseSpotify}
              className="p-2 my-4 bg-accent-blue rounded hover:underline font-2xl font-bold"
            >
              Deauthorise
            </button>
          </div>
        )}
      </div>
      {isLoadingSession ? (
        <ColorRing
          visible={true}
          height="80"
          width="80"
          ariaLabel="color-ring-loading"
          wrapperStyle={{}}
          wrapperClass="color-ring-wrapper"
          colors={["#0f0765", "#0f0765", "#0f0765", "#0f0765", "#0f0765"]}
        />
      ) : session ? (
        <div>
          <h3 className="text-3xl font-bold my-4">Current session</h3>
          <div className="flex flex-row items-center gap-4">
            <Image
              className="rounded-xl"
              src={session.playlist.art}
              alt={`Playlist art for ${session.playlist.name}`}
              width={100}
              height={100}
            />
            <div className="flex flex-col">
              <div className="font-bold text-xl">{session.name}</div>
              <div>{session.playlist.name}</div>
            </div>
          </div>
          <button
            onClick={onClickStopSession}
            className="p-2 my-4 bg-accent-blue rounded hover:underline font-2xl font-bold"
          >
            Stop session
          </button>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-bold">Playlist select</h3>
          <div className="flex flex-col my-4 gap-4">
            <input
              type="text"
              className="p-4 text-black rounded"
              placeholder="Session name"
              value={sessionNameText}
              onChange={onSessionNameTextChange}
              onKeyDown={onInputKeyDown}
            />
            <div className="flex flex-row flex-wrap">
              <CustomPlaylistCard
                onSubmit={(text) => onPlaylistSubmit(sessionNameText, text)}
              />
              {playlists.map((p) => (
                <PlaylistCard
                  key={p.id}
                  playlist={p}
                  onClickPlaylist={() => onClickPlaylistCard(p)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const AdminPanel = (props: {}) => {
  let { token } = useContext(AppContext)
  return <div>{!token ? <LoginPanel /> : <SettingsPanel />}</div>
}

export default AdminPanel
