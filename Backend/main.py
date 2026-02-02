import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas.player import Player
from schemas.lobby import Lobby

import random
import string

lobbies : dict[str, Lobby] = {}
sid_to_nick = {}
NUM_CHAR_LID = 6

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app = FastAPI()

socket_app = socketio.ASGIApp(sio, app)

@sio.event
async def connect(sid, environ):
    print(f"Player connected: {sid}")

@sio.event
async def disconnect(sid):
    if sid in sid_to_nick:
        user_data = sid_to_nick[sid]
        name = user_data["name"]
        lobby_id = user_data["lobby"]

        # update lobbies
        updated_lobby = remove_player_from_lobby(lobby_id, name)
        
        if(updated_lobby):
            await sio.emit("user_left", {
                "user": name,
                **updated_lobby.model_dump()
            }, room=lobby_id)

        # update sid_to_nick
        del sid_to_nick[sid]
        print(f"Cleaned up {name} after disconnect.")

# ---------------------------------------------

# SYNC: JOIN LOBBY
@sio.on("join_lobby")
async def handle_join(sid, data):
    username = data.get('user', '').strip()
    requested_lobby = data.get('lobby', '').strip().upper()

    currentLobby = None
    lobby_id = None

    if requested_lobby:
        if requested_lobby not in lobbies:
            # lobby not found
            # local emit with room arg, same with one like 3 lines down
            await sio.emit('join_error', {'message': 'LOBBY_NOT_FOUND'}, room=sid)
            return
        lobby_id = requested_lobby
        if username in lobbies[lobby_id].players:
            await sio.emit('join_error', {'message': 'NICKNAME_TAKEN'}, room=sid)
            return
        currentLobby = lobbies[lobby_id]
    else:
        # blank id, generate
        lobby_id = generate_unique_id()
        currentLobby = Lobby(
            lobbyId=lobby_id,
            players={},
            lobbyHost=username # mark user as host
        )
        lobbies[lobby_id] = currentLobby
    
    # update globals
    lobbies[lobby_id].players[username] = Player(
        nickname=username,
    )
    sid_to_nick[sid] = {"name": username, "lobby": lobby_id}

    await sio.enter_room(sid, lobby_id)

    await sio.emit('lobby_joined', {
        'username': username,
        **currentLobby.model_dump()
    }, room=lobby_id)

    print(f"User {username} joined {lobby_id}")

def generate_unique_id():
    """Generates a NUM_CHAR_LID character lobby code like 'A7B2X9'"""
    while True:
        new_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=NUM_CHAR_LID))
        if new_id not in lobbies:
            return new_id
        
# ---------------------------------------------

# SYNC: LEAVE LOBBY
@sio.on("leave_lobby")
async def handle_leave(sid, data):
    if sid in sid_to_nick:
        lobby_id = sid_to_nick[sid]["lobby"]
        await disconnect(sid) 
        await sio.leave_room(sid, lobby_id)

# ---------------------------------------------

# SYNC: ACTIVE LOBBY
def remove_player_from_lobby(lobby_id, username):
    """Removes a player and deletes the lobby if it's empty"""
    if lobby_id in lobbies:
        if username in lobbies[lobby_id].players:
            lobbies[lobby_id].players.pop(username)
            
            # clean empty lobbies
            if not lobbies[lobby_id].players:
                del lobbies[lobby_id]
                return None # lobby is gone
            
        return lobbies.get(lobby_id)
    
    return None

# ---------------------------------------------

# def serialize_players(players: dict[str, Player]):
#     """Serialize player dictionary to send to frontend"""
#     return [p.model_dump() for p in players.values()]

# ---------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)


