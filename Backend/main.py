import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas.player import Player
from schemas.lobby import Lobby
from schemas.gameModes import MODE_CONFIGS

import random
import string

lobbies : dict[str, Lobby] = {} # lobbyId / Lobby
sid_to_nick = {} # sid / {"name": nickname, "lobby": lobbyId}
NUM_CHAR_LID = 6

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app = FastAPI()

socket_app = socketio.ASGIApp(sio, app)

@sio.event
async def connect(sid, environ):
    print(f"Player connected: {sid}")

@sio.event
async def disconnect(sid):
    await handle_player_exit(sid)

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
    await handle_player_exit(sid)

async def handle_player_exit(sid):
    if not sid in sid_to_nick:
        return
    user_data = sid_to_nick.pop(sid) # clears up sid_to_nick pair
    name = user_data["name"]
    lobby_id = user_data["lobby"]

    if lobby_id in lobbies:
        lobby = lobbies[lobby_id]
        if not lobby.gameStarted and lobby.lobbyHost == name:
            # dismantle_lobby
            await sio.emit("lobby_dismantled", room=lobby_id)
            del lobbies[lobby_id]
        else:
            updated = remove_player_from_lobby(lobby_id, name)
            if updated:
                await sio.emit("user_left", {"user": name}, room=lobby_id)
                
    await sio.leave_room(sid, lobby_id)
    print(f"Cleaned up {name} after disconnect.")

# SYNC: START GAME

@sio.on("game_init") 
async def handle_game_init(sid, data):
    lobby_id = data.get("lobbyId")
    
    if not lobby_id or lobby_id not in lobbies:
        print(f"\n Game Start Error: Lobby {lobby_id} not found \n")
        return
        
    lobby = lobbies[lobby_id]
    incoming_settings = data.get("settings", {})
    mode = data.get("gameMode")

    # update server data
    lobby.settings = incoming_settings
    lobby.gameMode = mode

    # init proper input list
    if MODE_CONFIGS[mode]["input_list"]:
        input_list = lobby.settings.get("inputList")

        user_list = [s.strip() for s in input_list.split(',') if s.strip()]
        if len(user_list) < len(lobby.players):
            final_list = MODE_CONFIGS[mode]["default_list"]
        else:
            final_list = user_list

        selected_prompts = random.sample(final_list, len(lobby.players))
        for player, prompt in zip(lobby.players.values(), selected_prompts):
            player.assigned_prompt = prompt

    # broadcast to room
    for sid, session_data in sid_to_nick.items():
        target_nick = session_data.get("name")
        
        p = lobby.players.get(target_nick)
                
        if p:
            await sio.emit("game_start", {
                "gameMode": mode,
                "settings": incoming_settings,
                "assignedPrompt": p.assigned_prompt  
            }, to=sid)
    lobby.gameStarted = True
    
    print(f"Game started in lobby {lobby_id} with game mode {mode}")

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



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)
