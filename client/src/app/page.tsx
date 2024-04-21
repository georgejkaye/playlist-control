"use client"

import { useContext, useState } from "react"
import { AppContext } from "./context"
import { SessionOverview } from "./structs"
import { createSession } from "./api"
import { useRouter } from "next/navigation"
import { ColorRing } from "react-loader-spinner"

const SessionCard = (props: { session: SessionOverview }) => {
  const router = useRouter()
  const onClickSessionCard = (e: React.MouseEvent<HTMLButtonElement>) => {
    router.push(`/session/${props.session.slug}`)
  }
  return (
    <button
      className="text-left rounded-xl bg-accent-blue p-4 flex flex-row hover:bg-accent-blue-hover cursor-pointer"
      onClick={onClickSessionCard}
    >
      <div>
        <div className="font-bold">{props.session.name}</div>
        <div>hosted by {props.session.host}</div>
        {!props.session.playlist ? (
          ""
        ) : (
          <div>
            <div>
              {props.session.playlist ? props.session.playlist.name : ""}
            </div>
            {!props.session.current ? (
              ""
            ) : (
              <div>Currently playing: {props.session.current.name}</div>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

const NewSessionCard = (props: { setMaking: () => void }) => {
  const onClickNewButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.setMaking()
  }
  return (
    <button
      className="rounded-xl w-full p-4 font-bold bg-gray-700 hover:bg-gray-500 cursor-pointer"
      onClick={onClickNewButton}
    >
      New session
    </button>
  )
}

const MakeSession = (props: { stopMaking: () => void }) => {
  const { setSession } = useContext(AppContext)
  const [sessionNameText, setSessionNameText] = useState("")
  const [sessionHostText, setSessionHostText] = useState("")
  const [isLoading, setLoading] = useState(false)
  const router = useRouter()
  const onChangeNameBox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionNameText(e.target.value)
  }
  const onChangeHostBox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionHostText(e.target.value)
  }
  const onClickCancelButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.stopMaking()
  }
  const onClickCreateSessionButton = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (sessionNameText !== "" && sessionHostText !== "") {
      setLoading(true)
      let result = await createSession(sessionNameText, sessionHostText)
      if (result !== undefined) {
        console.log("session is", result.session)
        setLoading(false)
        setSession(result.session)
        router.push(`/session/${result.session.slug}`)
        props.stopMaking()
      } else {
        setLoading(false)
      }
    }
  }
  const boxStyle = "p-2 my-2 rounded-xl w-full tablet:w-full text-black"
  const createSessionButtonStyle =
    "my-4 p-2 w-48 rounded-xl bg-gray-100 bg-gray-700 hover:bg-gray-500 cursor-pointer"
  const boxDivStyle = "w-full"
  return isLoading ? (
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
    <div className="flex flex-col">
      <h2 className="text-xl font-bold">Create a new session</h2>
      <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700" />
      <div className="flex flex-col tablet:flex-row gap-4">
        <div className={boxDivStyle}>
          <div>Session name</div>
          <input
            className={boxStyle}
            type="text"
            value={sessionNameText}
            onChange={onChangeNameBox}
          />
        </div>
        <div className={boxDivStyle}>
          <div>Session host</div>
          <input
            className={boxStyle}
            type="text"
            value={sessionHostText}
            onChange={onChangeHostBox}
          />
        </div>
      </div>
      <div className="flex gap-4">
        <button
          className={createSessionButtonStyle}
          onClick={onClickCreateSessionButton}
        >
          Create session
        </button>
        <button
          className={createSessionButtonStyle}
          onClick={onClickCancelButton}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

const Home = () => {
  const { sessions } = useContext(AppContext)
  const [isMaking, setMaking] = useState(false)
  return (
    <div>
      {!isMaking ? (
        <div className="flex flex-col gap-4">
          <NewSessionCard setMaking={() => setMaking(true)} />
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <MakeSession stopMaking={() => setMaking(false)} />
      )}
    </div>
  )
}
export default Home
