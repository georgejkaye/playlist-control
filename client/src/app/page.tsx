"use client"

import { useContext, useEffect, useState } from "react"
import { AppContext } from "./context"
import { SessionOverview } from "./structs"
import { createSession, getSessions } from "./api"
import { useRouter } from "next/navigation"
import { Loader } from "./loader"
import { Line } from "./context"

const SessionCard = (props: { session: SessionOverview }) => {
  const router = useRouter()
  const onClickSessionCard = (e: React.MouseEvent<HTMLButtonElement>) => {
    router.push(`/session/${props.session.slug}`)
  }
  return (
    <button
      className="text-left rounded-xl bg-accent p-4 flex flex-row hover:bg-accent-hover cursor-pointer"
      onClick={onClickSessionCard}
    >
      <div>
        <div className="font-bold">{props.session.name}</div>
        <div>hosted by {props.session.host}</div>
        {!props.session.playlist ? (
          ""
        ) : (
          <div>
            <div>{props.session.playlist ? props.session.playlist : ""}</div>
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
  const [passwordText, setPasswordText] = useState("")
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const onChangeNameBox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionNameText(e.target.value)
  }
  const onChangeHostBox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionHostText(e.target.value)
  }
  const onChangePasswordBox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordText(e.target.value)
  }
  const onClickCancelButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.stopMaking()
  }
  const submitSession = async (
    name: string,
    host: string,
    password: string
  ) => {
    if (name === "" || host === "" || password === "") {
      setError("Need session name, host and password!")
    } else {
      setLoading(true)
      let result = await createSession(
        sessionNameText,
        sessionHostText,
        password
      )
      if (result !== undefined) {
        setSession(result.session)
        localStorage.setItem(`token-${result.session.slug}`, result.token)
        localStorage.setItem(
          `expires-${result.session.slug}`,
          result.expires.toISOString()
        )
        router.push(`/session/${result.session.slug}`)
      } else {
        setError("Session name already taken!")
        setLoading(false)
      }
    }
  }
  const onClickCreateSessionButton = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    submitSession(sessionHostText, sessionHostText, passwordText)
  }
  const onSubmitForm = (data: FormData) => {
    const name = data.get("sessionName")
    const host = data.get("sessionHost")
    const password = data.get("password")
    if (name && host && password) {
      submitSession(name.toString(), host.toString(), password.toString())
    }
  }
  const boxStyle = "p-2 my-2 rounded-xl w-full tablet:w-full text-black"
  const createSessionButtonStyle =
    "my-4 p-2 w-48 rounded-xl bg-gray-100 bg-gray-700 hover:bg-gray-500 cursor-pointer"
  const boxDivStyle = "w-full"
  return isLoading ? (
    <Loader />
  ) : (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold">Create a new session</h2>
      <Line />
      <form action={onSubmitForm}>
        <div className="flex flex-col tablet:flex-row gap-4">
          <div className={boxDivStyle}>
            <div>Session name</div>
            <input
              name="sessionName"
              autoFocus
              className={boxStyle}
              type="text"
              value={sessionNameText}
              onChange={onChangeNameBox}
            />
          </div>
          <div className={boxDivStyle}>
            <div>Session host</div>
            <input
              name="sessionHost"
              className={boxStyle}
              type="text"
              value={sessionHostText}
              onChange={onChangeHostBox}
            />
          </div>
          <div className={boxDivStyle}>
            <div>Password</div>
            <input
              name="password"
              className={boxStyle}
              type="password"
              value={passwordText}
              onChange={onChangePasswordBox}
            />
          </div>
        </div>
      </form>
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
      {error === "" ? (
        ""
      ) : (
        <div className="p-2 rounded-xl bg-red-600">{error}</div>
      )}
    </div>
  )
}

const Home = () => {
  const [sessions, setSessions] = useState<SessionOverview[]>([])
  const [isMaking, setMaking] = useState(false)
  useEffect(() => {
    const performSessionRequest = async () => {
      let sessions = await getSessions()
      if (sessions) {
        setSessions(sessions)
      } else {
        setSessions([])
      }
    }
    performSessionRequest()
  }, [])
  return (
    <div>
      {!isMaking ? (
        !sessions ? (
          <Loader />
        ) : (
          <div className="flex flex-col gap-4">
            <NewSessionCard setMaking={() => setMaking(true)} />
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )
      ) : (
        <MakeSession stopMaking={() => setMaking(false)} />
      )}
    </div>
  )
}
export default Home
