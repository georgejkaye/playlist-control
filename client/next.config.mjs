/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${process.env.API_URL}/:path*`
            },
            {
                source: "/server/:path*",
                destination: `${process.env.SERVER_URL}/:path*`
            },
        ]
    },
    output: "standalone",
    images: {
        remotePatterns: [{
            protocol: "https",
            hostname: "image-cdn-**.spotifycdn.com",
            pathname: "/image/*"
        }, {
            protocol: "https",
            hostname: "mosaic.scdn.co"
        }, {
            protocol: "https",
            hostname: "i.scdn.co",
            pathname: "/image/*"
        }, {
            hostname: "blend-playlist-covers.spotifycdn.com"
        }, {
            hostname: "lineup-images.scdn.co"
        }, {
            hostname: "wrapped-images.spotifycdn.com"
        }]
    }
}

export default nextConfig
