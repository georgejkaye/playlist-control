"use client"

import React, { useContext, useEffect, useState } from "react"
import {
  CurrentTrack,
  PlaylistOverview,
  Session,
  SetState,
  SpotifyUser,
  Track,
  getMultipleArtistsString,
} from "./structs"
import { getData, getQueue, postQueue } from "./api"
import Image from "next/image"
import { UserContext } from "./context"

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

const CurrentTrackCard = (props: { currentTrack: CurrentTrack }) => {
  return (
    <div className="flex flex-col desktop:flex-row desktop:items-center justify-center my-6 gap-4 desktop:gap-10 mx-1">
      <div>
        <Image
          className="rounded-lg"
          width={200}
          height={200}
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
      className={`${trackCardStyle} ${
        !props.track.queueable
          ? "text-gray-600"
          : "hover:bg-gray-700 cursor-pointer"
      }`}
      onClick={onClickCard}
    >
      <div>
        <Image
          className="rounded-lg"
          width={52}
          height={52}
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

const QueueingFromCard = (props: { playlist: PlaylistOverview }) => {
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
                key={track.track.id}
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
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | undefined>(
    undefined
  )
  const [current, setCurrent] = useState<CurrentTrack | undefined>(undefined)
  const [session, setSession] = useState<Session | undefined>(undefined)
  const [queued, setQueued] = useState<Track[]>([])
  const [queue, setQueue] = useState<Track[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [isAdding, setAdding] = useState(false)
  const [isLocked, setLocked] = useState(false)
  const { token, setToken } = useContext(UserContext)
  const [isAdminPanel, setAdminPanel] = useState(false)
  useEffect(() => {
    // getData(setSession, setTracks, setCurrent, setQueue)
  }, [])
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLocked) {
        getData(setSession, setTracks, setCurrent, setQueue)
      }
    }, 30000)
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
    <div>
      <Header session={session} />
      {!current ? (
        ""
      ) : (
        <div>
          <CurrentTrackCard currentTrack={current} />
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
  )
}

export default Home
