/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${process.env.API_URL}/:path*`
            }
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
        }]
    }
}

export default nextConfig
