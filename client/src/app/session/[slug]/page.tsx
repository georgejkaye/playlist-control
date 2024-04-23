"use client"

import React, { useContext, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import crypto from "crypto"
import querystring from "query-string"

import { postQueue, getSession } from "@/app/api"
import { AppContext } from "@/app/context"
import { Loader } from "@/app/loader"
import {
  Track,
  getMultipleArtistsString,
  SetState,
  Playlist,
  Session,
} from "@/app/structs"

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

const CurrentTrackCard = (props: { currentTrack: Track }) => {
  return (
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
        <div className="font-bold text-4xl py-1">{props.currentTrack.name}</div>
        <div className="text-lg py-2 text-2xl">
          {getMultipleArtistsString(props.currentTrack.artists)}
        </div>
        <div className="py-1">{props.currentTrack.album.name}</div>
      </div>
    </div>
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
  track: Track
  setQueue: SetState<Track[]>
  tracks: Track[]
  setTracks: SetState<Track[]>
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
      postQueue(props.track, props.tracks, props.setTracks, props.setQueue)
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
  setCurrent: SetState<Track | undefined>
  setQueue: SetState<Track[]>
}) => {
  const { session } = useContext(AppContext)
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
  return !session || !session.playlist ? (
    ""
  ) : (
    <div className="m-1">
      <div className={bigButtonStyle} onClick={onClickAdd}>
        {!props.isAdding ? "Add to queue" : "Back"}
      </div>
      {!props.isAdding ? (
        ""
      ) : (
        <div>
          <QueueingFromCard playlist={session.playlist} />
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
          <div>
            {filteredTracks.slice(0, tracksToShow).map((track) => (
              <QueueAdderTrackCard
                key={track.id}
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

let clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

const AdminPanel = (props: {
  session: Session
  logoutCallback: () => void
}) => {
  const router = useRouter()
  const onClickSpotify = async (e: React.MouseEvent<HTMLButtonElement>) => {
    localStorage.setItem("redirect", props.session.slug)
    let redirectURI = "http://localhost:3000/spotify"
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
  const onClickLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    localStorage.removeItem(`token-${props.session.slug}`)
    localStorage.removeItem(`expiry-${props.session.slug}`)
    props.logoutCallback()
  }
  const onClickDeauthoriseSpotify = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {}
  return (
    <>
      <div className="flex flex-col items-start ">
        {!props.session.spotify ? (
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
            <div>
              Authenticated with Spotify as {props.session.spotify.name}
            </div>
            <button
              onClick={onClickDeauthoriseSpotify}
              className="p-2 bg-accent-blue rounded hover:underline font-2xl font-bold"
            >
              Deauthorise
            </button>
          </div>
        )}
      </div>
      <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700" />
    </>
  )
}

const LoginPanel = (props: { session: Session }) => {
  return <div>Admin login</div>
}

const Home = ({ params }: { params: { slug: string } }) => {
  const { setCurrent, current, setQueue, queue, tracks, setTracks } =
    useContext(AppContext)
  const router = useRouter()
  const [token, setToken] = useState<
    { token: string; expiry: Date } | undefined
  >(undefined)
  const [isLoading, setLoading] = useState(false)
  const [session, setSession] = useState<Session | undefined>(undefined)
  const [isAdding, setAdding] = useState(false)
  useEffect(() => {
    setLoading(true)
    let tokenStorage = localStorage.getItem(`token-${params.slug}`)
    let expiryStorage = localStorage.getItem(`expires-${params.slug}`)
    const performRequests = async () => {
      let result = await getSession(params.slug, token?.token)
      if (result) {
        setSession(result)
        setLoading(false)
      } else {
        router.push("/")
      }
    }
    performRequests()
    let expiry = !expiryStorage ? undefined : new Date(expiryStorage)
    if (tokenStorage && expiry && new Date() < expiry) {
      setToken({ token: tokenStorage, expiry })
    } else {
      setToken(undefined)
    }
  }, [])
  return isLoading || !session ? (
    <Loader />
  ) : (
    <div>
      <Header session={session} />
      <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700" />
      {!token || new Date() > token.expiry ? (
        <LoginPanel session={session} />
      ) : (
        <AdminPanel
          session={session}
          logoutCallback={() => setToken(undefined)}
        />
      )}
      <div>
        {!session.playlist ? (
          ""
        ) : (
          <QueueAdder
            session={session}
            isAdding={isAdding}
            setAdding={setAdding}
            tracks={session.playlist.tracks}
            setTracks={setTracks}
            setCurrent={setCurrent}
            setQueue={setQueue}
          />
        )}
        {isAdding ? "" : <Queue queue={queue} />}
      </div>
    </div>
  )
}

export default Home
