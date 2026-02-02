from pydantic import BaseModel
from .player import Player


class Lobby(BaseModel):
    lobbyId: str
    players: dict[str, Player]
    lobbyHost: str
