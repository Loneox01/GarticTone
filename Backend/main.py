import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app = FastAPI()

socket_app = socketio.ASGIApp(sio, app)

@sio.event
async def connect(sid, environ):
    print(f"Player connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Player disconnected: {sid}")

# SYNC: JOIN LOBBY
@sio.on("join_lobby")
async def handle_join(sid, data):
    lobby = data.get("lobby")
    await sio.enter_room(sid, lobby)
    print(f"User {sid} joined lobby: {lobby}")
    await sio.emit("user_joined", {"user": sid}, room=lobby)

# SYNC: LEAVE LOBBY
@sio.on("leave_lobby")
async def handle_leave(sid, data):
    lobby = data.get("lobby")
    await sio.leave_room(sid, lobby)
    print(f"User {sid} left lobby: {lobby}")
    await sio.emit("user_left", {"user": sid}, room=lobby)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)