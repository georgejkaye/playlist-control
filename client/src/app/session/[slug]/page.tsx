"use client"

import React, { useContext, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import crypto from "crypto"
import querystring from "query-string"

import {
  postQueue,
  getSession,
  deauthenticateSpotify,
  getPlaylists,
  postPlaylist,
  login,
  searchTracks,
  requestTrack,
} from "@/app/api"
import { AppContext } from "@/app/context"
import { Loader } from "@/app/loader"
import {
  Track,
  getMultipleArtistsString,
  SetState,
  Playlist,
  Session,
  Token,
  PlaylistOverview,
} from "@/app/structs"
import { Line } from "@/app/context"

import cd from "@/../public/cd.webp"

const Header = (props: { session: Session | undefined }) => {
  return (
    <div>
      {!props.session ? (
        ""
      ) : (
        <div className="flex flex-col">
          <div className="font-bold  text-3xl">{props.session.name}</div>
          <div className="my-2">Hosted by {props.session.host}</div>
        </div>
      )}
    </div>
  )
}

const CurrentTrackCard = (props: { currentTrack: Track }) => {
  return (
    <>
      <div className="flex flex-col desktop:flex-row desktop:items-center justify-center my-6 gap-4 desktop:gap-10 mx-1">
        <div>
          <Image
            className="rounded-lg"
            width={200}
            height={200}
            src={props.currentTrack.album.art}
            alt={`Album art for ${props.currentTrack.album.name}`}
          />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="font-bold text-4xl py-1">
            {props.currentTrack.name}
          </div>
          <div className="text-lg py-2 text-2xl">
            {getMultipleArtistsString(props.currentTrack.artists)}
          </div>
          <div className="py-1">{props.currentTrack.album.name}</div>
        </div>
      </div>
      <Line />
    </>
  )
}

const trackCardStyle = "rounded-lg flex flex-row justify-center my-1 p-1 gap-5"

const TrackCard = (props: { track: Track }) => {
  return (
    <div className={trackCardStyle}>
      <div>
        <Image
          className="rounded-lg"
          width={50}
          height={50}
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
      {props.queue.map((track, i) => (
        <TrackCard key={`${track.id}-${i}`} track={track} />
      ))}
    </div>
  )
}

const QueueAdderTrackCard = (props: {
  session: Session
  track: Track
  setAdding: SetState<boolean>
}) => {
  const { queuedTracks } = useContext(AppContext)
  const [isQueueable, setQueueable] = useState(
    !queuedTracks.has(props.track.id)
  )
  useEffect(() => {
    setQueueable(!queuedTracks.has(props.track.id))
  }, [queuedTracks])
  const onClickCard = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isQueueable) {
      postQueue(props.session.slug, props.track)
      props.setAdding(false)
    }
  }
  return (
    <div
      className={`${trackCardStyle} ${
        !isQueueable ? "text-gray-600" : "hover:bg-gray-700 cursor-pointer"
      }`}
      onClick={onClickCard}
    >
      <div>
        <Image
          className="rounded-lg"
          width={52}
          height={52}
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

const SearcherTrackCard = (props: {
  session: Session
  track: Track
  setSearching: SetState<boolean>
}) => {
  const { queuedTracks } = useContext(AppContext)
  const [isQueueable, setQueueable] = useState(
    !queuedTracks.has(props.track.id)
  )
  useEffect(() => {
    setQueueable(!queuedTracks.has(props.track.id))
  }, [queuedTracks])
  const onClickCard = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isQueueable) {
      requestTrack(props.session, props.track)
      props.setSearching(false)
    }
  }
  return (
    <div
      className={`${trackCardStyle} ${
        !isQueueable ? "text-gray-600" : "hover:bg-gray-700 cursor-pointer"
      }`}
      onClick={onClickCard}
    >
      <div>
        <Image
          className="rounded-lg"
          width={52}
          height={52}
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

const QueueingFromCard = (props: { playlist: Playlist }) => {
  return (
    <div className="flex flex-row items-center mb-4 gap-4">
      <div>
        <Image
          className="rounded-lg mr-4"
          width={100}
          height={100}
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

const RequestTrackCard = (props: { session: Session; searchText: string }) => {
  const [isRequesting, setRequesting] = useState(false)
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [searchedTracks, setSearchedTracks] = useState<Track[]>([])
  const onClickRequest = async (e: React.MouseEvent<HTMLButtonElement>) => {
    let tracks = await searchTracks(props.session, props.searchText)
    console.log(tracks)
    setSearchedTracks(tracks)
  }
  return (
    <div className="flex flex-col">
      <button className={bigButtonStyle} onClick={onClickRequest}>
        Search all tracks
      </button>
      <div>
        {searchedTracks.map((track) => (
          <SearcherTrackCard
            key={track.id}
            track={track}
            session={props.session}
            setSearching={setRequesting}
          />
        ))}
      </div>
    </div>
  )
}

interface QueueItem {
  track: Track
  queueable: boolean
}

const QueueAdder = (props: {
  session: Session
  isAdding: boolean
  setAdding: SetState<boolean>
  tracks: Track[]
}) => {
  const [filteredTracks, setFilteredTracks] = useState<Track[]>(
    props.tracks.sort((t1, t2) => t1.name.localeCompare(t2.name))
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
  return !props.session || !props.session.playlist ? (
    ""
  ) : (
    <div>
      <div className={bigButtonStyle} onClick={onClickAdd}>
        {!props.isAdding ? "Add to queue" : "Back"}
      </div>
      {!props.isAdding ? (
        ""
      ) : (
        <div>
          <div className="flex">
            <input
              autoFocus
              className="rounded-lg text-black mb-4 flex-1 p-4 text-lg"
              type="text"
              value={filterText}
              placeholder={"Search"}
              onChange={onChangeFilterText}
            />
          </div>
          <RequestTrackCard session={props.session} searchText={filterText} />
          <div>
            {filteredTracks.slice(0, tracksToShow).map((track) => (
              <QueueAdderTrackCard
                session={props.session}
                key={track.id}
                track={track}
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

let clientId = process.env.NEXT_PUBLIC_SPOTIFY_APP_ID
let redirectURI = `${process.env.NEXT_PUBLIC_CLIENT_PROTOCOL}://${process.env.NEXT_PUBLIC_CLIENT_HOST}/spotify`

const smallButtonStyle =
  "p-2 bg-accent rounded hover:underline font-2xl font-bold"

const AdminPanel = (props: {
  token: string
  session: Session
  setLoading: SetState<boolean>
  logoutCallback: () => void
  setSession: SetState<Session | undefined>
}) => {
  const router = useRouter()
  const onClickSpotify = async (e: React.MouseEvent<HTMLButtonElement>) => {
    localStorage.setItem("redirect", props.session.slug)
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
      "playlist-read-private user-read-currently-playing user-read-playback-state user-modify-playback-state"
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
  const onClickLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    localStorage.removeItem(`token-${props.session.slug}`)
    localStorage.removeItem(`expiry-${props.session.slug}`)
    props.logoutCallback()
  }
  const onClickDeauthoriseSpotify = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    props.setLoading(true)
    const session = await deauthenticateSpotify(props.session.slug, props.token)
    if (session) {
      props.setSession(session)
      props.setLoading(false)
    } else {
      router.push("/")
    }
  }
  return (
    <>
      <div className="flex flex-col items-start gap-2">
        {!props.session.spotify ? (
          <div className="flex flex-col desktop:flex-row items-start desktop:items-center gap-2 desktop:gap-5">
            <div>Not authenticated with Spotify</div>
            <button onClick={onClickSpotify} className={smallButtonStyle}>
              Authenticate with Spotify
            </button>
          </div>
        ) : (
          <div className="flex flex-col desktop:flex-row items-start desktop:items-center gap-2 desktop:gap-5">
            <div>
              Authenticated with Spotify as {props.session.spotify.name}
            </div>
            <button
              onClick={onClickDeauthoriseSpotify}
              className={smallButtonStyle}
            >
              Deauthorise
            </button>
          </div>
        )}
        <button className={smallButtonStyle} onClick={onClickLogout}>
          Logout
        </button>
      </div>
      <Line />
    </>
  )
}

const LoginPanel = (props: {
  session: Session
  setToken: SetState<Token | undefined>
}) => {
  const { setSpotifyUser, setToken } = useContext(AppContext)
  const [isLoggingIn, setLoggingIn] = useState(false)
  const [passwordText, setPasswordText] = useState("")
  const [isLoading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState("")
  const onSubmit = async (password: string) => {
    setLoading(true)
    let result = await login(props.session, password)
    if (result.error || !result.token) {
      setErrorText(result.error)
    } else {
      setSpotifyUser(result.spotify)
      props.setToken(result.token)
    }
    setLoading(false)
  }
  const onClickLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoggingIn(true)
  }
  const onClickCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoggingIn(false)
  }
  const onClickSubmitLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    onSubmit(passwordText)
  }
  const onPasswordTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordText(e.target.value)
  }
  const onPasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSubmit(passwordText)
    }
  }
  return (
    <>
      <div className="my-4">
        {!isLoggingIn ? (
          <button className={smallButtonStyle} onClick={onClickLogin}>
            Admin login
          </button>
        ) : (
          <div className="flex flex-col desktop:flex-row gap-5 items-start desktop:items-center">
            {isLoading ? (
              <Loader />
            ) : (
              <>
                <input
                  autoFocus
                  type="password"
                  placeholder="Session password"
                  className="w-4/12 flex-1 p-4 text-black rounded"
                  value={passwordText}
                  onChange={onPasswordTextChange}
                  onKeyDown={onPasswordKeyDown}
                />
                <div className="flex flex-row gap-5">
                  <button
                    className={smallButtonStyle}
                    onClick={onClickSubmitLogin}
                  >
                    Login
                  </button>
                  <button className={smallButtonStyle} onClick={onClickCancel}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <Line />
    </>
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
        alt="Spotify logo"
        width={50}
        height={50}
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
          className="p-2 bg-accent rounded hover:underline font-2xl font-bold"
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
      className="p-4 cursor-pointer rounded-xl hover:bg-accent flex flex-row items-center w-full gap-5"
      onClick={onClickPlaylist}
    >
      <Image
        className="rounded-xl"
        src={props.playlist.art}
        width={50}
        height={50}
        alt={`Art for playlist ${props.playlist.name}`}
      />
      <div className="font-bold text-xl">{props.playlist.name}</div>
      <div>{props.playlist.tracks} tracks</div>
    </div>
  )
}

const PlaylistSelector = (props: {
  session: Session
  setSession: SetState<Session | undefined>
  token: Token
  setAdding: SetState<boolean>
}) => {
  const [isSelecting, setSelecting] = useState(false)
  const [isLoading, setLoading] = useState(false)
  const [playlists, setPlaylists] = useState<PlaylistOverview[]>([])
  const [playlistText, setPlaylistText] = useState("")
  const [errorText, setErrorText] = useState("")
  const onClickSelectPlaylist = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    setLoading(true)
    let playlists = await getPlaylists(props.token.token, props.session.slug)
    setPlaylists(playlists)
    setSelecting(true)
    setLoading(false)
  }
  const onPlaylistSubmit = async (playlistURL: string) => {
    setLoading(true)
    let { result, error } = await postPlaylist(
      props.token.token,
      props.session.slug,
      playlistURL
    )
    if (error) {
      setErrorText(error)
    } else {
      setSelecting(false)
    }
    setLoading(false)
  }
  const onClickPlaylistCard = (p: PlaylistOverview) => {
    onPlaylistSubmit(p.id)
  }
  return (
    <div>
      {isLoading ? (
        <Loader />
      ) : props.token && !isSelecting ? (
        <button className={smallButtonStyle} onClick={onClickSelectPlaylist}>
          Select playlist
        </button>
      ) : (
        <div className="flex flex-row flex-wrap">
          <CustomPlaylistCard
            onSubmit={(text) => onPlaylistSubmit(playlistText)}
          />
          {playlists.map((p) => (
            <PlaylistCard
              key={p.id}
              playlist={p}
              onClickPlaylist={() => onClickPlaylistCard(p)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const PlaylistPanel = (props: {
  session: Session
  setSession: SetState<Session | undefined>
  playlist: Playlist | undefined
  token: Token | undefined
  isAdding: boolean
  setAdding: SetState<boolean>
}) => {
  return (
    <div>
      {!props.playlist && props.token ? (
        <PlaylistSelector
          session={props.session}
          setSession={props.setSession}
          token={props.token}
          setAdding={props.setAdding}
        />
      ) : props.playlist ? (
        <div>
          <div className="flex flex-row items-center mb-4 gap-4">
            <div>
              <Image
                className="rounded-lg mr-4"
                width={100}
                height={100}
                src={props.playlist.art}
                alt={`Playlist art for ${props.playlist.name}`}
              />
            </div>
            <div>
              <div>Queueing from</div>
              <div className="text-2xl font-bold">{props.playlist.name}</div>
            </div>
          </div>
          <QueueAdder
            session={props.session}
            isAdding={props.isAdding}
            setAdding={props.setAdding}
            tracks={props.playlist.tracks}
          />
        </div>
      ) : (
        "No playlist"
      )}
      <Line />
    </div>
  )
}

const Home = ({ params }: { params: { slug: string } }) => {
  const {
    session,
    setSession,
    setCurrent,
    current,
    setQueue,
    queuedTracks,
    setQueuedTracks,
    queue,
    playlist,
    setPlaylist,
  } = useContext(AppContext)
  const router = useRouter()
  const [token, setToken] = useState<Token | undefined>(undefined)
  const [isLoading, setLoading] = useState(false)
  const [isAdding, setAdding] = useState(false)
  useEffect(() => {
    setLoading(true)
    let tokenStorage = localStorage.getItem(`token-${params.slug}`)
    let expiryStorage = localStorage.getItem(`expires-${params.slug}`)
    const performRequests = async () => {
      let result = await getSession(params.slug, token?.token)
      if (result) {
        let { session, queued, queue } = result
        setSession(session)
        setQueue(queue)
        setQueuedTracks(new Map(queued.map((obj: any) => [obj.id, obj.time])))
        setPlaylist(session.playlist)
        setLoading(false)
      } else {
        router.push("/")
      }
    }
    performRequests()
    let expires = !expiryStorage ? undefined : new Date(expiryStorage)
    if (tokenStorage && expires && new Date() < expires) {
      setToken({ token: tokenStorage, expires })
    } else {
      setToken(undefined)
    }
  }, [])
  return isLoading || !session ? (
    <Loader />
  ) : (
    <div>
      <Header session={session} />
      <Line />
      {!token || new Date() > token.expires ? (
        <LoginPanel session={session} setToken={setToken} />
      ) : (
        <AdminPanel
          setLoading={setLoading}
          token={token.token}
          session={session}
          setSession={setSession}
          logoutCallback={() => setToken(undefined)}
        />
      )}
      <div>
        {!current ? "" : <CurrentTrackCard currentTrack={current} />}
        <PlaylistPanel
          session={session}
          setSession={setSession}
          playlist={playlist}
          token={token}
          isAdding={isAdding}
          setAdding={setAdding}
        />
        {isAdding ? "" : <Queue queue={queue} />}
      </div>
    </div>
  )
}

export default Home
