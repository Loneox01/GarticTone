from pydantic import BaseModel


class Player(BaseModel):
    nickname: str
    is_host: bool
