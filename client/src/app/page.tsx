"use client"

import React, { useEffect, useState } from "react"
import {
  CurrentTrack,
  Playlist,
  Session,
  SetState,
  Track,
  getMultipleArtistsString,
} from "./structs"
import {
  getData,
  getPlaylists,
  getQueue,
  login,
  postPlaylist,
  postQueue,
  stopSession,
} from "./api"
import { ColorRing } from "react-loader-spinner"
import Image from "next/image"
import cd from "../../public/cd.webp"

const TopBar = (props: {
  token: string | undefined
  isAdminPanel: boolean
  setAdminPanel: SetState<boolean>
}) => {
  const onClickButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.setAdminPanel(!props.isAdminPanel)
  }
  return (
    <div className="p-4 bg-accent-blue flex flex-row">
      <div className="text-xl font-bold flex-1">Kayelist Controller</div>
      <button
        className="cursor-pointer hover:underline"
        onClick={onClickButton}
      >
        {props.isAdminPanel ? "Back" : props.token ? "Settings" : "Login"}
      </button>
    </div>
  )
}

const LoginPanel = (props: { setToken: SetState<string | undefined> }) => {
  const [userText, setUserText] = useState("")
  const [passwordText, setPasswordText] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setLoading] = useState(false)
  const onLogin = async () => {
    setError("")
    setLoading(true)
    const result = await login(userText, passwordText, props.setToken, setError)
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
    <div className="p-4 rounded-xl w-full flex flex-col desktop:flex-row align-center items-center gap-4">
      <Image
        className="rounded-xl mr-2"
        src={cd}
        alt="Picture of a CD"
        width={100}
      />
      <input
        type="text"
        placeholder="Playlist URL"
        className="flex-1 p-4 text-black rounded"
        value={customPlaylistText}
        onChange={onCustomPlaylistTextChange}
        onKeyDown={onCustomPlaylistKeyDown}
      />
      <button
        onClick={onClickSubmitButton}
        className="p-2 m4 bg-accent-blue rounded hover:underline font-2xl font-bold"
      >
        Submit
      </button>
    </div>
  )
}

const PlaylistCard = (props: {
  playlist: Playlist
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
      <img className="rounded-xl" src={props.playlist.art} width={100} />
      <div className="font-bold text-xl">{props.playlist.name}</div>
      <div>{props.playlist.tracks} tracks</div>
    </div>
  )
}

const SettingsPanel = (props: {
  token: string
  setToken: SetState<string | undefined>
  session: Session | undefined
  setSession: SetState<Session | undefined>
  setTracks: SetState<Track[]>
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [sessionNameText, setSessionNameText] = useState("")
  const [playlistText, setPlaylistText] = useState("")
  const [error, setError] = useState("")
  const [isLoadingSession, setLoadingSession] = useState(false)
  useEffect(() => {
    getPlaylists(setPlaylists)
  }, [])
  const onPlaylistSubmit = async (sessionName: string, playlistURL: string) => {
    setLoadingSession(true)
    let result = await postPlaylist(
      props.token,
      sessionName,
      playlistURL,
      setError,
      props.setSession,
      props.setTracks
    )
    if (result === 0) {
      setPlaylistText("")
      setSessionNameText("")
    }
    setLoadingSession(false)
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
    props.setToken("")
  }
  const onClickPlaylistCard = (p: Playlist) => {
    onPlaylistSubmit(sessionNameText, p.url)
  }
  const onClickStopSession = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.session) {
      setLoadingSession(true)
      stopSession(props.token, props.session.id)
      props.setSession(undefined)
      setLoadingSession(false)
    }
  }
  return (
    <div>
      <h2 className="my-4 text-4xl font-bold">Settings</h2>
      <button
        onClick={onClickLogout}
        className="p-2 my-4 bg-accent-blue rounded hover:underline font-2xl font-bold"
      >
        Logout
      </button>
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
      ) : props.session ? (
        <div>
          <h3 className="text-3xl font-bold my-4">Current session</h3>
          <div className="flex flex-row items-center gap-4">
            <Image
              className="rounded-xl"
              src={props.session.playlist.art}
              alt={`Playlist art for ${props.session.playlist.name}`}
              width={100}
              height={100}
            />
            <div className="flex flex-col">
              <div className="font-bold text-xl">{props.session.name}</div>
              <div>{props.session.playlist.name}</div>
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

const AdminPanel = (props: {
  token: string | undefined
  setToken: SetState<string | undefined>
  session: Session | undefined
  setSession: SetState<Session | undefined>
  setTracks: SetState<Track[]>
}) => {
  return (
    <div>
      {!props.token ? (
        <LoginPanel setToken={props.setToken} />
      ) : (
        <SettingsPanel
          token={props.token}
          setToken={props.setToken}
          session={props.session}
          setSession={props.setSession}
          setTracks={props.setTracks}
        />
      )}
    </div>
  )
}

const Header = (props: { session: Session | undefined }) => {
  return (
    <div>
      {!props.session ? (
        ""
      ) : (
        <div className="font-bold  text-3xl">{props.session.name}</div>
      )}
    </div>
  )
}

const CurrentTrack = (props: { currentTrack: CurrentTrack }) => {
  return (
    <div className="flex flex-col desktop:flex-row desktop:items-center justify-center my-6 gap-4 desktop:gap-10 mx-1">
      <div>
        <img
          className="rounded-lg"
          width="200"
          src={props.currentTrack.track.album.art}
          alt={`Album art for ${props.currentTrack.track.album.name}`}
        />
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <div className="font-bold text-4xl py-1">
          {props.currentTrack.track.name}
        </div>
        <div className="text-lg py-2 text-2xl">
          {getMultipleArtistsString(props.currentTrack.track.artists)}
        </div>
        <div className="py-1">{props.currentTrack.track.album.name}</div>
      </div>
    </div>
  )
}

const trackCardStyle = "rounded-lg flex flex-row justify-center my-1 p-1 gap-5"

const TrackCard = (props: { track: Track }) => {
  return (
    <div key={props.track.id} className={trackCardStyle}>
      <div>
        <img
          className="rounded-lg"
          width="50"
          src={props.track.album.art}
          alt={`Album art for ${props.track.album.name}`}
        />
      </div>
      <div className="flex-1 my-auto">
        <div className="text-xl font-bold">{props.track.name}</div>
        <div>{getMultipleArtistsString(props.track.artists)}</div>
      </div>
    </div>
  )
}

const Queue = (props: { queue: Track[] }) => {
  return (
    <div className="flex flex-col">
      {props.queue.map((track) => (
        <TrackCard track={track} />
      ))}
    </div>
  )
}

const QueueAdderTrackCard = (props: {
  track: QueueItem
  setQueue: SetState<Track[]>
  tracks: Track[]
  setTracks: SetState<Track[]>
  setAdding: SetState<boolean>
}) => {
  const onClickCard = (e: React.MouseEvent<HTMLDivElement>) => {
    if (props.track.queueable) {
      postQueue(
        props.track.track,
        props.tracks,
        props.setTracks,
        props.setQueue
      )
      props.setAdding(false)
    }
  }
  return (
    <div
      key={props.track.track.id}
      className={`${trackCardStyle} ${
        !props.track.queueable
          ? "text-gray-600"
          : "hover:bg-gray-700 cursor-pointer"
      }`}
      onClick={onClickCard}
    >
      <div>
        <img
          className="rounded-lg"
          width="52"
          src={props.track.track.album.art}
          alt={`Album art for ${props.track.track.album.name}`}
        />
      </div>
      <div className="flex-1 my-auto">
        <div className="text-xl font-bold">{props.track.track.name}</div>
        <div>{getMultipleArtistsString(props.track.track.artists)}</div>
      </div>
    </div>
  )
}

const QueueingFromCard = (props: { playlist: Playlist }) => {
  return (
    <div className="flex flex-row items-center mb-4 gap-4">
      <div>
        <img
          className="rounded-lg mr-4"
          width="100"
          src={props.playlist.art}
          alt={`Playlist art for ${props.playlist.name}`}
        />
      </div>
      <div>
        <div>Queueing from</div>
        <div className="text-2xl font-bold">{props.playlist.name}</div>
      </div>
    </div>
  )
}

const defaultTracksToShow = 50
const bigButtonStyle =
  "rounded-lg bg-gray-700 p-4 my-4 font-bold text-2xl cursor-pointer hover:bg-gray-600"

interface QueueItem {
  track: Track
  queueable: boolean
}

const QueueAdder = (props: {
  session: Session
  isAdding: boolean
  setAdding: SetState<boolean>
  tracks: Track[]
  setTracks: SetState<Track[]>
  setCurrent: SetState<CurrentTrack | undefined>
  setQueue: SetState<Track[]>
}) => {
  const [filteredTracks, setFilteredTracks] = useState<QueueItem[]>(
    props.tracks
      .sort((t1, t2) => t1.name.localeCompare(t2.name))
      .map((t) => ({ track: t, queueable: t.queued === undefined }))
  )
  const [filterText, setFilterText] = useState("")
  const [tracksToShow, setTracksToShow] = useState(100)
  const updateFilteredTracks = () => {
    setFilteredTracks(
      props.tracks
        .filter(
          (track) =>
            track.name.toLowerCase().includes(filterText.toLowerCase()) ||
            getMultipleArtistsString(track.artists)
              .toLowerCase()
              .includes(filterText.toLowerCase()) ||
            track.album.name.toLowerCase().includes(filterText.toLowerCase())
        )
        .sort((t1, t2) => t1.name.localeCompare(t2.name))
        .map((t) => ({ track: t, queueable: t.queued === undefined }))
    )
  }
  useEffect(() => {
    updateFilteredTracks()
  }, [filterText, props.tracks])
  useEffect(() => {
    setFilterText("")
    setTracksToShow(defaultTracksToShow)
  }, [props.isAdding])
  const onChangeFilterText = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilterText(e.target.value)
  const onClickAdd = (e: React.MouseEvent<HTMLDivElement>) =>
    props.setAdding(!props.isAdding)
  const onClickMore = (e: React.MouseEvent<HTMLDivElement>) =>
    setTracksToShow(tracksToShow + defaultTracksToShow)
  return (
    <div className="m-1">
      <div className={bigButtonStyle} onClick={onClickAdd}>
        {!props.isAdding ? "Add to queue" : "Back"}
      </div>
      {!props.isAdding ? (
        ""
      ) : (
        <div>
          <QueueingFromCard playlist={props.session.playlist} />
          <div className="flex">
            <input
              className="rounded-lg text-black mb-4 flex-1 p-4 text-lg"
              type="text"
              value={filterText}
              placeholder={"Search"}
              onChange={onChangeFilterText}
            />
          </div>
          <div>
            {filteredTracks.slice(0, tracksToShow).map((track) => (
              <QueueAdderTrackCard
                track={track}
                tracks={props.tracks}
                setTracks={props.setTracks}
                setQueue={props.setQueue}
                setAdding={props.setAdding}
              />
            ))}
          </div>
          {tracksToShow >= filteredTracks.length ? (
            ""
          ) : (
            <div className={bigButtonStyle} onClick={onClickMore}>
              More
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const Home = () => {
  const [current, setCurrent] = useState<CurrentTrack | undefined>(undefined)
  const [session, setSession] = useState<Session | undefined>(undefined)
  const [queued, setQueued] = useState<Track[]>([])
  const [queue, setQueue] = useState<Track[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [isAdding, setAdding] = useState(false)
  const [isLocked, setLocked] = useState(false)
  const [token, setToken] = useState<string | undefined>(undefined)
  const [isAdminPanel, setAdminPanel] = useState(false)
  useEffect(() => {
    getData(setSession, setTracks, setCurrent, setQueue)
  }, [])
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLocked) {
        getData(setSession, setTracks, setCurrent, setQueue)
      }
    }, 5000)
    return () => clearInterval(interval)
  })
  useEffect(() => {
    if (!isAdding) {
      window.scrollTo({ top: 0 })
      setLocked(false)
    } else {
      getData(setSession, setTracks, setCurrent, setQueue)
      setLocked(true)
    }
  }, [isAdding])
  useEffect(() => {
    if (current) {
      let startTime = current.start
      let duration = current.track.duration
      let endTime = startTime + duration
      let currentTime = new Date().getTime()
      let timeLeft = endTime - currentTime
      setTimeout(() => {
        getQueue(setCurrent, setQueue)
      }, timeLeft)
    }
  }, [current])
  return (
    <main>
      <TopBar
        token={token}
        isAdminPanel={isAdminPanel}
        setAdminPanel={setAdminPanel}
      />
      <div className="mx-4 my-6 desktop:mx-auto desktop:w-desktop">
        {isAdminPanel ? (
          <AdminPanel
            token={token}
            setToken={setToken}
            session={session}
            setSession={setSession}
            setTracks={setTracks}
          />
        ) : (
          <div>
            <Header session={session} />
            {!current ? (
              ""
            ) : (
              <div>
                <CurrentTrack currentTrack={current} />
                {!session ? (
                  ""
                ) : (
                  <QueueAdder
                    session={session}
                    isAdding={isAdding}
                    setAdding={setAdding}
                    tracks={tracks}
                    setTracks={setTracks}
                    setCurrent={setCurrent}
                    setQueue={setQueue}
                  />
                )}
                {isAdding ? "" : <Queue queue={queue} />}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default Home
