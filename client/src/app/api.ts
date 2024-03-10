import axios from "axios";
import { CurrentTrack, SetState, Track } from "./structs";

const responseToArtist = (response: any) => ({
  id: response["id"],
  name: response["name"],
});

const responseToAlbum = (response: any) => ({
  id: response["id"],
  name: response["name"],
  artists: response["artists"].map(responseToArtist),
  art: response["art"],
});

const responseToTrack = (response: any) => ({
  id: response["id"],
  name: response["name"],
  album: responseToAlbum(response["album"]),
  artists: response["artists"].map(responseToArtist),
  duration: response["duration"],
});

const responseToCurrentTrack = (response: any) => ({
  track: responseToTrack(response["track"]),
  start: response["start"],
});

export const getData = async (
  setTracks: SetState<Track[]>,
  setCurrent: SetState<CurrentTrack | undefined>,
  setQueue: SetState<Track[]>
) => {
  const endpoint = "/api/data";
  const response = await axios.get(endpoint);
  if (response.status === 200) {
    const data = response.data;
    console.log(data);
    const tracks = data["tracks"].map(responseToTrack);
    const current = responseToCurrentTrack(data["current"]);
    const queue = data["queue"].map(responseToTrack);
    setTracks(tracks);
    setCurrent(current);
    setQueue(queue);
  }
};

export const getQueue = async (
  setCurrent: SetState<CurrentTrack | undefined>,
  setQueue: SetState<Track[]>
) => {
  const endpoint = "/api/queue";
  const response = await axios.get(endpoint);
  if (response.status === 200) {
    const data = response.data;
    const current = responseToCurrentTrack(data["current"]);
    const queue = data["queue"].map(responseToTrack);
    setCurrent(current);
    setQueue(queue);
  }
};

export const postQueue = async (track: Track, setQueue: SetState<Track[]>) => {
  const endpoint = "/api/queue";
  const params = {
    track_id: track.id,
  };
  const response = await axios.post(endpoint, null, { params });
  if (response.status === 200) {
    const data = response.data;
    const queue = data.map(responseToTrack);
    setQueue(queue);
  }
};
