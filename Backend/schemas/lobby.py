from pydantic import BaseModel
from .player import Player


class Lobby(BaseModel):
    lobbyId: str
    players: dict[str, Player]
    lobbyHost: str
    gameMode: str = "STANDARD"
    settings: dict = {"roundDuration": 60}
