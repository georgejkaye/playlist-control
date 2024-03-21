from aiohttp import web
from api.utils import get_env_variable
import socketio
import uvicorn

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=[])
app = socketio.ASGIApp(sio)


@sio.event
def connect(sid, environ):
    print("Connect ", sid)


@sio.event
async def chat_message(sid, data):
    print("message ", data)


@sio.event
async def disconnect(sid):
    print("disconnect ", sid)


def start():
    if get_env_variable("API_ENV") == "prod":
        reload = False
    elif get_env_variable("API_ENV") == "dev":
        reload = True
    else:
        print("Invalid environment set")
        exit(1)
    uvicorn.run(
        "api.sock:app",
        host="0.0.0.0",
        port=int(get_env_variable("API_PORT")),
        reload=reload,
    )


if __name__ == "__main__":
    start()
