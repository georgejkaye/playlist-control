import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppContextWrapper } from "./context"
import { useState } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Party Playlist Controller",
  description: "App for controlling the playlist at the party",
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppContextWrapper>{children}</AppContextWrapper>
      </body>
    </html>
  )
}

export default RootLayout
