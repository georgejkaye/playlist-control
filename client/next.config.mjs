/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image-cdn-**.spotifycdn.com",
        pathname: "/image/*",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/image/*",
      },
      {
        hostname: "blend-playlist-covers.spotifycdn.com",
      },
      {
        hostname: "lineup-images.scdn.co",
      },
      {
        hostname: "wrapped-images.spotifycdn.com",
      },
      {
        hostname: "newjams-images.scdn.co",
      },
    ],
  },
}

export default nextConfig
