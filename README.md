# party-playlist

Tool for partygoers to contribute to the playlist

## Development

Set up the environment variables:

```
# .env

CLIENT_PORT=
SERVER_PORT_A=

# Just for deploying with traefik
CLIENT_HOST=
# Used within client to talk to server
SERVER_HOST=
SERVER_PROTOCOL=

SPOTIFY_APP_ID=
```

Create your secrets:

- `key.secret`: key used by the server to hash passwords
- `spotify.secret`: app secret generated by Spotify

Run the `dev` docker compose file:

```sh
# new
docker compose -f docker-compose.dev.yml up --build
# old
docker-compose -f docker-compose.dev.yml up --build
```
