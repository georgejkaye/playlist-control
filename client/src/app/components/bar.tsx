import Link from "next/link"

const TopBar = (props: { isLoggedIn: boolean; isAdminPanel: boolean }) => {
  let [href, text] = props.isAdminPanel
    ? ["/", "Back"]
    : props.isLoggedIn
    ? ["/settings", "Settings"]
    : ["/settings", "Login"]
  return (
    <div className="p-4 bg-accent-blue flex flex-row">
      <div className="text-xl font-bold flex-1">Kayelist Controller</div>
      <Link href={href}>{text}</Link>
    </div>
  )
}

export default TopBar
