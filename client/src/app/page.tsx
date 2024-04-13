"use client"

import { useContext, useState } from "react"
import { AppContext } from "./context"
import { SessionOverview } from "./structs"

const SessionCard = (props: { session: SessionOverview }) => {
  return (
    <div>
      <div>{props.session.name}</div>
      <div>{props.session.host}</div>
    </div>
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

const MakeSession = () => {
  const [sessionNameTest, setSessionNameText] = useState("")
  const [sessionHostText, setSessionHostText] = useState("")
  const onClickSubmitButton = (e: React.MouseEvent<HTMLButtonElement>) => {}
  const onChangeNameBox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionNameText(e.target.value)
  }
  const onChangeHostBox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionHostText(e.target.value)
  }
  const boxStyle = "p-2 my-2 rounded-xl w-2/3 tablet:w-full"
  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold">Create a new session</h2>
      <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700" />
      <div className="flex flex-col tablet:flex-row gap-10">
        <div className="w-1/3">
          <div>Session name</div>
          <input
            className={boxStyle}
            type="text"
            value={sessionNameTest}
            onChange={onChangeNameBox}
          />
        </div>
        <div className="w-1/3">
          <div>Session host</div>
          <input
            className={boxStyle}
            type="text"
            value={sessionHostText}
            onChange={onChangeHostBox}
          />
        </div>
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
        <div>
          <NewSessionCard setMaking={() => setMaking(true)} />
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <MakeSession />
      )}
    </div>
  )
}
export default Home
