"use client"

import { useEffect, useState } from "react";
import { CurrentTrack, Track, getMultipleArtistsString } from "./structs";
import { getQueue } from "./api";

const CurrentTrack = (props: { currentTrack: CurrentTrack }) => {
  return (
    <div className="flex flex-row justify-center my-10 gap-10">
      <div>
        <img className="rounded-lg" width="200" src={props.currentTrack.track.album.art} alt={`Album art for ${props.currentTrack.track.album.name}`} />
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <div className="font-bold text-4xl py-1">
          {props.currentTrack.track.name}
        </div>
        <div className="text-lg py-2 text-2xl">
          {getMultipleArtistsString(props.currentTrack.track.artists)}
        </div>
        <div className="py-1">
          {props.currentTrack.track.album.name}
        </div>
      </div>
    </div>
  )

}

const TrackCard = (props: { track: Track }) => {
  return (<div key={props.track.id} className="flex flex-row justify-center my-2 gap-5 animate-fadein">
    <div>
      <img className="rounded-lg" width="50" src={props.track.album.art} alt={`Album art for ${props.track.album.name}`} />
    </div>
    <div className="flex-1 my-auto">
      <div className="text-xl font-bold">{props.track.name}</div>
      <div>{getMultipleArtistsString(props.track.artists)}</div >
    </div>
  </div>
  )
}

const Queue = (props: { queue: Track[] }) => {
  return (<div className="flex flex-col">
    {props.queue.map((track) => <TrackCard track={track} />)}
  </div>)
}

const Home = () => {
  const [current, setCurrent] = useState<CurrentTrack | undefined>(undefined)
  const [queue, setQueue] = useState<Track[]>([])
  useEffect(() => {
    getQueue(setCurrent, setQueue)
  }, [])
  useEffect(() => {
    const interval = setInterval(() => {
      getQueue(setCurrent, setQueue)
    }, 5000)
    return () => clearInterval(interval)
  })
  return (
    <main>
      {!current ? "" :
        <div className="mx-8 my-6 desktop:mx-auto desktop:w-desktop">
          <CurrentTrack currentTrack={current} />
          <Queue queue={queue} />
        </div>
      }
    </main>
  )
}

export default Home