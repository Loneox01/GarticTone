from pydantic import BaseModel
from .player import Player

FLOWS: dict = {
        "CLASSIC": ["PROMPT", "RECORDING"],
        "BLIND_KARAOKE": ["RECORDING"] 
    }

class Lobby(BaseModel):
    lobbyId: str
    players: dict[str, Player]  # nickname: Player 
    lobbyHost: str
    gameMode: str = "CLASSIC"
    settings: dict = {}
    gameStarted: bool = False
    roundIndex: int = 1
    recList: list = []
    numRounds: int = 1
    roundNum: int = 1
