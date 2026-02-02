from pydantic import BaseModel
from .player import Player


class Lobby(BaseModel):
    lobby_id: str
    players: dict[str, Player]
