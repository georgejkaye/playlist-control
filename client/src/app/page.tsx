"use client";

import { useEffect, useState } from "react";
import {
  CurrentTrack,
  SetState,
  Track,
  getMultipleArtistsString,
} from "./structs";
import { getData, getQueue, postQueue } from "./api";

const CurrentTrack = (props: { currentTrack: CurrentTrack }) => {
  return (
    <div className="flex flex-row justify-center my-6 gap-10 mx-1">
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
  );
};

const trackCardStyle = "rounded-lg flex flex-row justify-center my-1 p-1 gap-5";

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
  );
};

const Queue = (props: { queue: Track[] }) => {
  return (
    <div className="flex flex-col">
      {props.queue.map((track) => (
        <TrackCard track={track} />
      ))}
    </div>
  );
};

const QueueAdderTrackCard = (props: {
  track: Track;
  setQueue: SetState<Track[]>;
  setAdding: SetState<boolean>;
}) => {
  const onClickCard = (e: React.MouseEvent<HTMLDivElement>) => {
    postQueue(props.track, props.setQueue);
    props.setAdding(false);
  };
  return (
    <div
      key={props.track.id}
      className={`${trackCardStyle} hover:bg-gray-700 cursor-pointer`}
      onClick={onClickCard}
    >
      <div>
        <img
          className="rounded-lg"
          width="52"
          src={props.track.album.art}
          alt={`Album art for ${props.track.album.name}`}
        />
      </div>
      <div className="flex-1 my-auto">
        <div className="text-xl font-bold">{props.track.name}</div>
        <div>{getMultipleArtistsString(props.track.artists)}</div>
      </div>
    </div>
  );
};

const defaultTracksToShow = 50;
const bigButtonStyle =
  "rounded-lg bg-gray-700 p-4 my-4 font-bold text-2xl cursor-pointer hover:bg-gray-600";

const QueueAdder = (props: {
  isAdding: boolean;
  setAdding: SetState<boolean>;
  tracks: Track[];
  setCurrent: SetState<CurrentTrack | undefined>;
  setQueue: SetState<Track[]>;
}) => {
  const [filteredTracks, setFilteredTracks] = useState<Track[]>(
    props.tracks.sort((t1, t2) => t1.name.localeCompare(t2.name))
  );
  const [filterText, setFilterText] = useState("");
  const [tracksToShow, setTracksToShow] = useState(100);
  useEffect(() => {
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
    );
  }, [filterText]);
  useEffect(() => {
    setFilterText("");
    setTracksToShow(defaultTracksToShow);
  }, [props.isAdding]);
  const onChangeFilterText = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilterText(e.target.value);
  const onClickAdd = (e: React.MouseEvent<HTMLDivElement>) =>
    props.setAdding(!props.isAdding);
  const onClickMore = (e: React.MouseEvent<HTMLDivElement>) =>
    setTracksToShow(tracksToShow + defaultTracksToShow);
  return (
    <div className="m-1">
      <div className={bigButtonStyle} onClick={onClickAdd}>
        {!props.isAdding ? "Add to queue" : "Back"}
      </div>
      {!props.isAdding ? (
        ""
      ) : (
        <div>
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
  );
};

const Home = () => {
  const [current, setCurrent] = useState<CurrentTrack | undefined>(undefined);
  const [queue, setQueue] = useState<Track[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isAdding, setAdding] = useState(false);
  const [isLocked, setLocked] = useState(false);
  useEffect(() => {
    getData(setTracks, setCurrent, setQueue);
    console.log(tracks);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLocked) {
        getQueue(setCurrent, setQueue);
      }
    }, 5000);
    return () => clearInterval(interval);
  });
  useEffect(() => {
    if (!isAdding) {
      window.scrollTo({ top: 0 });
      setLocked(false);
    } else {
      setLocked(true);
    }
  }, [isAdding]);
  useEffect(() => {
    if (current) {
      console.log("Updating song");
      let startTime = current.start;
      let duration = current.track.duration;
      let endTime = startTime + duration;
      let currentTime = new Date().getTime();
      let timeLeft = endTime - currentTime;
      setTimeout(() => {
        getQueue(setCurrent, setQueue);
      }, timeLeft);
    }
  }, [current]);
  return (
    <main>
      {!current ? (
        ""
      ) : (
        <div className="mx-4 my-6 desktop:mx-auto desktop:w-desktop">
          <CurrentTrack currentTrack={current} />
          <QueueAdder
            isAdding={isAdding}
            setAdding={setAdding}
            tracks={tracks}
            setCurrent={setCurrent}
            setQueue={setQueue}
          />
          {isAdding ? "" : <Queue queue={queue} />}
        </div>
      )}
    </main>
  );
};

export default Home;
