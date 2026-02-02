from pydantic import BaseModel


class Player(BaseModel):
    nickname: str
